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
  Dimensions,
} from 'react-native';
import {ChessBoard} from './src/components/board/chess-board';
import {JanggiBoard} from './src/components/board/janggi-board';
import {Janggi2Board} from './src/components/board/janggi2-board';
import {Janggi3Board} from './src/components/board/janggi3-board';
import {AnalysisPanel} from './src/components/analysis/analysis-panel';
import {TermText} from './src/components/ui/tooltip';
import {ToastNotification, Toast} from './src/components/ui/toast-notification';
import {GameVariant, GameMode, Square, EngineAnalysis} from './src/types/game';
import {createXBoardEngine, XBoardEngine} from './src/services/xboard-engine';
import {Chess} from 'chess.js';
import {applyMoveToFEN, validateJanggiMove} from './src/utils/janggi-fen';
import {
  setupNNUE,
  SetupProgress,
  NNUEFileInfo,
  downloadNNUEFromURL,
  getManualDownloadInstructions,
} from './src/utils/setup-nnue';
import {
  Board as Janggi3Board_Type,
  Position,
  createInitialBoard,
  applyMove as applyJanggi3Move,
  getGameResult,
} from './src/game/janggi3-game';
import {getLegalMoves as getJanggi3LegalMoves} from './src/game/janggi3-moves';
import {getAIMove as getJanggi3AIMove} from './src/game/janggi3-ai';
import {
  Board as Janggi2Board_Type,
  Position as Janggi2Position,
  createInitialBoard as createJanggi2InitialBoard,
  applyMove as applyJanggi2Move,
  getGameResult as getJanggi2GameResult,
} from './src/game/janggi2-game';
import {getLegalMoves as getJanggi2LegalMoves} from './src/game/janggi2-moves';
import {getAIMove as getJanggi2AIMove} from './src/game/janggi2-ai';

