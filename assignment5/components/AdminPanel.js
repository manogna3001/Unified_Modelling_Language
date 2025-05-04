import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from './UserContext';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Container, Box } from '@mui/material';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { Tooltip } from '@mui/material';
import ModeratorPanel from './ModeratorPanel';  

const AdminPanel = () => {
    const { user } = useContext(UserContext);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('http://localhost:5000/users');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setUsers(data);
            } catch (error) {
                console.error('Error fetching users:', error);
                setError('Failed to load users.');
            } finally {
                setIsLoading(false);
            }
        };

        if (user && user.persona === 'Administrator') {
            fetchUsers();
        }
    }, [user]);

    const handleEnableDisable = async (username, isEnabled) => {
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
            setError('Failed to update user status.');
        }
    };

    if (!user || (!user.persona === 'Administrator' && !user.persona === 'Moderator')) {
        return <Typography>You do not have permission to access this page.</Typography>;
    }

    if (isLoading) {
        return <Typography>Loading...</Typography>;
    }

    if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    return (
        <Container>
            <h2>Admin Panel</h2>
            {user.persona === 'Administrator' && (
                <>
                    <h3>User Management</h3>
                    <List>
                        {users.map((singleUser) => (
                            <ListItem key={singleUser.username} style={{ borderBottom: '1px solid #eee', padding: '10px' }}>
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center">
                                            <Typography variant="subtitle1">
                                                {singleUser.username}
                                            </Typography>
                                            {singleUser.persona === 'Administrator' && (
                                                <Tooltip title="Administrator">
                                                    <AdminPanelSettingsIcon color="primary" style={{ marginLeft: '5px', verticalAlign: 'middle' }} />
                                                </Tooltip>
                                            )}
                                            {user.username === singleUser.username && (
                                                <Tooltip title="You">
                                                    <VerifiedUserIcon color="secondary" style={{ marginLeft: '5px', verticalAlign: 'middle' }} />
                                                </Tooltip>
                                            )}
                                        </Box>
                                    }
                                    secondary={`Email: ${singleUser.email}, Persona: ${singleUser.persona}, Status: ${singleUser.isEnabled ? 'Enabled' : 'Disabled'}`}
                                />
                                <ListItemSecondaryAction>
                                    {singleUser.persona !== 'Administrator' && user.username !== singleUser.username ? (
                                        <Button
                                            variant="contained"
                                            color={singleUser.isEnabled ? 'secondary' : 'primary'}
                                            onClick={() => handleEnableDisable(singleUser.username, singleUser.isEnabled)}
                                            style={{ marginRight: '10px' }}
                                        >
                                            {singleUser.isEnabled ? 'Disable' : 'Enable'}
                                        </Button>
                                    ) : (
                                        <Typography variant="body2" style={{ marginRight: '10px' }}>
                                            {singleUser.persona === 'Administrator' ? 'Administrator' : 'Self'}
                                        </Typography>
                                    )}
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </>
            )}
             {user && user.persona === 'Moderator' && (
                <ModeratorPanel />
              )}
        </Container>
    );
};

export default AdminPanel;