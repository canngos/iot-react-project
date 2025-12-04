// src/components/NavBar.tsx
import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';

const NavBar: React.FC = () => {
    return (
        <AppBar position="static">
            <Toolbar>
                <Typography
                    variant="h6"
                    component={RouterLink}
                    to="/"
                    sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}
                >
                    IoT App
                </Typography>

                <Button color="inherit" component={RouterLink} to="/dashboard">
                    Dashboard
                </Button>
                <Button color="inherit" component={RouterLink} to="/history">
                    History
                </Button>
                <Button color="inherit" component={RouterLink} to="/evaluation">
                    Evaluation
                </Button>
                <Button color="inherit" component={RouterLink} to="/settings">
                    Settings
                </Button>
            </Toolbar>
        </AppBar>
    );
};

export default NavBar;