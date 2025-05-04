const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { Client } = require('@elastic/elasticsearch');
const OpenAI = require('openai');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = 5000;

const DATA_FILE = path.join(__dirname, 'components', 'data.json');
const SALT_ROUNDS = 10;

const ELASTIC_HOST = 'http://localhost:9200';
const ELASTIC_INDEX = 'es_index3';
const ELASTIC_SUBSCRIPTION_INDEX = 'es_subscription';
const ELASTIC_NOTIFICATION_INDEX = 'es_notification';

const elasticClient = new Client({ node: ELASTIC_HOST });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.use(cors({
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true 
  }));
app.use(bodyParser.json());
app.use(serveStatic(path.join(__dirname, 'public'), { 'static': ['js', 'css'] }));

const httpServer = http.createServer(app); 
const io = new Server(httpServer, {  
    cors: {
        origin: ["http://localhost:3000"], 
        methods: ["GET", "POST"]
    }
});



let cachedData = { users: [], posts: [] };

const loadUsers = async () => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const userData = JSON.parse(data);
        return userData.users || [];
    } catch (err) {
        console.error('Error reading user data:', err);
        return [];
    }
};

const loadData = async () => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        cachedData = JSON.parse(data);
        cachedData.posts = [];
        console.log("User data loaded into memory");
        return cachedData;
    } catch (err) {
        console.error('Error reading user data:', err);
        if (err.code === 'ENOENT') {
            console.log("data.json not found. Creating a new one (for users)...");
            const initialData = JSON.stringify({ users: [], posts: [] }, null, 2);
            try {
                await fs.writeFile(DATA_FILE, initialData);
                cachedData = { users: [], posts: [] };
                console.log("New data.json created (for users)");
                return cachedData;
            } catch (writeErr) {
                console.error("Error creating data.json:", writeErr);
                return { users: [], posts: [] };
            }
        } else {
            return { users: [], posts: [] };
        }
    }
};

const saveData = async (data) => {
    try {
        const jsonData = JSON.stringify({ users: data.users }, null, 2);
        await fs.writeFile(DATA_FILE, jsonData, 'utf8');
        console.log("User data successfully written to:", DATA_FILE);
        cachedData = { users: JSON.parse(jsonData).users, posts: [] };
    } catch (err) {
        console.error("Error writing user data to data.json:", err);
        throw err;
    }
};

const indexPost = async (post) => {
    try {
        await elasticClient.index({
            index: ELASTIC_INDEX,
            id: post.id,
            document: post,
        });
        console.log(`Post with ID ${post.id} indexed successfully in Elasticsearch`);
    } catch (error) {
        console.error(`Error indexing post with ID ${post.id} in Elasticsearch:`, error);
        throw error;
    }
};

const deletePostFromIndex = async (postId) => {
    try {
        await elasticClient.delete({
            index: ELASTIC_INDEX,
            id: postId,
        });
        console.log(`Post with ID ${postId} deleted successfully from Elasticsearch`);
    } catch (error) {
        console.error(`Error deleting post with ID ${postId} from Elasticsearch:`, error);
    }
};

const updatePostInIndex = async (post) => {
    try {
        await elasticClient.update({
            index: ELASTIC_INDEX,
            id: post.id,
            body: {
                doc: post,
            },
        });

        console.log(`Post with ID ${post.id} updated successfully in Elasticsearch`, post);
    } catch (error) {
        console.error(`Error updating post with ID ${post.id} in Elasticsearch:`, error);
        throw error;
    }
};

const indexExists = async (indexName) => {
    try {
        const response = await elasticClient.indices.exists({ index: indexName });
        return response.body;
    } catch (error) {
        console.error(`Error checking if index "${indexName}" exists:`, error);
        return false;
    }
};

const createIndex = async (indexName, mappings) => {
    try {
        await elasticClient.indices.create({
            index: indexName,
            body: {
                mappings: mappings
            }
        });
        console.log(`Index "${indexName}" created successfully.`);
    } catch (error) {
        console.error(`Error creating index "${indexName}":`, error);
    }
};

