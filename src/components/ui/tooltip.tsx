import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
} from 'react-native';
import {ChessTerm} from '../../types/game';
import {getTerm} from '../../utils/chess-terms';

interface TooltipProps {
  term: string;
  children: React.ReactNode;
}

export function Tooltip({term, children}: TooltipProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const [termData, setTermData] = useState<ChessTerm | null>(null);

  const handlePress = () => {
    const data = getTerm(term);
    if (data) {
      setTermData(data);
      setVisible(true);
    }
  };

  return (
    <>
      <Pressable onPress={handlePress}>{children}</Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setVisible(false)}>
          <View style={styles.tooltipContainer}>
            {termData && (
              <>
                <Text style={styles.tooltipTitle}>{termData.term}</Text>
                <Text style={styles.tooltipDefinition}>
                  {termData.definition}
                </Text>
                {termData.example && (
                  <View style={styles.exampleContainer}>
                    <Text style={styles.exampleLabel}>Example:</Text>
                    <Text style={styles.exampleText}>{termData.example}</Text>
                  </View>
                )}
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setVisible(false)}>
                  <Text style={styles.closeButtonText}>Got it</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

interface TermTextProps {
  children: string;
  style?: any;
}

export function TermText({children, style}: TermTextProps): React.JSX.Element {
  const [highlightedText, setHighlightedText] = useState<React.ReactNode[]>(
    [],
  );

  React.useEffect(() => {
    // Split text and wrap terms with Tooltip
    const words = children.split(/\b/);
    const elements = words.map((word, index) => {
      const lowerWord = word.toLowerCase();
      const term = getTerm(lowerWord);

      if (term) {
        return (
          <Tooltip key={index} term={lowerWord}>
            <Text style={[style, styles.termHighlight]}>{word}</Text>
          </Tooltip>
        );
      }
      return (
        <Text key={index} style={style}>
          {word}
        </Text>
      );
    });

    setHighlightedText(elements);
  }, [children, style]);

  return <Text>{highlightedText}</Text>;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    maxWidth: Dimensions.get('window').width - 40,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  tooltipDefinition: {
    fontSize: 16,
    color: '#555555',
    lineHeight: 24,
    marginBottom: 12,
  },
  exampleContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 6,
  },
  exampleText: {
    fontSize: 14,
    color: '#555555',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  termHighlight: {
    color: '#2196F3',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
});
