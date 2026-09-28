import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { ResultScreen } from '../components/ResultScreen';
import { Colors, Spacing } from '../constants/theme';
import { API_BASE_URL } from '../constants/config';
import { checkHealth, analyzeImage, HealthResponse, AnalyzeResponse } from '../services/api';
import { saveScanHistory } from '../services/history';

export const ScanScreen: React.FC = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Backend connectivity state
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [isTestingHealth, setIsTestingHealth] = useState<boolean>(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);

  useEffect(() => {
    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    try {
      setIsTestingHealth(true);
      const res = await checkHealth();
      setBackendHealth(res);
    } catch (err: any) {
      console.warn('Backend connection test failed:', err);
      setBackendHealth(null);
    } finally {
      setIsTestingHealth(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setErrorMessage(null);
      setAnalyzeResult(null);
      setIsLoading(true);

      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        setErrorMessage('Camera permission is required to take photos of waste items.');
        Alert.alert(
          'Permission Denied',
          'Camera permission is required to take photos of waste items.'
        );
        setIsLoading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      setErrorMessage('Failed to open camera. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setErrorMessage(null);
      setAnalyzeResult(null);
      setIsLoading(true);

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setErrorMessage('Photo library permission is required to select images.');
        Alert.alert(
          'Permission Denied',
          'Photo library permission is required to select images.'
        );
        setIsLoading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image from gallery:', error);
      setErrorMessage('Failed to select image from gallery. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadToBackend = async () => {
    if (!imageUri) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);
      const res = await analyzeImage(imageUri);
      setAnalyzeResult(res);

      // Save scan to local history
      if (res.result) {
        saveScanHistory({
          imageUri,
          category: res.result.category,
          material: res.result.material,
          label: res.result.label,
          confidence: res.result.confidence,
          recyclable: res.result.recyclable ?? false,
          disposal_action: res.result.disposal_action,
          preparation: res.result.preparation,
          reason: res.result.reason,
          explanation: res.result.explanation,
          model_used: res.result.model_used,
        }).catch((err) => console.warn('Failed to save scan to history:', err));
      }
    } catch (err: any) {
      console.error('Error analyzing image with Gemini:', err);
      const msg = err.message || 'Failed to analyze image with Gemini Vision.';
      setErrorMessage(msg);
      Alert.alert('Analysis Error', msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setImageUri(null);
    setErrorMessage(null);
    setAnalyzeResult(null);
  };

  // ── Result screen: analysis complete ──
  if (analyzeResult?.result && imageUri) {
    return (
      <View style={styles.container}>
        <Header title="Analysis Result" subtitle="AI classification & disposal guidance" />
        <ResultScreen
          imageUri={imageUri}
          result={analyzeResult.result}
          onScanAgain={handleReset}
        />
      </View>
    );
  }

  // ── Scan / preview flow ──
  return (
    <View style={styles.container}>
      <Header
        title="Scan Item"
        subtitle={imageUri ? 'Preview & classify item' : 'Capture or pick a waste item photo'}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Backend Connection Health Card */}
        <View style={styles.healthCard}>
          <View style={styles.healthInfo}>
            <Ionicons
              name={backendHealth ? 'wifi' : 'wifi-outline'}
              size={20}
              color={backendHealth ? Colors.primary : Colors.textMuted}
            />
            <Text style={styles.healthText}>
              Backend ({API_BASE_URL}):{' '}
              <Text
                style={{
                  fontWeight: 'bold',
                  color: backendHealth ? Colors.primary : '#D32F2F',
                }}
              >
                {backendHealth ? 'Connected (OK)' : 'Disconnected'}
              </Text>
            </Text>
          </View>
          <TouchableOpacity
            style={styles.retestButton}
            onPress={testBackendConnection}
            disabled={isTestingHealth}
          >
            {isTestingHealth ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="refresh" size={16} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {imageUri ? (
          <View style={styles.previewContainer}>
            <View style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            </View>

            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              <Text style={styles.statusText}>Photo Ready for Analysis</Text>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, styles.uploadButton]}
              onPress={handleUploadToBackend}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color={Colors.white} />
                  <Text style={styles.uploadButtonText}>Analyze with Gemini Vision</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={20} color={Colors.white} />
              <Text style={styles.resetButtonText}>Scan Another Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.captureContainer}>
            <View style={styles.viewportFrame}>
              {isLoading ? (
                <ActivityIndicator size="large" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={56} color={Colors.primary} />
                  <Text style={styles.frameTitle}>Scan Waste Item</Text>
                  <Text style={styles.frameSubtitle}>
                    Position the item cleanly or select a photo from your gallery.
                  </Text>
                </>
              )}
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleTakePhoto}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={22} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={handlePickImage}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={22} color={Colors.primary} />
                <Text style={styles.secondaryButtonText}>Pick from Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  healthInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  healthText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  retestButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  captureContainer: {
    alignItems: 'center',
  },
  viewportFrame: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  frameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  frameSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonGroup: {
    width: '100%',
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
  uploadButton: {
    backgroundColor: Colors.primary,
    width: '100%',
    marginBottom: Spacing.sm,
  },
  uploadButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
  previewContainer: {
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: Spacing.md,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  resetButton: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: Colors.textMuted,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  resetButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
});
