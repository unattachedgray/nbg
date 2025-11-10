/**
 * NNUE Setup Utility
 * Automatically checks for and downloads NNUE file if missing
 * Intelligently searches for latest NNUE files from Fairy-Stockfish website
 */

import RNFS from 'react-native-fs';
import {Platform} from 'react-native';

const DEFAULT_NNUE_FILENAME = 'nn-46832cfbead3.nnue';
const DEFAULT_NNUE_URL =
  'https://tests.stockfishchess.org/api/nn/nn-46832cfbead3.nnue';
const NNUE_INFO_PAGE = 'https://fairy-stockfish.github.io/nnue/';
const NNUE_NETWORKS_PAGE =
  'https://fairy-stockfish.github.io/nnue/#current-best-nnue-networks';

// Platform-specific paths
const getEngineDirectory = (): string => {
  if (Platform.OS === 'windows') {
    // For Windows, use the app's document directory
    return `${RNFS.DocumentDirectoryPath}/engines`;
  }
  // For other platforms
  return `${RNFS.DocumentDirectoryPath}/engines`;
};

const getNNUEPath = (filename: string = DEFAULT_NNUE_FILENAME): string => {
  return `${getEngineDirectory()}/${filename}`;
};

export interface NNUEFileInfo {
  filename: string;
  url: string;
  description?: string;
}

export interface SetupProgress {
  stage:
    | 'checking'
    | 'searching'
    | 'downloading'
    | 'complete'
    | 'error'
    | 'manual_input';
  progress?: number; // 0-100
  message: string;
  error?: string;
  availableFiles?: NNUEFileInfo[];
  needsUserInput?: boolean;
}

/**
 * Search for NNUE files by scraping Fairy-Stockfish website
 */
const searchForNNUEFiles = async (): Promise<NNUEFileInfo[]> => {
  const foundFiles: NNUEFileInfo[] = [];

  try {
    // Try to fetch the NNUE networks page
    console.log('Searching for NNUE files on Fairy-Stockfish website...');
    const response = await fetch(NNUE_INFO_PAGE);
    const html = await response.text();

    // Parse HTML for NNUE file URLs
    // Look for links to .nnue files in the format:
    // https://tests.stockfishchess.org/api/nn/nn-*.nnue
    const nnueRegex =
      /https?:\/\/tests\.stockfishchess\.org\/api\/nn\/(nn-[a-f0-9]+\.nnue)/gi;
    const matches = html.matchAll(nnueRegex);

    for (const match of matches) {
      const url = match[0];
      const filename = match[1];

      // Extract description if available (text near the link)
      const contextStart = Math.max(0, match.index! - 200);
      const contextEnd = Math.min(html.length, match.index! + 200);
      const context = html.substring(contextStart, contextEnd);

      // Look for description patterns
      let description = 'NNUE neural network';
      if (context.includes('chess') || context.includes('Chess')) {
        description = 'Chess NNUE network';
      }
      if (context.includes('best') || context.includes('current')) {
        description = 'Current best ' + description;
      }

      foundFiles.push({filename, url, description});
    }

    // Remove duplicates
    const uniqueFiles = Array.from(
      new Map(foundFiles.map(f => [f.filename, f])).values(),
    );

    console.log(`Found ${uniqueFiles.length} NNUE files`);
    return uniqueFiles;
  } catch (error) {
    console.error('Error searching for NNUE files:', error);
    return [];
  }
};

/**
 * Check if any NNUE file exists in the engine directory
 */
