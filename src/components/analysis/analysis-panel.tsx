import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {EngineAnalysis} from '../../types/game';
import {TermText} from '../ui/tooltip';

interface AnalysisPanelProps {
  analysis?: EngineAnalysis[];
  isAnalyzing?: boolean;
}

export function AnalysisPanel({
  analysis,
  isAnalyzing = false,
}: AnalysisPanelProps): React.JSX.Element {
  const formatScore = (score: number): string => {
    if (Math.abs(score) > 9000) {
      const mateIn = score > 0 ? 10000 - score : -10000 - score;
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

  if (!analysis || analysis.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Engine Analysis</Text>
        <View style={styles.placeholder}>
          {isAnalyzing ? (
            <Text style={styles.placeholderText}>Analyzing...</Text>
          ) : (
            <Text style={styles.placeholderText}>
              Analysis will appear here
            </Text>
          )}
        </View>
      </View>
    );
  }

  const mainLine = analysis[0];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Engine Analysis</Text>

      {/* Main Evaluation */}
      <View style={styles.evaluationCard}>
        <Text style={styles.evalLabel}>Evaluation:</Text>
        <Text
          style={[
            styles.evalScore,
            mainLine.score > 0 ? styles.positiveScore : styles.negativeScore,
          ]}>
          {formatScore(mainLine.score)}
        </Text>
        <TermText style={styles.evalText}>
          {getEvaluation(mainLine.score)}
        </TermText>
      </View>

      {/* Principal Variation */}
      <View style={styles.pvCard}>
        <Text style={styles.sectionTitle}>Best Line:</Text>
        <View style={styles.movesContainer}>
          {mainLine.pv.slice(0, 8).map((move, index) => (
            <View key={index} style={styles.moveItem}>
              <Text style={styles.moveNumber}>{Math.floor(index / 2) + 1}.</Text>
              <Text style={styles.moveText}>{move}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Statistics:</Text>
        <View style={styles.statRow}>
          <TermText style={styles.statLabel}>Depth:</TermText>
          <Text style={styles.statValue}>{mainLine.depth}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Nodes:</Text>
          <Text style={styles.statValue}>
            {mainLine.nodes.toLocaleString()}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Speed:</Text>
          <Text style={styles.statValue}>
            {(mainLine.nps / 1000).toFixed(0)}k nps
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Time:</Text>
          <Text style={styles.statValue}>
            {(mainLine.time / 1000).toFixed(1)}s
          </Text>
        </View>
      </View>

      {/* Alternative Lines */}
      {analysis.length > 1 && (
        <View style={styles.alternativesCard}>
          <Text style={styles.sectionTitle}>Alternative Lines:</Text>
          {analysis.slice(1, 4).map((line, index) => (
            <View key={index} style={styles.altLine}>
              <Text style={styles.altScore}>{formatScore(line.score)}</Text>
              <Text style={styles.altMoves}>
                {line.pv.slice(0, 4).join(' ')}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999999',
  },
  evaluationCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  evalLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  evalScore: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  positiveScore: {
    color: '#4CAF50',
  },
  negativeScore: {
    color: '#F44336',
  },
  evalText: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
  },
  pvCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  movesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  moveNumber: {
    fontSize: 12,
    color: '#999999',
    marginRight: 6,
  },
  moveText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  statsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  alternativesCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  altLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  altScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginRight: 12,
    minWidth: 50,
  },
  altMoves: {
    fontSize: 14,
    color: '#555555',
    flex: 1,
  },
});