(async () => {
    try {
        cachedData = await loadData();
        console.log("Initial user data loaded");

        const healthCheck = await elasticClient.cluster.health();
        console.log('Elasticsearch connection status:', healthCheck);

        const mainIndexExists = await indexExists(ELASTIC_INDEX);
        if (!mainIndexExists) {
            console.log(`Index "${ELASTIC_INDEX}" does not exist. Creating it...`);
            await createIndex(ELASTIC_INDEX, {
                properties: {
                    title: { type: "text" },
                    content: { type: "text" },
                    category: { type: "keyword" },
                    author: { type: "keyword" },
                    replies: {
                        type: "nested",
                        properties: {
                            id: { type: "keyword" },
                            replyText: { type: "text" },
                            replyAuthor: { type: "keyword" },
                        },
                    },
                    reports: {
                        type: "nested",
                        properties: {
                            reporter: { type: "keyword" },
                            timestamp: {
                                type: "date",
                                format: "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
                            },
                        },
                    },
                    categoryScore: { type: 'integer' },
                    imageURL: { type: 'keyword' },
                    externalLink: { type: 'keyword' },
                    isReported: { type: 'boolean' },
                    isUnderReview: { type: 'boolean' },
                    isApproved: { type: 'boolean' }
                }
            });
        } else {
            console.log(`Index "${ELASTIC_INDEX}" already exists.  Using existing index.`);
        }

        const subscriptionIndexExists = await indexExists(ELASTIC_SUBSCRIPTION_INDEX);
        if (!subscriptionIndexExists) {
            console.log(`Index "${ELASTIC_SUBSCRIPTION_INDEX}" does not exist. Creating it...`);
            await createIndex(ELASTIC_SUBSCRIPTION_INDEX, {
                properties: {
                    username: { type: 'keyword' },
                    topic: { type: 'keyword' }
                }
            });
        } else {
            console.log(`Index "${ELASTIC_SUBSCRIPTION_INDEX}" already exists. Using existing index.`);
        }

        const notificationIndexExists = await indexExists(ELASTIC_NOTIFICATION_INDEX);
        if (!notificationIndexExists) {
            console.log(`Index "${ELASTIC_NOTIFICATION_INDEX}" does not exist. Creating it...`);
            await createIndex(ELASTIC_NOTIFICATION_INDEX, {
                properties: {
                    id: { type: 'keyword' },
                    username: { type: 'keyword' },
                    title: { type: 'text' },
                    category: { type: 'keyword' },
                    message: { type: 'text' },
                    isRead: { type: 'boolean' },
                }
            });
        } else {
            console.log(`Index "${ELASTIC_NOTIFICATION_INDEX}" already exists. Using existing index.`);
        }

    } catch (err) {
        console.error("Failed to load initial data:", err);
    }
})();

