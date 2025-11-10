# Chess App Architecture

**Last Updated**: November 9, 2025

---

## 🎯 Core Architecture: Rules-Based Chess Engine

### IMPORTANT: NOT an AI API Application!

This chess application uses **traditional algorithmic chess engines**, NOT AI APIs like OpenAI or Gemini.

```
┌─────────────────────────────────────────────────────┐
│              React Native Application                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   UI Layer   │  │  chess.js    │  │  State   │ │
│  │  Components  │  │  Validation  │  │  Manager │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬────┘ │
└─────────┼──────────────────┼─────────────────┼──────┘
          │                  │                 │
          ▼                  ▼                 ▼
┌─────────────────────────────────────────────────────┐
│           XBoard Protocol Communication              │
│  - Text-based commands (xboard, go, move, etc.)     │
│  - Process spawning via Native Module               │
│  - Bi-directional stdin/stdout communication        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         Fairy-Stockfish Engine Process               │
│  ┌──────────────────────────────────────────────┐  │
│  │  Move Generation (Rules-Based)               │  │
│  │  - Legal move calculation using chess rules  │  │
│  │  - Variant-specific rules (chess, janggi)   │  │
│  │  - NO AI - pure algorithmic logic            │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Search Logic (Alpha-Beta Pruning)           │  │
│  │  - Minimax algorithm with optimizations      │  │
│  │  - Transposition tables, move ordering       │  │
│  │  - NO AI - classic game tree search          │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  NNUE Evaluation (Local Neural Network)      │  │
│  │  - Runs locally (NO internet/API calls)      │  │
│  │  - Uses pre-trained weights (46MB file)      │  │
│  │  - Evaluates positions in milliseconds       │  │
│  │  - Deterministic and reproducible            │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Technology Stack

### Frontend Layer
- **React Native 0.75.4** - Cross-platform UI framework
- **TypeScript 5.9** - Type-safe JavaScript
- **chess.js 1.0.0-beta.8** - Move validation in UI
- **React Native Windows 0.75.4** - Windows desktop support

### Engine Layer
- **Fairy-Stockfish** - Chess engine (50+ variants)
  - Windows: `fairy-stockfish-largeboard_x86-64-bmi2.exe` (1.8MB)
  - Linux: `fairy-stockfish` (983KB)
- **NNUE Weights** - `nn-46832cfbead3.nnue` (46MB)
- **Protocol**: XBoard (primary), UCI (alternative)

### Communication Layer
- **Native Module** (TODO) - Bridge React Native ↔ Engine
- **Process Management** - Spawn and manage engine process
- **Protocol Handler** - Format commands, parse responses

---

## 📡 XBoard Protocol Communication

### Why XBoard Over UCI?

**XBoard Advantages:**
- ✅ Simpler command structure
- ✅ Human-readable format (easier debugging)
- ✅ Less verbose than UCI
- ✅ Well-documented and stable
- ✅ Fully supported by Fairy-Stockfish

**UCI Advantages:**
- ✅ More modern (1990s vs 2000s)
- ✅ More widely adopted
- ✅ More detailed analysis info

**Decision**: XBoard for initial implementation, UCI as future enhancement.

### XBoard Command Flow

```typescript
// 1. Initialize engine
engine.stdin.write('xboard\n');
engine.stdin.write('protover 2\n');
// Wait for: "feature done=1"

// 2. New game
engine.stdin.write('new\n');
engine.stdin.write('variant janggi\n'); // If not standard chess
engine.stdin.write('post\n'); // Enable thinking output

// 3. Set position (if not starting position)
engine.stdin.write('force\n'); // Enter force mode
engine.stdin.write('setboard rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\n');

// 4. Request move
engine.stdin.write('go\n'); // Engine thinks and moves

// 5. Receive move
engine.stdout.on('data', (data) => {
  if (data.includes('move e2e4')) {
    // Parse and execute move
  }
});

// 6. Tell engine player's move
engine.stdin.write('force\n');
engine.stdin.write('e7e5\n'); // Player's move
engine.stdin.write('go\n'); // Engine responds

// 7. Quit
engine.stdin.write('quit\n');
```

### XBoard Thinking Output

When `post` is enabled, engine outputs thinking:
```
12 +145 1234 567890 e2e4 e7e5 g1f3 b8c6
│  │    │    │      └─ Principal variation (PV)
│  │    │    └─ Nodes searched
│  │    └─ Time (centiseconds)
│  └─ Score (centipawns, + for white, - for black)
└─ Depth (plies)
```

---

## 🧠 NNUE Evaluation (NOT an AI API!)

### What is NNUE?

**Efficiently Updatable Neural Network**
- Small neural network (46MB weights)
- Runs **locally** on device (no internet)
- Evaluates chess positions
- Trained on millions of chess games
- Faster and stronger than traditional evaluation

### How It Works

```
Position (FEN) → Feature Extraction → Neural Network → Score
                                      (46MB weights)
