// --- START OF FILE Main.js ---
import * as React from 'react';
import PropTypes from 'prop-types';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { Divider } from '@mui/material';
import Markdown from './Markdown';
import { useContext } from 'react';
import { UserContext } from './UserContext';
import Button from '@mui/material/Button';
import Reply from './Reply';
import axios from 'axios';


function Main(props) {
    const { title, posts } = props;
    const { user, reportPost } = useContext(UserContext);
    const [expandedPosts, setExpandedPosts] = React.useState({});

    const handleDeletePost = async (postId) => {
        try {
            const response = await axios.delete(`http://localhost:5000/posts/${postId}`);
            if (response.status === 200) {
                alert('Post deleted!');
                window.location.reload();
            } else {
                alert('Error deleting post.');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Error deleting post.');
        }
    };

    const togglePost = (postId) => {
        setExpandedPosts(prevState => ({
            ...prevState,
            [postId]: !prevState[postId],
        }));
    };

    const handleReportClick = (postId) => {
        if (user) {
            reportPost(postId, user.username, "No reason provided");
            alert('Post reported!');
        } else {
            alert('Please log in to report posts.');
        }
    };

    return (
        <Grid
            item
            xs={12}
            md={8}
            sx={{
                '& .markdown': {
                    py: 3,
                },
            }}
        >
            <Typography variant="h6" gutterBottom>
                {title}
            </Typography>
            <Divider />

            {posts && posts.length === 0 ? (
                <Typography>No blog posts available. Be the first to create one!</Typography>
            ) : (
                posts.map((post) => (
                    <div key={post.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px' }}>
                        <Typography
                            variant="h6"
                            style={{ cursor: 'pointer' }}
                            onClick={() => togglePost(post.id)}
                        >
                            {post.title}
                        </Typography>
                        <Typography variant="subtitle2">
                            By {post.author} 
                        </Typography>

                        {post.isUnderReview && user && user.persona !== 'Moderator' ? (
                            <Typography color="warning">This blog is currently under review.</Typography>
                        ) : (
                            expandedPosts[post.id] && (
                                <div>
                                    {post.imageURL && (
                                        <img src={post.imageURL} alt={post.title} style={{ maxWidth: '100%', height: 'auto' }} />
                                    )}
                                    {post.externalLink && (
                                        <Typography variant="body2">
                                            <a href={post.externalLink} target="_blank" rel="noopener noreferrer">
                                                {post.externalLink}
                                            </a>
                                        </Typography>
                                    )}
                                    <Markdown className="markdown">{post.content}</Markdown>

                                    {user && (
                                        <>
                                            <Reply postId={post.id} isUnderReview={post.isUnderReview} />
                                            {user.persona !== 'Moderator' && (
                                                <Button variant="outlined" color="error" onClick={() => handleReportClick(post.id)}>
                                                    Report Post
                                                </Button>
                                            )}
                                            {user.persona === 'Moderator' && (
                                                <Button variant="outlined" color="secondary" onClick={() => handleDeletePost(post.id)}>
                                                    Delete Post
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )
                        )}

                        {expandedPosts[post.id] && (
                            <div style={{ marginTop: '10px' }}>
                                <h4>Replies:</h4>
                                {post.replies && post.replies.length > 0 ? (
                                    post.replies.map((reply) => (
                                        <div key={reply.id} style={{ borderLeft: '3px solid #ccc', paddingLeft: '10px', marginTop: '5px' }}>
                                            <strong>{reply.replyAuthor}:</strong> {reply.replyText}
                                        </div>
                                    ))
                                ) : (
                                    <Typography>No replies yet.</Typography>
                                )}
                            </div>
                        )}
                        <Divider sx={{ my: 3 }} />
                    </div>
                ))
            )}
        </Grid>
    );
}

Main.propTypes = {
    title: PropTypes.string.isRequired,
    posts: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default Main;