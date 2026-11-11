import * as Location from 'expo-location';
import { postWithOffline } from './offline-utils';

const batchBuffer: { lat: number; lng: number; timestamp: string }[] = [];
const BATCH_SIZE = 10;

export const initBackgroundLocation = async () => {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return;

    await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 60000, distanceInterval: 100 },
      (loc) => {
        batchBuffer.push({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: new Date().toISOString(),
        });

        if (batchBuffer.length >= BATCH_SIZE) {
          void syncGPSBatch();
        }
      }
    );
  } catch {
    // Lỗi định vị là không chặn ứng dụng; người dùng báo gọi lại.
  }
};

async function syncGPSBatch() {
  if (batchBuffer.length === 0) return;
  const snapshot = [...batchBuffer];
  batchBuffer.length = 0;
  try {
    await postWithOffline('mobile/gps-batch', { points: snapshot });
  } catch {
    // Không gửi được: offline-utils sẽ đính kèm vào hàng đợi đồng bộ.
    batchBuffer.push(...snapshot);
  }
}

export const syncCurrentLocation = async () => {
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    batchBuffer.push({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      timestamp: new Date().toISOString(),
    });

    if (batchBuffer.length >= BATCH_SIZE) {
      await syncGPSBatch();
    }
  } catch {
    // Người dùng chưa cấp quyền định vị: giữ im lặng chứ không kèm lại.
  }
};
