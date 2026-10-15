import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '../lib/api';
import { postWithOffline } from '../lib/offline-utils';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SurfaceCard } from '../components/SurfaceCard';
import { ActionButton } from '../components/ActionButton';
import { decodeJwt } from '../utils/decodeJwt';

export default function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tripData, setTripData] = useState<any>(null);
  const [codAmount, setCodAmount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchCurrentTrip = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mobile/trips?limit=1');
      if (response.data.data && response.data.data.length > 0) {
        const trip = response.data.data[0];
        setTripData(trip);
      } else {
        setTripData(null);
      }

      const walletRes = await api.get('/mobile/wallet');
      const cod = Number(walletRes.data?.codAmount || walletRes.data?.data?.codAmount || 0);
      setCodAmount(cod);
    } catch (error: any) {
      console.error('Fetch trip error:', error);
      if (!refreshing) {
        Alert.alert('Error', error.response?.data?.message || 'Unable to load trip data.');
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

    const token = await AsyncStorage.getItem('@SmartLogi:driver_token');
    if (token) {
      const payload = decodeJwt(token);
      if (payload?.driverId) setDriverId(payload.driverId);
    }
  }, []);

  useEffect(() => {
    let locationInterval: ReturnType<typeof setInterval>;
    if (isOnline && driverId) {
      locationInterval = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCurrentLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          await postWithOffline('gps/batch', {
            logs: [{
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              driverId: driverId,
              timestamp: Date.now()
            }]
          });
        } catch (e) {
          console.warn('GPS sync failed', e);
        }
      }, 30000);
    }
    return () => clearInterval(locationInterval);
  }, [isOnline, driverId]);

  const toggleOnline = async () => {
    if (!isOnline) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permission to go online.');
        return;
      }
      setIsOnline(true);
      Alert.alert('Online', 'Your location is now being tracked.');
    } else {
      setIsOnline(false);
      Alert.alert('Offline', 'Location tracking stopped.');
    }
  };

  const handleSOS = async () => {
    Alert.alert(
      'CONFIRM EMERGENCY',
      'Your current location will be sent to dispatch and emergency contacts. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              let lat = 0;
              let lng = 0;
              const loc = await Location.getCurrentPositionAsync({});
              lat = loc.coords.latitude;
              lng = loc.coords.longitude;

              await postWithOffline('driver-app/sos', {
                lat,
                lng,
                message: 'Driver Emergency - SOS Triggered',
              });
              Alert.alert('Alert Sent', 'Emergency services have been notified.');
            } catch (e) {
              Alert.alert('Error', 'Unable to send SOS. Please try again.');
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
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
      <SurfaceCard style={styles.walletCard}>
        <Text style={[typography.caption, { color: colors['ink-soft'] }]}>Cash on Delivery (COD)</Text>
        <Text style={[typography.h1, { color: colors.ink, marginVertical: 12 }]}>{formatCurrency(codAmount)}</Text>
        <ActionButton
          title="Submit Remittance"
          onPress={() => navigation.navigate('Remittance')}
          variant="secondary"
          style={styles.remitButton}
        />
      </SurfaceCard>

      <ActionButton
        title={isOnline ? 'Go Offline' : 'Go Online'}
        onPress={toggleOnline}
        variant={isOnline ? 'secondary' : 'primary'}
        style={{ marginBottom: 20 }}
      />

      {tripData ? (
        <SurfaceCard style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={[typography.h3, { color: colors.ink }]}>{tripData.tripCode}</Text>
            <View style={styles.badge}>
              <Text style={[typography.caption, { color: colors.primary }]}>{tripData.status}</Text>
            </View>
          </View>

          <Text style={[typography.body1, styles.tripInfo]}>Vehicle: {tripData.vehicle?.plateNumber || 'Unassigned'}</Text>
          <Text style={[typography.body1, styles.tripInfo]}>Total Weight: {tripData.totalWeightKg} kg</Text>

          <ActionButton
            title="Trip Details"
            onPress={() => {
              if (tripData.id) {
                navigation.navigate('TripDetail', { tripId: tripData.id });
              } else {
                Alert.alert('Error', 'No trip data available.');
              }
            }}
            style={{ marginTop: 24 }}
          />
        </SurfaceCard>
      ) : (
        <View style={styles.emptyTrip}>
          <Text style={[typography.body1, { color: colors['ink-soft'] }]}>No trips assigned to you at this time.</Text>
        </View>
      )}

      <ActionButton
        title="Send SOS Alert"
        onPress={handleSOS}
        variant="danger"
        style={{ marginTop: 12 }}
      />

      <ActionButton
        title="Report Expenses"
        onPress={() => navigation.navigate('Expense')}
        variant="secondary"
        style={{ marginTop: 12 }}
      />
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
    backgroundColor: colors.white,
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
    color: colors['ink-soft'],
    marginBottom: 8,
  },
  emptyTrip: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 20,
  },
});