app.post('/signup', async (req, res) => {
    console.log("Received signup request:", req.body);
    const { username, email, password, persona } = req.body;
    try {
        if (!cachedData) {
            console.error("ERROR: Cached data is not available.");
            return res.status(500).json({ message: "Server error: User Data not loaded." });
        }
        const users = cachedData.users || [];

        if (users.find(user => user.username.toLowerCase() === username.toLowerCase())) {
            console.log("Signup failed: Username already exists");
            return res.status(400).json({ message: "Username already exists" });
        }
        if (users.find(user => user.email.toLowerCase() === email.toLowerCase())) {
            console.log("Signup failed: Email already exists");
            return res.status(400).json({ message: "Email already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = {
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            persona,
            isEnabled: true
        };
        cachedData.users = [...cachedData.users, newUser]

        await saveData(cachedData);
        console.log("User saved successfully:", newUser);
        const userForClient = { username: newUser.username, email: newUser.email, persona: newUser.persona };
        res.status(201).json({ message: "Signup successful", user: userForClient });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Signup failed: " + err.message });
    }
});

app.post('/login', async (req, res) => {
    console.log("Received login request:", req.body);
    const { username, password, persona } = req.body;

    try {
        if (!cachedData) {
            console.error("ERROR: Cached data is not available.");
            return res.status(500).json({ message: "Server error: User Data not loaded." });
        }

        const users = cachedData.users || [];

        const user = users.find(user => user.username.trim().toLowerCase() === username.trim().toLowerCase() && user.persona === persona);

        if (!user) {
            console.log("Login failed: User not found with username:", username);
            return res.status(401).json({ message: "User not found" });
        }

        if (user.isEnabled === false) {
            console.log(`Login failed: Account disabled for username: ${username}`);
            return res.status(403).json({ message: "This account has been disabled." });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            console.log("Login failed: Incorrect password for username:", username);
            return res.status(401).json({ message: "Incorrect password" });
        }

        const userForClient = { username: user.username, email: user.email, persona: user.persona };
        console.log("Login successful:", user);
        res.json({ message: "Login successful", user: userForClient });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Login failed: " + err.message });
    }
});

app.post('/subscribe/:topic', async (req, res) => {
    const { topic } = req.params;
    const { username } = req.body;
    console.log(`Received subscribe request: Username - ${username}, Topic - ${topic}`);

    try {
        const checkResponse = await elasticClient.search({
            index: ELASTIC_SUBSCRIPTION_INDEX,
            query: {
                bool: {
                    must: [
                        { term: { username: username } },
                        { term: { topic: topic } }
                    ]
                }
            }
        });

        if (checkResponse.hits.total.value > 0) {
            console.log(`${username} is already subscribed to ${topic}`);
            return res.status(400).json({ message: `${username} is already subscribed to ${topic}` });
        }

        const documentToIndex = {
            username: username,
            topic: topic
        };

        console.log("Document being indexed:", JSON.stringify(documentToIndex, null, 2));

        await elasticClient.index({
            index: ELASTIC_SUBSCRIPTION_INDEX,
            document: documentToIndex,
            refresh: true
        });
        console.log(`${username} subscribed to ${topic}`);

        return res.json({ message: `${username} subscribed to ${topic}` });

    } catch (err) {
        console.error("Subscription error:", err);
        return res.status(500).json({ message: "Subscription failed: " + err.message });
    }
});

app.post('/unsubscribe/:topic', async (req, res) => {
    const { topic } = req.params;
    const { username } = req.body;
    console.log(`Received unsubscribe request: Username - ${username}, Topic - ${topic}`);

    try {
        try {
            const subscriptionDeleteResponse = await elasticClient.deleteByQuery({
                index: ELASTIC_SUBSCRIPTION_INDEX,
                refresh: true,
                body: {
                    query: {
                        bool: {
                            must: [
                                { term: { username: username } },
                                { term: { topic: topic } }
                            ]
                        }
                    }
                }
            });

            console.log("Subscription Delete Elasticsearch response:", JSON.stringify(subscriptionDeleteResponse, null, 2)); // Log the full response

            if (subscriptionDeleteResponse.deleted === undefined || subscriptionDeleteResponse.deleted === null) {
                console.error("Subscription delete response missing 'deleted' property.");
                return res.status(500).json({ message: "Failed to delete subscription: Elasticsearch error." });
            }

        } catch (subErr) {
            console.error("Error deleting subscription from Elasticsearch:", subErr);
            return res.status(500).json({ message: "Failed to delete subscription: " + subErr.message });
        }

        try {
            const notificationDeleteResponse = await elasticClient.deleteByQuery({
                index: ELASTIC_NOTIFICATION_INDEX,
                refresh: true,
                body: {
                    query: {
                        bool: {
                            must: [
                                { term: { username: username } },
                                { term: { category: topic } }  
                            ]
                        }
                    }
                }
            });

            console.log("Notification Delete Elasticsearch response:", JSON.stringify(notificationDeleteResponse, null, 2)); 
        } catch (notifErr) {
            console.error("Error deleting notifications from Elasticsearch:", notifErr);

            console.warn("Failed to delete notifications, but continuing with unsubscription.");
        }

        console.log(`${username} unsubscribed from ${topic}`);
        return res.json({ message: `${username} unsubscribed from ${topic}` });


    } catch (err) {
        console.error("Unsubscription error:", err);
        return res.status(500).json({ message: "Unsubscription failed: " + err.message });
    }
});


app.get('/subscriptions/:username', async (req, res) => {
    const { username } = req.params;
    console.log(`Received get subscriptions request for username: ${username}`);

    try {
        const response = await elasticClient.search({
            index: ELASTIC_SUBSCRIPTION_INDEX,
            query: {
                match: {
                    username: username
                }
            },
            size: 10000  
        });

        console.log("Full Elasticsearch response:", JSON.stringify(response, null, 2));


        const subscriptions = response?.hits?.hits?.map(hit => hit._source.topic) || []; 

        console.log(`Subscriptions for ${username}:`, subscriptions);
        return res.json(subscriptions);

    } catch (err) {
        console.error("Get subscriptions error:", err);
        return res.status(500).json({ message: "Get subscriptions failed: " + err.message });
    }
});

app.get('/notifications/:username', async (req, res) => {
    const { username } = req.params;
    console.log(`Received get notifications request for username: ${username}`);

    try {
        const response = await elasticClient.search({
            index: ELASTIC_NOTIFICATION_INDEX,
            query: {
                match: {
                    username: username
                }
            },
        });

        console.log("Full Elasticsearch response:", JSON.stringify(response, null, 2));


        const notifications = response?.hits?.hits?.map(hit => hit._source) || [];  

        console.log(`Notifications for ${username}:`, notifications);
        return res.json(notifications);

    } catch (err) {
        console.error("Get notifications error:", err);
        return res.status(500).json({ message: "Get notifications failed: " + err.message });
    }
});

app.put('/notifications/:notificationId', async (req, res) => {
    const { notificationId } = req.params;
    const { isRead } = req.body;

    console.log(`Received update notification request: Notification ID - ${notificationId}, isRead - ${isRead}`);

    try {
        const response = await elasticClient.update({
            index: ELASTIC_NOTIFICATION_INDEX,
            id: notificationId,
            body: {
                doc: {
                    isRead: isRead
                }
            },
            refresh: true
        });
        console.log("Elasticsearch response:", JSON.stringify(response, null, 2));

        console.log(`Notification ${notificationId} updated successfully`);
        res.json({ message: `Notification ${notificationId} updated successfully` });
    } catch (error) {
        console.error(`Error updating notification ${notificationId}:`, error);
        console.error("Elasticsearch Error Details:", error.meta?.body ? JSON.stringify(error.meta.body, null, 2) : error);
        res.status(500).json({ message: "Error updating notification: " + error.message });
    }
});

app.post('/create-post', async (req, res) => {
    console.log("Received create post request:", req.body);
    const { title, content, category, author, replies, categoryScore, imageURL, externalLink } = req.body;

    if (!title || !content || !category || !author) {
        console.log("Post creation failed: Missing required fields");
        return res.status(400).json({ message: "Missing required fields (title, content, category, author, timestamp)." });
    }

    const newPost = {
        id: uuidv4(),
        title: title.trim(),
        content: content.trim(),
        category: category.trim().toLowerCase(),
        author: author.trim(),
        replies: replies || [],
        categoryScore,
        imageURL: imageURL || '',
        externalLink: externalLink || '',
        reports: [],
        isReported: false,
        isUnderReview: false,
        isApproved: true
    };

    try {
        await indexPost(newPost);

        const subscriptionResponse = await elasticClient.search({
            index: ELASTIC_SUBSCRIPTION_INDEX,
            query: {
                term: {
                    topic: category
                }
            },
            size: 1000
        });

        const hits = subscriptionResponse?.hits?.hits;
        const subscribedUsers = hits ? hits.map(hit => hit._source.username) : [];
        console.log(`Subscribed users for topic ${category}:`, subscribedUsers);

        if (subscribedUsers.length > 0) {
            subscribedUsers.forEach(async username => {
                const notification = {
                    id: uuidv4(),
                    username: username,
                    title: title.trim(),
                    category: category.trim().toLowerCase(),
                    message: `New post in ${category}: ${title}`,
                    isRead: false,
                };

                await elasticClient.index({
                    index: ELASTIC_NOTIFICATION_INDEX,
                    id: notification.id,
                    document: notification,
                    refresh: true
                });

                io.emit(`notification:${username}`, notification);
                console.log(`Notification emitted to user: ${username}`);
            });
        }

        res.status(201).json({ message: "Post created successfully", post: newPost });
    } catch (err) {
        console.error("Create post error:", err);
        res.status(500).json({ message: "Post creation failed:" + err.message });
    }
});

io.on('connection', (socket) => {
    console.log('A user connected via Socket.IO');

   
    socket.on('disconnect', () => {
        console.log('A user disconnected via Socket.IO');
    });
});

app.get('/db', async (req, res) => {
    if (!cachedData) {
        console.error("ERROR: Cached data is not available.");
        return res.status(500).json({ message: "Server error: User Data not loaded." });
    }
    res.json({ users: cachedData.users });
});

app.get('/users', async (req, res) => {
    console.log('Get all users request');
    try {
        if (!cachedData) {
            console.error("ERROR: Cached data is not available.");
            return res.status(500).json({ message: "Server error: User Data not loaded." });
        }

        const usersForClient = cachedData.users.map(({ username, email, persona, isEnabled = true }) => ({
            username,
            email,
            persona,
            isEnabled
        }));

        console.log('Users retrieved and being sent', usersForClient);
        res.json(usersForClient);
    } catch (error) {
        console.error("Error retrieving users:", error);
        res.status(500).json({ message: "Error getting users: " + error.message });
    }
});

app.put('/users/:username', async (req, res) => {
    const username = req.params.username;
    const { isEnabled } = req.body;

    console.log(`Received request to update user ${username} to isEnabled: ${isEnabled}`);

    try {
        if (!cachedData) {
            console.error("ERROR: Cached data is not available.");
            return res.status(500).json({ message: "Server error: User Data not loaded." });
        }

        const userIndex = cachedData.users.findIndex(user => user.username === username);

        if (userIndex === -1) {
            console.log(`Update user failed: User with username ${username} not found`);
            return res.status(404).json({ message: `User with username ${username} not found` });
        }

        cachedData.users[userIndex].isEnabled = isEnabled;

        await saveData(cachedData);

        console.log(`User ${username} updated successfully`);
        res.json({ message: `User ${username} updated successfully` });
    } catch (error) {
        console.error(`Error updating user ${username}:`, error);
        res.status(500).json({ message: "Error updating user: " + error.message });
    }
});

app.get('/posts', async (req, res) => {
    const userPersona = req.headers['user-persona'];

    try {
        const body = await elasticClient.search({
            index: ELASTIC_INDEX,
            query: {
                match_all: {}
            },
        });

        if (body && body.hits && body.hits.hits) {
            const posts = body.hits.hits.map(hit => {
                const post = hit._source;
                if (post.isUnderReview && userPersona !== 'Moderator') {
                    return {
                        id: post.id,
                        isReported: post.isReported,
                        isUnderReview: post.isUnderReview,
                        title: "[Post Under Review]",
                        content: "[This post is currently under review by a moderator.]",
                        category: post.category,
                        author: post.author,
                        reports: post.reports ? post.reports.length : 0,
                    };
                }
                return post;
            });
            res.json(posts);
        } else {
            console.warn('No posts found or unexpected Elasticsearch response format.');
            res.json([]);
        }
    } catch (error) {
        console.error('Error searching for posts in Elasticsearch:', error);
        return res.status(500).json({ message: "Error getting posts from elastic search " + error.message });
    }
});

app.get('/posts/:category', async (req, res) => {
    const category = req.params.category;
    const userPersona = req.headers['user-persona'];

    try {
        const body = await elasticClient.search({
            index: ELASTIC_INDEX,
            query: {
                term: {
                    category: {
                        value: category.toLowerCase()
                    }
                }
            }
        });

        if (body && body.hits && body.hits.hits) {
            const posts = body.hits.hits.map(hit => {
                const post = hit._source;
                if (post.isUnderReview && userPersona !== 'Moderator') {
                    return {
                        id: post.id,
                        isReported: post.isReported,
                        isUnderReview: post.isUnderReview,
                        title: "[Post Under Review]",
                        content: "[This post is currently under review by a moderator.]",
                        category: post.category,
                        author: post.author,
                        reports: post.reports ? post.reports.length : 0,
                    };
                }
                return post;
            });
            res.json(posts);
        } else {
            console.warn('No posts found or unexpected Elasticsearch response format for category:', category);
            res.json([]);
        }
    } catch (error) {
        console.error('Error searching for posts in Elasticsearch by category:', error);
        return res.status(500).json({ message: "Error getting posts from elastic search by category " + error.message });
    }
});

app.delete('/posts/:id', async (req, res) => {
    const postId = req.params.id;
    console.log(`Received request to delete post with id: ${postId}`);

    try {
        await deletePostFromIndex(postId);

        console.log(`Post with id ${postId} deleted successfully`);
        res.json({ message: `Post with id ${postId} deleted successfully` });
    } catch (error) {
        console.error(`Error deleting post with id ${postId}:`, error);
        res.status(500).json({ message: "Error deleting post: " + error.message });
    }
});

app.post('/posts/:id/replies', async (req, res) => {
    const postId = req.params.id;
    const { replyText, replyAuthor } = req.body;

    console.log(`Received request to add reply to post with id: ${postId}`);

    try {
        const getResponse = await elasticClient.get({
            index: ELASTIC_INDEX,
            id: postId,
        });

        const post = getResponse._source;

        if (!post) {
            console.log(`Add reply failed: Post with id ${postId} not found`);
            return res.status(404).json({ message: `Post with id ${postId} not found` });
        }

        const newReply = {
            id: uuidv4(),
            replyText: replyText.trim(),
            replyAuthor: replyAuthor.trim()
        };

        post.replies = [...(post.replies || []), newReply];


        try {
            await updatePostInIndex(post)
        } catch (error) {
            console.error("Failed to update post in Elasticsearch:", error);
        }

        console.log(`Reply added to post with id ${postId} successfully`);
        res.status(201).json({ message: "Reply added successfully", reply: newReply });
    } catch (error) {
        console.error(`Error adding reply to post with id ${postId}:`, error);
        res.status(500).json({ message: "Error adding reply: " + error.message });
    }
});

app.post('/posts/:id/openai/generate-reply', async (req, res) => {
    const postId = req.params.id;
    const { prompt, tone } = req.body;

    console.log(`Received request to generate OpenAI reply for post with id: ${postId}`);

    try {
        const getResponse = await elasticClient.get({
            index: ELASTIC_INDEX,
            id: postId,
        });

        const post = getResponse._source;

        if (!post) {
            console.log(`Post with id ${postId} not found`);
            return res.status(404).json({ message: `Post with id ${postId} not found` });
        }

        let fullPrompt = prompt;

        if (tone) {
            fullPrompt += ` Respond in a ${tone} tone.`;
        }
        else {
            fullPrompt += ` Be concise and avoid extra details.`;
        }

        console.log(`Full prompt being sent to OpenAI: ${fullPrompt}`);

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: fullPrompt }],
        });

        const replyText = completion.choices[0].message.content;

        console.log(`OpenAI reply generated for post with id ${postId} successfully`);
        res.status(200).json({ message: "OpenAI reply generated successfully", reply: { replyText: replyText.trim() } });

    } catch (error) {
        console.error("Error adding OpenAI reply:", error);
        res.status(500).json({ message: "Error generating OpenAI reply: " + error.message });
    }
});

