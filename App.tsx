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
import {ToastNotification, Toast} from './src/components/ui/toast-notification';
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
  const [engineReady, setEngineReady] = useState(false);
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [currentFen, setCurrentFen] = useState('');
  const [analysis, setAnalysis] = useState<EngineAnalysis[]>([]);
  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(
    null,
  );
  const [suggestedMoveHighlight, setSuggestedMoveHighlight] = useState(false);
  const [moveSequence, setMoveSequence] = useState<string[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [player1Type, setPlayer1Type] = useState<'human' | 'ai'>('ai'); // Black (top)
  const [player2Type, setPlayer2Type] = useState<'human' | 'ai'>('human'); // White (bottom)
  const [toasts, setToasts] = useState<Toast[]>([]);

  const engineRef = useRef<XBoardEngine | null>(null);
  const gameRef = useRef(new Chess());
  const autoPlayStopRef = useRef(false);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, {id, message, type}]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const dismissAllToasts = () => {
    setToasts([]);
  };

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
        showToast(
          'Failed to download NNUE file. The app may not work correctly. Please check your internet connection and restart the app.',
          'error',
        );
        return;
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      showToast(
        'Failed to initialize the application. Please restart the app.',
        'error',
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
                showToast(
                  'Failed to download NNUE file from the provided URL. Please check the URL and try again.',
                  'error',
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
      try {
        const startingFen = gameRef.current.fen();
        const initialAnalysis = await engine.analyze(startingFen, 15);
        setAnalysis([initialAnalysis]);
        console.log('✅ Initial analysis complete');
      } catch (error) {
        console.error('Error getting initial analysis:', error);
      }
    } catch (error) {
      console.error('Failed to initialize engine:', error);
      showToast(
        'Failed to initialize chess engine. Make sure you are running on Windows desktop.',
        'error',
      );
    }
  };

  const handleMove = async (from: Square, to: Square) => {
    console.log(`Move: ${from} -> ${to}`);

    // Apply the move to gameRef
    gameRef.current.move({from, to, promotion: 'q'});

    // Update FEN
    const newFen = gameRef.current.fen();
    setCurrentFen(newFen);

    // Analyze position after move
    if (engineRef.current && engineReady) {
      try {
        const moveAnalysis = await engineRef.current.analyze(newFen, 15);
        setAnalysis([moveAnalysis]);
      } catch (error) {
        console.error('Error getting move analysis:', error);
      }
    }

    // Check if next player is AI and should auto-move
    const currentTurn = gameRef.current.turn();
    const currentPlayerType = currentTurn === 'w' ? player2Type : player1Type; // w=player2(white), b=player1(black)

    if (currentPlayerType === 'ai' && !gameRef.current.isGameOver()) {
      // Next player is AI, auto-trigger their move
      setTimeout(() => getEngineMove(), 500);
    }
  };

  const handleSuggestionClick = (move: string) => {
    // Parse move like "e2e4" into from/to squares
    if (move.length >= 4) {
      const from = move.substring(0, 2) as Square;
      const to = move.substring(2, 4) as Square;
      console.log(`Playing suggested move: ${from} -> ${to}`);
      handleMove(from, to);
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
      try {
        const currentAnalysis = await engineRef.current.analyze(
          gameRef.current.fen(),
          15,
        );
        setAnalysis([currentAnalysis]);
      } catch (error) {
        console.error('Error getting analysis:', error);
      }

      setIsEngineThinking(false);
    } catch (error) {
      console.error('Error getting engine move:', error);
      setIsEngineThinking(false);
    }
  };

  const handleNewGame = async () => {
    console.log('Starting new game');

    // Stop auto-play if running
    if (isAutoPlaying) {
      autoPlayStopRef.current = true;
      setIsAutoPlaying(false);
    }

    // Reset game mode to player vs AI
    setGameMode('player-vs-ai');

    // Reset game state
    gameRef.current.reset();
    setCurrentFen(gameRef.current.fen());
    setAnalysis([]);
    setMoveSequence([]);
    setSuggestedMoveHighlight(false);

    // Reset engine
    if (engineRef.current && engineReady) {
      await engineRef.current.newGame();

      // Get initial analysis of starting position
      try {
        const startingFen = gameRef.current.fen();
        const initialAnalysis = await engineRef.current.analyze(startingFen, 15);
        setAnalysis([initialAnalysis]);
        console.log('✅ Initial analysis complete');
      } catch (error) {
        console.error('Error getting initial analysis:', error);
      }

      // If player 2 (white/bottom) is AI, make first move
      if (player2Type === 'ai') {
        setTimeout(() => getEngineMove(), 1000);
      }
    }
  };

  const handleStartStop = async () => {
    if (isAutoPlaying) {
      // Stop auto-play
      autoPlayStopRef.current = true;
      setIsAutoPlaying(false);
      console.log('Stopping auto-play');
      return;
    }

    setIsAutoPlaying(true);
    autoPlayStopRef.current = false;
    console.log('Starting auto-play');

    if (!engineRef.current || !engineReady) {
      showToast('Engine not ready', 'warning');
      setIsAutoPlaying(false);
      return;
    }

    // Continuous play loop
    while (!gameRef.current.isGameOver() && !autoPlayStopRef.current) {
      const currentTurn = gameRef.current.turn();
      const currentPlayerType = currentTurn === 'w' ? player2Type : player1Type; // w=player2(white), b=player1(black)

      if (currentPlayerType === 'ai') {
        await getEngineMove();
        await new Promise<void>(resolve => setTimeout(resolve, 1000));
      } else {
        // Current player is human, wait for their move
        break;
      }
    }

    setIsAutoPlaying(false);

    if (gameRef.current.isGameOver()) {
      console.log('Game over!', gameRef.current.isCheckmate() ? 'Checkmate' : 'Draw');
      showToast(
        gameRef.current.isCheckmate()
          ? `Checkmate! ${gameRef.current.turn() === 'w' ? 'Black' : 'White'} wins!`
          : 'Draw - ' + (gameRef.current.isStalemate() ? 'Stalemate' : 'Draw'),
        'success',
      );
    } else {
      console.log('Auto-play stopped');
    }
  };

  const handleLearningMode = () => {
    if (gameMode === 'learning') {
      // Exit learning mode
      setGameMode('player-vs-ai');
      console.log('Exiting learning mode');
    } else {
      // Enter learning mode
      setGameMode('learning');
      console.log('Starting learning mode');

      // Learning mode shows analysis but doesn't auto-play
      // Analysis is always shown after each move in handleMove()
    }
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
              suggestedMove={
                analysis.length > 0 && analysis[0].pv.length > 0 && suggestedMoveHighlight
                  ? analysis[0].pv[0]
                  : undefined
              }
              moveSequence={moveSequence}
            />
          </View>

          {/* Analysis Panel */}
          <View style={styles.analysisContainer}>
            <AnalysisPanel
              analysis={analysis}
              onSuggestionClick={handleSuggestionClick}
              onSuggestionHover={setSuggestedMoveHighlight}
              onContinuationHover={setMoveSequence}
              currentTurn={gameRef.current.turn()}
              player1Type={player1Type}
              player2Type={player2Type}
            />
          </View>
        </View>

        {/* Controls Section */}
        <View style={styles.controlsSection}>
          <Text style={styles.controlsSectionTitle}>Controls</Text>

          {/* Player Selection */}
          <View style={styles.playerSelectionRow}>
            <View style={styles.playerControl}>
              <Text style={styles.playerLabel}>Player 1 (Black - Top):</Text>
              <Pressable
                style={styles.playerButton}
                onPress={() => setPlayer1Type(player1Type === 'human' ? 'ai' : 'human')}>
                <Text style={styles.playerButtonText}>
                  {player1Type === 'human' ? 'Human' : 'AI'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.playerControl}>
              <Text style={styles.playerLabel}>Player 2 (White - Bottom):</Text>
              <Pressable
                style={styles.playerButton}
                onPress={() => setPlayer2Type(player2Type === 'human' ? 'ai' : 'human')}>
                <Text style={styles.playerButtonText}>
                  {player2Type === 'human' ? 'Human' : 'AI'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Game Control Buttons */}
          <View style={styles.gameControls}>
            <Pressable style={styles.controlButton} onPress={handleNewGame}>
              <Text style={styles.controlButtonText}>New Game</Text>
            </Pressable>
            {player1Type === 'ai' && player2Type === 'ai' && (
              <Pressable
                style={[
                  styles.controlButton,
                  isAutoPlaying && styles.stopButton,
                ]}
                onPress={handleStartStop}>
                <Text style={styles.controlButtonText}>
                  {isAutoPlaying ? 'Stop' : 'Start'}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.controlButton,
                gameMode === 'learning' && styles.activeButton,
              ]}
              onPress={handleLearningMode}>
              <Text style={styles.controlButtonText}>
                {gameMode === 'learning' ? 'Exit Learning' : 'Learning Mode'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Toast Notifications */}
      <ToastNotification
        toasts={toasts}
        onDismiss={dismissToast}
        onDismissAll={dismissAllToasts}
      />
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
    gap: 16,
    minHeight: 400,
    alignItems: 'flex-start',
  },
  boardContainer: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 400,
    minWidth: 350,
    maxWidth: 600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisContainer: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 400,
    minWidth: 300,
    maxWidth: 600,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlsSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  playerSelectionRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  playerControl: {
    flex: 1,
    minWidth: 250,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerLabel: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '600',
  },
  playerButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  playerButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  gameControls: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
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
  stopButton: {
    backgroundColor: '#F44336',
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default App;
