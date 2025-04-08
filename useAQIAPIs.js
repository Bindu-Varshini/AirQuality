import { useState, useEffect } from 'react';

const interpolateMissingValues = (data) => {
    if (!data || typeof data !== 'object') return data;

    const pollutants = ['pm2_5', 'pm10', 'no2', 'so2', 'o3', 'co']; // Add relevant pollutants
    let interpolatedData = { ...data };

    pollutants.forEach((pollutant) => {
        if (interpolatedData[pollutant] === null || interpolatedData[pollutant] === undefined) {
            // Simple Linear Interpolation: Average of previous & next known values
            const prevValue = interpolatedData.previous?.[pollutant] || 0;
            const nextValue = interpolatedData.next?.[pollutant] || 0;
            interpolatedData[pollutant] = (prevValue + nextValue) / 2;
        }
    });

    return interpolatedData;
};

const useAQIAPIs = (url) => {
    const [data, setData] = useState({});
    const [initial, setInitial] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (url.trim().length === 0) {
            return;
        }

        async function fetchData() {
            try {
                setInitial(false);
                setLoading(true);
                let response = await fetch(url);
                const json = await response.json();

                // Apply interpolation for missing values
                const processedData = interpolateMissingValues(json);

                setData(processedData);
                setLoading(false);
            } catch (error) {
                setError(error.message);
            }
        }

        fetchData();
    }, [url]);

    return [data, loading, initial, error];
};

export { useAQIAPIs };
