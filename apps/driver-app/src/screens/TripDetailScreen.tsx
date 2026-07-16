import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../lib/api';
import { postWithOffline } from '../lib/offline-utils';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { GlassCard } from '../components/GlassCard';
import { NeonButton } from '../components/NeonButton';

export default function TripDetailScreen({ route, navigation }: any) {
  const [stops, setStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const tripId = route.params?.tripId;
  if (!tripId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={[typography.body1, { color: colors.textMuted, textAlign: 'center' }]}>Không tìm thấy mã chuyến đi.</Text>
      </View>
    );
  }

  useEffect(() => {
    fetchStops();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permission to access location was denied');
      return;
    }

    let loc = await Location.getCurrentPositionAsync({});
    setLocation(loc);
  };

  const fetchStops = async () => {
    try {
      const response = await api.get(`/mobile/trips/${tripId}/stops`);
      setStops(response.data.data || []);
    } catch (error: any) {
      console.warn("API Error:", error);
      alert(error.response?.data?.message || 'Không thể tải danh sách điểm dừng. Vui lòng kiểm tra mạng.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (stopId: string) => {
    try {
      let loc = await Location.getCurrentPositionAsync({});
await postWithOffline(`driver-app/deliveries/${stopId}/check-in`, {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude
        });
      alert('Checked in successfully!');
      fetchStops();
    } catch (err: any) {
      console.warn("API Error:", err);
      alert(err.response?.data?.message || 'Không thể check-in. Thử lại.');
    }
  };

  const renderStop = ({ item, index }: any) => (
    <GlassCard style={styles.stopCard}>
      <View style={styles.stopHeader}>
        <View style={[styles.dot, { backgroundColor: item.status === 'COMPLETED' ? colors.success : colors.warning }]} />
        <Text style={[typography.h3, { color: colors.text }]}>Stop {index + 1}: {item.type}</Text>
      </View>
      <Text style={[typography.body2, styles.address]}>{item.address}</Text>
      
      {item.status === 'PENDING' && item.type === 'DELIVERY' && (
        <View style={styles.actions}>
          {!item.checkedIn && (
            <NeonButton 
              title="📍 CHECK-IN GPS" 
              onPress={() => handleCheckIn(item.id)}
              style={styles.actionButton}
            />
          )}
          <NeonButton 
            title="ARRIVED & DELIVERY" 
            onPress={() => navigation.navigate('POD', { stopId: item.id })}
            style={styles.actionButton}
            disabled={!item.checkedIn}
          />
        </View>
      )}
    </GlassCard>
  );

  return (
    <View style={styles.container}>
      {/* Map Area */}
      <View style={styles.mapArea}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: 10.762622,
            longitude: 106.660172,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation={true}
        >
          {stops.map((stop, index) => (
            stop.lat && stop.lng ? (
              <Marker
                key={stop.id}
                coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                title={`Stop ${index + 1}: ${stop.type}`}
                description={stop.address}
                pinColor={stop.status === 'COMPLETED' ? colors.success : colors.warning}
              />
            ) : null
          ))}
          {/* A simple polyline connecting stops */}
          {stops.filter(s => s.lat && s.lng).length > 1 && (
            <Polyline
              coordinates={stops.filter(s => s.lat && s.lng).map(s => ({ latitude: s.lat, longitude: s.lng }))}
              strokeColor={colors.primary}
              strokeWidth={3}
            />
          )}
        </MapView>
      </View>
      
      {/* Stop List */}
      {loading ? (
        <View style={[styles.list, { alignItems: 'center', paddingTop: 40 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList 
          data={stops}
          keyExtractor={item => item.id}
          renderItem={renderStop}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[typography.body1, { color: colors.textMuted, textAlign: 'center' }]}>No stops found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapArea: { height: 250, backgroundColor: colors.surface },
  map: { width: '100%', height: '100%' },
  list: { padding: 16 },
  stopCard: { marginBottom: 16 },
  stopHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  address: { color: colors.textMuted, marginLeft: 24, marginBottom: 16 },
  actions: { marginLeft: 24, gap: 12 },
  actionButton: { marginBottom: 8 }
});
