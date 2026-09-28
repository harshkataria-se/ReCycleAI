import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from '../constants/config';

export interface HealthResponse {
  status: string;
  service: string;
}

export interface DisposalGuidance {
  disposal_action: string;
  preparation: string;
  recyclable: boolean;
  reason: string;
}

export interface ClassificationResult {
  category: string;
  material?: string;
  label: string;
  confidence: number;
  explanation: string;
  model_used?: string;
  disposal_action?: string;
  preparation?: string;
  recyclable?: boolean;
  reason?: string;
}

export interface AnalyzeResponse {
  status: string;
  message: string;
  filename: string;
  content_type?: string;
  size_bytes?: number;
  result?: ClassificationResult;
  disposal_guidance?: DisposalGuidance;
}

/**
 * Perform health check against backend API.
 */
export const checkHealth = async (): Promise<HealthResponse> => {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Upload image to backend /analyze endpoint for Gemini Vision classification
 * using native Expo FileSystem multipart upload.
 */
export const analyzeImage = async (imageUri: string): Promise<AnalyzeResponse> => {
  if (!imageUri || typeof imageUri !== 'string' || imageUri.trim() === '') {
    throw new Error('Invalid or missing image URI for analysis.');
  }

  // Extract filename extension and determine proper MIME type
  const rawFilename = imageUri.split('/').pop()?.split('?')[0] || `scan_${Date.now()}.jpg`;
  const extensionMatch = /\.(\w+)$/.exec(rawFilename);
  const ext = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';

  let mimeType = 'image/jpeg';
  if (ext === 'png') {
    mimeType = 'image/png';
  } else if (ext === 'webp') {
    mimeType = 'image/webp';
  } else if (ext === 'bmp') {
    mimeType = 'image/bmp';
  } else if (ext === 'gif') {
    mimeType = 'image/gif';
  }

  try {
    const uploadResult = await FileSystem.uploadAsync(
      `${API_BASE_URL}/analyze`,
      imageUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: mimeType,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (uploadResult.status >= 200 && uploadResult.status < 300) {
      try {
        const parsed: AnalyzeResponse = JSON.parse(uploadResult.body);
        return parsed;
      } catch {
        throw new Error(`Failed to parse backend response: ${uploadResult.body}`);
      }
    } else {
      let errorDetail = `Server returned status ${uploadResult.status}`;
      try {
        const errJson = JSON.parse(uploadResult.body);
        if (errJson.detail) {
          errorDetail = errJson.detail;
        }
      } catch {
        if (uploadResult.body) {
          errorDetail = uploadResult.body;
        }
      }
      throw new Error(errorDetail);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Network request failed')) {
      throw new Error(`Cannot reach backend at ${API_BASE_URL}. Ensure your device and PC are on the same Wi-Fi.`);
    }
    throw err;
  }
};
