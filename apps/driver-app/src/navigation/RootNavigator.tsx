import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import { TabNavigator } from './TabNavigator';
import TripDetailScreen from '../screens/TripDetailScreen';
import PODScreen from '../screens/PODScreen';
import ExpenseScreen from '../screens/ExpenseScreen';
import RemittanceScreen from '../screens/RemittanceScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Login"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Trip Details' }} />
      <Stack.Screen name="POD" component={PODScreen} options={{ title: 'Proof of Delivery', presentation: 'modal' }} />
      <Stack.Screen name="Expense" component={ExpenseScreen} options={{ title: 'Report Expense' }} />
      <Stack.Screen name="Remittance" component={RemittanceScreen} options={{ title: 'COD Remittance' }} />
    </Stack.Navigator>
  );
};
