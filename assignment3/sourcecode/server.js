const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;

const DATA_FILE = path.join(__dirname, 'components', 'data.json');
const SALT_ROUNDS = 10;

app.use(cors());
app.use(bodyParser.json());
app.use(serveStatic(path.join(__dirname, 'public'), { 'static': ['js', 'css'] }));

let cachedData = { users: [], posts: [] };

const loadData = async () => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        cachedData = JSON.parse(data);
        console.log("Data loaded into memory");
        return cachedData;
    } catch (err) {
        console.error('Error reading data:', err);
        if (err.code === 'ENOENT') {
            console.log("data.json not found. Creating a new one...");
            const initialData = JSON.stringify({ users: [], posts: [] }, null, 2);
            try {
                await fs.writeFile(DATA_FILE, initialData);
                cachedData = { users: [], posts: [] };
                console.log("New data.json created");
                return cachedData;
            } catch (writeErr) {
                console.error("Error creating data.json:", writeErr);
                throw ({ users: [], posts: [] });
            }
        } else {
            throw ({ users: [], posts: [] });
        }
    }
};

const saveData = async (data) => {
    try {
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(DATA_FILE, jsonData, 'utf8');
        console.log("Data successfully written to:", DATA_FILE);
        cachedData = JSON.parse(jsonData);
    } catch (err) {
        console.error("Error writing to data.json:", err);
        throw err;
    }
};

