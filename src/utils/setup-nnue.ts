/**
 * NNUE Setup Utility
 * Automatically checks for and downloads NNUE file if missing
 */

import RNFS from 'react-native-fs';
import {Platform} from 'react-native';

const NNUE_FILENAME = 'nn-46832cfbead3.nnue';
const NNUE_URL = 'https://tests.stockfishchess.org/api/nn/nn-46832cfbead3.nnue';

// Platform-specific paths
const getEngineDirectory = (): string => {
  if (Platform.OS === 'windows') {
    // For Windows, use the app's document directory
    return `${RNFS.DocumentDirectoryPath}/engines`;
  }
  // For other platforms
  return `${RNFS.DocumentDirectoryPath}/engines`;
};

const getNNUEPath = (): string => {
  return `${getEngineDirectory()}/${NNUE_FILENAME}`;
};

export interface SetupProgress {
  stage: 'checking' | 'downloading' | 'complete' | 'error';
  progress?: number; // 0-100
  message: string;
  error?: string;
}

/**
 * Check if NNUE file exists
 */
export const checkNNUEExists = async (): Promise<boolean> => {
  try {
    const nnuePath = getNNUEPath();
    const exists = await RNFS.exists(nnuePath);
    console.log(`NNUE file exists: ${exists} at ${nnuePath}`);
    return exists;
  } catch (error) {
    console.error('Error checking NNUE file:', error);
    return false;
  }
};

/**
 * Download NNUE file with progress callback
 */
export const downloadNNUE = async (
  onProgress?: (progress: SetupProgress) => void,
): Promise<boolean> => {
  try {
    // Create engine directory if it doesn't exist
    const engineDir = getEngineDirectory();
    const dirExists = await RNFS.exists(engineDir);
    if (!dirExists) {
      await RNFS.mkdir(engineDir);
      console.log(`Created directory: ${engineDir}`);
    }

    const nnuePath = getNNUEPath();

    onProgress?.({
      stage: 'downloading',
      progress: 0,
      message: 'Downloading NNUE neural network...',
    });

    // Download the file
    const downloadResult = await RNFS.downloadFile({
      fromUrl: NNUE_URL,
      toFile: nnuePath,
      progress: res => {
        const progress = (res.bytesWritten / res.contentLength) * 100;
        onProgress?.({
          stage: 'downloading',
          progress: Math.round(progress),
          message: `Downloading NNUE: ${Math.round(progress)}%`,
        });
      },
      progressInterval: 500,
    }).promise;

    if (downloadResult.statusCode === 200) {
      console.log(`NNUE file downloaded successfully to ${nnuePath}`);
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'NNUE file ready!',
      });
      return true;
    } else {
      throw new Error(
        `Download failed with status code: ${downloadResult.statusCode}`,
      );
    }
  } catch (error) {
    console.error('Error downloading NNUE file:', error);
    onProgress?.({
      stage: 'error',
      message: 'Failed to download NNUE file',
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

/**
 * Setup NNUE file - check if exists, download if missing
 */
export const setupNNUE = async (
  onProgress?: (progress: SetupProgress) => void,
): Promise<boolean> => {
  try {
    onProgress?.({
      stage: 'checking',
      message: 'Checking for NNUE file...',
    });

    const exists = await checkNNUEExists();

    if (exists) {
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'NNUE file found!',
      });
      return true;
    }

    // File doesn't exist, download it
    console.log('NNUE file not found, downloading...');
    return await downloadNNUE(onProgress);
  } catch (error) {
    console.error('Error in setupNNUE:', error);
    onProgress?.({
      stage: 'error',
      message: 'Setup failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

export const getNNUEFilePath = (): string => {
  return getNNUEPath();
};
