// src/hooks/useSettings.ts
import { useEffect, useState } from 'react';
import { ref, onValue } from "firebase/database";
import { db } from '../config/firebase.config';

export const useSettings = () => {
    // Default values
    const [minTemp, setMinTemp] = useState<number>(21);
    const [maxTemp, setMaxTemp] = useState<number>(27);
    const [loading, setLoading] = useState<boolean>(true);
    const [readInterval, setReadInterval] = useState<number>(1);

    useEffect(() => {
        const settingsRef = ref(db, 'settings');
        const unsubscribe = onValue(settingsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setMinTemp(Number(data.min_temp));
                setMaxTemp(Number(data.max_temp));
                setReadInterval(Number(data.read_interval || 1));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { minTemp, maxTemp, loading, readInterval };
};