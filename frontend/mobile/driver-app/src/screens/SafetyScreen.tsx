import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { postWithOffline } from '../lib/offline-utils';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SurfaceCard } from '../components/SurfaceCard';
import { ActionButton } from '../components/ActionButton';

const TELEMETRY_KEY = '@telemetry_events';
const SPEED_KEY = '@telemetry_speed';

type TelemetryEvent = {
  id: string;
  kind: 'SPEED' | 'HARSH_BRK' | 'HARSH_TURN' | 'HARSH_IGN' | 'IDLE_TOO_LONG' | 'SOS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  at: string;
  lat?: number;
  lng?: number;
  speed?: number;
  note?: string;
};

type RiskTier = {
  score: number;
  lane: 'an toàn' | 'cảnh giác' | 'nghiêm trọng';
  tone: 'success' | 'warning' | 'danger';
  note: string;
};

type SpeedState = { lat: number | null; lng: number | null; speed: number };

const FINE: Record<TelemetryEvent['kind'], number> = {
  SPEED: 3,
  HARSH_BRK: 5,
  HARSH_TURN: 4,
  HARSH_IGN: 2,
  IDLE_TOO_LONG: 4,
  SOS: 20,
};

const EVENT_LABELS: Record<TelemetryEvent['kind'], string> = {
  SPEED: 'Năng suất tốc cho phép',
  HARSH_BRK: 'Thắng gấp',
  HARSH_TURN: 'Góc nguy hiểm',
  HARSH_IGN: 'Ra ga đột ngột',
  IDLE_TOO_LONG: 'Nghỉ quá lâu',
  SOS: 'Khẩn cấp SOS',
};

/** Hỗ trợ khi chưa có dữ liệu thiết bị thật: tạo sự kiện huấn luyện mẫu. */
const seedEvents = (): TelemetryEvent[] => {
  const now = Date.now();
  const kinds: TelemetryEvent['kind'][] = [
    'SPEED',
    'HARSH_BRK',
    'HARSH_TURN',
    'HARSH_IGN',
    'IDLE_TOO_LONG',
    'SOS',
  ];
  const result: TelemetryEvent[] = [];
  for (let i = 0; i < 6; i++) {
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const hoursAgo = Math.floor(Math.random() * 24) + 1;
    result.push({
      id: `tel-${i + 1}`,
      kind,
      severity: ([] as string[]).concat(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])[Math.floor(Math.random() * 4)] as TelemetryEvent['severity'],
      at: new Date(now - hoursAgo * 3600_000).toISOString(),
      lat: 10.78 + Math.random() * 0.02,
      lng: 106.7 + Math.random() * 0.02,
      speed: Math.random() > 0.5 ? 40 + Math.floor(Math.random() * 40) : undefined,
      note: kind === 'SOS' ? 'Bắt khẩn cấp' : undefined,
    });
  }
  return result.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
};

const tier = (score: number): RiskTier => {
  if (score >= 90)
    return {
      score,
      lane: 'an toàn',
      tone: 'success',
      note: 'Tài xế hoàn toàn tuân thủ quy định và không có sự kiện nguy hiểm gần đây.',
    };
  if (score >= 75)
    return {
      score,
      lane: 'cảnh giác',
      tone: 'warning',
      note: 'Có một vài hành vi gây ra rủi ro, cần nhắc nhở lái xe.',
    };
  return {
    score,
    lane: 'nghiêm trọng',
    tone: 'danger',
    note: 'Hành vi lái xe cần điều tra ngay.',
  };
};

