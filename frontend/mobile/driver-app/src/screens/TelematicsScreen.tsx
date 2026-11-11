import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { postWithOffline } from '../lib/offline-utils';
import { OfflineSyncEngine } from '../lib/offline-sync';
import NetInfo from '@react-native-community/netinfo';
import { initBackgroundLocation } from '../lib/backgroundLocation';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SurfaceCard } from '../components/SurfaceCard';
import { ActionButton } from '../components/ActionButton';

const LOG_KEY = '@telemetry_logs';
const TRACKING_KEY = '@telemetry_tracking';
const SPEED_KEY = '@telemetry_speed';

type LogPoint = {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  at: string;
  batch?: string;
};

type SpeedState = { lat: number | null; lng: number | null; speed: number };

export default function TelematicsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<LogPoint[]>([]);
  const [pending, setPending] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [speed, setSpeed] = useState<SpeedState>({ lat: null, lng: null, speed: 0 });
  const [isOnline, setIsOnline] = useState(false);

  const refreshQueue = useCallback(async () => {
    const queue = await OfflineSyncEngine.getQueue();
    setPending(queue.filter((a) => a.status !== 'COMPLETED').length);
  }, []);

  const logPosition = useCallback(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextSpeed: SpeedState = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        speed: loc.coords.speed ?? 0,
      };
      setSpeed(nextSpeed);
      await AsyncStorage.setItem(SPEED_KEY, JSON.stringify(nextSpeed));
      const stored = await AsyncStorage.getItem(LOG_KEY);
      const list: LogPoint[] = stored ? JSON.parse(stored) : [];
      list.unshift({
        id: `log-${Date.now()}`,
        lat: nextSpeed.lat ?? 0,
        lng: nextSpeed.lng ?? 0,
        speed: nextSpeed.speed,
        at: new Date().toISOString(),
      });
      await AsyncStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, 200)));
    } catch {
      // Toasts đến từ ToastHost được mount ở app root, màn hình không bắn cảnh báo.
    }
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const net = await NetInfo.fetch();
      setIsOnline(net.isConnected ?? false);
      const stored = await AsyncStorage.getItem(LOG_KEY);
      setLogs(stored ? JSON.parse(stored) : []);
      const saved = await AsyncStorage.getItem(TRACKING_KEY);
      setTracking(saved === 'true');
      await refreshQueue();
      const localSpeed = await AsyncStorage.getItem(SPEED_KEY);
      if (localSpeed) setSpeed(JSON.parse(localSpeed));
    } catch {
      setLogs([]);
      setPending(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const toggleTracking = async () => {
    const next = !tracking;
    setTracking(next);
    await AsyncStorage.setItem(TRACKING_KEY, String(next));
    if (next) {
      await initBackgroundLocation();
    }
  };

  const handleSync = async () => {
    await refreshQueue();
    await postWithOffline('driver-app/telemetry', { logs: logs.slice(0, 50) });
    await load();
  };

  useEffect(() => {
    load();
    const interval = setInterval(logPosition, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={[typography.h1, { color: colors.ink }]}>Phân tích telemetry</Text>
        <Text style={[typography.body1, { color: colors['ink-soft'] }]}>
          Hàng đợi ngoại tuyến, lịch sử vị trí cùng tốc độ theo thời gian thực.
        </Text>
      </View>

      <SurfaceCard style={styles.grid}>
        <View style={styles.cell}>
          <Text style={[typography.caption, { color: colors['ink-soft'] }]}>Chờ giải quyết</Text>
          <Text style={[typography.h2, { color: colors.ink }]}>{pending}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={[typography.caption, { color: colors['ink-soft'] }]}>Trực tuyến</Text>
          <Text style={[typography.h2, { color: colors.ink }]}>{isOnline ? 'Có' : 'Không'}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={[typography.caption, { color: colors['ink-soft'] }]}>Vị trí cuối</Text>
          <Text style={[typography.body2, { color: colors['ink-soft'] }]}>
            {speed.lat === null || speed.lng === null ? '—' : `${speed.lat.toFixed(4)}, ${speed.lng.toFixed(4)}`}
          </Text>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[typography.h3, { color: colors.ink }]}>Điều hành giám sát</Text>
          <Switch
            value={tracking}
            onValueChange={toggleTracking}
            trackColor={{ false: colors.slate[300], true: colors.emerald[500] }}
            thumbColor={tracking ? colors.emerald[600] : colors.slate[100]}
          />
        </View>
        <Text style={[typography.body2, { color: colors['ink-soft'], marginBottom: 16 }]}>
          Theo dõi vị trí nền khi ứng dụng ở chế độ nền.
        </Text>
        <View style={styles.actions}>
          <ActionButton title="Giải quyết hàng đợi thủ công" onPress={handleSync} variant="primary" style={styles.action} />
          <ActionButton title="Làm mới" onPress={onRefresh} variant="outline" style={styles.action} />
        </View>
      </SurfaceCard>

      <View style={styles.listHeader}>
        <Text style={[typography.h3, { color: colors.ink }]}>Lịch sử vị trí</Text>
        <Text style={[typography.caption, { color: colors['ink-soft'] }]}>{logs.length} điểm</Text>
      </View>

      {logs.length === 0 ? (
        <Text style={[typography.body1, { color: colors['ink-soft'], textAlign: 'center', padding: 40 }]}>
          Chưa ghi lại vị trí nào, bật giám sát sẽ có dữ liệu.
        </Text>
      ) : (
        logs.slice(0, 10).map((log) => (
          <SurfaceCard key={log.id} style={styles.eventCard}>
            <View style={styles.row}>
              <Text style={[typography.body2, { color: colors.ink }]}>{new Date(log.at).toLocaleString('vi-VN')}</Text>
              <Text style={[typography.caption, { color: colors['ink-soft'] }]}>
                {log.lat.toFixed(4)}, {log.lng.toFixed(4)}
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors['ink-soft'], marginTop: 4 }]}>
              Tốc độ: {(log.speed || 0).toFixed(1)} km/h
            </Text>
          </SurfaceCard>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, paddingBottom: 8 },
  grid: { margin: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'center' },
  card: { margin: 16, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  actions: { gap: 12 },
  action: { marginTop: 8 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  eventCard: { margin: 0, marginHorizontal: 16, marginBottom: 8, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
