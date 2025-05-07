import React, { useState, useContext } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { UserContext } from './UserContext';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';

const Reply = ({ postId, isUnderReview }) => {
    const [replyText, setReplyText] = useState('');
    const [useOpenAI, setUseOpenAI] = useState(false);
    const [openaiPrompt, setOpenaiPrompt] = useState('');
    const [tone, setTone] = useState('');
    const { user, addReply, posts } = useContext(UserContext); 
    const [isLoading, setIsLoading] = useState(false);

    const handleReplyChange = (event) => {
        setReplyText(event.target.value);
    };

    const handleOpenaiPromptChange = (event) => {
        setOpenaiPrompt(event.target.value);
    };

    const handleToneChange = (event) => {
        setTone(event.target.value);
    };

    const handleOpenAIChange = (event) => {
        setUseOpenAI(event.target.checked);
        setReplyText('');
    };


    const handleGenerateReply = async () => {
        setIsLoading(true);

        const fullPrompt = `Transform the short phrase "${openaiPrompt}" into a longer, more detailed and engaging reply that demonstrates a ${tone} tone.  Do *not* simply provide feedback or thank the author. Elaborate, expand, and rephrase the text into a new reply that still captures the text in less than 40 words.`;

        try {
            const response = await axios.post(`http://localhost:5000/posts/${postId}/openai/generate-reply`, { 
                prompt: fullPrompt,
                tone: tone,
            });

            if (response.data && response.data.reply) {
                setReplyText(response.data.reply.replyText);
            } else {
                console.error('Error creating OpenAI reply:', response);
                alert('Error creating OpenAI reply.');
                setReplyText('Error generating reply.');
            }

        } catch (error) {
            console.error('Error creating OpenAI reply:', error);
            alert('Error creating OpenAI reply: ' + error.message);
            setReplyText('Error generating reply.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReplySubmit = async (event) => {
        event.preventDefault();

        if (!user) {
            alert('Please log in to reply to this post.');
            return;
        }

        if (!replyText.trim()) {
            alert("Reply cannot be empty.");
            return;
        }

        try {
            await addReply(postId, replyText, user.username);

            setReplyText('');

        } catch (error) {
            console.error("There was an error when replying", error);
        }
    };

    if (!user) {
        return <Typography>Please log in to reply to this post.</Typography>;
    }

    if (isUnderReview) {
        return <Typography color="warning">Replies are disabled because this post is under review.</Typography>;
    }

    return (
        <form onSubmit={handleReplySubmit}>
            <Typography variant="subtitle1">
                {user.username} is replying...
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography component="label">
                    Use OpenAI
                </Typography>
                <Switch
                    checked={useOpenAI}
                    onChange={handleOpenAIChange}
                    inputProps={{ 'aria-label': 'Use OpenAI' }}
                />
            </Box>

            {useOpenAI && (
                <>
                    <TextField
                        label="Enter a prompt for OpenAI..."
                        value={openaiPrompt}
                        onChange={handleOpenaiPromptChange}
                        fullWidth
                        margin="normal"
                        multiline
                        rows={4}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="tone-label">Tone</InputLabel>
                        <Select
                            labelId="tone-label"
                            id="tone"
                            value={tone}
                            label="Tone"
                            onChange={handleToneChange}
                        >
                            <MenuItem value="">None</MenuItem>
                            <MenuItem value="Formal">Formal</MenuItem>
                            <MenuItem value="Informal">Informal</MenuItem>
                            <MenuItem value="Friendly">Friendly</MenuItem>
                            <MenuItem value="Sarcastic">Sarcastic</MenuItem>
                        </Select>
                    </FormControl>
                    
                    <Button variant="outlined" onClick={handleGenerateReply} disabled={!openaiPrompt.trim() || isLoading}>
                        {isLoading ? <CircularProgress size={24} /> : "Generate Reply"}
                    </Button>
                </>
            )}

            <TextField
                label="Add a reply..."
                value={replyText}
                onChange={handleReplyChange}
                fullWidth
                margin="normal"
                required
                multiline
                rows={4}
                disabled={isLoading}
            />

            <Button type="submit" variant="contained" color="primary" disabled={!replyText.trim() || isLoading}>
                Reply
            </Button>
        </form>
    );
};

export default Reply;