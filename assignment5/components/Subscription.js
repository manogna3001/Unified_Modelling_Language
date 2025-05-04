import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from './UserContext';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

const Subscription = ({ topics }) => {
    const { user } = useContext(UserContext);
    const [subscriptions, setSubscriptions] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState('');

    useEffect(() => {
        fetchSubscriptions(); 
    }, [user]);

    const subscribe = async (topic) => {
        try {
            const response = await fetch(`http://localhost:5000/subscribe/${topic}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username }),
            });

            if (response.ok) {
                console.log(`Subscribed to ${topic} successfully`);
                await fetchSubscriptions(); 
            } else {
                console.error(`Failed to subscribe to ${topic}:`, response.status);
                
            }
        } catch (error) {
            console.error("Error subscribing:", error);
        }
    };

    const unsubscribe = async (topic) => {
        try {
            const response = await fetch(`http://localhost:5000/unsubscribe/${topic}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username }),
            });

            if (response.ok) {
                console.log(`Unsubscribed from ${topic} successfully`);
                await fetchSubscriptions(); 
            } else {
                console.error(`Failed to unsubscribe from ${topic}:`, response.status);
            }
        } catch (error) {
            console.error("Error unsubscribing:", error);
        }
    };

    const fetchSubscriptions = async () => {
        if (user && user.username) {
            try {
                const response = await fetch(`http://localhost:5000/subscriptions/${user.username}`);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setSubscriptions(data);
                    } else {
                        console.warn("API returned non-array data for subscriptions:", data);
                        setSubscriptions([]); 
                    }
                } else {
                    console.error("Error fetching subscriptions:", response.status);
                    setSubscriptions([]);
                }
            } catch (error) {
                console.error("Error fetching subscriptions:", error);
                setSubscriptions([]); 
            }
        } else {
            setSubscriptions([]); 
        }
    };

    const isSubscribed = subscriptions.includes(selectedTopic);

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
                disabled={!selectedTopic || isSubscribed} 
                variant="contained"
                color="primary"
            >
                Subscribe
            </Button>

            <Button
                onClick={() => unsubscribe(selectedTopic)}
                disabled={!selectedTopic || !isSubscribed} 
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
                {subscriptions && subscriptions.length > 0 ? (
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