app.post('/posts/:id/report', async (req, res) => {
    const postId = req.params.id;
    const { reporter } = req.body;

    console.log(`Received request to report post with id: ${postId} from user: ${reporter}`);

    try {
        const getResponse = await elasticClient.get({
            index: ELASTIC_INDEX,
            id: postId,
        });

        if (!getResponse.found) {
            console.log(`Report post failed: Post with id ${postId} not found`);
            return res.status(404).json({ message: `Post with id ${postId} not found` });
        }

        const post = getResponse._source;

        const newReport = {
            reporter: reporter.trim(),
            timestamp: new Date().toISOString(),
        };

        post.reports = [...(post.reports || []), newReport];
        post.isReported = true;
        post.isUnderReview = true;


        try {
            await updatePostInIndex(post);
        } catch (error) {
            console.error("Failed to update post in Elasticsearch after reporting:", error);
            return res.status(500).json({ message: "Error updating post after reporting: " + error.message });
        }

        console.log(`Post with id ${postId} reported successfully by user: ${reporter}`);
        res.status(200).json({ message: "Post reported successfully. It is now under review." });

    } catch (error) {
        console.error(`Error reporting post with id ${postId}:`, error);
        if (error.status === 404) {
            return res.status(404).json({ message: `Post with id ${postId} not found` });
        }
        return res.status(500).json({ message: "Error reporting post: " + error.message });
    }
});


