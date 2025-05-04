// ReportedPosts.js
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from './UserContext';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import axios from 'axios';

const ReportedPosts = () => {
    const { user } = useContext(UserContext);
    const [reportedPosts, setReportedPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReportedPosts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axios.get('http://localhost:5000/reported-posts', {
                    headers: {
                        'user-persona': user.persona
                    }
                });
                setReportedPosts(response.data);
            } catch (error) {
                console.error('Error fetching reported posts:', error);
                setError('Failed to load reported posts.');
            } finally {
                setIsLoading(false);
            }
        };

        if (user && user.persona === 'Moderator') {
            fetchReportedPosts();
        }
    }, [user]);

    const handleReviewPost = async (postId, action) => {
        try {
            await axios.post(`http://localhost:5000/posts/${postId}/review`, { action }, {
                headers: {
                    'user-persona': user.persona
                }
            });
            const response = await axios.get('http://localhost:5000/reported-posts', {
                headers: {
                    'user-persona': user.persona
                }
            });
            setReportedPosts(response.data);
        } catch (error) {
            console.error('Error reviewing reported post:', error);
            setError('Failed to review reported post.');
        }
    };

    if (isLoading) {
        return <Typography>Loading reported posts...</Typography>;
    }

    if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    return (
        <>
            <h3>Reported Posts</h3>
            <List>
                {reportedPosts.map((post) => (
                    <ListItem key={post.id} style={{ borderBottom: '1px solid #eee', padding: '10px' }}>
                        <ListItemText
                            primary={post.title}
                            secondary={
                                <>
                                    {`Reported by: ${post.reports.map(report => report.reporter).join(', ')}`}
                                    <br />
                                    {`Under Review: ${post.isUnderReview ? 'Yes' : 'No'}`}
                                </>
                            }
                        />
                        <ListItemSecondaryAction>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => handleReviewPost(post.id, 'reject')}
                                style={{ marginRight: '10px' }}
                            >
                                Reject
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => handleReviewPost(post.id, 'approve')}
                            >
                                Approve
                            </Button>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        </>
    );
};

export default ReportedPosts;