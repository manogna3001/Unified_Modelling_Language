// --- START OF FILE Blog.js ---
import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Grid from '@mui/material/Grid';
import Container from '@mui/material/Container';
import GitHubIcon from '@mui/icons-material/GitHub';
import FacebookIcon from '@mui/icons-material/Facebook';
import XIcon from '@mui/icons-material/X';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Header from './Header';
import Main from './Main';
import Sidebar from './Sidebar';
import Footer from './Footer';
import Login from './Login';
import Signup from './Signup';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { UserProvider, UserContext } from './UserContext';
import ProtectedRoute from './ProtectedRoute';
import Typography from '@mui/material/Typography';
import { useContext, useCallback, useState, useEffect } from 'react';
import { Divider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import CreatePost from './CreatePost';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardActionArea';
import CardActionArea from '@mui/material/CardActionArea';
import Reply from './Reply';
import Markdown from './Markdown';
import AdminPanel from './AdminPanel';
import ModeratorPanel from './ModeratorPanel';

export const sections = [
    { title: 'Academic Resources', url: '#', score: 5 },
    { title: 'Career Services', url: '#', score: 3 },
    { title: 'Campus', url: '#', score: 2 },
    { title: 'Culture', url: '#', score: 4 },
    { title: 'Local Community Resources', url: '#', score: 1 },
    { title: 'Social', url: '#', score: 2 },
    { title: 'Sports', url: '#', score: 3 },
    { title: 'Health and Wellness', url: '#', score: 5 },
    { title: 'Technology', url: '#', score: 4 },
    { title: 'Travel', url: '#', score: 1 },
    { title: 'Alumni', url: '#', score: 2 },
];

const sidebar = {
    title: 'About',
    description:
        'The School/Department blog is a space for students, faculty, and alumni to connect, share their experiences, and celebrate our vibrant community. We highlight student achievements, faculty research, and the unique culture that makes it such a special place.',
    archives: [
        { title: 'March 2020', url: '#' },
        { title: 'February 2020', url: '#' },
    ],
    social: [
        { name: 'GitHub', icon: GitHubIcon },
        { name: 'X', icon: XIcon },
        { name: 'Facebook', icon: FacebookIcon },
    ],
};

const defaultTheme = createTheme();

function LoginRoute() {
    const { user, isLoading } = useContext(UserContext);

    if (isLoading) {
        return <Typography>Loading...</Typography>;
    }
    if (user) {
        return <Navigate to="/" replace />;
    }
    return <Login />;
}

const BlogComponent = () => {
    const { getPosts, loadData, isLoading, user } = useContext(UserContext);
    const [posts, setPosts] = React.useState([]);
    const [users, setUsers] = React.useState([]);
    const [featuredPosts, setFeaturedPosts] = React.useState([]);
    const [mainPost, setMainPost] = React.useState(null);
    const [expandedPosts, setExpandedPosts] = React.useState({});
    const [selectedAdminAction, setSelectedAdminAction] = useState('');
    const { title: sectionTitle } = useParams();

    const togglePost = (postId) => {
        setExpandedPosts(prevState => ({
            ...prevState,
            [postId]: !prevState[postId],
        }));
    };

    const normalizeString = useCallback((str) => {
        return str.replace(/\s+/g, ' ').trim().toLowerCase();
    }, []);

    const filteredPosts = useCallback(
        (allPosts, normalizedTitle) => {
            return allPosts.filter((post) => {
                const normalizedCategory = normalizeString(post.category);
                return normalizedCategory === normalizedTitle;
            });
        },
        [normalizeString]
    );

    React.useEffect(() => {
        const fetchPosts = async () => {
            try {
                await loadData();
                let allPosts = getPosts();

                if (sectionTitle) {
                    const normalizedTitle = normalizeString(sectionTitle);
                    allPosts = filteredPosts(allPosts, normalizedTitle);
                }

                allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                if (!sectionTitle) {
                    // Home page: separate featured and remaining posts
                    setMainPost(allPosts[0] || null);
                    setFeaturedPosts(allPosts.slice(1, 3));
                    setPosts(allPosts.slice(3));
                } else {
                    // Category page: all posts in a list
                    setPosts(allPosts);
                    setMainPost(null);
                    setFeaturedPosts([]);
                }

            } catch (error) {
                console.error('Error loading posts:', error);
            }
        };
        fetchPosts();
    }, [loadData, getPosts, sectionTitle, filteredPosts, normalizeString]);

   useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('http://localhost:5000/users');
                if (response.ok) {
                    const data = await response.json();
                    setUsers(data);
                } else {
                    console.error('Error fetching users:', response.statusText);
                    alert('Error fetching users.');
                }
            } catch (error) {
                console.error('Error fetching users:', error);
                alert('Error fetching users.');
            }
        };

        if (user && user.persona === 'Administrator') {
            fetchUsers();
        }
    }, [user]);

    const handleEnableDisable = async (username, isEnabled) => {  // Function Definition
        try {
            const response = await fetch(`http://localhost:5000/users/${username}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isEnabled: !isEnabled }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setUsers(prevUsers =>
                prevUsers.map(u =>
                    u.username === username ? { ...u, isEnabled: !isEnabled } : u
                )
            );
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    };

    const handleAdminActionChange = (event) => {
        setSelectedAdminAction(event.target.value);
    };

    if (isLoading) {
        return <Typography>Loading...</Typography>;
    }

    const cardStyle = (imageURL) => ({
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 300,
        backgroundImage: imageURL ? `url(${imageURL})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        overflow: 'hidden',
    });

    const cardContentStyle = {
        position: 'relative',
        zIndex: 1,
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    };

    return (
        <main>
            {!sectionTitle && mainPost && (
                // Show featured post only on the home page
                <Grid container spacing={4}>
                    <Grid item xs={12}>
                        <CardActionArea component="div" onClick={() => togglePost(mainPost.id)}>
                            <Card sx={cardStyle(mainPost.imageURL)}>
                                <CardContent sx={cardContentStyle}>
                                    <Typography component="h2" variant="h5">
                                        {mainPost.title}
                                    </Typography>
                                    <Typography variant="subtitle1" color="inherit">
                                        By {mainPost.author} on {mainPost.timestamp}
                                    </Typography>
                                    {(mainPost.isUnderReview && (!user || user.persona !== 'Moderator')) ? (
                                        <Typography color="warning">This blog is currently under review.</Typography>
                                    ) : (
                                        expandedPosts[mainPost.id] && (
                                            <>
                                                <Markdown className="markdown">{mainPost.content}</Markdown>
                                                {user && (
                                                    <Reply postId={mainPost.id} isUnderReview={mainPost.isUnderReview} />
                                                )}
                                            </>
                                        )
                                    )}
                                </CardContent>
                            </Card>
                        </CardActionArea>
                        <Divider sx={{ my: 3 }} />
                    </Grid>
                </Grid>
            )}

            {!sectionTitle && featuredPosts.length > 0 && (
                // Show featured posts only on the home page
                <Grid container spacing={4}>
                    {featuredPosts.map((post) => (
                        <Grid item xs={12} md={6} key={post.id}>
                            <CardActionArea component="div" onClick={() => togglePost(post.id)}>
                                <Card sx={cardStyle(post.imageURL)}>
                                    <CardContent sx={cardContentStyle}>
                                        <Typography component="h2" variant="h5">
                                            {post.title}
                                        </Typography>
                                        <Typography variant="subtitle1" color="inherit">
                                            By {post.author} on {post.timestamp}
                                        </Typography>
                                         {(post.isUnderReview && (!user || user.persona !== 'Moderator')) ? (
                                            <Typography color="warning">This blog is currently under review.</Typography>
                                        ) : (
                                            expandedPosts[post.id] && (
                                                <>
                                                    <Markdown className="markdown">{post.content}</Markdown>
                                                    {user && (
                                                       <Reply postId={post.id} isUnderReview={post.isUnderReview} />
                                                    )}
                                                </>
                                            )
                                        )}
                                    </CardContent>
                                </Card>
                            </CardActionArea>
                            <Divider sx={{ my: 3 }} />
                        </Grid>
                    ))}
                </Grid>
            )}
            <Grid container spacing={5} sx={{ mt: 3 }}>
                <Grid item xs={12} md={8}>
                    <Main title={sectionTitle || "From the firehose"} posts={posts} />
                    {user && (user.persona === 'Administrator') && (
                        <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
                            <FormControl fullWidth>
                                <InputLabel id="admin-actions-label">Admin Controls</InputLabel>
                                <Select
                                    labelId="admin-actions-label"
                                    id="admin-actions"
                                    value={selectedAdminAction}
                                    label="Admin Actions"
                                    onChange={handleAdminActionChange}
                                    style={{ marginBottom: '10px' }}
                                >
                                    <MenuItem value="">Select Action</MenuItem>
                                    <MenuItem value="userManagement">User Management</MenuItem>
                                </Select>
                            </FormControl>
                            {selectedAdminAction === 'userManagement' && (
                                <div style={{ marginTop: '20px' }}>
                                    <AdminPanel users={users} handleEnableDisable={handleEnableDisable} />
                                </div>
                            )}
                        </div>
                    )}
                    {user && (user.persona === 'Moderator') && (
                        <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
                            <ModeratorPanel />
                        </div>
                    )}
                </Grid>
                <Sidebar title={sidebar.title} description={sidebar.description} archives={sidebar.archives} social={sidebar.social} />
            </Grid>
        </main>
    );
};

export default function Blog() {
    return (
        <BrowserRouter>
            <UserProvider>
                <ThemeProvider theme={defaultTheme}>
                    <CssBaseline />
                    <Container maxWidth="lg">
                        <Header title="Blog" sections={sections} />
                        <Routes>
                            <Route path="/login" element={<LoginRoute />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route path="/create-post" element={<ProtectedRoute><CreatePost sections={sections} /></ProtectedRoute>} />
                            <Route path="/" element={<ProtectedRoute><BlogComponent /></ProtectedRoute>} />
                            <Route path="/dashboard" element={<ProtectedRoute><BlogComponent /></ProtectedRoute>} />
                            <Route path="/:title" element={<ProtectedRoute><BlogComponent /></ProtectedRoute>} />
                            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                        </Routes>
                        <Footer title="Footer" description="Something here to give the footer a purpose!" />
                    </Container>
                </ThemeProvider>
            </UserProvider>
        </BrowserRouter>
    );
}