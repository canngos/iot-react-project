// typescript
import React from 'react';
import {
    Box,
    Grid,
    Typography,
    Paper,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
} from '@mui/material';
import { useSensorData } from '../hooks/useSensorData';
import {useSettings} from "../hooks/useSettingsData";

const formatEvaluation = (minTemp: number, maxTemp: number, temp?: number) => {
    if (temp === undefined || temp === null) return '—';
    if (temp > maxTemp) return '🔥 HOT';
    if (temp < minTemp) return '❄️ COLD';
    return '✅ IDEAL';
};

const statusChipColor = (status?: string) => {
    if (!status) return 'default';
    return status === 'INACTIVE' ? 'warning' : 'success';
};

const History: React.FC = () => {
    const { minTemp, maxTemp} = useSettings();
    const { historyList } = useSensorData(50);
    const list = historyList ?? [];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h2" gutterBottom>
                Historical Values
            </Typography>

            <Typography variant="body2" sx={{ mb: 2 }}>
                Displaying the last 50 readings received from the device.
            </Typography>

            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <Paper elevation={1}>
                        <TableContainer component={Paper}>
                            <Table aria-label="history table" size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>#</TableCell>
                                        <TableCell>Temperature</TableCell>
                                        <TableCell>Alarm Status</TableCell>
                                        <TableCell>Evaluation</TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {list.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">
                                                No historical data
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        list.map((entry, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>
                                                    {entry.temperature ?? '—'} °C
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={entry.alarm_status ?? 'UNKNOWN'}
                                                        color={statusChipColor(entry.alarm_status)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>{formatEvaluation(minTemp, maxTemp, entry.temperature)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default History;
