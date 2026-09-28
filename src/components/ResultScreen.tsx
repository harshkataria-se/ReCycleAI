import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import type { ClassificationResult } from '../services/api';

interface ResultScreenProps {
  imageUri?: string | null;
  result: ClassificationResult;
  onScanAgain?: () => void;
  onBack?: () => void;
  actionButtonText?: string;
}

/** Map common waste categories to an icon + accent color. */
const getCategoryMeta = (
  category: string,
  recyclable?: boolean,
): { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string } => {
  const cat = category.toLowerCase();

  if (cat.includes('plastic'))
    return { icon: 'water-outline', color: '#1565C0', bgColor: '#E3F2FD' };
  if (cat.includes('paper') || cat.includes('cardboard'))
    return { icon: 'document-text-outline', color: '#6D4C41', bgColor: '#EFEBE9' };
  if (cat.includes('glass'))
    return { icon: 'wine-outline', color: '#00838F', bgColor: '#E0F7FA' };
  if (cat.includes('metal'))
    return { icon: 'hardware-chip-outline', color: '#546E7A', bgColor: '#ECEFF1' };
  if (cat.includes('electronic') || cat.includes('e-waste'))
    return { icon: 'phone-portrait-outline', color: '#6A1B9A', bgColor: '#F3E5F5' };
  if (cat.includes('organic') || cat.includes('food') || cat.includes('wet'))
    return { icon: 'leaf-outline', color: '#2E7D32', bgColor: '#E8F5E9' };
  if (cat.includes('hazard'))
    return { icon: 'warning-outline', color: '#D84315', bgColor: '#FBE9E7' };

  // Default / Unknown
  return recyclable
    ? { icon: 'checkmark-circle-outline', color: '#2E7D32', bgColor: '#E8F5E9' }
    : { icon: 'help-circle-outline', color: '#757575', bgColor: '#F5F5F5' };
};

export const ResultScreen: React.FC<ResultScreenProps> = ({
  imageUri,
  result,
  onScanAgain,
  onBack,
  actionButtonText,
}) => {
  const recyclable = result.recyclable ?? false;
  const confidencePct = ((result.confidence ?? 0) * 100).toFixed(1);
  const categoryMeta = getCategoryMeta(result.category || '', recyclable);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Top Back Button (if opened from History) ── */}
      {onBack && (
        <TouchableOpacity
          style={styles.topBackButton}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
          <Text style={styles.topBackText}>Back to History</Text>
        </TouchableOpacity>
      )}

      {/* ── Hero image ── */}
      <View style={styles.imageCard}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name={categoryMeta.icon} size={48} color={categoryMeta.color} />
            <Text style={styles.placeholderImageText}>Image Not Stored</Text>
          </View>
        )}
        {/* Recyclable badge overlay */}
        <View
          style={[
            styles.recyclableBadge,
            { backgroundColor: recyclable ? '#2E7D32' : '#D84315' },
          ]}
        >
          <Ionicons
            name={recyclable ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color="#FFF"
          />
          <Text style={styles.recyclableBadgeText}>
            {recyclable ? 'Recyclable' : 'Not Recyclable'}
          </Text>
        </View>
      </View>

      {/* ── Category hero ── */}
      <View
        style={[styles.categoryHero, { backgroundColor: categoryMeta.bgColor }]}
      >
        <Ionicons name={categoryMeta.icon} size={32} color={categoryMeta.color} />
        <View style={styles.categoryTextGroup}>
          <Text style={[styles.categoryTitle, { color: categoryMeta.color }]}>
            {result.category || 'Unknown'}
          </Text>
          <Text style={styles.categorySubtitle}>
            {result.label || 'Unidentified Item'}
          </Text>
        </View>
        <View style={styles.confidenceChip}>
          <Text style={styles.confidenceText}>{confidencePct}%</Text>
        </View>
      </View>

      {/* ── Disposal Action (prominent) ── */}
      {result.disposal_action ? (
        <View style={styles.disposalCard}>
          <View style={styles.disposalHeader}>
            <Ionicons
              name={recyclable ? 'arrow-redo-circle-outline' : 'trash-outline'}
              size={22}
              color={recyclable ? '#2E7D32' : '#D84315'}
            />
            <Text style={styles.disposalLabel}>Disposal Action</Text>
          </View>
          <Text style={styles.disposalAction}>{result.disposal_action}</Text>
          {result.reason ? (
            <Text style={styles.disposalReason}>{result.reason}</Text>
          ) : null}
        </View>
      ) : null}

      {/* ── Preparation ── */}
      {result.preparation ? (
        <View style={styles.prepCard}>
          <View style={styles.prepHeader}>
            <Ionicons name="construct-outline" size={18} color={Colors.secondary} />
            <Text style={styles.prepLabel}>Preparation</Text>
          </View>
          <Text style={styles.prepText}>{result.preparation}</Text>
        </View>
      ) : null}

      {/* ── Details card ── */}
      <View style={styles.detailsCard}>
        <View style={styles.detailsHeader}>
          <Ionicons name="sparkles" size={18} color={Colors.primary} />
          <Text style={styles.detailsTitle}>AI Analysis Details</Text>
        </View>

        <DetailRow label="Category" value={result.category} />
        <DetailRow label="Item" value={result.label} />
        {result.material ? (
          <DetailRow label="Material" value={result.material} />
        ) : null}
        <DetailRow label="Confidence" value={`${confidencePct}%`} />
        {result.model_used ? (
          <DetailRow label="Model" value={result.model_used} />
        ) : null}

        {result.explanation ? (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>Visual Analysis</Text>
            <Text style={styles.explanationText}>{result.explanation}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Action Button (Scan Again or Back) ── */}
      {(onScanAgain || onBack) && (
        <TouchableOpacity
          style={styles.scanAgainButton}
          onPress={onScanAgain || onBack}
          activeOpacity={0.8}
        >
          <Ionicons
            name={onScanAgain ? 'camera-outline' : 'arrow-back-outline'}
            size={22}
            color={Colors.white}
          />
          <Text style={styles.scanAgainText}>
            {actionButtonText || (onScanAgain ? 'Scan Another Item' : 'Back to History')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
};

/* Small helper component for label/value rows */
const DetailRow: React.FC<{ label: string; value?: string }> = ({
  label,
  value,
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={2}>
      {value || '—'}
    </Text>
  </View>
);

/* ─────────────────────── Styles ─────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  topBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    alignSelf: 'flex-start',
  },
  topBackText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImageText: {
    marginTop: Spacing.xs,
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  /* Image */
  imageCard: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  recyclableBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  recyclableBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },

  /* Category hero */
  categoryHero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 14,
    marginBottom: Spacing.md,
  },
  categoryTextGroup: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categorySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  confidenceChip: {
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },

  /* Disposal card */
  disposalCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 14,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  disposalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  disposalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.xs,
  },
  disposalAction: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    lineHeight: 22,
    marginTop: 2,
  },
  disposalReason: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },

  /* Preparation card */
  prepCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 14,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  prepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  prepLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.xs,
  },
  prepText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginTop: 2,
  },

  /* Details card */
  detailsCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 14,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'right',
    maxWidth: '60%',
  },
  explanationBox: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  explanationText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },

  /* Scan Again */
  scanAgainButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  scanAgainText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
});
