import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { CustomInput } from '../components/CustomInput';
import { NeonButton } from '../components/NeonButton';
import { GlassCard } from '../components/GlassCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../lib/auth';
import api from '../lib/api';

const SLUG_ROLE_MAP: Record<string, string> = {
  'smartlogi': 'DRIVER',
  'demo-tenant': 'TENANT_ADMIN',
  'warehouse-tenant': 'WAREHOUSE_MANAGER',
  'logistics-tenant': 'LOGISTICS_MANAGER',
};

export default function LoginScreen({ navigation }: any) {
  const [slug, setSlug] = useState('smartlogi');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!slug) {
      Alert.alert('Error', 'Please enter your workspace slug.');
      return;
    }
    
    setLoading(true);
    try {
      const role = SLUG_ROLE_MAP[slug] || 'DRIVER';
      const res = await api.post('/mobile/auth/login', 
        { email: phone },
        { headers: { 'x-tenant-slug': slug } }
      );
      
      if (res.data && (res.data.token || res.data.data?.token || res.data.accessToken)) {
        const token = res.data.token || res.data.data?.token || res.data.accessToken;
        await auth.setToken(token);
        await AsyncStorage.setItem('@SmartLogi:driver_role', role);

        navigation.replace('MainTabs');
      } else {
        throw new Error('Token not received');
      }
    } catch (err: any) {
      console.warn("Login Error:", err);
      Alert.alert('Login Error', err.response?.data?.message || 'Unable to login. Please check your workspace slug.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[typography.h1, styles.title]}>SmartLogi Driver</Text>
        <Text style={[typography.body1, styles.subtitle]}>Welcome back. Sign in to view your trips.</Text>
        
        <GlassCard>
          <CustomInput
            label="Workspace Slug"
            placeholder="smartlogi"
            autoCapitalize="none"
            value={slug}
            onChangeText={setSlug}
          />
          <CustomInput
            label="Phone / Email"
            placeholder="john@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={phone}
            onChangeText={setPhone}
          />
          
          <NeonButton 
            title="LOGIN" 
            onPress={handleLogin} 
            loading={loading}
            style={{ marginTop: 8 }}
          />
        </GlassCard>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 40,
  }
});