app.get('/reported-posts', async (req, res) => {
    const userPersona = req.headers['user-persona'];

    if (userPersona !== 'Moderator') {
        console.log(`Unauthorized attempt to access reported posts by user with persona: ${userPersona}`);
        return res.status(403).json({ message: "Forbidden: Only Moderators can access reported posts." });
    }
    console.log('Received request to get all reported posts');

    try {
        const body = await elasticClient.search({
            index: ELASTIC_INDEX,
            query: {
                bool: {
                    filter: [
                        { term: { isReported: true } }
                    ]
                }
            }
        });

        const reportedPosts = body.hits.hits.map(hit => hit._source);
        console.log(`Found ${reportedPosts.length} reported posts`);
        res.status(200).json(reportedPosts);
    } catch (error) {
        console.error("Error retrieving reported posts:", error);
        res.status(500).json({ message: "Error retrieving reported posts: " + error.message });
    }
});

app.post('/posts/:id/review', async (req, res) => {

    const userPersona = req.headers['user-persona'];

    if (userPersona !== 'Moderator') {
        console.log(`Unauthorized attempt to review post by user with persona: ${userPersona}`);
        return res.status(403).json({ message: "Forbidden: Only Moderators can access reported posts." });
    }
    const postId = req.params.id;
    const { action } = req.body;

    console.log(`Received request to review post with id: ${postId}, action: ${action}`);

    try {

        if (action === 'approve') {
            console.log(`Post with id ${postId} marked for deletion by moderator.`);

            try {
                await deletePostFromIndex(postId);
            } catch (error) {
                console.error("Failed to delete post from Elasticsearch:", error);
            }

            res.status(200).json({ message: `Post with id ${postId} marked for deletion.` });
            return;

        } else if (action === 'reject') {

            const getResponse = await elasticClient.get({
                index: ELASTIC_INDEX,
                id: postId,
            });

            const post = getResponse._source;

            if (!post) {
                console.log(`Report post failed: Post with id ${postId} not found`);
                return res.status(404).json({ message: `Post with id ${postId} not found` });
            }
            post.isReported = false;
            post.reports = [];

            console.log(`Post with id ${postId} review rejected by moderator.`);
            try {
                await updatePostInIndex(post)
            } catch (error) {
                console.error("Failed to update post in Elasticsearch:", error);
            }

            res.status(200).json({ message: `Post with id ${postId} review rejected.` });
            return;
        } else {
            console.log(`Review post failed: Invalid action: ${action}`);
            return res.status(400).json({ message: `Invalid action: ${action}.  Must be 'approve' or 'reject'.` });
        }
    } catch (error) {
        console.error(`Error reviewing post with id ${postId}:`, error);
        res.status(500).json({ message: "Error reviewing post: " + error.message });
    }
});

