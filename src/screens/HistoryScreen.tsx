import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Header } from '../components/Header';
import { ResultScreen } from '../components/ResultScreen';
import { Colors, Spacing } from '../constants/theme';
import { RootTabParamList } from '../navigation/TabNavigator';
import {
  HistoryItem,
  ImpactStats,
  getScanHistory,
  clearScanHistory,
  deleteScanHistoryItem,
  calculateImpactStats,
  formatHistoryTimestamp,
} from '../services/history';

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<ImpactStats>({
    totalScans: 0,
    recyclableScans: 0,
    nonRecyclableScans: 0,
    recyclingRate: 0,
    categoryBreakdown: {},
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const items = await getScanHistory();
      setHistory(items);
      setStats(calculateImpactStats(items));
    } catch (err) {
      console.warn('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all saved scan history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearScanHistory();
            await loadHistory();
          },
        },
      ]
    );
  };

  const handleDeleteItem = (id: string, label: string) => {
    Alert.alert('Delete Scan', `Remove "${label}" from your history?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteScanHistoryItem(id);
          if (selectedItem?.id === id) {
            setSelectedItem(null);
          }
          await loadHistory();
        },
      },
    ]);
  };

  // ── Detail view when a history item is tapped ──
  if (selectedItem) {
    return (
      <View style={styles.container}>
        <Header
          title="Scan Details"
          subtitle={formatHistoryTimestamp(selectedItem.timestamp)}
        />
        <ResultScreen
          imageUri={selectedItem.imageUri}
          result={{
            category: selectedItem.category,
            material: selectedItem.material,
            label: selectedItem.label,
            confidence: selectedItem.confidence,
            recyclable: selectedItem.recyclable,
            disposal_action: selectedItem.disposal_action,
            preparation: selectedItem.preparation,
            reason: selectedItem.reason,
            explanation: selectedItem.explanation || '',
            model_used: selectedItem.model_used,
          }}
          onBack={() => setSelectedItem(null)}
          actionButtonText="Back to History"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Scan History"
        subtitle="Your classified waste items & personal impact"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : history.length === 0 ? (
          /* ── Empty State ── */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="time-outline" size={56} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Scans Recorded Yet</Text>
            <Text style={styles.emptySubtitle}>
              Classify a waste item using the camera or gallery in the Scan tab to start tracking your recycling history and personal circular impact.
            </Text>
            <TouchableOpacity
              style={styles.scanNowButton}
              onPress={() => navigation.navigate('Scan')}
              activeOpacity={0.8}
            >
              <Ionicons name="scan" size={20} color={Colors.white} />
              <Text style={styles.scanNowButtonText}>Scan an Item Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Impact Statistics Summary Bar ── */}
            <View style={styles.impactCard}>
              <View style={styles.impactHeader}>
                <Ionicons name="stats-chart" size={18} color={Colors.primary} />
                <Text style={styles.impactTitle}>Recycling Impact Summary</Text>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricNumber}>{stats.totalScans}</Text>
                  <Text style={styles.metricLabel}>Total Scanned</Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={[styles.metricNumber, { color: Colors.primary }]}>
                    {stats.recyclableScans}
                  </Text>
                  <Text style={styles.metricLabel}>Recyclable</Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={[styles.metricNumber, { color: '#D84315' }]}>
                    {stats.nonRecyclableScans}
                  </Text>
                  <Text style={styles.metricLabel}>Non-Recyclable</Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={[styles.metricNumber, { color: Colors.secondary }]}>
                    {stats.recyclingRate}%
                  </Text>
                  <Text style={styles.metricLabel}>Diversion Rate</Text>
                </View>
              </View>
            </View>

            {/* ── History Header & Clear Action ── */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.listCountText}>
                {history.length} {history.length === 1 ? 'Record' : 'Records'}
              </Text>
              <TouchableOpacity
                onPress={handleClearHistory}
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={15} color="#D32F2F" />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* ── Scan History List ── */}
            {history.map((entry) => {
              const recyclable = entry.recyclable;
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.historyCard}
                  onPress={() => setSelectedItem(entry)}
                  activeOpacity={0.7}
                >
                  {/* Thumbnail / Placeholder */}
                  <View style={styles.thumbnailWrapper}>
                    {entry.imageUri ? (
                      <Image
                        source={{ uri: entry.imageUri }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <Ionicons
                          name="image-outline"
                          size={24}
                          color={Colors.textMuted}
                        />
                      </View>
                    )}
                  </View>

                  {/* Item Info */}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel} numberOfLines={1}>
                      {entry.label || 'Unknown Item'}
                    </Text>
                    <Text style={styles.itemCategory} numberOfLines={1}>
                      {entry.category || 'General'}
                    </Text>
                    <Text style={styles.itemDate}>
                      {formatHistoryTimestamp(entry.timestamp)}
                    </Text>
                  </View>

                  {/* Recyclable Badge & Arrow */}
                  <View style={styles.rightSection}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: recyclable ? '#E8F5E9' : '#FBE9E7' },
                      ]}
                    >
                      <Ionicons
                        name={recyclable ? 'checkmark-circle' : 'close-circle'}
                        size={12}
                        color={recyclable ? Colors.primary : '#D84315'}
                      />
                      <Text
                        style={[
                          styles.badgeText,
                          { color: recyclable ? Colors.primary : '#D84315' },
                        ]}
                      >
                        {recyclable ? 'Recycle' : 'Waste'}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={Colors.textMuted}
                      style={{ marginTop: 6 }}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl * 2,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: 14,
    color: Colors.textMuted,
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 1.5,
    paddingHorizontal: Spacing.md,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  scanNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanNowButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: Spacing.xs,
  },

  /* Impact Summary Card */
  impactCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  /* List Header */
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  listCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D32F2F',
    marginLeft: 4,
  },

  /* History Card */
  historyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },
  itemInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
  },
  itemCategory: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
});
