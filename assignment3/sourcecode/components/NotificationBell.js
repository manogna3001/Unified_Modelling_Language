import React, { useState, useEffect, useCallback, useContext } from 'react';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import axios from 'axios';
import { UserContext } from './UserContext';

const NotificationBell = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const { user, isLoading } = useContext(UserContext);
    const [notifications, setNotifications] = useState([]); //Initialize
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        try {
            const response = await axios.get(`http://localhost:5000/notifications/${user.username}`);

            //ADDITIONAL logging to inspect data on load
            console.log("Raw Notifications Data from API:", response.data);

            setNotifications(response.data);
            console.log("Fetched notifications:", response.data);

        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();

        const intervalId = setInterval(fetchNotifications, 5000);

        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    const handleNotificationClick = (index) => {
        if (!user) return;

        if (index < 0 || index >= notifications.length) {  // Verify index is in range
            console.warn(`Invalid index ${index} for notifications array.`);
            return;
        }
    const notification = notifications[index];  // Access the specific notification
    if (!notification || !notification.id) {
        console.warn(`Notification at index ${index} is undefined or has no id.`);
        return;
    }


        const updatedNotifications = [...notifications];

        updatedNotifications[index].isRead = true;
        setNotifications(updatedNotifications);


       axios.put(`http://localhost:5000/notifications/${notification.id}`, { isRead: true })
                .then(response => {
                    console.log("Notification updated on server");
                })
                .catch(error => {
                    console.error("Error updating notification:", error);
                });

    };

    if (isLoading || !user) {
        return null;
    }

    const unreadCount = notifications ? notifications.filter(notification => !notification.isRead).length : 0;

    return (
        <div>
            <IconButton
                aria-label="notifications"
                aria-controls="basic-menu"
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
            >
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>
            <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'basic-button',
                }}
            >
                {notifications && notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                        <MenuItem
                            key={index}
                            onClick={() => {
                                handleNotificationClick(index);
                                handleClose();
                            }}
                            style={{ backgroundColor: !notification.isRead ? '#f0f0f0' : 'white' }}
                        >
                            <Typography>{notification.message}</Typography>
                        </MenuItem>
                    ))
                ) : (
                    <MenuItem disabled>
                        <Typography>No notifications</Typography>
                    </MenuItem>
                )}
            </Menu>
        </div>
    );
};

export default NotificationBell;