function App(): React.JSX.Element {
  const [selectedVariant, setSelectedVariant] =
    useState<GameVariant>('chess');
  const [gameMode, setGameMode] = useState<GameMode>('player-vs-ai');
  const [engineReady, setEngineReady] = useState(false);
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentFen, setCurrentFen] = useState(new Chess().fen());
  const [analysis, setAnalysis] = useState<EngineAnalysis[]>([]);
  const [analysisTurn, setAnalysisTurn] = useState<'w' | 'b' | null>(null); // Track which turn the analysis is for
  const [analysisFen, setAnalysisFen] = useState<string>(new Chess().fen()); // Track which FEN position the analysis is for
  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(
    null,
  );
  const [hoveredMove, setHoveredMove] = useState<string | null>(null);
  const [moveSequence, setMoveSequence] = useState<string[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [player1Type, setPlayer1Type] = useState<'human' | 'ai'>('ai'); // Black (top)
  const [player2Type, setPlayer2Type] = useState<'human' | 'ai'>('human'); // White (bottom)
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showVariantDropdown, setShowVariantDropdown] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<'w' | 'b'>('w'); // Track whose turn it is
  const [gameStatus, setGameStatus] = useState<string>(''); // Track check/checkmate/stalemate
  const [fastMode, setFastMode] = useState(false); // Disable rendering for AI vs AI
  const [fastModeMovesPlayed, setFastModeMovesPlayed] = useState(0); // Track moves in fast mode
  const [stats, setStats] = useState({
    whiteWins: 0,
    blackWins: 0,
    draws: 0,
    totalGames: 0,
  });
  const [currentGameMoves, setCurrentGameMoves] = useState(0); // Track moves in current game
  const [recentMoveTimestamps, setRecentMoveTimestamps] = useState<number[]>([]); // Track move timestamps for last 2 seconds
  const [movesPerMinute, setMovesPerMinute] = useState(0); // Current game moves per minute (last 2 seconds * 30)
  const [sectionPositions, setSectionPositions] = useState({
    board: {x: 0, y: 0}, // Board on the left
    analysis: {x: 440, y: 0}, // Suggestions to the right of board
    controls: {x: 440, y: 320}, // Controls under suggestions on right
  });
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });

  // Janggi3 standalone game state
  const [janggi3Board, setJanggi3Board] = useState<Janggi3Board_Type>(createInitialBoard());
  const [janggi3Turn, setJanggi3Turn] = useState<boolean>(true); // true = Han (red), false = Cho (blue)
  const [janggi3HighlightedMoves, setJanggi3HighlightedMoves] = useState<Position[]>([]);

  // Janggi2 engine-integrated game state
  const [janggi2Board, setJanggi2Board] = useState<Janggi2Board_Type>(createJanggi2InitialBoard());
  const [janggi2Turn, setJanggi2Turn] = useState<boolean>(true); // true = Han (red), false = Cho (blue)
  const [janggi2HighlightedMoves, setJanggi2HighlightedMoves] = useState<Janggi2Position[]>([]);

  const engineRef = useRef<XBoardEngine | null>(null);
  const gameRef = useRef(new Chess());
  const autoPlayStopRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisRequestIdRef = useRef(0); // Track which analysis request is current

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

  const resetLayout = () => {
    // Reset to default layout: Board left, Suggestions and Controls on right
    const defaultPositions = {
      board: {x: 0, y: 0},
      analysis: {x: 440, y: 0}, // Right of board (400px board + 40px gap)
      controls: {x: 440, y: 320}, // Below analysis on right side
    };
    setSectionPositions(defaultPositions);
    showToast('Layout reset to default', 'info');
  };

  const resetStats = () => {
    const emptyStats = {
      whiteWins: 0,
      blackWins: 0,
      draws: 0,
      totalGames: 0,
    };
    setStats(emptyStats);
    showToast('Statistics reset', 'info');
  };

  const loadSavedData = async () => {
    try {
      if (Platform.OS !== 'windows') {
        const RNFS = require('react-native-fs');
        const statsPath = `${RNFS.DocumentDirectoryPath}/chess-stats.json`;

        // Check if file exists
        const fileExists = await RNFS.exists(statsPath);
        if (fileExists) {
          const fileContent = await RNFS.readFile(statsPath, 'utf8');
          const savedData = JSON.parse(fileContent);

          // Load game stats
          if (savedData.stats) {
            setStats(savedData.stats);
          }

          // Load section positions
          if (savedData.sectionPositions) {
            setSectionPositions(savedData.sectionPositions);
          }

          // Window size will be set by Dimensions listener
          console.log('Loaded saved data:', savedData);
        }
      } else {
        // For Windows, try to load from localStorage equivalent or just use defaults
        console.log('Using default positions for Windows');
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  };

  const saveUIStateImmediate = async () => {
    try {
      const dataToSave = {
        stats,
        sectionPositions,
        windowSize,
        lastUpdated: new Date().toISOString(),
      };

      if (Platform.OS !== 'windows') {
        const RNFS = require('react-native-fs');
        const statsPath = `${RNFS.DocumentDirectoryPath}/chess-stats.json`;
        await RNFS.writeFile(statsPath, JSON.stringify(dataToSave, null, 2), 'utf8');
        console.log('UI state saved');
      } else {
        // For Windows, just log to console
        console.log('UI state (Windows):', dataToSave);
      }
    } catch (error) {
      console.error('Failed to save UI state:', error);
    }
  };

  const saveUIState = () => {
    // Debounce saves to avoid excessive writes during resize/drag
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveUIStateImmediate();
    }, 1000); // Save 1 second after last change
  };

  const recordGameResult = async () => {
    if (!gameRef.current.isGameOver()) {
      console.log('Game not over, not recording result');
      return;
    }

    const newStats = {...stats};
    newStats.totalGames += 1;

    if (gameRef.current.isCheckmate()) {
      // Winner is the opposite of current turn (current turn is the loser)
      if (currentTurn === 'w') {
        newStats.blackWins += 1;
        console.log('Recording Black win');
      } else {
        newStats.whiteWins += 1;
        console.log('Recording White win');
      }
    } else {
      // Draw (stalemate, insufficient material, etc.)
      newStats.draws += 1;
      console.log('Recording Draw - isStalemate:', gameRef.current.isStalemate(),
                  'isDraw:', gameRef.current.isDraw(),
                  'isInsufficientMaterial:', gameRef.current.isInsufficientMaterial(),
                  'isThreefoldRepetition:', gameRef.current.isThreefoldRepetition());
    }

    console.log('New stats:', newStats);
    setStats(newStats);
    // UI state will be saved automatically via the useEffect hook
  };

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  // Track window size changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({window}) => {
      setWindowSize({width: window.width, height: window.height});
    });

    // Set initial window size
    const initialWindow = Dimensions.get('window');
    setWindowSize({width: initialWindow.width, height: initialWindow.height});

    return () => subscription?.remove();
  }, []);

  // Save UI state whenever positions or window size change (debounced)
  useEffect(() => {
    if (windowSize.width > 0 && windowSize.height > 0) {
      saveUIState();
    }
  }, [sectionPositions, windowSize]);

  // Save immediately when stats change (game result)
  useEffect(() => {
    if (stats.totalGames > 0) {
      saveUIStateImmediate();
    }
  }, [stats]);

  // Calculate moves per minute based on last 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const twoSecondsAgo = now - 2000;

      // Filter timestamps to only include moves in last 2 seconds
      const recentMoves = recentMoveTimestamps.filter(timestamp => timestamp > twoSecondsAgo);

      // Update the filtered list
      setRecentMoveTimestamps(recentMoves);

      // Calculate moves per minute: (moves in 2 seconds) * 30
      setMovesPerMinute(recentMoves.length * 30);
    }, 500); // Update twice per second for more responsiveness

    return () => clearInterval(interval);
  }, [recentMoveTimestamps]);

  // Initialize NNUE and engine on mount (only once)
  useEffect(() => {
    initializeApp();

    return () => {
      // Cleanup on unmount
      if (engineRef.current) {
        engineRef.current.quit();
      }
    };
  }, []); // Empty dependency array - only run once

  // Handle variant changes without reinitializing engine
  useEffect(() => {
    console.log('Variant change detected:', selectedVariant, 'Engine ready:', engineReady);
    // Janggi3 doesn't need engine, switch immediately
    // Janggi2 needs engine but we can still try to switch (will check inside)
    if (selectedVariant === 'janggi3' || selectedVariant === 'janggi2') {
      switchVariant(selectedVariant);
    } else if (engineRef.current && engineReady) {
      switchVariant(selectedVariant);
    }
  }, [selectedVariant, engineReady]);

  // Re-trigger analysis when player types change to ensure suggestions show up
  useEffect(() => {
    const triggerAnalysis = async () => {
      // Skip analysis for janggi3 and janggi2 (don't use engine)
      if (selectedVariant === 'janggi3' || selectedVariant === 'janggi2') return;

      // Only analyze if engine is ready and at least one player is human
      if (!engineRef.current || !engineReady) return;
      if (player1Type === 'ai' && player2Type === 'ai') return;

      // Check if current player is human
      const currentPlayerType = currentTurn === 'w' ? player2Type : player1Type;
      if (currentPlayerType === 'human') {
        try {
          setIsAnalyzing(true);
          const fen = selectedVariant === 'janggi' ? currentFen : gameRef.current.fen();
          const moveAnalysis = await engineRef.current.analyze(fen, 15);
          setAnalysis([moveAnalysis]);
          setAnalysisTurn(currentTurn);
          setAnalysisFen(fen);
        } catch (error) {
          console.error('Error analyzing after player type change:', error);
        } finally {
          setIsAnalyzing(false);
        }
      }
    };

    triggerAnalysis();
  }, [player1Type, player2Type, janggi2Board, janggi2Turn]);

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

      // Map janggi2 to janggi for engine (same rules, different pieces)
      const engineVariant = selectedVariant === 'janggi2' ? 'janggi' : selectedVariant;
      const engine = await createXBoardEngine(engineVariant);
      engineRef.current = engine;

      setEngineReady(true);
      console.log('✅ Engine ready!');

      // Get initial analysis of starting position
      try {
        const startingFen = gameRef.current.fen();
        const initialAnalysis = await engine.analyze(startingFen, 15);
        setAnalysis([initialAnalysis]);
        setAnalysisTurn('w'); // Starting position is white's turn
        setAnalysisFen(startingFen); // Store the FEN this analysis is for
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

  const switchVariant = async (variant: GameVariant) => {
    try {
      console.log(`Switching to variant: ${variant}`);

      // Janggi3 is standalone - no engine needed
      if (variant === 'janggi3') {
        const initialBoard = createInitialBoard();
        setJanggi3Board(initialBoard);
        setJanggi3Turn(true); // Han starts
        setJanggi3HighlightedMoves([]);

        // Clear engine analysis (not used for janggi3)
        setAnalysis([]);
        setAnalysisTurn(null);
        setAnalysisFen('');

        // If Han (bottom/player2) is AI, make first move
        if (player2Type === 'ai') {
          Promise.resolve().then(() => makeJanggi3AIMove(initialBoard, true));
        }

        // Reset game counters
        setCurrentGameMoves(0);
        setRecentMoveTimestamps([]);
        setMovesPerMinute(0);
        setCurrentTurn('w');
        setGameStatus('');
        setMoveSequence([]);
        setHoveredMove(null);

        showToast(`Switched to ${variant}`, 'success');
        console.log(`✅ Successfully switched to ${variant}`);
        return; // Exit early - no engine needed
      }

      // Janggi2 - standalone implementation (no engine required)
      if (variant === 'janggi2') {
        // Initialize janggi2 board
        const initialBoard = createJanggi2InitialBoard();
        setJanggi2Board(initialBoard);
        setJanggi2Turn(true); // Han starts
        setJanggi2HighlightedMoves([]);

        // If Han (bottom/player2) is AI, make first move
        if (player2Type === 'ai') {
          Promise.resolve().then(() => makeJanggi2AIMove(initialBoard, true));
        }

        // Reset game counters
        setCurrentGameMoves(0);
        setRecentMoveTimestamps([]);
        setMovesPerMinute(0);
        setCurrentTurn('w');
        setGameStatus('');
        setMoveSequence([]);
        setHoveredMove(null);

        showToast(`Switched to ${variant}`, 'success');
        console.log(`✅ Successfully switched to ${variant}`);
        return; // Exit early - no engine needed
      }

      // For other variants, check if engine is ready
      if (!engineRef.current || !engineReady) {
        console.log('Engine not ready, cannot switch variant');
        return;
      }

      // Tell engine to switch variant
      await engineRef.current.setVariant(variant);

      // Reset game state based on variant
      if (variant === 'chess') {
        // Standard chess starting position
        gameRef.current.reset();
        const startingFen = gameRef.current.fen();
        setCurrentFen(startingFen);

        // Get initial analysis for chess
        try {
          const initialAnalysis = await engineRef.current.analyze(startingFen, 15);
          setAnalysis([initialAnalysis]);
          setAnalysisTurn('w');
          setAnalysisFen(startingFen);
        } catch (error) {
          console.error('Error getting initial analysis:', error);
        }
      } else if (variant === 'janggi') {
        // Janggi starting position (9x10 board)
        // Generals (k/K) are in the CENTER of their palaces (rank 1 and 8, file 4)
        const janggiStartingFen =
          'rnba1abnr/4k4/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/4K4/RNBA1ABNR w - - 0 1';
        setCurrentFen(janggiStartingFen);

        // Get initial analysis for Janggi
        try {
          const initialAnalysis = await engineRef.current.analyze(
            janggiStartingFen,
            15,
          );
          setAnalysis([initialAnalysis]);
          setAnalysisTurn('w');
          setAnalysisFen(janggiStartingFen);
        } catch (error) {
          console.error('Error getting initial analysis:', error);
        }
      }

      // Reset game counters
      setCurrentGameMoves(0);
      setRecentMoveTimestamps([]);
      setMovesPerMinute(0);
      setCurrentTurn('w');
      setGameStatus('');
      setMoveSequence([]);
      setHoveredMove(null);

      showToast(`Switched to ${variant}`, 'success');
      console.log(`✅ Successfully switched to ${variant}`);
    } catch (error) {
      console.error(`Error switching variant:`, error);
      showToast(`Failed to switch to ${variant}`, 'error');
    }
  };

  const handleJanggi3Move = async (from: Position, to: Position) => {
    // Validate move is legal
    const legalMoves = getJanggi3LegalMoves(janggi3Board, from, janggi3Turn);
    const isLegalMove = legalMoves.some(
      move => move.to.row === to.row && move.to.col === to.col
    );

    if (!isLegalMove) {
      showToast('Invalid move', 'error');
      return;
    }

    // Apply move to create new board
    const newBoard = applyJanggi3Move(janggi3Board, { from, to });
    setJanggi3Board(newBoard);

    // Switch turn
    const newTurn = !janggi3Turn;
    setJanggi3Turn(newTurn);

    // Increment move counter and add timestamp
    setCurrentGameMoves(prev => prev + 1);
    setRecentMoveTimestamps(prev => [...prev, Date.now()]);

    // Clear highlighted moves
    setJanggi3HighlightedMoves([]);

    // Check for game over
    const gameResult = getGameResult(newBoard);
    if (gameResult !== null) {
      const resultText = gameResult === 1 ? 'Han wins!' : gameResult === -1 ? 'Cho wins!' : 'Draw';
      setGameStatus(`Game Over: ${resultText}`);
      showToast(`Game Over: ${resultText}`, 'info');
      return;
    }

    // Check if next player is AI and should auto-move
    // Han (bottom) = player2, Cho (top) = player1
    const currentPlayerType = newTurn ? player2Type : player1Type;
    if (currentPlayerType === 'ai') {
      // Trigger AI move after a short delay
      Promise.resolve().then(() => makeJanggi3AIMove(newBoard, newTurn));
    }
  };

  const makeJanggi3AIMove = async (board: Janggi3Board_Type, isHanTurn: boolean) => {
    try {
      setIsEngineThinking(true);

      // Get AI move
      const aiMove = getJanggi3AIMove(board, isHanTurn);
      if (!aiMove) {
        setGameStatus('No legal moves - Game Over');
        showToast('No legal moves available', 'info');
        setIsEngineThinking(false);
        return;
      }

      // Apply AI move
      const newBoard = applyJanggi3Move(board, aiMove);
      setJanggi3Board(newBoard);

      // Switch turn
      const newTurn = !isHanTurn;
      setJanggi3Turn(newTurn);

      // Increment move counter
      setCurrentGameMoves(prev => prev + 1);
      setRecentMoveTimestamps(prev => [...prev, Date.now()]);

      setIsEngineThinking(false);

      // Check for game over
      const gameResult = getGameResult(newBoard);
      if (gameResult !== null) {
        const resultText = gameResult === 1 ? 'Han wins!' : gameResult === -1 ? 'Cho wins!' : 'Draw';
        setGameStatus(`Game Over: ${resultText}`);
        showToast(`Game Over: ${resultText}`, 'info');
        return;
      }

      // Check if next player is also AI (AI vs AI mode)
      // Han (bottom) = player2, Cho (top) = player1
      const nextPlayerType = newTurn ? player2Type : player1Type;
      if (nextPlayerType === 'ai') {
        // Continue AI vs AI
        setTimeout(() => makeJanggi3AIMove(newBoard, newTurn), 1000);
      }
    } catch (error) {
      console.error('Error making AI move:', error);
      setIsEngineThinking(false);
    }
  };

  const handleJanggi2Move = async (from: Janggi2Position, to: Janggi2Position) => {
    // Validate move is legal
    const legalMoves = getJanggi2LegalMoves(janggi2Board, from, janggi2Turn);
    const isLegalMove = legalMoves.some(
      move => move.to.row === to.row && move.to.col === to.col
    );

    if (!isLegalMove) {
      showToast('Invalid move', 'error');
      return;
    }

    // Apply move to create new board
    const newBoard = applyJanggi2Move(janggi2Board, { from, to });
    setJanggi2Board(newBoard);

    // Switch turn
    const newTurn = !janggi2Turn;
    setJanggi2Turn(newTurn);

    // Increment move counter and add timestamp
    setCurrentGameMoves(prev => prev + 1);
    setRecentMoveTimestamps(prev => [...prev, Date.now()]);

    // Clear highlighted moves
    setJanggi2HighlightedMoves([]);

    // Check for game over
    const gameResult = getJanggi2GameResult(newBoard);
    if (gameResult !== null) {
      const resultText = gameResult === 1 ? 'Han wins!' : gameResult === -1 ? 'Cho wins!' : 'Draw';
      setGameStatus(`Game Over: ${resultText}`);
      showToast(`Game Over: ${resultText}`, 'info');
      return;
    }

    // Check if next player is AI and should auto-move
    // Han (bottom) = player2, Cho (top) = player1
    const currentPlayerType = newTurn ? player2Type : player1Type;
    if (currentPlayerType === 'ai') {
      // Trigger AI move after a short delay
      Promise.resolve().then(() => makeJanggi2AIMove(newBoard, newTurn));
    }
  };

  const makeJanggi2AIMove = async (board: Janggi2Board_Type, isHanTurn: boolean) => {
    try {
      setIsEngineThinking(true);

      // Use random AI, not engine
      const aiMove = getJanggi2AIMove(board, isHanTurn);
      if (!aiMove) {
        setGameStatus('No legal moves - Game Over');
        showToast('No legal moves available', 'info');
        setIsEngineThinking(false);
        return;
      }

      // Apply AI move
      const newBoard = applyJanggi2Move(board, aiMove);
      setJanggi2Board(newBoard);

      // Switch turn
      const newTurn = !isHanTurn;
      setJanggi2Turn(newTurn);

      // Increment move counter
      setCurrentGameMoves(prev => prev + 1);
      setRecentMoveTimestamps(prev => [...prev, Date.now()]);

      setIsEngineThinking(false);

      // Check for game over
      const gameResult = getJanggi2GameResult(newBoard);
      if (gameResult !== null) {
        const resultText = gameResult === 1 ? 'Han wins!' : gameResult === -1 ? 'Cho wins!' : 'Draw';
        setGameStatus(`Game Over: ${resultText}`);
        showToast(`Game Over: ${resultText}`, 'info');
        return;
      }

      // Check if next player is also AI (AI vs AI mode)
      // Han (bottom) = player2, Cho (top) = player1
      const nextPlayerType = newTurn ? player2Type : player1Type;
      if (nextPlayerType === 'ai') {
        // Continue AI vs AI
        setTimeout(() => makeJanggi2AIMove(newBoard, newTurn), 1000);
      }
    } catch (error) {
      console.error('Error making AI move:', error);
      setIsEngineThinking(false);
    }
  };


  const handleMove = async (from: Square, to: Square) => {
    // Increment request ID to invalidate any pending analysis
    analysisRequestIdRef.current += 1;
    const thisRequestId = analysisRequestIdRef.current;

    // DON'T clear analysis - keep previous suggestions visible during AI thinking

    // Increment move counter and add timestamp
    setCurrentGameMoves(prev => prev + 1);
    setRecentMoveTimestamps(prev => [...prev, Date.now()]);

    let newFen: string;
    let newTurn: 'w' | 'b';

    if (selectedVariant === 'janggi' || selectedVariant === 'janggi2') {
      // For Janggi, we can't use chess.js (doesn't support Janggi)
      // Validate move first
      const moveNotation = `${from}${to}`;
      const validation = validateJanggiMove(currentFen, moveNotation);

      if (!validation.isValid) {
        // Show error toast and return early
        showToast(validation.error || 'Invalid move', 'error');
        return;
      }

      // Apply the move
      newFen = applyMoveToFEN(currentFen, moveNotation);
      setCurrentFen(newFen);
      newTurn = currentTurn === 'w' ? 'b' : 'w';
      setCurrentTurn(newTurn);
      // Skip game status checks for Janggi (need engine to determine)
    } else {
      // Chess: use chess.js for move validation and game state
      gameRef.current.move({from, to, promotion: 'q'});

      // Update FEN and turn
      newFen = gameRef.current.fen();
      newTurn = gameRef.current.turn();

      // Only update UI if not in fast mode
      if (!fastMode) {
        setCurrentFen(newFen);
      }
      setCurrentTurn(newTurn);

      // Update game status (checkmate takes priority over check)
      if (gameRef.current.isCheckmate()) {
        setGameStatus('Checkmate!');
        await recordGameResult();
      } else if (gameRef.current.isStalemate()) {
        setGameStatus('Stalemate!');
        await recordGameResult();
      } else if (gameRef.current.isCheck()) {
        setGameStatus('Check!');
      } else {
        setGameStatus('');
      }
    }

    // Analyze position after move
    if (engineRef.current && engineReady) {
      try {
        setIsAnalyzing(true);
        const moveAnalysis = await engineRef.current.analyze(newFen, 15);

        // GUARD: Only set analysis if this is still the current request
        if (analysisRequestIdRef.current === thisRequestId && gameRef.current.fen() === newFen) {
          setAnalysis([moveAnalysis]);
          setAnalysisTurn(newTurn);
          setAnalysisFen(newFen);
        }
        setIsAnalyzing(false);
      } catch (error) {
        console.error('Error getting move analysis:', error);
        setIsAnalyzing(false);
      }
    }

    // Check if next player is AI and should auto-move
    // Note: janggi2 and janggi3 have their own move handlers, so skip engine for them
    const nextTurn = (selectedVariant === 'janggi' || selectedVariant === 'janggi2') ? newTurn : gameRef.current.turn();
    const isGameOver = (selectedVariant === 'janggi' || selectedVariant === 'janggi2') ? false : gameRef.current.isGameOver(); // For Janggi, assume game continues
    const currentPlayerType = nextTurn === 'w' ? player2Type : player1Type; // w=player2(white), b=player1(black)

    if (currentPlayerType === 'ai' && !isGameOver && selectedVariant !== 'janggi2' && selectedVariant !== 'janggi3') {
      // Next player is AI, trigger immediately (no setTimeout delay)
      // Use setImmediate or Promise.resolve to avoid blocking UI
      // Pass the newFen directly to avoid race condition with state update
      Promise.resolve().then(() => getEngineMove(newFen));
    }
  };

  const handleSuggestionClick = (move: string) => {
    // Parse move like "e2e4" into from/to squares
    if (move.length >= 4) {
      const from = move.substring(0, 2) as Square;
      const to = move.substring(2, 4) as Square;

      // Verify the move is valid for the current position before playing
      try {
        const moveObj = gameRef.current.move({from, to, promotion: 'q'});
        if (moveObj) {
          // Move was valid, undo it so handleMove can redo it properly
          gameRef.current.undo();
          handleMove(from, to);
        } else {
          console.error('Invalid suggested move:', move);
          showToast('Invalid move suggestion', 'error');
        }
      } catch (error) {
        console.error('Error playing suggested move:', error);
        showToast('Could not play suggested move', 'error');
      }
    }
  };

  const getEngineMove = async (providedFen?: string) => {
    if (!engineRef.current || !engineReady) {
      return;
    }

    // Increment request ID to invalidate any pending analysis
    analysisRequestIdRef.current += 1;
    const thisRequestId = analysisRequestIdRef.current;

    try {
      setIsEngineThinking(true);

      // DON'T clear analysis - keep previous suggestions visible

      // Tell engine about current position and get move
      // Use provided FEN if available (avoids race condition), otherwise fall back to state
      const fen = providedFen || (selectedVariant === 'janggi' ? currentFen : gameRef.current.fen());
      // Lightning-fast thinking for AI vs AI in fast mode: 10ms, otherwise 50ms for AI vs AI, 500ms for human games
      const thinkTime = fastMode ? 10 : (player1Type === 'ai' && player2Type === 'ai') ? 50 : 500;
      const engineMove = await engineRef.current.getBestMove(fen, thinkTime);

      let newFen: string;
      let newTurn: 'w' | 'b';

      if (selectedVariant === 'janggi') {
        // For Janggi, apply move manually to FEN
        newFen = applyMoveToFEN(fen, engineMove);
        newTurn = currentTurn === 'w' ? 'b' : 'w';
      } else {
        // For Chess, use chess.js
        gameRef.current.move(engineMove as any);
        newTurn = gameRef.current.turn();
        newFen = gameRef.current.fen();
      }

      // Increment move counter and add timestamp
      setCurrentGameMoves(prev => prev + 1);
      setRecentMoveTimestamps(prev => [...prev, Date.now()]);

      // Only update UI if not in fast mode
      if (!fastMode) {
        setCurrentFen(newFen);
      } else {
        // In fast mode, just increment move counter
        setFastModeMovesPlayed(prev => prev + 1);
      }
      setCurrentTurn(newTurn);

      // Update game status (checkmate takes priority over check)
      // For Janggi, skip game status checks (need engine to determine)
      if (selectedVariant === 'chess') {
        if (gameRef.current.isCheckmate()) {
          setGameStatus('Checkmate!');
          // If fast mode, update board to show final position
          if (fastMode) {
            setCurrentFen(newFen);
            setFastMode(false);
            setFastModeMovesPlayed(0);
          }
          await recordGameResult();
        } else if (gameRef.current.isStalemate()) {
          setGameStatus('Stalemate!');
          // If fast mode, update board to show final position
          if (fastMode) {
            setCurrentFen(newFen);
            setFastMode(false);
            setFastModeMovesPlayed(0);
          }
          await recordGameResult();
        } else if (gameRef.current.isCheck()) {
          setGameStatus('Check!');
        } else {
          setGameStatus('');
        }
      }

      setIsEngineThinking(false);

      // Skip analysis during AI vs AI or fast mode for better performance
      // Only analyze if at least one player is human and not in fast mode
      if (!fastMode && (player1Type === 'human' || player2Type === 'human')) {
        try {
          setIsAnalyzing(true);
          const currentAnalysis = await engineRef.current.analyze(newFen, 15);

          // GUARD: Only set analysis if this is still the current request
          if (analysisRequestIdRef.current === thisRequestId && gameRef.current.fen() === newFen) {
            setAnalysis([currentAnalysis]);
            setAnalysisTurn(newTurn);
            setAnalysisFen(newFen);
          }
          setIsAnalyzing(false);
        } catch (error) {
          console.error('Error getting analysis:', error);
          setIsAnalyzing(false);
        }
      }
    } catch (error) {
      console.error('Error getting engine move:', error);
      setIsEngineThinking(false);
    }
  };

  const handleNewGame = async () => {
    // Increment request ID to invalidate any pending analysis from old game
    analysisRequestIdRef.current += 1;

    // Stop auto-play if running
    if (isAutoPlaying) {
      autoPlayStopRef.current = true;
      setIsAutoPlaying(false);
    }

    // Reset game mode to player vs AI
    setGameMode('player-vs-ai');

    // Reset fast mode
    setFastMode(false);
    setFastModeMovesPlayed(0);

    // Reset game timing stats
    setCurrentGameMoves(0);
    setRecentMoveTimestamps([]);
    setMovesPerMinute(0);

    if (selectedVariant === 'janggi3') {
      // Janggi3 standalone - reset board
      const initialBoard = createInitialBoard();
      setJanggi3Board(initialBoard);
      setJanggi3Turn(true); // Han starts
      setJanggi3HighlightedMoves([]);
      setGameStatus('');

      // If Han (bottom/player2) is AI, make first move
      if (player2Type === 'ai') {
        Promise.resolve().then(() => makeJanggi3AIMove(initialBoard, true));
      }
    } else {
      // Reset game state for chess/janggi (engine-based variants)
      gameRef.current.reset();
      setCurrentFen(gameRef.current.fen());
      setCurrentTurn('w'); // White starts
      setGameStatus('');
      setAnalysis([]);
      setAnalysisFen('');
      setMoveSequence([]);
      setHoveredMove(null);

      // Reset engine
      if (engineRef.current && engineReady) {
        await engineRef.current.newGame();

        // Get initial analysis of starting position
        try {
          const startingFen = gameRef.current.fen();
          const initialAnalysis = await engineRef.current.analyze(startingFen, 15);
          setAnalysis([initialAnalysis]);
          setAnalysisTurn('w'); // Starting position is white's turn
          setAnalysisFen(startingFen); // Store the FEN this analysis is for
          console.log('✅ Initial analysis complete');
        } catch (error) {
          console.error('Error getting initial analysis:', error);
        }

        // If player 2 (white/bottom) is AI, make first move immediately
        // Skip for standalone variants (janggi2, janggi3) which handle AI differently
        if (player2Type === 'ai' && selectedVariant !== 'janggi2' && selectedVariant !== 'janggi3') {
          Promise.resolve().then(() => getEngineMove());
        }
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
      const turn = gameRef.current.turn();
      const currentPlayerType = turn === 'w' ? player2Type : player1Type; // w=player2(white), b=player1(black)

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
      // Exit learning mode - return to player vs AI
      setGameMode('player-vs-ai');
      setPlayer1Type('ai');  // Black = AI
      setPlayer2Type('human');  // White = Human
    } else {
      // Enter learning mode - human plays both sides with continuous hints
      setGameMode('learning');
      setPlayer1Type('human');  // Black = Human
      setPlayer2Type('human');  // White = Human

      // In learning mode, suggestions are always shown for both sides
      // to help the user learn best moves for both white and black
      showToast('Learn Mode: Play both sides with AI hints!', 'info');
    }
  };

  const handleFastModeToggle = () => {
    if (fastMode) {
      // Exit fast mode - update board to current position
      setFastMode(false);
      setCurrentFen(gameRef.current.fen());
      setFastModeMovesPlayed(0);
      showToast('Fast mode disabled - Board rendering enabled', 'info');
    } else {
      // Enter fast mode - disable board updates for lightning speed
      setFastMode(true);
      setFastModeMovesPlayed(0);
      showToast('Fast mode enabled - Lightning speed AI vs AI!', 'info');
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

          {/* Game Status */}
          <View style={styles.turnContainer}>
            {gameStatus ? (
              <Text style={[
                styles.gameStatusText,
                gameStatus === 'Checkmate!' && styles.checkmateText,
                gameStatus === 'Check!' && styles.checkTextHeader,
              ]}>
                {gameStatus}
              </Text>
            ) : (
              <Text style={styles.turnIndicator}>
                {/* Placeholder for consistent spacing */}
                {'‎ '}
              </Text>
            )}
          </View>

          {/* Reset Buttons */}
          <View style={styles.resetButtonsContainer}>
            <Pressable
              style={styles.resetLayoutButton}
              onPress={resetLayout}>
              <Text style={styles.resetButtonText}>Reset Layout</Text>
            </Pressable>
            <Pressable
              style={styles.resetStatsButton}
              onPress={resetStats}>
              <Text style={styles.resetButtonText}>Reset Stats</Text>
            </Pressable>
          </View>

          {/* Variant Dropdown */}
          <View style={styles.variantSelector}>
            <Text style={styles.variantLabel}>Game: </Text>
            <Pressable
              style={styles.variantDropdown}
              onPress={() => setShowVariantDropdown(!showVariantDropdown)}>
              <Text style={styles.variantDropdownText}>
                {selectedVariant === 'chess' ? 'Chess' :
                 selectedVariant === 'janggi' ? 'Janggi' :
                 selectedVariant === 'janggi2' ? 'Janggi 2' :
                 'Janggi 3'} ▼
              </Text>
            </Pressable>
            {showVariantDropdown && (
              <View style={styles.variantDropdownMenu}>
                {(['chess', 'janggi', 'janggi2', 'janggi3'] as GameVariant[]).map((variant) => (
                  <Pressable
                    key={variant}
                    style={[
                      styles.variantDropdownItem,
                      selectedVariant === variant && styles.variantDropdownItemSelected
                    ]}
                    onPress={() => {
                      setSelectedVariant(variant);
                      setShowVariantDropdown(false);
                    }}>
                    <Text style={[
                      styles.variantDropdownItemText,
                      selectedVariant === variant && styles.variantDropdownItemTextSelected
                    ]}>
                      {variant === 'chess' ? 'Chess' :
                       variant === 'janggi' ? 'Janggi' :
                       variant === 'janggi2' ? 'Janggi 2' : 'Janggi 3'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Main Content - Flex Layout */}
      <View style={styles.mainContent}>
        <View style={styles.flexContainer}>
          {/* Left Column - Board */}
          <View style={styles.leftColumn}>
            <View style={styles.boardContainer}>
              {selectedVariant === 'janggi' ? (
                <JanggiBoard
                  variant={selectedVariant}
                  onMove={handleMove}
                  fen={
                    currentFen &&
                    currentFen.split('/').length === 10
                      ? currentFen
                      : 'rnba1abnr/4k4/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/4K4/RNBA1ABNR w - - 0 1'
                  }
                  suggestedMove={hoveredMove || (analysis[0]?.pv?.[0])}
                  legalMoves={analysis[0]?.pv || []}
                />
              ) : selectedVariant === 'janggi2' ? (
                <Janggi2Board
                  board={janggi2Board}
                  onMove={handleJanggi2Move}
                  highlightedMoves={janggi2HighlightedMoves}
                  disabled={isEngineThinking}
                />
              ) : selectedVariant === 'janggi3' ? (
                <Janggi3Board
                  board={janggi3Board}
                  onMove={handleJanggi3Move}
                  highlightedMoves={janggi3HighlightedMoves}
                  disabled={isEngineThinking}
                />
              ) : (
                <ChessBoard
                  variant={selectedVariant}
                  onMove={handleMove}
                  fen={currentFen || undefined}
                  suggestedMove={hoveredMove || (analysis[0]?.pv?.[0])}
                  moveSequence={moveSequence}
                />
              )}
            </View>
          </View>

          {/* Right Column - Suggestions and Controls */}
          <View style={styles.rightColumn}>
            {/* Analysis Panel - only show for engine-based variants */}
            {selectedVariant !== 'janggi2' && selectedVariant !== 'janggi3' && (
              <View style={styles.analysisContainer}>
                <AnalysisPanel
                  analysis={analysis}
                  analysisTurn={analysisTurn}
                  analysisFen={analysisFen}
                  currentFen={currentFen}
                  onSuggestionClick={handleSuggestionClick}
                  onSuggestionHover={setHoveredMove}
                  onContinuationHover={setMoveSequence}
                  currentTurn={currentTurn}
                  player1Type={player1Type}
                  player2Type={player2Type}
                  variant={selectedVariant}
                />
              </View>
            )}

            {/* Stats Panel */}
            <View style={styles.statsContainer}>
              <Text style={styles.controlsSectionTitle}>Statistics</Text>

              {/* Engine Analysis Stats */}
              {analysis && analysis.length > 0 && (
                <View style={styles.engineStatsSection}>
                  <View style={styles.evaluationRow}>
                    <View style={styles.scoreBox}>
                      <Text
                        style={[
                          styles.scoreValue,
                          analysis[0].score > 0
                            ? styles.positiveScore
                            : styles.negativeScore,
                        ]}>
                        {Math.abs(analysis[0].score) > 9000
                          ? `M${Math.abs(
                              analysis[0].score > 0
                                ? Math.ceil((10000 - analysis[0].score) / 2)
                                : Math.ceil((-10000 - analysis[0].score) / 2),
                            )}`
                          : (analysis[0].score / 100).toFixed(2)}
                      </Text>
                      <Text style={styles.scoreLabel}>Evaluation</Text>
                    </View>
                    <View style={styles.depthNodesBox}>
                      <View style={styles.miniStatRow}>
                        <Text style={styles.miniStatLabel}>Depth:</Text>
                        <Text style={styles.miniStatValue}>{analysis[0].depth}</Text>
                      </View>
                      <View style={styles.miniStatRow}>
                        <Text style={styles.miniStatLabel}>Nodes:</Text>
                        <Text style={styles.miniStatValue}>
                          {(analysis[0].nodes / 1000).toFixed(0)}k
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.evaluationText}>
                    {(() => {
                      const score = analysis[0].score;
                      const absScore = Math.abs(score);
                      if (absScore > 9000) {
                        return score > 0 ? 'White is winning' : 'Black is winning';
                      }
                      if (absScore > 300) {
                        return score > 0
                          ? 'White has a winning advantage'
                          : 'Black has a winning advantage';
                      }
                      if (absScore > 150) {
                        return score > 0
                          ? 'White has a significant advantage'
                          : 'Black has a significant advantage';
                      }
                      if (absScore > 50) {
                        return score > 0
                          ? 'White is slightly better'
                          : 'Black is slightly better';
                      }
                      return 'The position is equal';
                    })()}
                  </Text>
                </View>
              )}

              {/* Live Game Stats - Compact */}
              <View style={styles.liveStatsRow}>
                <View style={styles.compactStatBox}>
                  <Text style={styles.compactStatValue}>{movesPerMinute}</Text>
                  <Text style={styles.compactStatLabel}>Moves/Min</Text>
                </View>
                <View style={styles.compactStatBox}>
                  <Text style={styles.compactStatValue}>{currentGameMoves}</Text>
                  <Text style={styles.compactStatLabel}>Moves</Text>
                </View>
              </View>

              {/* Historical Stats - Games */}
              <View style={styles.historicalStatsSection}>
                <Text style={styles.statsSubtitle}>Games Played</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{stats.totalGames}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{stats.whiteWins}</Text>
                    <Text style={styles.statLabel}>White Wins</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{stats.blackWins}</Text>
                    <Text style={styles.statLabel}>Black Wins</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{stats.draws}</Text>
                    <Text style={styles.statLabel}>Draws</Text>
                  </View>
                </View>
              </View>

              {/* Win Odds */}
              {stats.totalGames > 0 && (
                <View style={styles.winOddsSection}>
                  <Text style={styles.statsSubtitle}>Win Probability</Text>
                  <View style={styles.oddsRow}>
                    <View style={styles.oddsBox}>
                      <Text style={[styles.oddsValue, styles.whiteOdds]}>
                        {((stats.whiteWins / stats.totalGames) * 100).toFixed(1)}%
                      </Text>
                      <Text style={styles.oddsLabel}>White</Text>
                    </View>
                    <View style={styles.oddsBox}>
                      <Text style={[styles.oddsValue, styles.drawOdds]}>
                        {((stats.draws / stats.totalGames) * 100).toFixed(1)}%
                      </Text>
                      <Text style={styles.oddsLabel}>Draw</Text>
                    </View>
                    <View style={styles.oddsBox}>
                      <Text style={[styles.oddsValue, styles.blackOdds]}>
                        {((stats.blackWins / stats.totalGames) * 100).toFixed(1)}%
                      </Text>
                      <Text style={styles.oddsLabel}>Black</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Controls Section */}
            <View style={styles.controlsContainer}>
              <Text style={styles.controlsSectionTitle}>Controls</Text>

              {/* Player Selection */}
              <View style={styles.playerSelectionRow}>
                <Pressable
                  style={[
                    styles.playerColorButton,
                    styles.blackButton,
                    player1Type === 'ai' && styles.playerButtonAI,
                  ]}
                  onPress={() => setPlayer1Type(player1Type === 'human' ? 'ai' : 'human')}>
                  <Text style={[styles.playerColorButtonText, styles.blackButtonText]}>
                    Black
                  </Text>
                  <Text style={[styles.playerTypeText, styles.blackButtonText]}>
                    {player1Type === 'human' ? 'Human' : 'AI'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.playerColorButton,
                    styles.whiteButton,
                    player2Type === 'ai' && styles.playerButtonAI,
                  ]}
                  onPress={() => setPlayer2Type(player2Type === 'human' ? 'ai' : 'human')}>
                  <Text style={[styles.playerColorButtonText, styles.whiteButtonText]}>
                    White
                  </Text>
                  <Text style={[styles.playerTypeText, styles.whiteButtonText]}>
                    {player2Type === 'human' ? 'Human' : 'AI'}
                  </Text>
                </Pressable>
              </View>

              {/* Game Control Buttons */}
              <View style={styles.gameControls}>
                <Pressable style={styles.controlButton} onPress={handleNewGame}>
                  <Text style={styles.controlButtonText}>New Game</Text>
                </Pressable>
                {player1Type === 'ai' && player2Type === 'ai' && selectedVariant !== 'janggi2' && selectedVariant !== 'janggi3' && (
                  <>
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
                    <Pressable
                      style={[
                        styles.controlButton,
                        styles.fastModeButton,
                        fastMode && styles.activeButton,
                      ]}
                      onPress={handleFastModeToggle}>
                      <Text style={styles.controlButtonText}>
                        {fastMode ? 'Normal Speed' : 'Fast Mode'}
                      </Text>
                    </Pressable>
                  </>
                )}
                <Pressable
                  style={[
                    styles.controlButton,
                    gameMode === 'learning' && styles.activeButton,
                  ]}
                  onPress={handleLearningMode}>
                  <Text style={styles.controlButtonText}>
                    {gameMode === 'learning' ? 'Exit Learn' : 'Learn'}
                  </Text>
                </Pressable>
              </View>

              {/* Fast Mode Indicator */}
              {fastMode && (
                <View style={styles.fastModeIndicator}>
                  <Text style={styles.fastModeText}>
                    ⚡ Fast Mode Active - {fastModeMovesPlayed} moves played
                  </Text>
                </View>
              )}
            </View>
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
  turnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
  },
  turnIndicator: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '600',
  },
  gameStatusText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  checkTextHeader: {
    color: '#FF9800',
  },
  checkmateText: {
    color: '#F44336',
  },
  resetButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 12,
  },
  resetLayoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#9C27B0',
  },
  resetStatsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FF5722',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  variantSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
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
  variantDropdownMenu: {
    position: 'absolute',
    top: 32,
    left: 45,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
    zIndex: 1000,
  },
  variantDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  variantDropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  variantDropdownItemText: {
    fontSize: 13,
    color: '#333333',
  },
  variantDropdownItemTextSelected: {
    fontWeight: '600',
    color: '#2196F3',
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  flexContainer: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  leftColumn: {
    flexShrink: 0,
  },
  rightColumn: {
    flex: 1,
    gap: 16,
    minWidth: 320,
    maxWidth: 500,
  },
  boardContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'scroll',
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  engineStatsSection: {
    backgroundColor: '#F3E5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  evaluationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  positiveScore: {
    color: '#4CAF50',
  },
  negativeScore: {
    color: '#F44336',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '600',
  },
  depthNodesBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 10,
    justifyContent: 'center',
  },
  miniStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 11,
    color: '#666666',
  },
  miniStatValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333333',
  },
  evaluationText: {
    fontSize: 12,
    color: '#6A1B9A',
    fontWeight: '600',
    textAlign: 'center',
  },
  liveStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  compactStatBox: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  compactStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 2,
  },
  compactStatLabel: {
    fontSize: 9,
    color: '#1565C0',
    fontWeight: '600',
  },
  historicalStatsSection: {
    marginBottom: 16,
  },
  statsSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statBox: {
    flex: 1,
    minWidth: 70,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#666666',
  },
  winOddsSection: {
    marginTop: 8,
  },
  oddsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  oddsBox: {
    flex: 1,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  oddsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  whiteOdds: {
    color: '#4CAF50',
  },
  blackOdds: {
    color: '#F44336',
  },
  drawOdds: {
    color: '#FF9800',
  },
  oddsLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '600',
  },
  controlsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
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
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    justifyContent: 'space-around',
  },
  statItem: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  playerSelectionRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 12,
    justifyContent: 'center',
  },
  playerColorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  blackButton: {
    backgroundColor: '#1a1a1a',
    borderColor: '#000000',
  },
  whiteButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d0d0d0',
  },
  playerButtonAI: {
    opacity: 0.8,
  },
  playerColorButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  blackButtonText: {
    color: '#ffffff',
  },
  whiteButtonText: {
    color: '#333333',
  },
  playerTypeText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
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
  fastModeButton: {
    backgroundColor: '#FF9800',
  },
  fastModeIndicator: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  fastModeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F57C00',
    textAlign: 'center',
  },
});

export default App;
