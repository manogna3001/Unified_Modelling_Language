import React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

function SearchResultsPopup({ open, onClose, results }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle></DialogTitle>
            <DialogContent>
                {results && results.length > 0 ? (
                    <List>
                        {results.map(post => (
                            <ListItem key={post.id} alignItems="flex-start">
                                <ListItemText
                                    primary={
                                        <Typography variant="h6" component="div">
                                            {post.title}
                                        </Typography>
                                    }
                                    secondary={
                                        <React.Fragment>
                                            <Typography
                                                sx={{ display: 'inline' }}
                                                component="span"
                                                variant="body2"
                                                color="text.primary"
                                            >
                                                By {post.author} 
                                            </Typography>

                                            <Typography variant="body1" style={{ marginTop: '8px' }}>
                                                {post.content}
                                            </Typography>

                                            {post.imageURL && (
                                                <Box mt={1}>
                                                    <img src={post.imageURL} alt="Post Image" style={{ maxWidth: '100%', maxHeight: '200px' }} />
                                                </Box>
                                            )}

                                            {post.externalLink && (
                                                <Box mt={1}>
                                                    <Link href={post.externalLink} target="_blank" rel="noopener noreferrer">
                                                        External Link
                                                    </Link>
                                                </Box>
                                            )}

                                            <Divider style={{ marginTop: '16px', marginBottom: '8px' }} />

                                            <Typography variant="subtitle2">Replies:</Typography>
                                            {post.replies && post.replies.length > 0 ? (
                                                <List dense>
                                                    {post.replies.map((reply, index) => (
                                                        <ListItem key={index}>
                                                            <ListItemText primary={`${reply.replyAuthor}: ${reply.replyText}`} /> 
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            ) : (
                                                <Typography variant="body2">No replies yet.</Typography>
                                            )}
                                        </React.Fragment>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography>No results found.</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}

SearchResultsPopup.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    results: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
        category: PropTypes.string.isRequired,
        author: PropTypes.string.isRequired,
        replies: PropTypes.arrayOf(PropTypes.shape({ 
            replyText: PropTypes.string.isRequired,
            replyAuthor: PropTypes.string.isRequired,
            id: PropTypes.string.isRequired,
        })),
        categoryScore: PropTypes.number,
        imageURL: PropTypes.string,
        externalLink: PropTypes.string,
        reports: PropTypes.array,
        isReported: PropTypes.bool,
        isUnderReview: PropTypes.bool,
        isApproved: PropTypes.bool
    })),
};
export default SearchResultsPopup;