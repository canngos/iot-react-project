// src/components/TempChart.tsx
import React from 'react';
import { Card, CardHeader, CardContent, Box, IconButton, useTheme } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props {
    labels: string[];
    data: number[];
    title?: string;
    onRefresh?: () => void;
}

const TempChart: React.FC<Props> = ({ labels, data, title = 'Live Sensor Data Stream', onRefresh }) => {
    const theme = useTheme();

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Real-time Temperature (°C)',
                data,
                borderColor: theme.palette.primary.main,
                backgroundColor: `${theme.palette.primary.main}33`, // 20% opacity
                tension: 0.4,
                fill: true,
                pointRadius: 2,
            },
        ],
    };

    const options: ChartOptions<'line'> = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: title },
            tooltip: { mode: 'index', intersect: false },
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
            x: { display: true },
            y: { display: true, beginAtZero: false },
        },
        maintainAspectRatio: false,
    };

    return (
        <Card elevation={2}>
            <CardHeader
                title={title}
                action={
                    onRefresh ? (
                        <IconButton aria-label="refresh" onClick={onRefresh}>
                            <RefreshIcon />
                        </IconButton>
                    ) : null
                }
            />
            <CardContent>
                <Box sx={{ height: { xs: 240, sm: 300, md: 360 } }}>
                    <Line options={options} data={chartData} />
                </Box>
            </CardContent>
        </Card>
    );
};

export default TempChart;