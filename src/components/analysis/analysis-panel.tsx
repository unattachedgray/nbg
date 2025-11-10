import React, {useState} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {EngineAnalysis} from '../../types/game';
import {TermText} from '../ui/tooltip';

interface AnalysisPanelProps {
  analysis?: EngineAnalysis[];
  isAnalyzing?: boolean;
  onSuggestionClick?: (move: string) => void;
  onSuggestionHover?: (hovering: boolean) => void;
  onContinuationHover?: (moves: string[]) => void;
  currentTurn?: 'w' | 'b';
  player1Type?: 'human' | 'ai'; // black
  player2Type?: 'human' | 'ai'; // white
}

export function AnalysisPanel({
  analysis,
  isAnalyzing = false,
  onSuggestionClick,
  onSuggestionHover,
  onContinuationHover,
  currentTurn,
  player1Type,
  player2Type,
}: AnalysisPanelProps): React.JSX.Element {
  const [isHoveringSuggestion, setIsHoveringSuggestion] = useState(false);
  const [isHoveringContinuation, setIsHoveringContinuation] = useState(false);
  const formatScore = (score: number): string => {
    // Mate scores are typically above 9000
    if (Math.abs(score) > 9000) {
      // Calculate moves to mate
      // Positive score = white is winning, negative = black is winning
      const mateIn = score > 0 ? Math.ceil((10000 - score) / 2) : Math.ceil((-10000 - score) / 2);
      return `M${Math.abs(mateIn)}`;
    }
    return (score / 100).toFixed(2);
  };

  const getEvaluation = (score: number): string => {
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
  };

  const formatMovePairs = (moves: string[]): string => {
    let formatted = '';
    for (let i = 0; i < Math.min(moves.length, 10); i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];

      if (blackMove) {
        formatted += `${moveNum}. ${whiteMove} ${blackMove}  `;
      } else {
        formatted += `${moveNum}. ${whiteMove}`;
      }
    }
    return formatted.trim();
  };

  if (!analysis || analysis.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Engine Analysis</Text>
        <View style={styles.placeholder}>
          {isAnalyzing ? (
            <Text style={styles.placeholderText}>Analyzing...</Text>
          ) : (
            <Text style={styles.placeholderText}>
              Make a move to see analysis
            </Text>
          )}
        </View>
      </View>
    );
  }

  const mainLine = analysis[0];

  // Determine if current player is human
  // player1Type = black (top), player2Type = white (bottom)
  // currentTurn 'w' means white to move, 'b' means black to move
  const currentPlayerType = currentTurn === 'w' ? player2Type : player1Type;
  const isHumanTurn = currentPlayerType === 'human';

  // Validate: only show suggestions if it's actually a human player's turn
  const shouldShowSuggestions = isHumanTurn && mainLine && mainLine.pv.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Suggestions</Text>

      {/* Compact layout - All sections visible without scrolling */}
      <View style={styles.contentGrid}>
        {/* Evaluation + Stats (Left Column) */}
        <View style={styles.leftColumn}>
          {/* Evaluation */}
          <View style={styles.evalSection}>
            <Text
              style={[
                styles.evalScore,
                mainLine.score > 0
                  ? styles.positiveScore
                  : styles.negativeScore,
              ]}>
              {formatScore(mainLine.score)}
            </Text>
            <TermText style={styles.evalText}>
              {getEvaluation(mainLine.score)}
            </TermText>
          </View>

          {/* Stats */}
          <View style={styles.statsSection}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Depth</Text>
              <Text style={styles.statValue}>{mainLine.depth}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Nodes</Text>
              <Text style={styles.statValue}>
                {(mainLine.nodes / 1000).toFixed(0)}k
              </Text>
            </View>
          </View>
        </View>

        {/* Suggestions (Right Column) - Only show for human players */}
        {shouldShowSuggestions && (
          <View style={styles.rightColumn}>
            {/* Best Move Suggestion */}
            <View style={styles.suggestionSection}>
            <Text style={styles.sectionTitle}>Your Best Move</Text>
            {mainLine.pv.length > 0 ? (
              <Pressable
                style={[
                  styles.suggestionBox,
                  isHoveringSuggestion && styles.suggestionBoxHover,
                ]}
                onPress={() => onSuggestionClick?.(mainLine.pv[0])}
                onHoverIn={() => {
                  setIsHoveringSuggestion(true);
                  onSuggestionHover?.(true);
                }}
                onHoverOut={() => {
                  setIsHoveringSuggestion(false);
                  onSuggestionHover?.(false);
                }}>
                <Text style={styles.suggestionMove}>{mainLine.pv[0]}</Text>
                <Text style={styles.suggestionLabel}>
                  {isHoveringSuggestion ? 'Click to play' : 'Recommended'}
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.suggestionBox, styles.suggestionBoxEmpty]}>
                <Text style={styles.suggestionMove}>--</Text>
                <Text style={styles.suggestionLabel}>Analyzing...</Text>
              </View>
            )}
          </View>

          {/* Continuation */}
          <View style={styles.suggestionSection}>
            <Text style={styles.sectionTitle}>If You Play Best Move</Text>
            {mainLine.pv.length > 1 ? (
              <Pressable
                style={[
                  styles.continuationBox,
                  isHoveringContinuation && styles.continuationBoxHover,
                ]}
                onHoverIn={() => {
                  setIsHoveringContinuation(true);
                  onContinuationHover?.(mainLine.pv.slice(1));
                }}
                onHoverOut={() => {
                  setIsHoveringContinuation(false);
                  onContinuationHover?.([]);
                }}>
                <Text style={styles.continuationText} numberOfLines={3}>
                  {formatMovePairs(mainLine.pv.slice(1))}
                </Text>
                <Text style={styles.continuationLabel}>
                  {isHoveringContinuation ? 'Hover to preview' : 'Future moves'}
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.continuationBox, styles.continuationBoxEmpty]}>
                <Text style={styles.continuationText}>--</Text>
                <Text style={styles.continuationLabel}>Analyzing...</Text>
              </View>
            )}
          </View>
        </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999999',
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1,
    minWidth: 150,
    maxWidth: 250,
    gap: 12,
  },
  rightColumn: {
    flex: 1,
    minWidth: 150,
    maxWidth: 250,
    gap: 12,
  },
  evalSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  evalScore: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  positiveScore: {
    color: '#4CAF50',
  },
  negativeScore: {
    color: '#F44336',
  },
  evalText: {
    fontSize: 12,
    color: '#555555',
    textAlign: 'center',
  },
  pvSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  pvText: {
    fontSize: 12,
    color: '#333333',
    lineHeight: 18,
  },
  statsSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  suggestionSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  suggestionBox: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    cursor: 'pointer',
  },
  suggestionBoxHover: {
    backgroundColor: '#1976D2',
    transform: [{scale: 1.05}],
  },
  suggestionBoxEmpty: {
    backgroundColor: '#CCCCCC',
    cursor: 'default',
  },
  suggestionMove: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  suggestionLabel: {
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.9,
  },
  continuationBox: {
    backgroundColor: '#9C27B0',
    borderRadius: 8,
    padding: 12,
    cursor: 'pointer',
  },
  continuationBoxHover: {
    backgroundColor: '#7B1FA2',
    transform: [{scale: 1.02}],
  },
  continuationBoxEmpty: {
    backgroundColor: '#CCCCCC',
    cursor: 'default',
  },
  continuationText: {
    fontSize: 12,
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 18,
  },
  continuationLabel: {
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.9,
  },
});
