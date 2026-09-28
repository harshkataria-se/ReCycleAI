import Constants from 'expo-constants';

const getDevApiUrl = (): string => {
  // Try to extract the host IP address dynamically from Expo Constants
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8001`;
    }
  }

  // Fallback to explicit LAN IP address for development
  return 'http://10.156.242.132:8001';
};

export const API_BASE_URL = getDevApiUrl();
