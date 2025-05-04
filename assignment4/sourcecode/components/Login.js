import React, { useState, useContext } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Typography from '@mui/material/Typography';
import { UserContext } from '../components/UserContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [persona, setPersona] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const { login } = useContext(UserContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, persona }),
            });

            const data = await response.json();

            if (!response.ok) {
                setErrorMessage(data.message);
                return;
            }

            login(data.user); 
            alert('Login successful!');
            navigate('/dashboard'); 

        } catch (error) {
            console.error('Login error:', error);
            setErrorMessage('Login failed: An unexpected error occurred.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {errorMessage && (
                <Typography color="error" gutterBottom>
                    {errorMessage}
                </Typography>
            )}
            <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                margin="normal"
                required
            />
            <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                margin="normal"
                required
            />
            <FormControl fullWidth margin="normal">
                <InputLabel id="persona-label">Persona</InputLabel>
                <Select
                    labelId="persona-label"
                    id="persona"
                    value={persona}
                    label="Persona"
                    onChange={(e) => setPersona(e.target.value)}
                    required
                >
                    <MenuItem value="Student">Student</MenuItem>
                    <MenuItem value="Faculty">Faculty</MenuItem>
                    <MenuItem value="Staff">Staff</MenuItem>
                    <MenuItem value="Moderator">Moderator</MenuItem>
                    <MenuItem value="Administrator">Administrator</MenuItem>
                </Select>
            </FormControl>
            <Button type="submit" variant="contained" color="primary">
                Login
            </Button>
        </form>
    );
};

export default Login;
