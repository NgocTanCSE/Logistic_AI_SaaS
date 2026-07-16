import * as Location from 'expo-location';
import api from './api';

const LOCATION_TASK_NAME = 'background-location-task';
const batchBuffer: { lat: number; lng: number; timestamp: string }[] = [];

export const initBackgroundLocation = async () => {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return;

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') return;

    // Start watching location
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000, // 1 minute
      distanceInterval: 100, // 100 meters
      showsBackgroundLocationIndicator: true,
    });

    console.log('Background location tracking started.');
  } catch (err) {
    console.error('Failed to init background location', err);
  }
};

// Simulated mock for when actual background tasks are limited in Expo Go
export const startMockGPSBatchSync = () => {
  setInterval(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      batchBuffer.push({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        timestamp: new Date().toISOString()
      });

      if (batchBuffer.length >= 5) { // sync every 5 points
        await api.post('/mobile/gps-batch', { points: batchBuffer });
        batchBuffer.length = 0; // clear buffer
        console.log('GPS batch synced');
      }
    } catch (e) {
      console.warn('GPS Batch sync error', e);
    }
  }, 30000); // 30s for demo purposes
};
