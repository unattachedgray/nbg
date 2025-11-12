import {EngineAnalysis, GameVariant} from '../types/game';
import {Platform} from 'react-native';
import {nativeEngineBridge} from './native-engine-bridge';

export interface XBoardEngineConfig {
  enginePath: string;
  variant: GameVariant;
}

/**
 * XBoard Protocol Engine Interface
 *
 * Uses XBoard protocol (simpler than UCI) for communication with Fairy-Stockfish
 * This is a RULES-BASED chess engine:
 * - Move generation: Chess rules (algorithmic)
 * - Search: Alpha-beta pruning
 * - Evaluation: NNUE (local neural network)
 * - NO AI APIs needed!
 */
export class XBoardEngine {
  private enginePath: string;
  private variant: GameVariant;
  private isReady: boolean = false;
  private callbacks: Map<string, (data: any) => void> = new Map();
  private outputBuffer: string = '';
  private outputCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: XBoardEngineConfig) {
    this.enginePath = config.enginePath;
    this.variant = config.variant;

    // Set up output listener
    nativeEngineBridge.onOutput((data) => {
      this.handleOutput(data);
    });

    nativeEngineBridge.onError((error) => {
      console.error(`Engine Error: ${error}`);
    });
  }

  async initialize(): Promise<void> {
    console.log(`Initializing XBoard Engine for ${this.variant}`);

    // Check if native bridge is available (Windows only for now)
    if (!nativeEngineBridge.isAvailable()) {
      throw new Error(
        'Native engine bridge not available. Windows desktop app required.',
      );
    }

    // Get absolute path to engine
    const absolutePath = await this.getEnginePath();
    console.log(`Spawning engine at: ${absolutePath}`);

    // Spawn the engine process
    await nativeEngineBridge.spawnEngine(absolutePath);

    // Start polling for output
    this.startOutputPolling();

    // Initialize XBoard protocol
    await this.sendCommand('xboard');
    await this.sendCommand('protover 2');
    await this.waitForFeature('done=1');

    // Set variant if not standard chess
    if (this.variant !== 'chess') {
      await this.sendCommand(`variant ${this.variant}`);

      // Load variant-specific NNUE file
      await this.loadVariantNNUE();
    }

    // Set up engine options
    await this.sendCommand('post'); // Enable thinking output

    this.isReady = true;
    console.log('✅ XBoard Engine initialized');
  }

  async sendCommand(command: string): Promise<void> {
    console.log(`XBoard >>> ${command}`);

    if (nativeEngineBridge.isAvailable()) {
      await nativeEngineBridge.sendCommand(command);
    } else {
      throw new Error('Native engine bridge not available');
    }
  }

  /**
   * Get absolute path to engine executable
   */
  private async getEnginePath(): Promise<string> {
    if (Platform.OS === 'windows') {
      // Windows: Get the full path to the engine in the app package
      // In Debug mode, this is in the project directory
      // In Release mode, this is in the installed package
      const engineName = 'fairy-stockfish-largeboard_x86-64-bmi2.exe';

      // Full absolute path to the engine
      const fullPath = `C:\\Users\\unatt\\OneDrive\\dev\\nbg\\ChessApp\\windows\\chessapp\\Assets\\engines\\${engineName}`;

      console.log('Using engine path:', fullPath);
      return fullPath;
    } else {
      // Other platforms: Use the Linux binary
      return this.enginePath;
    }
  }

  /**
   * Change to a different game variant
   */
  async setVariant(variant: GameVariant): Promise<void> {
    console.log(`Changing variant from ${this.variant} to ${variant}`);
    this.variant = variant;

    // Send variant command to engine
    if (variant !== 'chess') {
      await this.sendCommand(`variant ${variant}`);
    } else {
      await this.sendCommand('variant normal');
    }

    // Load variant-specific NNUE file
    await this.loadVariantNNUE();

    console.log(`✅ Variant changed to ${variant}`);
  }

  /**
   * Load variant-specific NNUE file
   *
   * NOTE: XBoard protocol doesn't support runtime NNUE loading via commands.
   * Fairy-Stockfish should automatically load the correct NNUE file for each variant
   * from the engines directory. If not, NNUE must be specified via command-line args.
   */
  private async loadVariantNNUE(): Promise<void> {
    // XBoard doesn't support setoption command (that's UCI)
    // Fairy-Stockfish should auto-load NNUE files for variants
    // Just log what we expect the engine to use
    const nnueFiles: Record<GameVariant, string> = {
      chess: 'nn-46832cfbead3.nnue',
      janggi: 'janggi-9991472750de.nnue',
      janggi2: 'janggi-9991472750de.nnue', // Same as janggi
      janggi3: '', // Standalone, doesn't use engine
      xiangqi: 'xiangqi-nnue.nnue',
      shogi: 'shogi-nnue.nnue',
    };

    const nnueFile = nnueFiles[this.variant];
    if (nnueFile) {
      console.log(`Expected NNUE file for ${this.variant}: ${nnueFile}`);
      console.log(`(Fairy-Stockfish should load this automatically)`);
    }
  }

  /**
   * Start polling for engine output
   */
  private startOutputPolling(): void {
    this.outputCheckInterval = setInterval(async () => {
      try {
        const output = await nativeEngineBridge.readOutput();
        if (output) {
          this.handleOutput(output);
        }
      } catch (error) {
        console.error('Error reading engine output:', error);
      }
    }, 50); // Poll every 50ms
  }

  async newGame(): Promise<void> {
    this.sendCommand('new');
    this.sendCommand('force'); // Enter force mode to set up position
  }

  async setPosition(fen: string): Promise<void> {
    this.sendCommand('force');
    this.sendCommand(`setboard ${fen}`);
  }

  async getBestMove(fen: string, timeMs: number = 1000): Promise<string> {
    await this.setPosition(fen);

    return new Promise((resolve) => {
      const callback = (data: string) => {
        // XBoard sends moves as "move e2e4"
        if (data.startsWith('move ')) {
          const move = data.substring(5).trim();
          this.callbacks.delete('move');
          resolve(move);
        }
      };

      this.callbacks.set('move', callback);

      // Set time control and start thinking
      this.sendCommand(`st ${timeMs / 1000}`); // Set time in seconds
      this.sendCommand('go'); // Start thinking
    });
  }

  async analyze(
    fen: string,
    depth: number = 20,
  ): Promise<EngineAnalysis> {
    await this.setPosition(fen);

    return new Promise((resolve) => {
      let currentAnalysis: Partial<EngineAnalysis> = {
        depth: 0,
        score: 0,
        bestMove: '',
        pv: [],
        nodes: 0,
        nps: 0,
        time: 0,
      };

      const callback = (data: string) => {
        // Parse XBoard thinking output
        // Format: ply score time nodes pv...
        // Example: 12 +145 1234 567890 e2e4 e7e5 g1f3

        if (data.match(/^\d+\s+[+-]?\d+/)) {
          const parts = data.split(/\s+/).filter(p => p.length > 0);
          if (parts.length >= 4) {
            currentAnalysis.depth = parseInt(parts[0], 10);
            currentAnalysis.score = parseInt(parts[1], 10);
            currentAnalysis.time = parseInt(parts[2], 10) * 10; // Convert to ms
            currentAnalysis.nodes = parseInt(parts[3], 10);
            currentAnalysis.nps = currentAnalysis.nodes / (currentAnalysis.time / 1000);

            // Filter out numeric fields, keep only moves (format: e2e4, g1f3, etc.)
            const moves = parts.slice(4).filter(move =>
              /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)
            );
            currentAnalysis.pv = moves;
            currentAnalysis.bestMove = moves[0] || '';
          }
        }

        if (data.startsWith('move ')) {
          this.callbacks.delete('analysis');
          resolve(currentAnalysis as EngineAnalysis);
        }
      };

      this.callbacks.set('analysis', callback);

      // Set search depth and start analyzing
      this.sendCommand(`sd ${depth}`); // Set depth
      this.sendCommand('go'); // Start thinking
    });
  }

  async makeMove(move: string): Promise<void> {
    // Tell engine about player's move
    this.sendCommand('force'); // Ensure force mode
    this.sendCommand(move); // Send the move
  }

  async hint(): Promise<string> {
    return new Promise((resolve) => {
      const callback = (data: string) => {
        // XBoard returns hint as "Hint: e2e4"
        if (data.startsWith('Hint: ')) {
          const hint = data.substring(6).trim();
          this.callbacks.delete('hint');
          resolve(hint);
        }
      };

      this.callbacks.set('hint', callback);
      this.sendCommand('hint');
    });
  }

  private waitForFeature(feature: string): Promise<void> {
    return new Promise((resolve) => {
      const callback = (data: string) => {
        if (data.includes(feature)) {
          this.callbacks.delete('feature');
          resolve();
        }
      };
      this.callbacks.set('feature', callback);
    });
  }

  async stop(): Promise<void> {
    this.sendCommand('?'); // Interrupt thinking
  }

  async quit(): Promise<void> {
    // Stop output polling
    if (this.outputCheckInterval) {
      clearInterval(this.outputCheckInterval);
      this.outputCheckInterval = null;
    }

    // Send quit command
    await this.sendCommand('quit');

    // Stop the engine process
    if (nativeEngineBridge.isAvailable()) {
      await nativeEngineBridge.stopEngine();
    }

    // Cleanup
    nativeEngineBridge.cleanup();
    this.isReady = false;
    console.log('✅ XBoard Engine shut down');
  }

  // Handle output from engine
  handleOutput(data: string): void {
    this.outputBuffer += data;
    const lines = this.outputBuffer.split('\n');
    this.outputBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        console.log(`XBoard <<< ${trimmed}`);
        this.callbacks.forEach((callback) => callback(trimmed));
      }
    }
  }
}

/**
 * Factory function to create XBoard engine instance
 * Uses the Windows .exe for native Windows apps
 */
export async function createXBoardEngine(
  variant: GameVariant = 'chess',
): Promise<XBoardEngine> {
  const enginePath = Platform.select({
    windows: 'fairy-stockfish-largeboard_x86-64-bmi2.exe',
    android: 'fairy-stockfish',
    ios: 'fairy-stockfish',
    default: 'fairy-stockfish',
  }) || 'fairy-stockfish';

  const engine = new XBoardEngine({
    enginePath,
    variant,
  });

  await engine.initialize();
  return engine;
}

/**
 * Convert XBoard move notation to SAN (Standard Algebraic Notation)
 * XBoard uses coordinate notation (e2e4), chess.js uses SAN (e4)
 */
export function xboardToSan(xboardMove: string): string {
  // This will be implemented using chess.js move validation
  // For now, return the coordinate notation
  return xboardMove;
}

/**
 * Convert SAN to XBoard coordinate notation
 */
export function sanToXboard(san: string, fen: string): string {
  // This will use chess.js to convert
  // For now, pass through
  return san;
}
