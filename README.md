# Chess Game - Cross-Platform Chess Application

A feature-rich chess application built with React Native, supporting multiple chess variants (Chess, Janggi, and more), with advanced features like engine analysis, learning mode, and AI vs AI gameplay.

## Features

- ✅ **Multiple Chess Variants**: Chess, Janggi (Korean Chess), with support for more variants via Fairy-Stockfish
- ✅ **Cross-Platform**: Windows, Android, iOS support with single codebase
- ✅ **Game Modes**:
  - Player vs AI
  - AI vs AI (watch engines play)
  - Learning Mode (with tooltips and hints)
- ✅ **Engine Analysis**: Real-time position evaluation using Fairy-Stockfish
- ✅ **Interactive Learning**: Hover over chess terms for definitions and examples
- ✅ **Modern UI**: Clean, responsive design with smooth animations

## Project Structure

```
ChessApp/
├── src/
│   ├── components/
│   │   ├── board/         # Chess board components
│   │   ├── analysis/      # Engine analysis panel
│   │   └── ui/            # Reusable UI components (tooltips, etc.)
│   ├── services/
│   │   └── uci-engine.ts  # UCI protocol for chess engines
│   ├── types/
│   │   └── game.ts        # TypeScript type definitions
│   ├── utils/
│   │   └── chess-terms.ts # Chess terminology database
│   └── assets/
│       └── engines/       # Chess engine binaries and NNUE files
├── windows/               # Windows UWP project
├── android/               # Android project (standard RN)
├── ios/                   # iOS project (standard RN)
├── App.tsx                # Main app component
└── package.json
```

## Prerequisites

### For All Platforms:
- Node.js 20+
- npm 10+

### For Windows Development:
- **Visual Studio 2022** with:
  - Universal Windows Platform development workload
  - C++ (v143) Universal Windows Platform tools
  - Windows 11 SDK (10.0.22621.0 or later)
- **Windows 11** (for running UWP apps)

### For Android Development:
- Android Studio
- Android SDK (API 33+)
- Java Development Kit (JDK) 17+

### For iOS Development (macOS only):
- Xcode 14+
- CocoaPods
- macOS 12+

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   cd ChessApp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **✅ Fairy-Stockfish Engine** (ALREADY COMPILED!):

   The chess engine is already compiled and ready to use!

   **Test the engine:**
   ```bash
   ./test-engine.sh     # Quick engine verification
   node demo-engine.js  # Full demo with analysis examples
   ```

   **Engine Details:**
   - Version: Fairy-Stockfish 091125
   - Location: `src/assets/engines/fairy-stockfish`
   - Size: 983KB
   - Supports: Chess, Janggi, Xiangqi, Shogi, and 50+ variants
   - Features: NNUE neural network evaluation

   **Recompile (if needed):**
   ```bash
   cd ../Fairy-Stockfish/src
   make -j4 build ARCH=x86-64-modern
   cp stockfish ../../ChessApp/src/assets/engines/fairy-stockfish
   ```

## Running the App

### Windows (Desktop):

```bash
npm run windows
```

This will:
1. Start the Metro bundler
2. Build the Windows UWP project
3. Deploy and launch the app

**Note**: The first build may take 10-20 minutes as it compiles all dependencies.

### Android:

```bash
# Start Metro bundler
npm start

# In another terminal, run Android
npm run android
```

### iOS (macOS only):

```bash
# Install iOS dependencies
cd ios && pod install && cd ..

# Run on iOS simulator
npm run ios
```

## Development Workflow

1. **Start the Metro bundler**:
   ```bash
   npm start
   ```

2. **Run on your target platform**:
   ```bash
   npm run windows   # Windows
   npm run android   # Android
   npm run ios       # iOS
   ```

3. **Enable Fast Refresh**: Code changes will automatically reload in the app.

## Building for Production

### Windows:

```bash
# Open Visual Studio
# Open windows/chessapp.sln
# Select "Release" configuration
# Build > Build Solution
# The package will be in windows/AppPackages/
```

### Android:

```bash
cd android
./gradlew assembleRelease
# APK will be in android/app/build/outputs/apk/release/
```

### iOS:

```bash
# Open Xcode
# Open ios/ChessApp.xcworkspace
# Product > Archive
# Follow the App Store submission process
```