app.get('/search', async (req, res) => {
    const searchTerm = req.query.q;
    console.log("serach==============", searchTerm);
    if (!searchTerm) {
        return res.status(400).json({ message: "Search term 'q' is required." });
    }

    try {
        const body = await elasticClient.search({
            index: ELASTIC_INDEX,
            query: {
                multi_match: {
                    query: searchTerm,
                    fields: ["title", "content"]
                }
            }
        });

        if (body && body.hits && body.hits.hits) {
            const posts = body.hits.hits.map(hit => hit._source);
            console.log(posts);
            res.json({ message: "Search results", posts });
        } else {
            console.warn('No posts found or unexpected Elasticsearch response format.');
            res.json({ message: "No posts found" });
        }
    } catch (error) {
        console.error('Error searching for posts in Elasticsearch:', error);
        return res.status(500).json({ message: "Error searching posts: " + error.message });
    }
});

app.get('/proxy-serpapi', async (req, res) => {
    const { q } = req.query;
    const SERPAPI_KEY = '3a57505961f0168c22ce9b2aac99d4282db0c954bd236ed2e93cf080d5325ea8';
    console.log(q);
    try {
      const response = await axios.get(`https://serpapi.com/search?engine=google&q=${encodeURIComponent(q)}&api_key=${SERPAPI_KEY}`);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

httpServer.listen(PORT, () => {  
    console.log(`Backend running on: http://localhost:${PORT}`);
});