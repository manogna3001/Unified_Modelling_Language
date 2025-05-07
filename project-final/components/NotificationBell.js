import React, { useState, useEffect, useCallback, useContext } from 'react';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import axios from 'axios';
import { UserContext } from './UserContext';
import SearchResultsPopup from './SearchResultsPopup'; 
const NotificationBell = () => {
const [anchorEl, setAnchorEl] = useState(null);
const { user, isLoading } = useContext(UserContext);
const [notifications, setNotifications] = useState([]); 
const open = Boolean(anchorEl);
const [selectedPost, setSelectedPost] = useState(null);
const [isPopupOpen, setIsPopupOpen] = useState(false);

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

        console.log("Raw Notifications Data from API:", response.data);

         if (response.data && Array.isArray(response.data)) {
             setNotifications(response.data);
         } else {
             console.warn("Error: Notifications API returned:", response.data);
             setNotifications([]);  
         }

    } catch (error) {
        console.error('Error fetching notifications:', error);
         setNotifications([]);  
    }
}, [user]);

useEffect(() => {
    fetchNotifications();

    const intervalId = setInterval(fetchNotifications, 5000);

    return () => clearInterval(intervalId);
}, [fetchNotifications]);

const handleNotificationClick = async (notification) => {
    if (!user || !notification || !notification.id || !notification.category || !notification.title) return;

    try {
        await axios.put(`http://localhost:5000/notifications/${notification.id}`, { isRead: true });
        console.log("Notification updated on server:", notification.id);

        setNotifications(prevNotifications =>
            prevNotifications.map(n =>
                n.id === notification.id ? { ...n, isRead: true } : n
            )
        );
        handleClose(); 

        const response = await axios.get(`http://localhost:5000/posts/${notification.category}`);
        if (response.data && Array.isArray(response.data)) {
            const post = response.data.find(p => p.title === notification.title);
            if (post) {
                setSelectedPost(post);
                setIsPopupOpen(true);
            } else {
                console.warn("Could not find post matching notification:", notification);
            }
        } else {
            console.warn("Error fetching posts for notification category:", response.data);
        }

    } catch (error) {
        console.error('Error handling notification click:', error);
    }
};

const handlePopupClose = () => {
    setIsPopupOpen(false);
    setSelectedPost(null);
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
                        onClick={() => handleNotificationClick(notification)}
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

        {selectedPost && (
            <SearchResultsPopup open={isPopupOpen} onClose={handlePopupClose} results={[selectedPost]} />
        )}
    </div>
);
};

export default NotificationBell;