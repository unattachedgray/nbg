import {NativeModules, NativeEventEmitter, Platform} from 'react-native';

/**
 * Bridge to native chess engine module
 * Provides JavaScript interface to Windows native code
 */

interface IEngineModule {
  SpawnEngine(enginePath: string): Promise<boolean>;
  SendCommand(command: string): Promise<boolean>;
  ReadOutput(): Promise<string>;
  StopEngine(): Promise<boolean>;
  IsEngineRunning(): Promise<boolean>;
}

// Get the native module
const EngineModuleNative = NativeModules.EngineModule as IEngineModule | undefined;

// Debug: Log what's available
if (__DEV__) {
  console.log('=== Native Module Debug ===');
  console.log('EngineModule exists:', !!EngineModuleNative);
  if (EngineModuleNative) {
    console.log('Available methods:', Object.keys(EngineModuleNative));
  }
  console.log('All native modules:', Object.keys(NativeModules));
}

/**
 * Native Engine Bridge
 * Handles communication with the native chess engine process
 */
export class NativeEngineBridge {
  private eventEmitter: NativeEventEmitter | null = null;
  private onOutputCallback: ((output: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor() {
    if (EngineModuleNative && Platform.OS === 'windows') {
      // Pass null to avoid removeListeners warning
      // Event emitter will still work with the module name
      this.eventEmitter = new NativeEventEmitter();
      this.setupEventListeners();
    }
  }

  /**
   * Check if native module is available
   */
  isAvailable(): boolean {
    return EngineModuleNative !== undefined && Platform.OS === 'windows';
  }

  /**
   * Spawn the chess engine process
   */
  async spawnEngine(enginePath: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Native engine module not available');
    }

    try {
      return await EngineModuleNative!.SpawnEngine(enginePath);
    } catch (error) {
      console.error('Failed to spawn engine:', error);
      throw error;
    }
  }

  /**
   * Send command to engine stdin
   */
  async sendCommand(command: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Native engine module not available');
    }

    try {
      return await EngineModuleNative!.SendCommand(command);
    } catch (error) {
      console.error('Failed to send command:', error);
      throw error;
    }
  }

  /**
   * Read output from engine stdout
   */
  async readOutput(): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Native engine module not available');
    }

    try {
      return await EngineModuleNative!.ReadOutput();
    } catch (error) {
      console.error('Failed to read output:', error);
      throw error;
    }
  }

  /**
   * Stop the engine process
   */
  async stopEngine(): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Native engine module not available');
    }

    try {
      return await EngineModuleNative!.StopEngine();
    } catch (error) {
      console.error('Failed to stop engine:', error);
      throw error;
    }
  }

  /**
   * Check if engine is running
   */
  async isEngineRunning(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return await EngineModuleNative!.IsEngineRunning();
    } catch (error) {
      console.error('Failed to check engine status:', error);
      return false;
    }
  }

  /**
   * Set callback for engine output
   */
  onOutput(callback: (output: string) => void): void {
    this.onOutputCallback = callback;
  }

  /**
   * Set callback for engine errors
   */
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Setup event listeners for native module events
   */
  private setupEventListeners(): void {
    if (!this.eventEmitter) {
      return;
    }

    // Listen for output events
    this.eventEmitter.addListener('OnEngineOutput', (output: string) => {
      if (this.onOutputCallback) {
        this.onOutputCallback(output);
      }
    });

    // Listen for error events
    this.eventEmitter.addListener('OnEngineError', (error: string) => {
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    });
  }

  /**
   * Cleanup event listeners
   */
  cleanup(): void {
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('OnEngineOutput');
      this.eventEmitter.removeAllListeners('OnEngineError');
    }
  }
}

// Export singleton instance
export const nativeEngineBridge = new NativeEngineBridge();
