// src/pages/Dashboard.tsx
import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useSensorData } from '../hooks/useSensorData';
import StatusCard from '../components/StatusCard';
import TempChart from '../components/TempChart';
import {useSettings} from "../hooks/useSettingsData";

const Dashboard: React.FC = () => {
    // Fetch last 20 points for the dashboard
    const { currentTemp, systemStatus, chartLabels, chartValues } = useSensorData(20);
    const { minTemp, maxTemp, loading } = useSettings()

    const getStatusColor = (temp: number) => {
        if (loading) return '#e2e3e5'; // gray for loading
        if (temp > maxTemp) return '#ffcccc'; // Hot
        if (temp < minTemp) return '#ccf2ff'; // Cold
        return '#d4edda'; // Ideal
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h2" gutterBottom>
                Dashboard
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <StatusCard
                        title="Current Temp"
                        value={`${currentTemp ?? '--'} °C`}
                        color={getStatusColor(currentTemp)}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <StatusCard
                        title="Alert Status"
                        value={systemStatus ?? 'UNKNOWN'}
                        color={systemStatus === 'INACTIVE' ? '#fff3cd' : '#e2e3e5'}
                    />
                </Grid>
            </Grid>

            <Box sx={{ height: { xs: 300, md: 420 } }}>
                <TempChart labels={chartLabels} data={chartValues} />
            </Box>
        </Box>
    );
};

export default Dashboard;