import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJwt } from '../utils/decodeJwt';

const TOKEN_KEY = '@SmartLogi:driver_token';

export const auth = {
  getToken: async () => {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  },
  
  setToken: async (token: string) => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      return;
    }
  },
  
  getRole: async (): Promise<string> => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        const payload = decodeJwt(token);
        return payload?.role || 'DRIVER';
      }
    } catch (e) {
      return 'DRIVER';
    }
    return 'DRIVER';
  },

  removeToken: async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem('@SmartLogi:driver_role');
    } catch (e) {
      return;
    }
  }
};
