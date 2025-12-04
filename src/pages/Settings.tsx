// typescript
// src/pages/Settings.tsx
import React, { useEffect, useState } from 'react';
import { db } from '../config/firebase.config';
import { ref, get, set } from 'firebase/database';
import {
    Box,
    Paper,
    Grid,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Stack,
} from '@mui/material';

const DEFAULT_MIN = 21;
const DEFAULT_MAX = 27;

const Settings: React.FC = () => {
    const [minTemp, setMinTemp] = useState<number>(DEFAULT_MIN);
    const [maxTemp, setMaxTemp] = useState<number>(DEFAULT_MAX);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');

    useEffect(() => {
        const fetchSettings = async () => {
            const settingsRef = ref(db, 'settings');
            try {
                const snapshot = await get(settingsRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    if (typeof data.min_temp === 'number') setMinTemp(data.min_temp);
                    if (typeof data.max_temp === 'number') setMaxTemp(data.max_temp);
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
                setMessage('❌ Failed to load settings.');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        setMessage('Saving...');

        try {
            await set(ref(db, 'settings'), {
                min_temp: Number(minTemp),
                max_temp: Number(maxTemp),
                updated_at: Date.now(),
            });

            setMessage('✅ Settings updated! Pico will apply them in the next cycle.');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error:', error);
            setMessage('❌ An error occurred.');
        } finally {
            setSaving(false);
        }
    };

    const handleResetDefaults = async () => {
        setSaving(true);
        setMessage('Resetting to defaults...');
        try {
            await set(ref(db, 'settings'), {
                min_temp: DEFAULT_MIN,
                max_temp: DEFAULT_MAX,
                updated_at: Date.now(),
            });

            setMinTemp(DEFAULT_MIN);
            setMaxTemp(DEFAULT_MAX);
            setMessage('✅ Defaults restored.');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error resetting defaults:', error);
            setMessage('❌ Failed to reset defaults.');
        } finally {
            setSaving(false);
        }
    };

    const messageSeverity = (msg: string) =>
        msg.startsWith('✅') ? 'success' : msg.startsWith('❌') ? 'error' : 'info';

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 4 } }}>
            <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
                <Typography variant="h5" component="h1" gutterBottom>
                    ⚙️ Device Settings
                </Typography>

                <Typography variant="body2" sx={{ mb: 2 }}>
                    Configure the alarm thresholds for your Raspberry Pi Pico W here.
                </Typography>

                <Box component="form" onSubmit={handleSave}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                label="Min Temperature (°C)"
                                type="number"
                                fullWidth
                                value={minTemp}
                                onChange={(e) => setMinTemp(Number(e.target.value))}
                                inputProps={{ step: 0.5 }}
                                helperText="Blue LED turns on if temperature drops below this value."
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                label="Max Temperature (°C)"
                                type="number"
                                fullWidth
                                value={maxTemp}
                                onChange={(e) => setMaxTemp(Number(e.target.value))}
                                inputProps={{ step: 0.5 }}
                                helperText="Red LED and Buzzer turn on if temperature rises above this value."
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Button type="submit" variant="contained" color="primary" disabled={saving}>
                                    {saving ? <CircularProgress size={20} /> : 'SAVE SETTINGS'}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outlined"
                                    color="secondary"
                                    disabled={saving}
                                    onClick={handleResetDefaults}
                                >
                                    {saving ? <CircularProgress size={20} /> : 'RESET TO DEFAULTS'}
                                </Button>

                                {message && (
                                    <Alert severity={messageSeverity(message)} sx={{ minWidth: 240 }}>
                                        {message}
                                    </Alert>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Box>
    );
};

export default Settings;
