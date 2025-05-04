import React, { useState, useContext } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './UserContext';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';

const CreatePost = ({ sections }) => {
    const { user, addPost } = useContext(UserContext);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [categoryScore, setCategoryScore] = useState(null);
    const [imageURL, setImageURL] = useState(''); 
    const [externalLink, setExternalLink] = useState(''); 

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            alert('You must be logged in to create a post.');
            return;
        }

        if (!title || !content || !category) {
            alert('Title, Content and Category are required!');
            return;
        }

        const newPost = {
            title,
            content,
            category,
            author: user.username,
            timestamp: new Date().toLocaleString(),
            replies: [],
            categoryScore: categoryScore,
            imageURL: imageURL || '', 
            externalLink: externalLink || '', 
        };
console.log("New post values that is gonna be loaded: " + JSON.stringify(newPost, null, 2));
        await addPost(newPost);
        alert('Post created!');
        navigate('/');
    };

    const handleCategoryChange = (e) => {
        const selectedCategory = e.target.value;
        setCategory(selectedCategory);

        const selectedSection = sections.find(section => section.title === selectedCategory);
        if (selectedSection) {
            setCategoryScore(selectedSection.score);
        } else {
            setCategoryScore(null);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Create a New Post</h2>
            <TextField
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                margin="normal"
                required
            />
            <TextField
                label="Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                fullWidth
                margin="normal"
                multiline
                rows={4}
                required
            />
            <TextField
                label="Image URL"
                value={imageURL}
                onChange={(e) => setImageURL(e.target.value)}
                fullWidth
                margin="normal"
                helperText="Optional: Add an image to your post"
            />
            <TextField
                label="External Link"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                fullWidth
                margin="normal"
                helperText="Optional: Add an external link"
            />
            <FormControl fullWidth margin="normal">
                <InputLabel id="category-label">Category</InputLabel>
                <Select
                    labelId="category-label"
                    id="category"
                    value={category}
                    label="Category"
                    onChange={handleCategoryChange}
                    required
                    MenuProps={{
                        PaperProps: {
                            style: {
                                maxHeight: 200, // Adjust the max height as needed
                            },
                        },
                    }}
                >
                    {sections.map((section) => (
                        <MenuItem key={section.title} value={section.title}>
                            {section.title}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {categoryScore !== null && (
                <Typography variant="body2">Category Score: {categoryScore}</Typography>
            )}

            <Button type="submit" variant="contained" color="primary">
                Create Post
            </Button>
        </form>
    );
};

CreatePost.propTypes = {
    sections: PropTypes.arrayOf(
        PropTypes.shape({
            title: PropTypes.string.isRequired,
            url: PropTypes.string.isRequired,
            score: PropTypes.number.isRequired,
        })
    ).isRequired,
};

export default CreatePost;