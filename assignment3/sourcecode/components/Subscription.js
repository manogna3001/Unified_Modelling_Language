// --- START OF FILE Subscription.js ---
import React, { useContext, useState } from 'react';
import { UserContext } from './UserContext';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

const Subscription = ({ topics }) => {
    const { subscriptions, subscribe, unsubscribe } = useContext(UserContext);
    const [selectedTopic, setSelectedTopic] = useState('');

    return (
        <div>
            <Typography variant="h6">Manage Subscriptions</Typography>

            <Select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                displayEmpty
            >
                <MenuItem value="" disabled>Select a topic</MenuItem>
                {topics.map((topic) => (
                    <MenuItem key={topic} value={topic}>{topic}</MenuItem>
                ))}
            </Select>

            <Button
                onClick={() => subscribe(selectedTopic)}
                disabled={!selectedTopic || subscriptions.includes(selectedTopic)}
                variant="contained"
                color="primary"
            >
                Subscribe
            </Button>

            <Button
                onClick={() => unsubscribe(selectedTopic)}
                disabled={!selectedTopic || !subscriptions.includes(selectedTopic)}
                variant="contained"
                color="secondary"
                style={{ marginLeft: '10px' }}
            >
                Unsubscribe
            </Button>

            <Typography variant="subtitle1" style={{ marginTop: '20px' }}>
                Your Subscriptions:
            </Typography>
            <ul>
                {subscriptions.length > 0 ? (
                    subscriptions.map((sub) => (
                        <li key={sub}>{sub}</li>
                    ))
                ) : (
                    <Typography>No subscriptions yet.</Typography>
                )}
            </ul>
        </div>
    );
};

export default Subscription;