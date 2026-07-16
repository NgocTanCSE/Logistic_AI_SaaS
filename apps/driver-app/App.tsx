import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NetworkBanner } from './src/components/NetworkBanner';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { registerForPushNotificationsAsync } from './src/lib/notifications';
import { startMockGPSBatchSync } from './src/lib/backgroundLocation';

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => console.log('Init Token:', token));
    startMockGPSBatchSync();
  }, []);

  return (
    <NetworkProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <NetworkBanner />
        <RootNavigator />
      </NavigationContainer>
    </NetworkProvider>
  );
}
