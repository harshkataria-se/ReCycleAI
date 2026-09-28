import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Header } from '../components/Header';
import { ResultScreen } from '../components/ResultScreen';
import { Colors, Spacing } from '../constants/theme';
import { RootTabParamList } from '../navigation/TabNavigator';
import {
  HistoryItem,
  ImpactStats,
  getScanHistory,
  calculateImpactStats,
  formatHistoryTimestamp,
} from '../services/history';

export const HomeScreen: React.FC = () => {
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      const items = await getScanHistory();
      setHistory(items);
      setStats(calculateImpactStats(items));
    } catch (err) {
      console.warn('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // ── Detail view when a recent scan is tapped ──
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
          actionButtonText="Back to Home"
        />
      </View>
    );
  }

  const recentScans = history.slice(0, 3);

  return (
    <View style={styles.container}>
      <Header
        title="ReCycleAI"
        subtitle="AI Waste Classification & Circular Living"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Hero & Value Proposition ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="leaf" size={24} color={Colors.primary} />
            </View>
            <View style={styles.heroTextGroup}>
              <Text style={styles.heroTitle}>Smart Waste Sorting</Text>
              <Text style={styles.heroTagline}>Vision AI for a cleaner planet</Text>
            </View>
          </View>
          <Text style={styles.heroDescription}>
            Point your camera at any waste item or packaging to identify materials, determine recyclability, and receive verified disposal preparation steps.
          </Text>
        </View>

        {/* ── 2. Primary Scan CTA ── */}
        <TouchableOpacity
          style={styles.primaryScanButton}
          onPress={() => navigation.navigate('Scan')}
          activeOpacity={0.85}
        >
          <View style={styles.scanButtonLeft}>
            <View style={styles.scanIconCircle}>
              <Ionicons name="camera" size={26} color={Colors.white} />
            </View>
            <View style={styles.scanButtonTextGroup}>
              <Text style={styles.scanButtonTitle}>Scan an Item</Text>
              <Text style={styles.scanButtonSubtitle}>
                AI Vision classification & rules guidance
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={22} color={Colors.white} />
        </TouchableOpacity>

        {/* ── 3. How ReCycleAI Works ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>How It Works</Text>
          </View>

          <View style={styles.stepsContainer}>
            <View style={styles.stepItem}>
              <View style={styles.stepBadge}>
                <Ionicons name="camera-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.stepTextGroup}>
                <Text style={styles.stepTitle}>1. Snap or Pick Photo</Text>
                <Text style={styles.stepDesc}>
                  Capture any household waste or packaging clearly with your phone.
                </Text>
              </View>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepItem}>
              <View style={styles.stepBadge}>
                <Ionicons name="sparkles-outline" size={18} color={Colors.secondary} />
              </View>
              <View style={styles.stepTextGroup}>
                <Text style={styles.stepTitle}>2. Gemini 3.8 Vision</Text>
                <Text style={styles.stepDesc}>
                  Multimodal AI detects material composition, object type, and category.
                </Text>
              </View>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepItem}>
              <View style={styles.stepBadge}>
                <Ionicons name="repeat-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.stepTextGroup}>
                <Text style={styles.stepTitle}>3. Deterministic Rules</Text>
                <Text style={styles.stepDesc}>
                  Get immediate, factual recycling actions and preparation guidelines.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 4. Live Scan Statistics ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderBetween}>
            <View style={styles.sectionHeader}>
              <Ionicons name="stats-chart" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Your Recycling Activity</Text>
            </View>
            {stats.totalScans > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Impact')}
                activeOpacity={0.7}
              >
                <Text style={styles.headerLinkText}>Details →</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <View style={styles.statsLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : stats.totalScans === 0 ? (
            /* Empty state for stats */
            <View style={styles.emptyStatsContainer}>
              <Ionicons name="pie-chart-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyStatsTitle}>No Activity Recorded Yet</Text>
              <Text style={styles.emptyStatsDesc}>
                Your recycling rate and material breakdown will automatically calculate once you scan your first waste item.
              </Text>
            </View>
          ) : (
            /* Live stats grid */
            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricNumber}>{stats.totalScans}</Text>
                <Text style={styles.metricLabel}>Total Scanned</Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={[styles.metricNumber, { color: Colors.primary }]}>
                  {stats.recyclableScans}
                </Text>
                <Text style={styles.metricLabel}>Diverted</Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={[styles.metricNumber, { color: '#D84315' }]}>
                  {stats.nonRecyclableScans}
                </Text>
                <Text style={styles.metricLabel}>General Waste</Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={[styles.metricNumber, { color: Colors.secondary }]}>
                  {stats.recyclingRate}%
                </Text>
                <Text style={styles.metricLabel}>Diversion Rate</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── 5. Recent Scans ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderBetween}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Recent Scans</Text>
            </View>
            {history.length > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('History')}
                activeOpacity={0.7}
              >
                <Text style={styles.headerLinkText}>View All ({history.length}) →</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <View style={styles.statsLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : recentScans.length === 0 ? (
            <View style={styles.emptyRecentContainer}>
              <Text style={styles.emptyRecentText}>
                No scans saved yet. Tap "Scan an Item" above to analyze your first object.
              </Text>
            </View>
          ) : (
            recentScans.map((item) => {
              const recyclable = item.recyclable;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentItemRow}
                  onPress={() => setSelectedItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recentThumbnail}>
                    {item.imageUri ? (
                      <Image
                        source={{ uri: item.imageUri }}
                        style={styles.recentThumbImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.recentThumbPlaceholder}>
                        <Ionicons
                          name="image-outline"
                          size={18}
                          color={Colors.textMuted}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.recentInfo}>
                    <Text style={styles.recentLabel} numberOfLines={1}>
                      {item.label || 'Unknown Item'}
                    </Text>
                    <Text style={styles.recentSub}>
                      {item.category || 'General'} • {formatHistoryTimestamp(item.timestamp)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.recentBadge,
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
                        styles.recentBadgeText,
                        { color: recyclable ? Colors.primary : '#D84315' },
                      ]}
                    >
                      {recyclable ? 'Recycle' : 'Waste'}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={Colors.textMuted}
                    style={{ marginLeft: Spacing.xs }}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── 6. Quick Access Hub ── */}
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="time" size={22} color="#1565C0" />
            </View>
            <Text style={styles.quickCardTitle}>Scan History</Text>
            <Text style={styles.quickCardSub}>
              {history.length} {history.length === 1 ? 'saved scan' : 'saved scans'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Impact')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="leaf" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.quickCardTitle}>Impact Metrics</Text>
            <Text style={styles.quickCardSub}>
              {stats.recyclingRate}% diversion
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.lg }} />
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

  /* 1. Hero Card */
  heroCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  heroTextGroup: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
  },
  heroTagline: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  heroDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },

  /* 2. Primary Scan CTA */
  primaryScanButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scanIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  scanButtonTextGroup: {
    flex: 1,
  },
  scanButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  scanButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },

  /* Section Card standard */
  sectionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  headerLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  /* 3. Steps */
  stepsContainer: {
    marginTop: Spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  stepTextGroup: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  stepDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: 2,
  },
  stepDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: Spacing.xs,
    marginLeft: 40,
  },

  /* 4. Stats */
  statsLoading: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptyStatsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  emptyStatsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  emptyStatsDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
    paddingHorizontal: Spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
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

  /* 5. Recent Scans */
  emptyRecentContainer: {
    paddingVertical: Spacing.sm,
  },
  emptyRecentText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  recentThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  recentThumbImage: {
    width: '100%',
    height: '100%',
  },
  recentThumbPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },
  recentInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
    justifyContent: 'center',
  },
  recentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  recentSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  recentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: Spacing.xs,
  },
  recentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
  },

  /* 6. Quick Access Grid */
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  quickCardSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
