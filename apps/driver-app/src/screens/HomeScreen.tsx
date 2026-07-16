import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '../lib/api';
import { postWithOffline } from '../lib/offline-utils';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { GlassCard } from '../components/GlassCard';
import { NeonButton } from '../components/NeonButton';

export default function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tripData, setTripData] = useState<any>(null);

  const fetchCurrentTrip = async () => {
    try {
      const response = await api.get('/mobile/trips?limit=1');
      if (response.data.data && response.data.data.length > 0) {
        setTripData(response.data.data[0]);
      }
    } catch (error: any) {
      console.error('Fetch trip error:', error);
      setTripData(null);
      if (!refreshing) {
        Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải dữ liệu chuyến đi.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCurrentTrip();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCurrentTrip();
  };

  const [isOnline, setIsOnline] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('@SmartLogi:driver_profile');
        if (stored) {
          const profile = JSON.parse(stored);
          setDriverId(profile.id);
        }
      } catch {}
    })();
  }, []);

  // GPS Tracking Loop
  useEffect(() => {
    let locationInterval: ReturnType<typeof setInterval>;
    if (isOnline && driverId) {
      locationInterval = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
await postWithOffline('gps/batch', {
                logs: [{
                  lat: loc.coords.latitude, 
                  lng: loc.coords.longitude,
                  driverId: driverId,
                  timestamp: Date.now()
                }]
              });
          console.log("GPS Ping Sent", loc.coords);
        } catch (e) {
          console.warn("GPS Ping Failed", e);
        }
      }, 3000);
    }
    return () => clearInterval(locationInterval);
  }, [isOnline, driverId]);

  const toggleOnline = async () => {
    if (!isOnline) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Cần cấp quyền Vị trí (Location) để nhận chuyến.');
        return;
      }
      setIsOnline(true);
      Alert.alert('Đã Trực Tuyến', 'Hệ thống đang theo dõi vị trí của bạn.');
    } else {
      setIsOnline(false);
      Alert.alert('Đã Ngoại Tuyến', 'Ngừng chia sẻ vị trí.');
    }
  };

  const handleSOS = async () => {
    Alert.alert(
      "XÁC NHẬN KHẨN CẤP",
      "Hệ thống sẽ lấy vị trí hiện tại và gửi tín hiệu SOS tới quản lý. Bạn có chắc chắn không?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "GỬI SOS", 
          style: "destructive",
          onPress: async () => {
            try {
              let { status } = await Location.requestForegroundPermissionsAsync();
              let lat = 10.7;
              let lng = 106.6;
              if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                lat = loc.coords.latitude;
                lng = loc.coords.longitude;
              }
              await postWithOffline('driver-app/sos', { lat, lng, message: 'Driver Emergency! Geofence/SOS Triggered.' });
              Alert.alert("Đã gửi báo động!", "Vui lòng giữ bình tĩnh, hỗ trợ đang đến.");
            } catch (e) {
              Alert.alert("Lỗi", "Không thể gửi tín hiệu SOS qua mạng. Đang lưu offline và thử lại.");
            }
          }
        }
      ]
    );
  };

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
      {/* Wallet Card */}
      <GlassCard style={styles.walletCard}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>Ví Tiền mặt COD</Text>
        <Text style={[typography.h1, { color: colors.success, marginVertical: 12 }]}>4,820,000 đ</Text>
        <NeonButton title="Nộp tiền qua QR" variant="secondary" onPress={() => navigation.navigate('Remittance')} style={styles.remitButton} />
      </GlassCard>

      {/* Online Status Toggle */}
      <NeonButton 
        title={isOnline ? "🟢 ĐANG TRỰC TUYẾN" : "⚪ BẮT ĐẦU ONLINE"} 
        variant={isOnline ? "secondary" : "primary"}
        onPress={toggleOnline} 
        style={{ marginBottom: 20 }}
      />

      {/* Current Trip */}
      {tripData ? (
        <GlassCard style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={[typography.h3, { color: colors.text }]}>{tripData.tripCode}</Text>
            <View style={styles.badge}>
              <Text style={[typography.caption, { color: colors.primary }]}>{tripData.status}</Text>
            </View>
          </View>
          
          <Text style={[typography.body1, styles.tripInfo]}>🚚 Xe: {tripData.vehicle?.plateNumber || 'Chưa gán'}</Text>
          <Text style={[typography.body1, styles.tripInfo]}> Tổng tải trọng: {tripData.totalWeightKg} kg</Text>

          <NeonButton 
            title="CHI TIẾT CHUYẾN" 
            onPress={() => {
              if (tripData.id) {
                navigation.navigate('TripDetail', { tripId: tripData.id });
              } else {
                Alert.alert('Lỗi', 'Không có dữ liệu chuyến đi.');
              }
            }}
            style={{ marginTop: 24 }}
          />
        </GlassCard>
      ) : (
        <View style={styles.emptyTrip}>
          <Text style={[typography.body1, { color: colors.textMuted }]}>Hiện bạn chưa có chuyến đi nào được gán.</Text>
        </View>
      )}

      {/* SOS Button */}
      <NeonButton 
        title="🚨 GỬI BÁO ĐỘNG SOS" 
        variant="danger" 
        onPress={handleSOS} 
        style={{ marginTop: 12 }} 
      />

      {/* Expense Button */}
      <NeonButton 
        title="💸 BÁO CÁO CHI PHÍ" 
        variant="secondary" 
        onPress={() => navigation.navigate('Expense')} 
        style={{ marginTop: 12 }} 
      />
      
      <Text style={[typography.caption, styles.versionNote]}>SmartLogi Driver v1.0.4 - Connected to Core AI</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletCard: {
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderColor: colors.success + '40',
  },
  remitButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tripCard: {
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tripInfo: {
    color: colors.textMuted,
    marginBottom: 8,
  },
  emptyTrip: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  versionNote: {
    color: colors.border,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 40,
  }
});
