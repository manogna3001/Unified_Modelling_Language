import * as React from 'react';
import PropTypes from 'prop-types';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';
import { useState, useContext, useCallback, useRef, useEffect } from 'react';
import { UserContext } from './UserContext';
import { useNavigate } from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Subscription from './Subscription';
import NotificationBell from './NotificationBell';
import RecommendedForYouButton from './FindRecommendation';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

function Header(props) {
  const { sections, title, onSearch } = props;
  const { user, logout, loadData, socket } = useContext(UserContext);
  const navigate = useNavigate();
  const [value, setValue] = React.useState(0);
  const [showSubscription, setShowSubscription] = React.useState(false);
  const socketRef = useRef(socket);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    if (user && socketRef.current) {
      const currentSocket = socketRef.current;
      currentSocket.on('newPost', (newPosts) => {
        setNotifications((prevNotifications) => {
          const mergedNotifications = [...prevNotifications, ...newPosts].map((notification) => ({
            ...notification,
            isRead: false,
          }));
          console.log("Merged Notifications:", mergedNotifications);
          localStorage.setItem(`notifications_${user.username}`, JSON.stringify(mergedNotifications));
          return mergedNotifications;
        });
      });

      return () => {
        currentSocket.off('newPost');
      };
    }
  }, [user, setNotifications]);

  const loadInitialNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`http://localhost:5000/notifications/${user.username}`);
      const data = await response.json();
      if (data && Array.isArray(data)) {
        console.log("Raw Notifications Data from API:", data);
        setNotifications(data);
      } else {
        setNotifications([]); 
      }
    } catch (error) {
      console.error("Error retrieving notifications from API:", error);
      setNotifications([]);
    }
  }, [user, setNotifications, loadData]);

  useEffect(() => {
    loadInitialNotifications();
  }, [user, loadInitialNotifications]);

    const handleNotificationClick = async (notification) => {
    if (!user) return;
    if (!notification || !notification.id) {
      console.warn(`Notification is undefined or has no id.`);
      return;
    }

    try {
      setNotifications((prevNotifications) =>
        prevNotifications.filter((n) => n.id !== notification.id)
      );
      navigate(`/${notification.category.toLowerCase()}`);

      console.log("Navigated to category:", `/${notification.category.toLowerCase()}`);
    } catch (error) {
      console.error('Error navigating to category:', error); 
    }
  };


  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleSubscribeClick = () => {
    setShowSubscription(true);
  };

  const handleCloseSubscription = () => {
    setShowSubscription(false);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [searchError, setSearchError] = useState(''); 



  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault(); 

    if (searchTerm.trim() === '') {
      onSearch([]); 
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/search?q=${searchTerm}`);
      if (!response.ok) {
        throw new Error(`Search request failed with status: ${response.status}`);
      }
      const data = await response.json();
      console.log("RESPONSE coming from axios:", data);
      if (data && Array.isArray(data.posts)) {
        onSearch(data.posts);
      }
      setSearchError(''); 
    } catch (error) {
      console.error("Error during search:", error);
      setSearchError("An error occurred during the search.  Please try again."); 
      onSearch([]); 
    }
  };

  return (
    <React.Fragment>
      <Toolbar sx={{ borderBottom: 1, borderColor: 'divider' }}>
        {user && (
          <Button size="small" onClick={handleSubscribeClick}>Subscriptions</Button>
        )}
        <Typography
          component="h2"
          variant="h5"
          color="inherit"
          align="center"
          noWrap
          sx={{ flex: 1 }}
        >
          {title}
        
        </Typography>
        {user && (
        <form onSubmit={handleSearchSubmit}>
          <TextField
            size="small"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={handleSearchChange}
            error={!!searchError} 
            helperText={searchError} 
            InputProps={{
              endAdornment: (
                <InputAdornment position="end"> 
                  <IconButton type="submit" aria-label="search">
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </form>
        )}
        {user ? (
          <>
            <Typography sx={{ marginRight: 2 }}>Welcome, {user.username}!</Typography>
            <NotificationBell notifications={notifications} setNotifications={setNotifications} />
            <Button variant="outlined" size="small" component={Link} to="/create-post" sx={{ marginRight: 1 }}>
              Create Post
            </Button>
            <RecommendedForYouButton />

            <Button variant="outlined" size="small" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button variant="outlined" size="small">
              <Link to="/login" style={{ textDecoration: 'none', color: 'inherit' }}>
                Log In
              </Link>
            </Button>
            <Button variant="outlined" size="small">
              <Link to="/signup" style={{ textDecoration: 'none', color: 'inherit' }}>
                Sign Up
              </Link>
            </Button>
          </>
        )}
      </Toolbar>
      {showSubscription && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '20px', border: '1px solid #ccc', zIndex: 1000 }}>
          <Subscription topics={sections.map(section => section.title)} />
          <Button onClick={handleCloseSubscription}>Close</Button>
        </div>
      )}

      {isMobile ? (
        <>
          <Button
            id="basic-button"
            aria-controls={open ? 'basic-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleMenu}
          >
            Categories
          </Button>
          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'basic-button',
            }}
          >
            <MenuItem
              key="Home"
              onClick={handleClose}
              component={Link}
              to="/"
            >
              Home
            </MenuItem>
            {sections.map((section) => (
              <MenuItem
                key={section.title}
                onClick={handleClose}
                component={Link}
                to={`/${section.title.toLowerCase()}`}
              >
                {section.title}
              </MenuItem>
            ))}
          </Menu>
        </>
      ) : (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="Category Tabs"
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            <Tab
              key="Home"
              label="Home"
              component={Link}
              to="/"
              style={{ textDecoration: 'none', color: 'inherit' }}
            />
            {sections.map((section) => (
              <Tab
                key={section.title}
                label={section.title}
                component={Link}
                to={`/${section.title.toLowerCase()}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              />
            ))}
          </Tabs>
        </Box>
      )}
    </React.Fragment>
  );
}

Header.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
    })
  ).isRequired,
  title: PropTypes.string.isRequired,
  onSearch: PropTypes.func.isRequired,
};

export default Header;