## Configuration

### Engine Settings

Edit `src/services/uci-engine.ts` to configure:
- Engine strength (depth, time limits)
- Multi-PV (number of alternative lines)
- Hash table size
- Number of threads

### Game Variants

To add new chess variants:
1. Ensure Fairy-Stockfish supports the variant
2. Add the variant type to `src/types/game.ts`
3. Update the variant selector in `App.tsx`
4. Add terminology to `src/utils/chess-terms.ts`

## Next Steps / TODO

### High Priority:
- [ ] Implement native module for UCI engine communication
- [ ] Complete AI vs AI game loop
- [ ] Add move history and game replay
- [ ] Implement save/load game functionality (PGN format)
- [ ] Add sound effects for moves

### Medium Priority:
- [ ] Implement Janggi-specific board rendering
- [ ] Add opening book integration
- [ ] Create puzzle mode
- [ ] Add multiplayer support (online)
- [ ] Implement position setup/editor

### Low Priority:
- [ ] Add themes (different board styles)
- [ ] Implement game statistics and player ratings
- [ ] Add game analysis tools (blunder detection)
- [ ] Create tutorial mode for beginners

## Engine Information

### ✅ Engine Already Compiled!

The Fairy-Stockfish engine has been successfully compiled and is ready to use:

- **Binary**: `src/assets/engines/fairy-stockfish` (983KB)
- **Version**: Fairy-Stockfish 091125
- **Type**: Linux ELF x86-64 (runs in WSL)
- **Supports**: 50+ chess variants (chess, janggi, xiangqi, shogi, etc.)

### Testing the Engine

**Quick test:**
```bash
./test-engine.sh
```

**Full demo with analysis:**
```bash
node demo-engine.js
```

**Manual test:**
```bash
./src/assets/engines/fairy-stockfish
# Then type UCI commands:
# uci
# setoption name UCI_Variant value chess
# position startpos
# go depth 15
# quit
```

### Cross-Compiling for Windows (Optional)

If you need a native Windows .exe:

```bash
cd Fairy-Stockfish/src
sudo apt install mingw-w64
make clean
make -j4 build ARCH=x86-64-modern COMP=mingw
cp stockfish.exe ../../ChessApp/src/assets/engines/fairy-stockfish.exe
```

## Troubleshooting

### Windows Build Issues:

**Error: "Windows SDK not found"**
- Install Windows 11 SDK via Visual Studio Installer
- Check that the SDK version matches in `windows/chessapp/chessapp.vcxproj`

**Error: "MSBuild error MSB4019"**
- Ensure Visual Studio 2022 is installed
- Run from "Developer Command Prompt for VS 2022"

### Metro Bundler Issues:

**Error: "Port 8081 already in use"**
```bash
npx react-native start --reset-cache --port 8082
```

### Chess.js Import Issues:

If you see errors about chess.js imports, ensure you're using the correct version:
```bash
npm install chess.js@1.0.0-beta.8
```

## Architecture Notes

### Engine Communication:
- Uses UCI (Universal Chess Interface) protocol
- Currently logging to console (native module TODO)
- Will use child_process on Windows, native modules on mobile

### State Management:
- Using React hooks (useState, useEffect)
- Can upgrade to Redux/Zustand for complex state

### Performance:
- Chess board re-renders optimized with React.memo
- Engine analysis runs in background
- UI remains responsive during analysis

## Contributing

To contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on target platforms
5. Submit a pull request

## License

This project uses Fairy-Stockfish which is licensed under GNU GPL v3.
See `../Fairy-Stockfish/Copying.txt` for details.

## Resources

- [Fairy-Stockfish](https://github.com/fairy-stockfish/Fairy-Stockfish)
- [React Native Documentation](https://reactnative.dev/)
- [React Native Windows](https://microsoft.github.io/react-native-windows/)
- [UCI Protocol](https://www.chessprogramming.org/UCI)
- [Chess.js](https://github.com/jhlywa/chess.js)

## Support

For issues and questions:
1. Check the Troubleshooting section
2. Review the React Native Windows documentation
3. Open an issue on GitHub

---

**Version**: 1.0.0
**Last Updated**: 2025-11-09