export const checkNNUEExists = async (): Promise<boolean> => {
  try {
    const engineDir = getEngineDirectory();
    const dirExists = await RNFS.exists(engineDir);

    if (!dirExists) {
      return false;
    }

    // List all files in the engine directory
    const files = await RNFS.readDir(engineDir);
    const nnueFiles = files.filter(file => file.name.endsWith('.nnue'));

    if (nnueFiles.length > 0) {
      console.log(`Found ${nnueFiles.length} NNUE file(s): ${nnueFiles.map(f => f.name).join(', ')}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking NNUE file:', error);
    return false;
  }
};

/**
 * Download NNUE file with progress callback
 */
export const downloadNNUE = async (
  fileInfo: NNUEFileInfo,
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

    const nnuePath = getNNUEPath(fileInfo.filename);

    onProgress?.({
      stage: 'downloading',
      progress: 0,
      message: `Downloading ${fileInfo.filename}...`,
    });

    // Download the file
    const downloadResult = await RNFS.downloadFile({
      fromUrl: fileInfo.url,
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
 * Setup NNUE file - intelligently find and download if missing
 * Returns object with success status and available files if user selection needed
 */
export const setupNNUE = async (
  onProgress?: (progress: SetupProgress) => void,
  selectedFile?: NNUEFileInfo,
): Promise<{success: boolean; needsSelection?: boolean; files?: NNUEFileInfo[]}> => {
  try {
    // Step 1: Check if NNUE file already exists
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
      return {success: true};
    }

    // Step 2: If user has selected a file, download it
    if (selectedFile) {
      console.log(`Downloading selected NNUE file: ${selectedFile.filename}`);
      const downloaded = await downloadNNUE(selectedFile, onProgress);
      return {success: downloaded};
    }

    // Step 3: Try downloading default NNUE file
    console.log('NNUE file not found, trying default download...');
    const defaultFile: NNUEFileInfo = {
      filename: DEFAULT_NNUE_FILENAME,
      url: DEFAULT_NNUE_URL,
      description: 'Default Chess NNUE network',
    };

    const defaultDownloaded = await downloadNNUE(defaultFile, onProgress);

    if (defaultDownloaded) {
      return {success: true};
    }

    // Step 4: Default download failed, search for NNUE files
    console.log('Default download failed, searching for NNUE files...');
    onProgress?.({
      stage: 'searching',
      message: 'Searching for NNUE files online...',
    });

    const foundFiles = await searchForNNUEFiles();

    if (foundFiles.length > 0) {
      // Return files for user selection
      onProgress?.({
        stage: 'manual_input',
        message: 'Found NNUE files. Please select one to download.',
        availableFiles: foundFiles,
        needsUserInput: true,
      });
      return {success: false, needsSelection: true, files: foundFiles};
    }

    // Step 5: No files found, request manual input
    console.log('No NNUE files found automatically.');
    onProgress?.({
      stage: 'manual_input',
      message: 'Could not find NNUE files. Please provide download URL manually.',
      needsUserInput: true,
    });

    return {success: false, needsSelection: true};
  } catch (error) {
    console.error('Error in setupNNUE:', error);
    onProgress?.({
      stage: 'error',
      message: 'Setup failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return {success: false};
  }
};

/**
 * Download NNUE from manual URL input
 */
export const downloadNNUEFromURL = async (
  url: string,
  onProgress?: (progress: SetupProgress) => void,
): Promise<boolean> => {
  try {
    // Extract filename from URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];

    if (!filename.endsWith('.nnue')) {
      throw new Error('URL must point to a .nnue file');
    }

    const fileInfo: NNUEFileInfo = {
      filename,
      url,
      description: 'Manually provided NNUE file',
    };

    return await downloadNNUE(fileInfo, onProgress);
  } catch (error) {
    console.error('Error downloading from manual URL:', error);
    onProgress?.({
      stage: 'error',
      message: 'Failed to download from URL',
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

export const getNNUEFilePath = (filename?: string): string => {
  return getNNUEPath(filename);
};

export const getManualDownloadInstructions = (): string => {
  return `To manually download NNUE file:

1. Visit: ${NNUE_INFO_PAGE}
2. Look for "Current Best NNUE Networks" section
3. Find the Chess NNUE network link (ends with .nnue)
4. Copy the download URL
5. Paste the URL in the app

Or download directly and place in:
${getEngineDirectory()}

The file should be named: nn-*.nnue (e.g., nn-46832cfbead3.nnue)`;
};
