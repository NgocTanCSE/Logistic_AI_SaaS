import AsyncStorage from '@react-native-async-storage/async-storage';

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
      console.error('Failed to save token', e);
    }
  },
  
  removeToken: async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to remove token', e);
    }
  }
};