export default function SafetyScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [score, setScore] = useState(100);
  const [safety, setSafety] = useState<RiskTier | null>(tier(100));
  const [speed, setSpeed] = useState<SpeedState>({ lat: null, lng: null, speed: 0 });
  const [isOnline, setIsOnline] = useState(false);

  const onKeyDown = async () => {
    const stored = await AsyncStorage.getItem(TELEMETRY_KEY);
    const eventsList: TelemetryEvent[] = stored ? JSON.parse(stored) : seedEvents();
    const penalty = eventsList.reduce((total, e) => total + (FINE[e.kind] ?? 0), 0);
    const computed = Math.max(0, 100 - penalty);
    setScore(computed);
    setSafety(tier(computed));
    setEvents(eventsList);
  };

  const load = async () => {
    setLoading(true);
    try {
      const net = await NetInfo.fetch();
      setIsOnline(net.isConnected ?? false);
      const [telemetry, localSpeed] = await Promise.all([
        AsyncStorage.getItem(TELEMETRY_KEY),
        AsyncStorage.getItem(SPEED_KEY),
      ]);
      const eventsList: TelemetryEvent[] = telemetry ? JSON.parse(telemetry) : seedEvents();
      const storedSpeed: SpeedState = localSpeed
        ? JSON.parse(localSpeed)
        : { lat: null, lng: null, speed: 0 };
      setEvents(eventsList);
      setSpeed(storedSpeed);
      onKeyDown();
    } catch {
      setScore(100);
      setSafety(tier(100));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const trackSpeed = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextSpeed = { lat: loc.coords.latitude, lng: loc.coords.longitude, speed: loc.coords.speed ?? 0 };
      setSpeed(nextSpeed);
      await AsyncStorage.setItem(SPEED_KEY, JSON.stringify(nextSpeed));
      await AsyncSave(nextSpeed);
    } catch {
      // Toasts tới từ ToastHost được mount ở app root, màn hình không bắn cảnh báo.
    }
  };

  const AsyncSave = async (next: SpeedState) => {
    const stored = await AsyncStorage.getItem(TELEMETRY_KEY);
    const eventsList: TelemetryEvent[] = stored ? JSON.parse(stored) : [];
    eventsList.push({
      id: `tel-${Date.now()}`,
      kind: 'HARSH_BRK',
      severity: 'LOW',
      at: new Date().toISOString(),
      lat: next.lat ?? undefined,
      lng: next.lng ?? undefined,
      speed: next.speed,
      note: 'Sim',
    } as TelemetryEvent);
    eventsList.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    await AsyncStorage.setItem(TELEMETRY_KEY, JSON.stringify(eventsList));
    onKeyDown();
  };

  const handlePost = async () => {
    if (!speed.lat || !speed.lng) return;
    await postWithOffline('driver-app/safety', {
      driverId: 'skip',
      lat: speed.lat,
      lng: speed.lng,
      safe: safety?.lane === 'an toàn',
      at: new Date().toISOString(),
    });
    await trackSpeed();
  };

  useEffect(() => {
    load();
    const interval = setInterval(trackSpeed, 30_000);
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
        <Text style={[typography.h1, { color: colors.ink }]}>An toàn tài xế</Text>
        <Text style={[typography.body1, { color: colors['ink-soft'] }]}>
          Điểm an toàn, cảnh báo và sự kiện giám sát hành trình.
        </Text>
      </View>

      <SurfaceCard style={styles.scoreCard}>
        <View style={styles.scoreRing}>
          <Text style={[typography.h2, { color: safety?.tone === 'danger' ? colors.rose[500] : colors.emerald[600] }]}>
            {score}
          </Text>
          <Text style={[typography.caption, { color: colors['ink-soft'] }]}>/ 100 điểm</Text>
        </View>
        <Text
          style={[
            typography.body1,
            {
              color: safety?.tone === 'danger' ? colors.rose[500] : colors.emerald[600],
              fontWeight: '600',
            },
          ]}
        >
          {safety?.lane || '—'}
        </Text>
        <Text style={[typography.body2, { color: colors['ink-soft'], marginTop: 8 }]}>
          {safety?.note}
        </Text>
      </SurfaceCard>

      <SurfaceCard style={styles.car}>
        <Text style={[typography.h3, { color: colors.ink, marginBottom: 12 }]}>Vị trí cuối cùng</Text>
        <View style={styles.row}>
          <Text style={[typography.body2, { color: colors['ink-soft'] }]}>
            Kinh độ: {speed.lng === null ? '—' : speed.lng.toFixed(6)}
          </Text>
          <Text style={[typography.body2, { color: colors['ink-soft'] }]}>
            Vĩ độ: {speed.lat === null ? '—' : speed.lat.toFixed(6)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[typography.body2, { color: colors['ink-soft'] }]}>
            Tốc độ: {`${(speed.speed || 0).toFixed(1)} km/h`}
          </Text>
          <Text style={[typography.body2, { color: colors['ink-soft'] }]}>
            Trực tuyến: {isOnline ? 'Có' : 'Không'}
          </Text>
        </View>
        <View style={styles.actions}>
          <ActionButton title="Gửi vị trí đến tình năng" onPress={handlePost} variant="primary" style={styles.action} />
          <ActionButton title="Làm mới điểm an toàn" onPress={onRefresh} variant="outline" style={styles.action} />
        </View>
      </SurfaceCard>

      <View style={styles.listHeader}>
        <Text style={[typography.h3, { color: colors.ink }]}>Sự kiện gần đây</Text>
        <Text style={[typography.caption, { color: colors['ink-soft'] }]}>{events.length} Sự kiện</Text>
      </View>

      {events.length === 0 ? (
        <Text style={[typography.body1, { color: colors['ink-soft'], textAlign: 'center', padding: 40 }]}>
          Không có sự kiện an toàn nào gần đây.
        </Text>
      ) : (
        events.slice(0, 8).map((event) => (
          <SurfaceCard key={event.id} style={styles.eventCard}>
            <View style={styles.eventRow}>
              <Text style={[typography.body2, { color: colors.ink, fontWeight: '600' }]}>
                {EVENT_LABELS[event.kind]}
              </Text>
              <Text style={[typography.caption, { color: colors['ink-soft'] }]}>
                {new Date(event.at).toLocaleString('vi-VN')}
              </Text>
            </View>
            {event.lat && event.lng ? (
              <Text style={[typography.caption, { color: colors['ink-soft'] }]}>
                {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
              </Text>
            ) : null}
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
  scoreCard: { margin: 16, padding: 24, alignItems: 'center' },
  scoreRing: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  car: { margin: 16, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  actions: { marginTop: 16, gap: 12 },
  action: { marginTop: 8 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  eventCard: { margin: 0, marginHorizontal: 16, marginBottom: 8, padding: 12 },
  eventRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
