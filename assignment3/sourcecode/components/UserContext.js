import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef
} from 'react';
import axios from 'axios';

export const UserContext = createContext(null);

const fetchSubscriptions = async (username) => {
    try {
        console.log("fetchSubscriptions called for username:", username);
        const response = await axios.get(`http://localhost:5000/subscriptions/${username}`);
        console.log("Subscriptions fetched:", response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return [];
    }
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [subscriptions, setSubscriptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [socket] = useState(null);

    //Remove unnecessary usage
    const login = useCallback((userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('user');
    }, []);

    const memoizedFetchSubscriptions = useCallback(async (username) => {
        const fetchedSubscriptions = await fetchSubscriptions(username);
        if (fetchedSubscriptions) {
            setSubscriptions(fetchedSubscriptions);
        }
    }, []);

    useEffect(() => {
        const loadUser = async () => {
            console.log("Starting loadUser effect");
            setIsLoading(true);
            try {
                const storedUser = localStorage.getItem('user');
                console.log("Stored user from localStorage:", storedUser);

                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);

                        if (parsedUser && parsedUser.username) {
                            try {
                                await memoizedFetchSubscriptions(parsedUser.username);
                            } catch (fetchSubscriptionsError) {
                                console.error("Error in memoizedFetchSubscriptions:", fetchSubscriptionsError);
                            }
                        } else {
                            console.warn("No user or username found in localStorage");
                        }
                    } catch (parseError) {
                        console.error("Error parsing user from localStorage:", parseError);
                    }
                }
            } finally {
                setIsLoading(false);
                console.log("Finished loadUser effect");
            }
        };

        loadUser();
    }, [memoizedFetchSubscriptions]);

    const subscribe = useCallback(async (topic) => {
        if (!user) {
            alert("You need to be logged in to subscribe.");
            return;
        }
        try {
            await axios.post('http://localhost:5000/subscribe', {
                username: user.username,
                topic
            });
            setSubscriptions(prev => [...prev, topic]);
            console.log(`Subscribed to: ${topic}`);
            await memoizedFetchSubscriptions(user.username); //Refetch subscriptions
        } catch (error) {
            console.error('Error subscribing:', error);
        }
    }, [user, memoizedFetchSubscriptions]);

    const unsubscribe = useCallback(async (topic) => {
        if (!user) {
            alert("You need to be logged in to unsubscribe.");
            return;
        }
        try {
            await axios.post('http://localhost:5000/unsubscribe', {
                username: user.username,
                topic
            });
            setSubscriptions(prev => prev.filter(sub => sub !== topic));
            console.log(`Unsubscribed from: ${topic}`);
            await memoizedFetchSubscriptions(user.username);
        } catch (error) {
            console.error('Error unsubscribing:', error);
        }
    }, [user, memoizedFetchSubscriptions]);

    //These are not being used.
    // const notifySubscribers = useCallback((category) => {
    //     if (subscriptions.includes(category)) {}
    // }, [subscriptions]);

    // const updateData = useCallback(async (newData) => {
    //     try {
    //         await axios.put('http://localhost:5000/db', newData);
    //         setData(newData);
    //     } catch (error) {
    //         console.error('Error updating data:', error);
    //     }
    // }, []);

    // const addUser = useCallback(async (userData) => {
    //     try {
    //         const newData = {
    //             ...data,
    //             users: [...data.users, userData]
    //         };
    //         await updateData(newData);
    //         await memoizedLoadData();
    //     } catch (error) {
    //         console.error('Error adding user:', error);
    //     }
    // }, [data, updateData, memoizedLoadData]);

    // const addPost = useCallback(async (postData) => {
    //     try {
    //         await axios.post('http://localhost:5000/create-post', postData);
    //         await memoizedLoadData();
    //         notifySubscribers(postData.category);
    //     } catch (error) {
    //         console.error('Error creating post:', error);
    //     }
    // }, [memoizedLoadData, notifySubscribers]);

    // const addReply = useCallback(async (postId, replyText, replyAuthor) => {
    //     try {
    //         const response = await axios.post(`http://localhost:5000/posts/${postId}/replies`, {
    //             replyText: replyText,
    //             replyAuthor: replyAuthor
    //         });

    //         if (response.status === 201) {
    //             const newReply = response.data.reply;

    //             setData(prevData => {
    //                 const updatedPosts = prevData.posts.map(post => {
    //                     if (post.id === postId) {
    //                         return {
    //                             ...post,
    //                             replies: [...(post.replies || []), newReply]
    //                         };
    //                     }
    //                     return post;
    //                 });

    //                 return {
    //                     ...prevData,
    //                     posts: updatedPosts
    //                 };
    //             });

    //             console.log('Reply added successfully');
    //         } else {
    //             console.error('Error adding reply:', response.status, response.data);
    //             alert('Error adding reply.');
    //         }
    //     } catch (error) {
    //         console.error('Error adding reply:', error);
    //         alert('Error adding reply.');
    //     }
    // }, []);

    // const getPosts = useCallback(() => data.posts || [], [data]);

    // const reportPost = useCallback(async (postId, reporter) => {
    //     try {
    //         await axios.post(`http://localhost:5000/posts/${postId}/report`, {
    //             reporter: reporter,
    //         });
    //         await memoizedLoadData();
    //         console.log('Post reported successfully');
    //     } catch (error) {
    //         console.error('Error reporting post:', error);
    //         alert('Error reporting post.');
    //     }
    // }, [memoizedLoadData]);

    const value = useMemo(() => ({
        user,
        login: login,
        logout: logout,
        // addUser,
        // addPost,
        // addReply,
        // getPosts,
        // loadData: memoizedLoadData,
        // reportPost,
        isLoading,
        subscriptions,
        subscribe,
        unsubscribe,
        fetchSubscriptions: memoizedFetchSubscriptions,
        socket
    }), [user, isLoading, subscriptions, subscribe, unsubscribe, memoizedFetchSubscriptions, socket, login, logout]);

    return ( <UserContext.Provider value = { value} > {children} </UserContext.Provider>
    );
};

export const UserContextValue = () => React.useContext(UserContext);
export const UserConsumer = UserContext.Consumer;

export default UserContext;