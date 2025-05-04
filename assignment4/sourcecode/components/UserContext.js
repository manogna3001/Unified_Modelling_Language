import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]); 
    const [isLoading, setIsLoading] = useState(true);

    const loadUsers = useCallback(async () => {
        try {
            const response = await axios.get('http://localhost:5000/users');
            console.log("UserContext - Axios Response Status (Users):", response.status);
            console.log("UserContext - Axios Response Data (Users):", response.data);
            setUsers(response.data);
        } catch (error) {
            console.error('UserContext - Error loading users:', error);
        }
    }, []);

    useEffect(() => {
        const loadDataAndUser = async () => {
            setIsLoading(true);
            try {
                await loadUsers(); 

                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadDataAndUser();
    }, [loadUsers]);

    const updateUsers = useCallback(async (newUsers) => {
        console.log("The functionality to update users from user context has not implemented yet");
    }, []);

    const login = useCallback((userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('user');
    }, []);

    const addUser = useCallback(async (userData) => {
        try {
            const response = await axios.post('http://localhost:5000/signup', userData);
            if (response.status === 201) {
                await loadUsers(); 
                console.log('User added successfully');
            } else {
                console.error('Error adding user:', response.status, response.data);
                alert('Error adding user.');
            }
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Error adding user.');
        }
    }, [loadUsers]);

    const addPost = useCallback(async (postData) => {
        try {
            const response = await axios.post('http://localhost:5000/create-post', postData);
            if (response.status === 201) {
                console.log('Post created successfully');
            } else {
                console.error('Error creating post:', response.status, response.data);
                alert('Error creating post.');
            }
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Error creating post.');
        }
    }, []);

    const addReply = useCallback(async (postId, replyText, replyAuthor) => {
        try {
            const response = await axios.post(`http://localhost:5000/posts/${postId}/replies`, {
                replyText: replyText,
                replyAuthor: replyAuthor
            });

            if (response.status === 201) {
                console.log('Reply added successfully');
            } else {
                console.error('Error adding reply:', response.status, response.data);
                alert('Error adding reply.');
            }
        } catch (error) {
            console.error('Error adding reply:', error);
            alert('Error adding reply.');
        }
    }, []);

    const getPosts = useCallback(() => {
        console.log("get post functionality from user context has not been implemented because post should be retrieved from blog component")
    }, []);

    const reportPost = useCallback(async (postId, reporter) => {
        try {
            await axios.post(`http://localhost:5000/posts/${postId}/report`, {
                reporter: reporter,
            });
            console.log('Post reported successfully');
        } catch (error) {
            console.error('Error reporting post:', error);
            alert('Error reporting post.');
        }
    }, []);

    const value = useMemo(() => ({
        user,
        login,
        logout,
        addUser,
        addPost,
        addReply,
        getPosts,
        reportPost,
        isLoading
    }), [user, login, logout, addUser, addPost, addReply, getPosts, reportPost, isLoading]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const UserContextValue = () => React.useContext(UserContext);
export const UserConsumer = UserContext.Consumer;
export default UserContext;