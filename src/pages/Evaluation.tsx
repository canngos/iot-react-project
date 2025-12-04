import React, { useMemo, useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase.config';
import { ref, update } from 'firebase/database';
import { useMqttData } from '../hooks/useMqttData';
import { useSettings } from '../hooks/useSettingsData';
import { Line } from 'react-chartjs-2';
import {
    Container, Grid, Card, CardContent, Typography, TextField, Button,
    Box, Divider, Chip, Stack, CircularProgress, useTheme
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const DEFAULT_READ_INTERVAL = 2;

const Evaluation: React.FC = () => {
    const theme = useTheme();
    const { mqttHistory, isConnected, clearData } = useMqttData(100); // Increased buffer to 100 for better graph
    const { readInterval } = useSettings();

    const [targetInterval, setTargetInterval] = useState<number>(DEFAULT_READ_INTERVAL);
    const [isSaving, setIsSaving] = useState(false);

    // --- SESSION STATE (Resets when interval changes) ---
    const [sessionCount, setSessionCount] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState(Date.now());
    const [currentInterval, setCurrentInterval] = useState(DEFAULT_READ_INTERVAL);

    // We use a Ref to track the last processed message ID to avoid double-counting
    const lastProcessedMsgId = useRef<number | null>(null);

    // --- LOGIC: RESET SESSION ON INTERVAL CHANGE ---
    useEffect(() => {
        if (mqttHistory.length > 0) {
            const latestPacket = mqttHistory[0];
            const packetInterval = latestPacket.interval || DEFAULT_READ_INTERVAL;

            // If the incoming packet has a different interval than our current session
            // It means the Pico has accepted the new setting. RESET!
            if (packetInterval !== currentInterval) {
                console.log("New Scenario Detected! Resetting Counters.");
                setCurrentInterval(packetInterval);
                setSessionCount(1); // Start at 1
                setSessionStartTime(Date.now());
                lastProcessedMsgId.current = latestPacket.msg_id;
            }
            // Normal counting logic
            else if (latestPacket.msg_id !== lastProcessedMsgId.current) {
                setSessionCount(prev => prev + 1);
                lastProcessedMsgId.current = latestPacket.msg_id;
            }
        }
    }, [mqttHistory, currentInterval]);


    // --- CALCULATE LATENCY (Jitter) ---
    const latencyData = useMemo(() => {
        if (mqttHistory.length < 2) return [];

        // Calculate time difference between consecutive packets
        // Since history is New -> Old, we iterate backwards
        const latencies = [];
        for (let i = 0; i < mqttHistory.length - 1; i++) {
            const current = mqttHistory[i]; // Newest
            const previous = mqttHistory[i+1]; // Older

            const diff = current.timestamp - previous.timestamp;
            latencies.push(diff);
        }
        return latencies.reverse(); // Old -> New for graph
    }, [mqttHistory]);

    const avgLatency = latencyData.length > 0
        ? (latencyData.reduce((a, b) => a + b, 0) / latencyData.length).toFixed(0)
        : "0";

    const handleUpdateInterval = async () => {
        setIsSaving(true);
        try {
            await update(ref(db, 'settings'), { read_interval: Number(targetInterval) });
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleResetDefaults = async () => {
        setIsSaving(true);
        try {
            // 1. Reset Firebase Setting
            await update(ref(db, 'settings'), { read_interval: DEFAULT_READ_INTERVAL });

            // 2. Reset Local Input State
            setTargetInterval(DEFAULT_READ_INTERVAL);

            // 3. Reset Session Counters (Throughput)
            setSessionCount(0);
            setSessionStartTime(Date.now());

            // 4. Clear the Graph (The new function)
            clearData();

        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    // --- CHART 1: THROUGHPUT (Accumulated Messages) ---
    // We want to show a slope. Steep slope = High Throughput.
    const throughputChartData = {
        labels: Array.from({length: sessionCount}, (_, i) => i + 1), // 1, 2, 3...
        datasets: [
            {
                label: 'Total Messages Received (Current Scenario)',
                data: Array.from({length: sessionCount}, (_, i) => i + 1), // Linear growth
                borderColor: theme.palette.primary.main,
                backgroundColor: theme.palette.primary.light,
                fill: true,
                tension: 0,
            },
        ],
    };

    // --- CHART 2: LATENCY (Inter-arrival Time) ---
    const latencyChartData = {
        labels: latencyData.map((_, i) => i.toString()),
        datasets: [
            {
                label: 'Inter-Arrival Time (ms)',
                data: latencyData,
                borderColor: '#ff9f40',
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderWidth: 2,
                pointRadius: 2,
                tension: 0.3,
            },
            {
                label: 'Expected Interval',
                data: latencyData.map(() => currentInterval * 1000),
                borderColor: theme.palette.error.main,
                borderDash: [5, 5], // Dashed line
                pointRadius: 0,
                borderWidth: 1
            }
        ],
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Typography variant="h4">System Evaluation</Typography>
                <Chip icon={<CloudQueueIcon />} label={isConnected ? "MQTT Active" : "Connecting..."} color={isConnected ? "success" : "default"} variant="outlined" />
            </Stack>

            <Grid container spacing={3}>
                {/* CONFIGURATION PANEL */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>1. Configure Scenario</Typography>
                            <Box sx={{ my: 3 }}>
                                <TextField
                                    label="Set Read Interval (s)"
                                    type="number"
                                    fullWidth
                                    value={targetInterval}
                                    onChange={(e) => setTargetInterval(Number(e.target.value))}
                                    helperText={`Projected: ${(60 / (targetInterval || 1)).toFixed(1)} msgs/min`}
                                />
                                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                    <Button variant="contained" fullWidth onClick={handleUpdateInterval} disabled={isSaving}>
                                        {isSaving ? <CircularProgress size={20} /> : 'Apply'}
                                    </Button>
                                    <Button variant="outlined" onClick={handleResetDefaults} disabled={isSaving}>
                                        Reset
                                    </Button>
                                </Stack>
                            </Box>
                            <Divider sx={{ my: 2 }} />
                            <Stack direction="row" justifyContent="space-between">
                                <Typography color="text.secondary">Active Interval:</Typography>
                                <Typography fontWeight="bold">{currentInterval}s</Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* METRICS PANEL */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={2}>
                        {/* CARD: THROUGHPUT */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Card sx={{ bgcolor: theme.palette.primary.light, color: 'white' }}>
                                <CardContent>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <SpeedIcon />
                                        <Typography variant="h6">Throughput</Typography>
                                    </Stack>
                                    <Typography variant="h3" fontWeight="bold" sx={{ mt: 2 }}>
                                        {sessionCount}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Messages in current session
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        {/* CARD: LATENCY */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Card sx={{ bgcolor: '#ff9f40', color: 'white' }}>
                                <CardContent>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <TimerIcon />
                                        <Typography variant="h6">Avg Latency</Typography>
                                    </Stack>
                                    <Typography variant="h3" fontWeight="bold" sx={{ mt: 2 }}>
                                        {avgLatency}<span style={{fontSize: '1rem'}}>ms</span>
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        Inter-arrival time (Avg)
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* GRAPHS */}
                    <Box sx={{ mt: 2 }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Network Stability (Latency)</Typography>
                                <Box sx={{ height: 250 }}>
                                    <Line
                                        data={latencyChartData}
                                        options={{
                                            maintainAspectRatio: false,
                                            animation: { duration: 0 },
                                            scales: {
                                                y: { title: { display: true, text: 'Milliseconds (ms)' } }
                                            }
                                        }}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </Grid>
            </Grid>
        </Container>
    );
};

export default Evaluation;