```

**NOT an AI API because:**
- ❌ No API calls to external services
- ❌ No internet connection required
- ❌ No API keys needed
- ❌ No rate limits or costs
- ✅ Runs entirely on local device
- ✅ Deterministic (same input = same output)
- ✅ Fast (milliseconds per position)
- ✅ Pre-trained (weights included with engine)

### Comparison

| Feature | NNUE (This App) | AI API (NOT Used) |
|---------|-----------------|-------------------|
| Location | Local device | Cloud servers |
| Internet | Not required | Required |
| Speed | <1ms per eval | 100ms-2000ms |
| Cost | Free | Per-API-call pricing |
| Privacy | 100% private | Data sent to cloud |
| Deterministic | Yes | Usually yes |
| API Keys | None | Required |

---

## 📁 Project Structure

```
ChessApp/
├── src/
│   ├── components/
│   │   ├── board/
│   │   │   └── chess-board.tsx       ✅ Interactive chess UI
│   │   ├── analysis/
│   │   │   └── analysis-panel.tsx    ✅ Engine analysis display
│   │   └── ui/
│   │       └── tooltip.tsx           ✅ Chess term tooltips
│   │
│   ├── services/
│   │   ├── xboard-engine.ts          ✅ XBoard protocol (PRIMARY)
│   │   └── uci-engine.ts             ✅ UCI protocol (ALTERNATIVE)
│   │
│   ├── types/
│   │   └── game.ts                   ✅ TypeScript definitions
│   │
│   ├── utils/
│   │   └── chess-terms.ts            ✅ 40+ chess terms
│   │
│   └── assets/
│       └── engines/
│           ├── fairy-stockfish-largeboard_x86-64-bmi2.exe  ✅ Windows (1.8MB)
│           ├── fairy-stockfish                              ✅ Linux (983KB)
│           └── nn-46832cfbead3.nnue                        ✅ Weights (46MB)
│
├── windows/                          ✅ UWP project (React Native Windows)
├── android/                          📱 Android project (standard RN)
├── ios/                              📱 iOS project (standard RN)
│
├── App.tsx                           ✅ Main application
├── test-engine.sh                    ✅ Engine test script
├── demo-engine.js                    ✅ Node.js demo
│
├── README.md                         ✅ Installation & usage
├── STATUS.md                         ✅ Project status
├── ARCHITECTURE.md                   ✅ This file
└── package.json                      ✅ Dependencies
```

---

## 🔄 Data Flow

### User Makes a Move

```
1. User drags piece on board
   ↓
2. chess.js validates move
   ↓
3. If valid, update board state
   ↓
4. Send move to engine via XBoard
   ↓
5. Engine thinks (rules + search + NNUE)
   ↓
6. Engine returns move
   ↓
7. Parse engine response
   ↓
8. Validate engine's move
   ↓
9. Update board with engine's move
   ↓
10. Update analysis panel with thinking info
```

### Real-Time Analysis

```
Current Position
   ↓
Send to engine: "go infinite"
   ↓
Engine continuously outputs thinking:
- Current depth
- Best move so far
- Evaluation score
- Principal variation
   ↓
Parse and display in AnalysisPanel
   ↓
User makes move → Stop analysis → Restart
```

---

## 🎮 Game Modes Implementation

### 1. Player vs AI

```typescript
async function onPlayerMove(move: string) {
  // 1. Validate and make player's move
  game.move(move);
  updateBoard();

  // 2. Tell engine about move
  await engine.makeMove(move);

  // 3. Ask engine for response
  const engineMove = await engine.getBestMove(game.fen(), 2000);

  // 4. Make engine's move
  game.move(engineMove);
  updateBoard();
}
```

### 2. AI vs AI

```typescript
async function startAIvsAI(speedMs: number) {
  while (!game.isGameOver()) {
    // Get move from engine
    const move = await engine.getBestMove(game.fen(), speedMs);

    // Make move
    game.move(move);
    updateBoard();

    // Small delay for visualization
    await sleep(speedMs / 2);
  }
}
```

### 3. Learning Mode

```typescript
async function enableLearningMode() {
  // Start infinite analysis
  engine.sendCommand('analyze');

  // Show analysis in real-time
  engine.on('thinking', (analysis) => {
    showAnalysis(analysis);
    highlightBestMove(analysis.bestMove);
    showEvaluation(analysis.score);
  });

  // Show hints on hover
  onSquareHover((square) => {
    const hint = engine.getHint(square);
    showTooltip(hint);
  });
}
```

---

## 🔌 Native Module Design

### Required Native Module (Windows UWP)

```cpp
// EngineModule.h
namespace ChessApp {
  class EngineModule {
  public:
    void SpawnEngine(std::string path);
    void SendCommand(std::string command);
    std::string ReadOutput();
    void StopEngine();

