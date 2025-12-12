import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'qrScanHistory';
const THEME_KEY = 'qrScannerTheme';

export interface ScanResult {
  text: string;
  type: string;
  format: string;
  timestamp: string;
}

export const saveHistory = async (history: ScanResult[]) => {
  try {
    const jsonValue = JSON.stringify(history);
    await AsyncStorage.setItem(HISTORY_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to save history', e);
  }
};

export const loadHistory = async (): Promise<ScanResult[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(HISTORY_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to load history', e);
    return [];
  }
};

export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error('Failed to clear history', e);
  }
};

export const saveTheme = async (theme: 'light' | 'dark') => {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error('Failed to save theme', e);
  }
};

export const loadTheme = async (): Promise<'light' | 'dark' | null> => {
  try {
    const theme = await AsyncStorage.getItem(THEME_KEY);
    return theme as 'light' | 'dark' | null;
  } catch (e) {
    console.error('Failed to load theme', e);
    return null;
  }
};
