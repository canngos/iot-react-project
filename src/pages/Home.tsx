// typescript
// src/pages/Home.tsx
import React, { useMemo } from 'react';
import { Box, Paper, Grid, Typography, Chip, CircularProgress } from '@mui/material';
import { useSensorData } from '../hooks/useSensorData';
import { useSettings } from '../hooks/useSettingsData';

const Home: React.FC = () => {
    const { chartValues } = useSensorData(20);
    const { minTemp, maxTemp, loading } = useSettings();

    const averageTemp = useMemo(() => {
        if (!chartValues || chartValues.length === 0) return null;
        const sum = chartValues.reduce((acc, curr) => acc + curr, 0);
        return (sum / chartValues.length).toFixed(1);
    }, [chartValues]);

    const statusKey = useMemo(() => {
        if (!averageTemp) return 'nodata';
        const temp = Number(averageTemp);
        if (typeof maxTemp === 'number' && temp > maxTemp) return 'hot';
        if (typeof minTemp === 'number' && temp < minTemp) return 'cold';
        return 'ideal';
    }, [averageTemp, minTemp, maxTemp]);

    const status = useMemo(() => {
        switch (statusKey) {
            case 'hot':
                return { label: 'Very Hot', color: 'error' as any, emoji: '🔥' };
            case 'cold':
                return { label: 'Cold', color: 'info' as any, emoji: '❄️' };
            case 'ideal':
                return { label: 'Ideal Comfort', color: 'success' as any, emoji: '🌿' };
            default:
                return { label: 'No Data', color: 'default' as any, emoji: '—' };
        }
    }, [statusKey]);

    const background = useMemo(() => {
        // Simple gradient + pattern per state. Keep lightweight and CSS-only.
        if (statusKey === 'hot') {
            return [
                // warm gradient
                'linear-gradient(135deg, #ff9a76 0%, #ff6b6b 50%, #ff3b3b 100%)',
                // subtle radial "heat" blobs
                'radial-gradient(circle at 10% 10%, rgba(255,255,255,0.04) 0 8%, transparent 30%)',
                'radial-gradient(circle at 90% 80%, rgba(255,255,255,0.02) 0 6%, transparent 30%)',
            ].join(', ');
        }

        if (statusKey === 'cold') {
            return [
                // cool gradient
                'linear-gradient(135deg, #c9f0ff 0%, #9bd8ff 40%, #5fb6ff 100%)',
                // soft snow-like dots pattern using radial gradients
                'radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 2px)',
                'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 2px)',
            ].join(', ');
        }

        if (statusKey === 'ideal') {
            return [
                // green / calm gradient
                'linear-gradient(135deg, #e6ffe9 0%, #c8f7d0 50%, #aaf0b3 100%)',
                // soft leaf-like texture
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0 6%, transparent 30%)',
            ].join(', ');
        }

        // nodata / fallback
        return 'linear-gradient(180deg, #f5f7fa 0%, #e9eef6 100%)';
    }, [statusKey]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                minHeight: '100vh',
                background,
                backgroundRepeat: 'no-repeat',
                backgroundSize: statusKey === 'cold' ? '20px 20px, cover' : 'cover',
                transition: 'background 400ms ease',
                // slightly dim content on very colorful backgrounds for readability
                color: statusKey === 'hot' ? 'common.white' : undefined,
            }}
        >
            <Grid container spacing={3} justifyContent="center">
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper elevation={3} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(6px)' }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, md: 8 }}>
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                        📍 Living Room (Pico W)
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                        <Typography variant="h2" component="div" sx={{ fontWeight: 700, lineHeight: 1 }}>
                                            {averageTemp ?? '--'}
                                        </Typography>
                                        <Typography variant="subtitle1" color="text.secondary">
                                            °C
                                        </Typography>
                                    </Box>

                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                        {status.emoji} {status.label}
                                    </Typography>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
                                    <Chip label={`Target Max: ${maxTemp}°C`} color="warning" size="small" />
                                    <Chip label={`Target Min: ${minTemp}°C`} color="primary" size="small" />
                                    <Chip label={status.label} color={status.color} size="small" sx={{ mt: 1 }} />
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Showing average of the last {chartValues?.length ?? 0} readings.
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Home;
