import React, { useMemo, useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase.config';
import { ref, update } from 'firebase/database';
import { useMqttData } from '../hooks/useMqttData';
import { useSettings } from '../hooks/useSettingsData';
import { Line } from 'react-chartjs-2';
import {
    Container, Grid, Card, CardContent, Typography, TextField, Button,
    Box, Divider, Chip, Stack, CircularProgress, useTheme, LinearProgress
} from '@mui/material';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const DEFAULT_READ_INTERVAL = 2;
const TEST_DURATION_MS = 60000; // 60 Seconds exactly

const Evaluation: React.FC = () => {
    const theme = useTheme();
    const { mqttHistory, isConnected, clearData } = useMqttData(100);
    const { readInterval } = useSettings();

    const [targetInterval, setTargetInterval] = useState<number>(DEFAULT_READ_INTERVAL);
    const [isSaving, setIsSaving] = useState(false);

    // --- TEST SESSION STATE ---
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [testMessageCount, setTestMessageCount] = useState(0);
    const [finalResult, setFinalResult] = useState<number | null>(null);

    // REFS FOR ACCURATE TIMING
    const testEndTimeRef = useRef<number>(0);
    const lastTestMsgId = useRef<number | null>(null);

    // --- EFFECT: ACCURATE TIMER LOGIC ---
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isTestRunning) {
            interval = setInterval(() => {
                const now = Date.now();
                const end = testEndTimeRef.current;

                // Calculate remaining seconds based on REAL TIME, not ticks
                const remaining = Math.ceil((end - now) / 1000);

                if (remaining <= 0) {
                    // Test Finished exactly when real time is up
                    setTimeLeft(0);
                    setIsTestRunning(false);
                    // We need to capture the count one last time here to be safe
                    // But since state updates are async, we rely on the effect below to stop counting
                } else {
                    setTimeLeft(remaining);
                }
            }, 100); // Check every 100ms to keep UI snappy
        } else if (!isTestRunning && timeLeft === 0 && testEndTimeRef.current !== 0) {
            // Test just finished, save result
            setFinalResult(testMessageCount);
            testEndTimeRef.current = 0; // Reset ref so we don't save again
        }

        return () => clearInterval(interval);
    }, [isTestRunning, testMessageCount]);

    // --- EFFECT: COUNT MESSAGES DURING TEST ---
    useEffect(() => {
        if (isTestRunning && mqttHistory.length > 0) {
            const latestPacket = mqttHistory[0];
            // Only count if it's a new message
            if (latestPacket.msg_id !== lastTestMsgId.current) {
                setTestMessageCount(prev => prev + 1);
                lastTestMsgId.current = latestPacket.msg_id;
            }
        }
    }, [mqttHistory, isTestRunning]);

    // --- CALCULATE LATENCY (Jitter) ---
    const latencyData = useMemo(() => {
        if (mqttHistory.length < 2) return [];
        const latencies = [];
        for (let i = 0; i < mqttHistory.length - 1; i++) {
            const current = mqttHistory[i];
            const previous = mqttHistory[i+1];
            const diff = current.timestamp - previous.timestamp;
            latencies.push(diff);
        }
        return latencies.reverse();
    }, [mqttHistory]);

    const avgLatency = latencyData.length > 0
        ? (latencyData.reduce((a, b) => a + b, 0) / latencyData.length).toFixed(0)
        : "0";

    // --- HANDLERS ---
    const handleStartTest = () => {
        // Set the end time to exactly NOW + 60000ms
        testEndTimeRef.current = Date.now() + TEST_DURATION_MS;

        setIsTestRunning(true);
        setTimeLeft(60);
        setTestMessageCount(0);
        setFinalResult(null);
        lastTestMsgId.current = mqttHistory[0]?.msg_id || null;
    };

    const handleUpdateInterval = async () => {
        setIsSaving(true);
        try {
            await update(ref(db, 'settings'), { read_interval: Number(targetInterval) });
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleResetDefaults = async () => {
        setIsSaving(true);
        try {
            await update(ref(db, 'settings'), { read_interval: DEFAULT_READ_INTERVAL });
            setTargetInterval(DEFAULT_READ_INTERVAL);
            setIsTestRunning(false);
            setTimeLeft(0);
            setTestMessageCount(0);
            setFinalResult(null);
            testEndTimeRef.current = 0;
            clearData();
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    // --- CHARTS ---
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
                data: latencyData.map(() => (readInterval || 2) * 1000),
                borderColor: theme.palette.error.main,
                borderDash: [5, 5],
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
                                <Stack spacing={2} sx={{ mt: 2 }}>
                                    <Stack direction="row" spacing={1}>
                                        <Button variant="contained" fullWidth onClick={handleUpdateInterval} disabled={isSaving || isTestRunning}>
                                            {isSaving ? <CircularProgress size={20} /> : 'Apply'}
                                        </Button>
                                        <Button variant="outlined" onClick={handleResetDefaults} disabled={isSaving || isTestRunning}>
                                            Reset
                                        </Button>
                                    </Stack>

                                    <Divider>MEASUREMENT</Divider>

                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        size="large"
                                        startIcon={isTestRunning ? <CircularProgress size={20} color="inherit"/> : <PlayArrowIcon />}
                                        onClick={handleStartTest}
                                        disabled={isTestRunning || !isConnected}
                                    >
                                        {isTestRunning ? `Testing... ${timeLeft}s` : "Start 1-Min Counter"}
                                    </Button>

                                    {isTestRunning && (
                                        <LinearProgress variant="determinate" value={((60 - timeLeft) / 60) * 100} color="secondary" />
                                    )}
                                </Stack>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Card sx={{ bgcolor: theme.palette.primary.light, color: 'white', height: '100%' }}>
                                <CardContent>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <SpeedIcon />
                                        <Typography variant="subtitle1">Throughput</Typography>
                                    </Stack>
                                    <Typography variant="h3" fontWeight="bold" sx={{ mt: 1 }}>
                                        {mqttHistory.length}
                                    </Typography>
                                    <Typography variant="caption">Buffered Packets</Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Card sx={{ bgcolor: isTestRunning ? theme.palette.secondary.main : (finalResult ? theme.palette.success.light : '#e0e0e0'), color: 'white', height: '100%' }}>
                                <CardContent>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <AssessmentIcon />
                                        <Typography variant="subtitle1">Actual (1 min)</Typography>
                                    </Stack>
                                    {isTestRunning ? (
                                        <Typography variant="h3" fontWeight="bold" sx={{ mt: 1 }}>
                                            {testMessageCount}
                                        </Typography>
                                    ) : (
                                        <Typography variant="h3" fontWeight="bold" sx={{ mt: 1 }}>
                                            {finalResult !== null ? finalResult : "--"}
                                        </Typography>
                                    )}
                                    <Typography variant="caption">
                                        {isTestRunning ? "Counting..." : "msgs / minute"}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Card sx={{ bgcolor: '#ff9f40', color: 'white', height: '100%' }}>
                                <CardContent>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <TimerIcon />
                                        <Typography variant="subtitle1">Avg Latency</Typography>
                                    </Stack>
                                    <Typography variant="h3" fontWeight="bold" sx={{ mt: 1 }}>
                                        {avgLatency}<span style={{fontSize: '1rem'}}>ms</span>
                                    </Typography>
                                    <Typography variant="caption">Inter-arrival deviation</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3 }}>
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