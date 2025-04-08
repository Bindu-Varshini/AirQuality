import { useState, useEffect } from "react";
import { useAQIAPIs } from "./useAQIAPIs";
import { TOKEN, FEED_AQI_BASE_URL } from "./AQIConst";
import * as tf from "@tensorflow/tfjs";

const pollutantNames = {
    pm25: "Particulate Matter 2.5 (PM2.5)",
    pm10: "Particulate Matter 10 (PM10)",
    o3: "Ozone (O3)",
    no2: "Nitrogen Dioxide (NO2)",
    so2: "Sulfur Dioxide (SO2)",
    co: "Carbon Monoxide (CO)",
    t: "Temperature (°C)",
    w: "Wind Speed (m/s)",
    r: "Rain (mm)",
    h: "Relative Humidity (%)",
    d: "Dew Point (°C)",
    p: "Pressure (hPa)",
};

// AQI Categories
const AQI_CATEGORIES = ["Good", "Moderate", "Unhealthy for Sensitive Groups", "Unhealthy", "Very Unhealthy", "Hazardous"];

// Function to categorize AQI into index labels
const categorizeAQI = (aqi) => {
    if (aqi <= 50) return 0;
    if (aqi <= 100) return 1;
    if (aqi <= 150) return 2;
    if (aqi <= 200) return 3;
    if (aqi <= 300) return 4;
    return 5;
};

const CityAQIPredictor = ({ uid }) => {
    const [info, error] = useAQIAPIs(`${FEED_AQI_BASE_URL}${uid}/?token=${TOKEN}`);
    const [trainingData, setTrainingData] = useState([]);
    const [trainingLabels, setTrainingLabels] = useState([]);
    const [model, setModel] = useState(null);
    const [predictedAQICategory, setPredictedAQICategory] = useState(null);

    // Load AQI Data
    useEffect(() => {
        if (info.data?.iaqi) {
            const iaqi = info.data.iaqi;
            const features = [
                iaqi.pm25?.v || 0,
                iaqi.pm10?.v || 0,
                iaqi.o3?.v || 0,
                iaqi.no2?.v || 0,
                iaqi.so2?.v || 0,
                iaqi.co?.v || 0,
                iaqi.t?.v || 0,
                iaqi.w?.v || 0,
                iaqi.r?.v || 0,
                iaqi.h?.v || 0,
                iaqi.d?.v || 0,
                iaqi.p?.v || 0
            ];

            setTrainingData((prev) => [...prev, features]);
            setTrainingLabels((prev) => [...prev, categorizeAQI(info.data.aqi)]);
        }
    }, [info]);

    // Train Model
    useEffect(() => {
        if (trainingData.length > 10) { // Wait for sufficient training data
            const trainModel = async () => {
                const model = tf.sequential();
                model.add(tf.layers.dense({ inputShape: [12], units: 16, activation: "relu" }));
                model.add(tf.layers.dense({ units: 16, activation: "relu" }));
                model.add(tf.layers.dense({ units: 6, activation: "softmax" })); // 6 categories

                model.compile({ optimizer: "adam", loss: "sparseCategoricalCrossentropy", metrics: ["accuracy"] });

                const xs = tf.tensor2d(trainingData);
                const ys = tf.tensor1d(trainingLabels, "int32");

                await model.fit(xs, ys, { epochs: 50 }); // Train for 50 epochs
                setModel(model);
            };

            trainModel();
        }
    }, [trainingData]);

    // Make Predictions
    useEffect(() => {
        if (model && info.data?.iaqi) {
            const inputFeatures = tf.tensor2d([
                [
                    info.data.iaqi.pm25?.v || 0,
                    info.data.iaqi.pm10?.v || 0,
                    info.data.iaqi.o3?.v || 0,
                    info.data.iaqi.no2?.v || 0,
                    info.data.iaqi.so2?.v || 0,
                    info.data.iaqi.co?.v || 0,
                    info.data.iaqi.t?.v || 0,
                    info.data.iaqi.w?.v || 0,
                    info.data.iaqi.r?.v || 0,
                    info.data.iaqi.h?.v || 0,
                    info.data.iaqi.d?.v || 0,
                    info.data.iaqi.p?.v || 0,
                ],
            ]);

            const prediction = model.predict(inputFeatures);
            prediction.data().then((probabilities) => {
                const categoryIndex = probabilities.indexOf(Math.max(...probabilities));
                setPredictedAQICategory(AQI_CATEGORIES[categoryIndex]);
            });
        }
    }, [model, info]);

    return (
        <div>
            {error && <p>Error: {error}</p>}
            {info.data ? (
                <div>
                    <h2>🌍 Air Quality Index (AQI)</h2>
                    <h3>📍 {info.data.city.name}</h3>
                    <p>🕕 {new Date(info.data.time.s).toLocaleTimeString()}</p>
                    <p><strong>AQI Level:</strong> {info.data.aqi}</p>

                    <h3>🌡 Pollutant Levels:</h3>
                    <ul>
                        {Object.keys(info.data.iaqi || {}).map((key) => (
                            <li key={key}>
                                <strong>{pollutantNames[key] || key}:</strong> {info.data.iaqi[key]?.v || 0}
                            </li>
                        ))}
                    </ul>

                    {predictedAQICategory && <p>🚀 Predicted AQI Category: <strong>{predictedAQICategory}</strong></p>}
                </div>
            ) : (
                <p>Loading AQI Data...</p>
            )}
        </div>
    );
};

export default CityAQIPredictor;

        
                            
           
