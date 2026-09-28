import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY_HISTORY = '@recycleai_scan_history_v1';
const MAX_HISTORY_ITEMS = 100;

export interface HistoryItem {
  id: string;
  timestamp: number;
  imageUri?: string;
  category: string;
  material?: string;
  label: string;
  confidence: number;
  recyclable: boolean;
  disposal_action?: string;
  preparation?: string;
  reason?: string;
  explanation?: string;
  model_used?: string;
}

export interface ImpactStats {
  totalScans: number;
  recyclableScans: number;
  nonRecyclableScans: number;
  recyclingRate: number; // Percentage (0 - 100)
  categoryBreakdown: Record<string, number>;
}

/**
 * Save a newly classified scan into local AsyncStorage.
 * Prepend to keep newest scans first, limiting to MAX_HISTORY_ITEMS.
 */
export const saveScanHistory = async (
  itemData: Omit<HistoryItem, 'id' | 'timestamp'>
): Promise<HistoryItem> => {
  const newItem: HistoryItem = {
    ...itemData,
    id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: Date.now(),
  };

  try {
    const existingHistory = await getScanHistory();
    const updatedHistory = [newItem, ...existingHistory].slice(0, MAX_HISTORY_ITEMS);
    await AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.warn('Failed to save scan history to AsyncStorage:', error);
  }

  return newItem;
};

/**
 * Retrieve all saved scan history items from local AsyncStorage.
 * Handles missing data, parsing errors, and corrupt entries gracefully.
 */
export const getScanHistory = async (): Promise<HistoryItem[]> => {
  try {
    const rawData = await AsyncStorage.getItem(STORAGE_KEY_HISTORY);
    if (!rawData) {
      return [];
    }

    const parsed = JSON.parse(rawData);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Filter and sanitize items to ensure required fields exist
    return parsed.filter(
      (item): item is HistoryItem =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.category === 'string' &&
        typeof item.label === 'string'
    );
  } catch (error) {
    console.warn('Failed to retrieve scan history from AsyncStorage:', error);
    return [];
  }
};

/**
 * Delete a specific scan item from local AsyncStorage by ID.
 */
export const deleteScanHistoryItem = async (id: string): Promise<void> => {
  try {
    const current = await getScanHistory();
    const filtered = current.filter((item) => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
  } catch (error) {
    console.warn(`Failed to delete scan item ${id} from AsyncStorage:`, error);
  }
};

/**
 * Clear all scan history records from local AsyncStorage.
 */
export const clearScanHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_HISTORY);
  } catch (error) {
    console.warn('Failed to clear scan history from AsyncStorage:', error);
  }
};

/**
 * Calculate descriptive circular economy statistics from saved scan items.
 * Strictly calculates factual counts and percentages without inventing CO2 figures.
 */
export const calculateImpactStats = (items: HistoryItem[]): ImpactStats => {
  const totalScans = items.length;
  let recyclableScans = 0;
  let nonRecyclableScans = 0;
  const categoryBreakdown: Record<string, number> = {};

  for (const item of items) {
    if (item.recyclable) {
      recyclableScans += 1;
    } else {
      nonRecyclableScans += 1;
    }

    const cat = item.category || 'Other';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  }

  const recyclingRate =
    totalScans > 0 ? Math.round((recyclableScans / totalScans) * 1000) / 10 : 0;

  return {
    totalScans,
    recyclableScans,
    nonRecyclableScans,
    recyclingRate,
    categoryBreakdown,
  };
};

/**
 * Format a numeric timestamp into a human-readable date/time string.
 */
export const formatHistoryTimestamp = (timestamp: number): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `Today, ${timeStr}`;
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    }

    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  } catch {
    return 'Recent';
  }
};