  private:
    HANDLE processHandle;
    HANDLE stdinWrite;
    HANDLE stdoutRead;
  };
}
```

### React Native Bridge

```typescript
// src/services/native-engine-bridge.ts
import { NativeModules } from 'react-native';

const { EngineModule } = NativeModules;

export class NativeEngine {
  async spawn(path: string) {
    await EngineModule.spawnEngine(path);
  }

  async sendCommand(cmd: string) {
    await EngineModule.sendCommand(cmd);
  }

  async readOutput(): Promise<string> {
    return await EngineModule.readOutput();
  }
}
```

---

## 🚀 Next Implementation Steps

### Phase 1: Native Module (HIGH PRIORITY)

1. **Create C++ Native Module for Windows**
   - File: `windows/chessapp/EngineModule.h/.cpp`
   - Implement process spawning
   - Handle stdin/stdout pipes
   - Thread-safe output reading

2. **Bridge to React Native**
   - Register module in `ReactPackageProvider`
   - Expose methods to JavaScript
   - Handle async operations properly

3. **Integrate with XBoardEngine**
   - Replace console.log with native calls
   - Implement output parsing
   - Handle errors and edge cases

### Phase 2: Game Features (MEDIUM)

1. Move history with undo/redo
2. Save/load games (PGN)
3. AI vs AI mode
4. Learning mode with hints
5. Position setup

### Phase 3: Polish (LOW)

1. Animations
2. Sound effects
3. Multiple themes
4. Opening book
5. Statistics

---

## 📊 Performance Considerations

### Engine Performance

- **Move generation**: <1ms (rules-based)
- **NNUE evaluation**: <1ms per position
- **Search (depth 12)**: ~1-2 seconds
- **Memory usage**: ~50MB (engine + NNUE)

### UI Performance

- **Board rendering**: 60 FPS (React Native)
- **Move validation**: <1ms (chess.js)
- **State updates**: Optimized with React.memo

### Optimization Strategies

1. **Lazy load** NNUE weights only when needed
2. **Keep engine alive** between moves (don't restart)
3. **Use hash tables** for position caching
4. **Limit analysis depth** in real-time mode
5. **Debounce** position updates

---

## 🔒 Security & Privacy

### Local-First Architecture

- ✅ No user data sent to external servers
- ✅ No analytics or tracking
- ✅ No internet required for gameplay
- ✅ All computation happens locally
- ✅ NNUE weights stored locally (46MB)

### Process Isolation

- Engine runs in separate process
- Limited privileges (no network access)
- Sandboxed execution on mobile
- Clean shutdown on errors

---

## 📚 References

### Documentation

- **XBoard Protocol**: http://hgm.nubati.net/CECP.html
- **UCI Protocol**: https://www.chessprogramming.org/UCI
- **Fairy-Stockfish**: https://github.com/fairy-stockfish/Fairy-Stockfish
- **NNUE**: https://github.com/glinscott/nnue-pytorch
- **React Native Windows**: https://microsoft.github.io/react-native-windows/

### Similar Projects

- lichess.org (web chess platform)
- Chess.com mobile apps
- DroidFish (Android chess)

---

## ❓ FAQs

**Q: Why not use an AI API like GPT-4 for chess moves?**
A: Traditional chess engines are far superior for chess:
- 1000x faster (1ms vs 1000ms)
- 100% accurate rules
- Much cheaper (free vs paid)
- Works offline
- Deterministic results

**Q: What is NNUE and why isn't it an "AI API"?**
A: NNUE is a small neural network that runs locally. It's "AI" in the sense of being a neural network, but it's NOT an API service. It's more like a sophisticated mathematical function that evaluates chess positions.

**Q: Can I use Stockfish instead of Fairy-Stockfish?**
A: Yes, but you'll lose support for chess variants. Fairy-Stockfish is a fork of Stockfish that adds 50+ variants.

**Q: Why XBoard instead of UCI?**
A: XBoard is simpler to implement and debug. We may add UCI support later.

**Q: Does this need internet?**
A: No! Everything runs locally. Internet is only needed to download the app initially.

---

**Last Updated**: November 9, 2025
**Architecture Version**: 1.0
**Status**: ✅ Foundation Complete, Ready for Native Module Integration