(async () => {
    try {
        cachedData = await loadData();
        console.log("Initial data loaded");
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
            return res.status(500).json({ message: "Server error: Data not loaded." });
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
            return res.status(500).json({ message: "Server error: Data not loaded." });
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

app.post('/create-post', async (req, res) => {
    console.log("Received create post request:", req.body);
    const { title, content, category, author, timestamp, replies, categoryScore, imageURL, externalLink } = req.body;

    if (!title || !content || !category || !author || !timestamp) {
        console.log("Post creation failed: Missing required fields");
        return res.status(400).json({ message: "Missing required fields (title, content, category, author, timestamp)." });
    }

    const newPost = {
        id: uuidv4(),
        title: title.trim(),
        content: content.trim(),
        category: category.trim(),
        author: author.trim(),
        timestamp: timestamp.trim(),
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
        if (!cachedData) {
            console.error("ERROR: Cached data is not available.");
            return res.status(500).json({ message: "Server error: Data not loaded." });
        }

        cachedData.posts = [...cachedData.posts, newPost];

        await saveData(cachedData);
        console.log("Post saved successfully:", newPost);
        res.status(201).json({ message: "Post created successfully", post: newPost });
    } catch (err) {
        console.error("Create post error:", err);
        res.status(500).json({ message: "Post creation failed:" + err.message });
    }
});

app.get('/db', (req, res) => {
    if (!cachedData) {
        console.error("ERROR: Cached data is not available.");
        return res.status(500).json({ message: "Server error: Data not loaded." });
    }
    res.json(cachedData);
});

app.get('/users', async (req, res) => {
  console.log('Get all users request');
  try {
    if (!cachedData) {
      console.error("ERROR: Cached data is not available.");
      return res.status(500).json({ message: "Server error: Data not loaded." });
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
            return res.status(500).json({ message: "Server error: Data not loaded." });
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

app.get('/posts/:category', async (req, res) => {
    const category = req.params.category;
    if (!cachedData) {
        console.error("ERROR: Cached data is not available.");
        return res.status(500).json({ message: "Server error: Data not loaded." });
    }
    const filteredPosts = cachedData.posts.filter(post => {
        return post.category.toLowerCase() === category.toLowerCase();
    });
    res.json(filteredPosts);
});

app.delete('/posts/:id', async (req, res) => {
    const postId = req.params.id;
    console.log(`Received request to delete post with id: ${postId}`);

    try {
        if (!cachedData) {
            console.error("ERROR: Cached data is not available.");
            return res.status(500).json({ message: "Server error: Data not loaded." });
        }

        const initialPostLength = cachedData.posts.length;
        cachedData.posts = cachedData.posts.filter(post => post.id !== postId);

        if (cachedData.posts.length === initialPostLength) {
            console.log(`Delete post failed: Post with id ${postId} not found`);
            return res.status(404).json({ message: `Post with id ${postId} not found` });
        }
        await saveData(cachedData);

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
        if (!cachedData) {
            console.error("ERROR: Cached data is not available.");
            return res.status(500).json({ message: "Server error: Data not loaded." });
        }

        const postIndex = cachedData.posts.findIndex(post => post.id === postId);

        if (postIndex === -1) {
            console.log(`Add reply failed: Post with id ${postId} not found`);
            return res.status(404).json({ message: `Post with id ${postId} not found` });
        }

        const newReply = {
            id: uuidv4(),
            replyText: replyText.trim(),
            replyAuthor: replyAuthor.trim()
        };

        cachedData.posts[postIndex].replies = [...(cachedData.posts[postIndex].replies || []), newReply];

        await saveData(cachedData);

        console.log(`Reply added to post with id ${postId} successfully`);
        res.status(201).json({ message: "Reply added successfully", reply: newReply });
    } catch (error) {
        console.error(`Error adding reply to post with id ${postId}:`, error);
        res.status(500).json({ message: "Error adding reply: " + error.message });
    }
});

app.post('/posts/:id/report', async (req, res) => {
    const postId = req.params.id;
    const { reporter } = req.body;

    console.log(`Received request to report post with id: ${postId} from user: ${reporter}`);

    try {
        if (!cachedData) {
            console.error("ERROR: Cached data is not available.");
            return res.status(500).json({ message: "Server error: Data not loaded." });
        }

        const postIndex = cachedData.posts.findIndex(post => post.id === postId);

        if (postIndex === -1) {
            console.log(`Report post failed: Post with id ${postId} not found`);
            return res.status(404).json({ message: `Post with id ${postId} not found` });
        }

        const newReport = {
            reporter: reporter.trim(),
            timestamp: new Date().toISOString()
        };

        cachedData.posts[postIndex].reports = [...(cachedData.posts[postIndex].reports || []), newReport];
        cachedData.posts[postIndex].isReported = true;
        cachedData.posts[postIndex].isUnderReview = true;

        await saveData(cachedData);

        console.log(`Post with id ${postId} reported successfully by user: ${reporter}`);
        res.status(200).json({ message: "Post reported successfully" });
    } catch (error) {
        console.error(`Error reporting post with id ${postId}:`, error);
        res.status(500).json({ message: "Error reporting post: " + error.message });
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
        if (!cachedData) {
            console.error("ERROR: Cached data is not available.");
            return res.status(500).json({ message: "Server error: Data not loaded." });
        }

        const reportedPosts = cachedData.posts.filter(post => post.isReported);
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
        if (!cachedData) {
            console.error("ERROR: Cached data is not available.");
             return res.status(500).json({ message: "Server error: Data not loaded." });
        }

        const postIndex = cachedData.posts.findIndex(post => post.id === postId);

        if (postIndex === -1) {
            console.log(`Review post failed: Post with id ${postId} not found`);
            return res.status(404).json({ message: `Post with id ${postId} not found` });
        }

        if (action === 'approve') {
            console.log(`Post with id ${postId} marked for deletion by moderator.`);

            cachedData.posts = cachedData.posts.filter(post => post.id !== postId);
          
            await saveData(cachedData);
            res.status(200).json({ message: `Post with id ${postId} marked for deletion.` });
            return;

        } else if (action === 'reject') {
            cachedData.posts[postIndex].isReported = false;
            cachedData.posts[postIndex].isUnderReview = false;
            cachedData.posts[postIndex].reports = [];

            console.log(`Post with id ${postId} review rejected by moderator.`);
            await saveData(cachedData);
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

app.listen(PORT, () => {
    console.log(`Backend running on: http://localhost:${PORT}`);
});