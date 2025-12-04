import { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';

// --- CONFIGURATION ---
// 1. Get this from your "Connection Details" screen (TLS WebSocket URL)
const MQTT_BROKER_URL = 'wss://dec143733fe44e05a5d90b4b4d074bbc.s1.eu.hivemq.cloud:8884/mqtt';

// 2. You MUST create these in the "Access Management" tab of your HiveMQ dashboard
const MQTT_USERNAME = 'test123';
const MQTT_PASSWORD = 'Testtesttest123';

const MQTT_TOPIC = 'sensor_data/temp';

export interface MqttDataPacket {
    temperature: number;
    msg_id: number;
    timestamp: number;
    interval?: number;
}

export const useMqttData = (limit: number = 50) => {
    const [mqttHistory, setMqttHistory] = useState<MqttDataPacket[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const clientRef = useRef<mqtt.MqttClient | null>(null);

    const clearData = () => {
        setMqttHistory([]);
    };

    useEffect(() => {
        console.log("Hook: Connecting to HiveMQ Cloud...");

        const client = mqtt.connect(MQTT_BROKER_URL, {
            clientId: `react_client_${Math.random().toString(16).substring(2, 8)}`,
            keepalive: 60,
            clean: true,
            reconnectPeriod: 1000,
            // AUTHENTICATION IS REQUIRED FOR HIVEMQ CLOUD
            username: MQTT_USERNAME,
            password: MQTT_PASSWORD,
            protocolVersion: 5, // HiveMQ Cloud supports MQTT 5
        });

        client.on('connect', () => {
            console.log("Hook: MQTT Connected");
            setIsConnected(true);
            client.subscribe(MQTT_TOPIC, (err) => {
                if (!err) console.log(`Subscribed to ${MQTT_TOPIC}`);
                else console.error("Subscribe Error:", err);
            });
        });

        client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString()) as MqttDataPacket;
                setMqttHistory((prev) => {
                    const newList = [payload, ...prev];
                    if (newList.length > limit) return newList.slice(0, limit);
                    return newList;
                });
            } catch (e) {
                console.error("MQTT Parse Error:", e);
            }
        });

        client.on('offline', () => setIsConnected(false));

        client.on('error', (err) => {
            console.error("MQTT Connection Error:", err);
            setIsConnected(false);
        });

        clientRef.current = client;

        return () => {
            console.log("Hook: Cleaning up MQTT");
            client.end();
        };
    }, [limit]);

    return { mqttHistory, isConnected, clearData };
};