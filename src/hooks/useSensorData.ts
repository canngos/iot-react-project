import { useEffect, useState } from 'react';
import { ref, onValue, limitToLast, query } from "firebase/database";
import { db } from '../config/firebase.config';

export interface SensorData {
    temperature: number;
    alarm_status: string;
    message_id?: number;
    timestamp?: number;
    read_interval?: number;
}

export const useSensorData = (limit: number = 30) => {
    const [currentTemp, setCurrentTemp] = useState<number>(0);
    const [systemStatus, setSystemStatus] = useState<string>("Loading...");
    const [chartLabels, setChartLabels] = useState<string[]>([]);
    const [chartValues, setChartValues] = useState<number[]>([]);
    const [historyList, setHistoryList] = useState<SensorData[]>([]);

    useEffect(() => {
        // Fetch the last N entries for real-time visualization
        const dataRef = query(ref(db, 'thermistor_sensor_data'), limitToLast(limit));

        const unsubscribe = onValue(dataRef, (snapshot) => {
            const data = snapshot.val();

            if (data) {
                const temps: number[] = [];
                const labels: string[] = [];
                const rawList: SensorData[] = [];

                let latestTemp = 0;
                let latestStatus = "Offline";

                Object.keys(data).forEach((key, index) => {
                    const entry = data[key] as SensorData;
                    temps.push(entry.temperature);
                    labels.push((index + 1).toString()); // Simple counter as label

                    latestTemp = entry.temperature;
                    latestStatus = entry.alarm_status;

                    // Add to list for History view (Reversed later to show newest first)
                    rawList.push(entry);
                });

                setCurrentTemp(latestTemp);
                setSystemStatus(latestStatus);
                setChartLabels(labels);
                setChartValues(temps);
                setHistoryList(rawList.reverse());
            }
        });

        return () => unsubscribe();
    }, [limit]);

    return { currentTemp, systemStatus, chartLabels, chartValues, historyList };
};