import React, {useState, useEffect, useRef} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  StatusBar,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {ChessBoard} from './src/components/board/chess-board';
import {AnalysisPanel} from './src/components/analysis/analysis-panel';
import {TermText} from './src/components/ui/tooltip';
import {GameVariant, GameMode, Square, EngineAnalysis} from './src/types/game';
import {createXBoardEngine, XBoardEngine} from './src/services/xboard-engine';
import {Chess} from 'chess.js';
import {
  setupNNUE,
  SetupProgress,
  NNUEFileInfo,
  downloadNNUEFromURL,
  getManualDownloadInstructions,
} from './src/utils/setup-nnue';

function App(): React.JSX.Element {
  const [selectedVariant, setSelectedVariant] =
    useState<GameVariant>('chess');
  const [gameMode, setGameMode] = useState<GameMode>('player-vs-ai');
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [engineReady, setEngineReady] = useState(false);
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [currentFen, setCurrentFen] = useState('');
  const [analysis, setAnalysis] = useState<EngineAnalysis[]>([]);
  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(
    null,
  );

  const engineRef = useRef<XBoardEngine | null>(null);
  const gameRef = useRef(new Chess());

  // Initialize NNUE and engine on mount
  useEffect(() => {
    initializeApp();

    return () => {
      // Cleanup on unmount
      if (engineRef.current) {
        engineRef.current.quit();
      }
    };
  }, [selectedVariant]);

  const initializeApp = async () => {
    try {
      // For Windows, NNUE file is handled via setup script before build
      // Skip automatic download on Windows to avoid react-native-fs issues
      if (Platform.OS === 'windows') {
        console.log('Windows platform detected - NNUE file managed via setup script');
        await initializeEngine();
        return;
      }

      // Step 1: Setup NNUE file (download if missing) - Android/iOS only
      console.log('Setting up NNUE file...');
      const result = await setupNNUE(progress => {
        setSetupProgress(progress);
        console.log(`NNUE Setup: ${progress.message}`);
      });

      if (result.success) {
        // NNUE file ready, proceed to initialize engine
        await initializeEngine();
      } else if (result.needsSelection) {
        // Need user to select a file or provide URL
        if (result.files && result.files.length > 0) {
          // Show file selection dialog
          showFileSelectionDialog(result.files);
        } else {
          // Show manual URL input dialog
          showManualURLDialog();
        }
        return; // Don't initialize engine yet
      } else {
        Alert.alert(
          'Setup Error',
          'Failed to download NNUE file. The app may not work correctly. Please check your internet connection and restart the app.',
        );
        return;
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize the application. Please restart the app.',
      );
    } finally {
      // Clear setup progress after a short delay
      setTimeout(() => setSetupProgress(null), 2000);
    }
  };

  const showFileSelectionDialog = (files: NNUEFileInfo[]) => {
    const fileOptions = files.map(
      (f, i) => `${i + 1}. ${f.description || f.filename}`,
    );

    Alert.alert(
      'Select NNUE File',
      `Found ${files.length} NNUE files. Please select one:\n\n${fileOptions.join('\n')}\n\nOr tap "Manual Input" to provide a custom URL.`,
      [
        ...files.map((file, index) => ({
          text: `${index + 1}`,
          onPress: async () => {
            const result = await setupNNUE(
              progress => setSetupProgress(progress),
              file,
            );
            if (result.success) {
              await initializeEngine();
            }
          },
        })),
        {
          text: 'Manual Input',
          onPress: () => showManualURLDialog(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  };

  const showManualURLDialog = () => {
    const instructions = getManualDownloadInstructions();

    Alert.prompt(
      'Manual NNUE Download',
      instructions,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Download',
          onPress: async url => {
            if (url) {
              const success = await downloadNNUEFromURL(url, progress =>
                setSetupProgress(progress),
              );
              if (success) {
                await initializeEngine();
              } else {
                Alert.alert(
                  'Download Failed',
                  'Failed to download NNUE file from the provided URL. Please check the URL and try again.',
                );
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'url',
    );
  };

  const initializeEngine = async () => {
    try {
      console.log('Initializing chess engine...');
      setEngineReady(false);

      const engine = await createXBoardEngine(selectedVariant);
      engineRef.current = engine;

      setEngineReady(true);
      console.log('✅ Engine ready!');

      // Get initial analysis of starting position
      if (showAnalysis) {
        try {
          const startingFen = gameRef.current.fen();
          const initialAnalysis = await engine.analyze(startingFen, 15);
          setAnalysis([initialAnalysis]);
          console.log('✅ Initial analysis complete');
        } catch (error) {
          console.error('Error getting initial analysis:', error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize engine:', error);
      Alert.alert(
        'Engine Error',
        'Failed to initialize chess engine. Make sure you are running on Windows desktop.',
      );
    }
  };

  const handleMove = async (from: Square, to: Square) => {
    console.log(`Player move: ${from} -> ${to}`);

    // Apply the move to gameRef
    gameRef.current.move({from, to, promotion: 'q'});

    // Update FEN
    const newFen = gameRef.current.fen();
    setCurrentFen(newFen);

    // Analyze position after player move
    if ((showAnalysis || gameMode === 'learning') && engineRef.current && engineReady) {
      try {
        const moveAnalysis = await engineRef.current.analyze(newFen, 15);
        setAnalysis([moveAnalysis]);
      } catch (error) {
        console.error('Error getting move analysis:', error);
      }
    }

    if (gameMode === 'player-vs-ai' && engineRef.current && engineReady) {
      // Get AI response
      await getEngineMove();
    }
  };

  const getEngineMove = async () => {
    if (!engineRef.current || !engineReady) {
      return;
    }

    try {
      setIsEngineThinking(true);

      // Tell engine about current position and get move
      const fen = gameRef.current.fen();
      const engineMove = await engineRef.current.getBestMove(fen, 2000);

      console.log(`Engine move: ${engineMove}`);

      // Make the engine's move on the board
      gameRef.current.move(engineMove as any);
      setCurrentFen(gameRef.current.fen());

      // Update analysis after the move (after each complete round)
      if (showAnalysis || gameMode === 'learning') {
        try {
          const currentAnalysis = await engineRef.current.analyze(
            gameRef.current.fen(),
            15,
          );
          setAnalysis([currentAnalysis]);
        } catch (error) {
          console.error('Error getting analysis:', error);
        }
      }

      setIsEngineThinking(false);
    } catch (error) {
      console.error('Error getting engine move:', error);
      setIsEngineThinking(false);
    }
  };

  const handleNewGame = async () => {
    console.log('Starting new game');

    // Reset game
    gameRef.current.reset();
    setCurrentFen(gameRef.current.fen());

    // Reset engine
    if (engineRef.current && engineReady) {
      await engineRef.current.newGame();
    }
  };

  const handleAIvsAI = async () => {
    setGameMode('ai-vs-ai');
    console.log('Starting AI vs AI mode');

    if (!engineRef.current || !engineReady) {
      Alert.alert('AI vs AI', 'Engine not ready');
      return;
    }

    // AI vs AI game loop
    while (!gameRef.current.isGameOver()) {
      await getEngineMove();
      await new Promise<void>(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }

    console.log('Game over!', gameRef.current.isCheckmate() ? 'Checkmate' : 'Draw');
  };

  const handleLearningMode = () => {
    setGameMode('learning');
    setShowAnalysis(true);
    console.log('Starting learning mode');

    // In learning mode, show continuous analysis
    // TODO: Implement continuous analysis
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header - Compact */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Neural Board Games</Text>

          {/* Engine Status - Inline */}
          <View style={styles.engineStatus}>
            {setupProgress &&
            setupProgress.stage !== 'complete' &&
            setupProgress.stage !== 'manual_input' ? (
              <>
                <ActivityIndicator
                  size="small"
                  color={
                    setupProgress.stage === 'searching' ? '#9C27B0' : '#2196F3'
                  }
                />
                <Text style={styles.engineStatusText}>
                  {setupProgress.message}
                  {setupProgress.progress !== undefined &&
                    ` ${setupProgress.progress}%`}
                </Text>
              </>
            ) : !engineReady ? (
              <>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.engineStatusText}>Loading...</Text>
              </>
            ) : isEngineThinking ? (
              <>
                <ActivityIndicator size="small" color="#FF9800" />
                <Text style={styles.engineStatusText}>Thinking...</Text>
              </>
            ) : (
              <>
                <View style={styles.engineStatusDot} />
                <Text style={styles.engineStatusText}>Ready</Text>
              </>
            )}
          </View>

          {/* Variant Dropdown */}
          <View style={styles.variantSelector}>
            <Text style={styles.variantLabel}>Game: </Text>
            <Pressable
              style={styles.variantDropdown}
              onPress={() => {
                const variants: GameVariant[] = ['chess', 'janggi'];
                const currentIndex = variants.indexOf(selectedVariant);
                const nextVariant = variants[(currentIndex + 1) % variants.length];
                setSelectedVariant(nextVariant);
              }}>
              <Text style={styles.variantDropdownText}>
                {selectedVariant === 'chess' ? 'Chess' : 'Janggi'} ▼
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Main Content - Compact Layout */}
      <View style={styles.mainContent}>
        {/* Top Row: Board + Analysis */}
        <View style={styles.topRow}>
          {/* Chess Board */}
          <View style={styles.boardContainer}>
            <ChessBoard
              variant={selectedVariant}
              onMove={handleMove}
              fen={currentFen || undefined}
            />
          </View>

          {/* Analysis Panel */}
          {showAnalysis && (
            <View style={styles.analysisContainer}>
              <AnalysisPanel analysis={analysis} />
            </View>
          )}
        </View>

        {/* Bottom Row: Controls */}
        <View style={styles.bottomRow}>
          <View style={styles.controls}>
            <Pressable style={styles.controlButton} onPress={handleNewGame}>
              <Text style={styles.controlButtonText}>New Game</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={handleAIvsAI}>
              <Text style={styles.controlButtonText}>
                AI vs AI {gameMode === 'ai-vs-ai' && '✓'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.controlButton}
              onPress={handleLearningMode}>
              <Text style={styles.controlButtonText}>
                Learning {gameMode === 'learning' && '✓'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.controlButton, styles.toggleButton]}
              onPress={() => setShowAnalysis(!showAnalysis)}>
              <Text style={styles.controlButtonText}>
                {showAnalysis ? 'Hide' : 'Show'} Analysis
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  engineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  engineStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  engineStatusText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 6,
  },
  variantSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  variantLabel: {
    fontSize: 12,
    color: '#666666',
    marginRight: 6,
  },
  variantDropdown: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  variantDropdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    gap: 16,
    minHeight: 400,
  },
  boardContainer: {
    flex: 1,
    minWidth: 350,
    maxWidth: 600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisContainer: {
    flex: 1,
    minWidth: 300,
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomRow: {
    paddingTop: 16,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  controlButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  toggleButton: {
    backgroundColor: '#9C27B0',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default App;
