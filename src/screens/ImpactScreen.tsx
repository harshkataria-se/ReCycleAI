import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Colors, Spacing } from '../constants/theme';
import {
  getScanHistory,
  calculateImpactStats,
  ImpactStats,
} from '../services/history';

export const ImpactScreen: React.FC = () => {
  const [stats, setStats] = useState<ImpactStats>({
    totalScans: 0,
    recyclableScans: 0,
    nonRecyclableScans: 0,
    recyclingRate: 0,
    categoryBreakdown: {},
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadImpactData = async () => {
    try {
      setIsLoading(true);
      const items = await getScanHistory();
      setStats(calculateImpactStats(items));
    } catch (err) {
      console.warn('Failed to load impact stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadImpactData();
    }, [])
  );

  const categories = Object.entries(stats.categoryBreakdown).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Header
        title="Your Impact"
        subtitle="Factual circular metrics from your verified scans"
      />

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Calculating impact metrics...</Text>
          </View>
        ) : (
          <>
            {/* ── Key Metrics Cards ── */}
            <View style={styles.metricsRow}>
              <View style={styles.metricBadge}>
                <Ionicons name="scan-outline" size={24} color={Colors.primary} />
                <Text style={styles.metricNumber}>{stats.totalScans}</Text>
                <Text style={styles.metricLabel}>Total Scans</Text>
              </View>

              <View style={styles.metricBadge}>
                <Ionicons name="repeat-outline" size={24} color={Colors.secondary} />
                <Text style={[styles.metricNumber, { color: Colors.secondary }]}>
                  {stats.recyclableScans}
                </Text>
                <Text style={styles.metricLabel}>Recyclable Diverted</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricBadge}>
                <Ionicons name="trash-outline" size={24} color="#D84315" />
                <Text style={[styles.metricNumber, { color: '#D84315' }]}>
                  {stats.nonRecyclableScans}
                </Text>
                <Text style={styles.metricLabel}>General Waste</Text>
              </View>

              <View style={styles.metricBadge}>
                <Ionicons name="pie-chart-outline" size={24} color={Colors.primary} />
                <Text style={[styles.metricNumber, { color: Colors.primary }]}>
                  {stats.recyclingRate}%
                </Text>
                <Text style={styles.metricLabel}>Diversion Rate</Text>
              </View>
            </View>

            {/* ── Category Breakdown ── */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeader}>
                <Ionicons name="layers-outline" size={18} color={Colors.primary} />
                <Text style={styles.cardTitle}>Materials & Categories Analyzed</Text>
              </View>

              {categories.length === 0 ? (
                <Text style={styles.emptyText}>
                  No items categorized yet. Scans will be categorized automatically as you analyze items.
                </Text>
              ) : (
                categories.map(([category, count]) => {
                  const percentage =
                    stats.totalScans > 0
                      ? Math.round((count / stats.totalScans) * 100)
                      : 0;

                  return (
                    <View key={category} style={styles.categoryRow}>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{category}</Text>
                        <Text style={styles.categoryCount}>
                          {count} {count === 1 ? 'item' : 'items'} ({percentage}%)
                        </Text>
                      </View>
                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(percentage, 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* ── Circular Economy Progress Summary ── */}
            <Card
              title="Circular Economy Role"
              description="Accurate sorting at the source is the single most critical factor in avoiding batch contamination at materials recovery facilities. Clean separation ensures plastics, glass, metals, and cardboard can be remanufactured rather than landfilled."
            />

            {/* ── Status Badge ── */}
            <Card title="Sorting Activity Status">
              <Text style={styles.badgeTitle}>
                {stats.totalScans === 0
                  ? '🌱 Getting Started'
                  : stats.recyclingRate >= 70
                  ? '🌟 Circular Champion'
                  : stats.recyclingRate >= 40
                  ? '🌿 Active Sorter'
                  : '📦 Waste Sorter'}
              </Text>
              <Text style={styles.badgeDesc}>
                {stats.totalScans === 0
                  ? 'Scan your first waste item to start building your personal circular sorting record.'
                  : `${stats.recyclableScans} of your ${stats.totalScans} verified items have been successfully directed toward proper recycling streams.`}
              </Text>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingVertical: Spacing.md,
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
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  metricBadge: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: Spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  /* Card */
  cardContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    paddingVertical: Spacing.xs,
  },
  categoryRow: {
    marginVertical: 6,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginTop: Spacing.xs,
  },
  badgeDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
});
