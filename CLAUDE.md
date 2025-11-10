# CLAUDE.md - ChessApp Development Instructions

This file contains persistent instructions for Claude Code sessions working on the ChessApp project.

## 📋 Project Context

- **Project**: Neural Board Games - React Native Windows Chess App with Fairy-Stockfish engine
- **Username**: unattachedgray
- **Primary Platform**: Windows 10/11 UWP Desktop
- **Tech Stack**: React Native 0.75.4, TypeScript, chess.js, Fairy-Stockfish (XBoard protocol)

## 🔐 GitHub Credentials

**IMPORTANT**: For all git operations, read credentials from `/mnt/c/Users/unatt/OneDrive/dev/nbg/ChessApp/credentials.json`

**credentials.json structure** (now fixed):
```json
{
  "github": {
    "username": "unattachedgray",
    "token": "<github_personal_access_token>"
  }
}
```

**Usage Pattern**:
```bash
# With python (recommended):
GITHUB_USER=$(python3 -c "import json; print(json.load(open('/mnt/c/Users/unatt/OneDrive/dev/nbg/ChessApp/credentials.json'))['github']['username'])")
GITHUB_TOKEN=$(python3 -c "import json; print(json.load(open('/mnt/c/Users/unatt/OneDrive/dev/nbg/ChessApp/credentials.json'))['github']['token'])")

# Set remote and push
git remote set-url origin https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/nbg.git
git push
```

**Alternative with jq** (if installed):
```bash
GITHUB_USER=$(jq -r '.github.username' /mnt/c/Users/unatt/OneDrive/dev/nbg/ChessApp/credentials.json)
GITHUB_TOKEN=$(jq -r '.github.token' /mnt/c/Users/unatt/OneDrive/dev/nbg/ChessApp/credentials.json)
```

## 📝 STATUS.md Update Protocol

**When to Update**: After completing any significant feature or fix

**Update Locations**:
1. **Currently Working On** section - Update current tasks
2. **Recent Changes Log** section - Add timestamped entry at the TOP with:
   - Date and time (format: "November 9, 2025 - 10:30 PM")
   - Bullet list of changes made
   - Technical details of fixes/improvements

**Example Entry**:
```markdown
### November 9, 2025 - 10:30 PM
- Fixed hover highlighting - now properly highlights suggested move on board
- Reorganized analysis panel layout - moved continuation to right column
- Added move sequence overlays with numbered circles
- Improved horizontal resize behavior with better flex constraints
```

## 🔄 Git Workflow for Every Session End

**IMPORTANT**: Always commit and push automatically after completing work. Never ask for permission.

**Standard Commit Procedure**:
```bash
# 1. Review changes
git status
git diff

# 2. Stage changes (avoid build artifacts)
git add <relevant-files>

# 3. Commit with descriptive message
git commit -m "feat: <brief description of changes>

- Detail 1
- Detail 2
- Detail 3

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. ALWAYS push automatically using credentials (no permission needed)
GITHUB_USER=$(python3 -c "import json; print(json.load(open('/mnt/c/Users/unatt/OneDrive/dev/nbg/ChessApp/credentials.json'))['github']['username'])")
GITHUB_TOKEN=$(python3 -c "import json; print(json.load(open('/mnt/c/Users/unatt/OneDrive/dev/nbg/ChessApp/credentials.json'))['github']['token'])")
git remote set-url origin https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/nbg.git
git push
```

## 🏗️ Architecture Key Points

### XBoard Protocol Limitations
- No multi-PV support (can't show alternative lines)
- Single best move only
- Format: `ply score time nodes pv...`
- Must filter moves with regex: `/^[a-h][1-8][a-h][1-8][qrbn]?$/`

### Component Communication Flow
```
App.tsx (state management)
  ├─> ChessBoard (board display, move input)
  │   └─ Props: fen, onMove, suggestedMove, moveSequence
  │
  └─> AnalysisPanel (engine analysis display)
      └─ Props: analysis, onSuggestionClick, onSuggestionHover, onContinuationHover
```

### State Management Pattern
- `currentFen` - Current board position
- `analysis` - Engine analysis results
- `suggestedMoveHighlight` - Boolean to show/hide suggested move highlighting
- `moveSequence` - Array of moves to overlay on board

## 🎮 Game Modes

### Player vs AI (default)
- Player makes move → Analysis updates → AI responds → Analysis updates
- Uses `getBestMove()` with 2 second time limit

### AI vs AI
- Continuous loop: `getEngineMove()` → 1 second delay → repeat
- **IMPORTANT**: Needs stop button and mode reset functionality

### Learning Mode
- Should show continuous analysis
- Should NOT auto-play moves
- Currently not fully implemented

## 🐛 Known Issues to Remember

1. **react-native-fs doesn't work on Windows UWP**
   - Solution: Platform check, skip on Windows
   - Windows uses PowerShell setup script

2. **Horizontal resize can cause layout issues**
   - Use flexGrow/flexShrink instead of flex
   - Set alignItems: 'flex-start' on containers

3. **XBoard engine output includes numeric fields**
   - Must filter with regex before displaying moves

## 📦 Build and Run

### From PowerShell (not WSL):
```powershell
# Automated run (preferred)
.\run-app.ps1

# Manual run
npm start          # Terminal 1 - Metro bundler
npm run windows    # Terminal 2 - Build and launch
```

### First Time Setup:
```powershell
npm install
.\setup-engines.ps1    # Download NNUE file
.\run-app.ps1
```

## 🎨 UI/UX Guidelines

### Analysis Panel Layout
- **Left Column**: Evaluation + Stats
- **Right Column**: Your Best Move + If You Play Best Move
- Both suggestion boxes are interactive (hover + click)

### Color Scheme
- Suggested move: Blue (#4fc3f7) source, Green (#81c784) destination
- Your Best Move: Blue box (#2196F3)
- Continuation: Purple box (#9C27B0)
- Move overlays: Blue/Green with white borders

### Responsive Design
- Board: minWidth 350px, maxWidth 600px
- Analysis: minWidth 300px, maxWidth 600px
- Use flexWrap for wrapping on small screens

## 🔧 Common Fixes

### Invalid Move Errors
- Usually caused by not resetting game state properly
- Fix: Call `gameRef.current.reset()` before starting new game
- Fix: Ensure engine is in force mode before setting position

### Hover Not Working
- Ensure prop is passed directly, not through internal state
- ChessBoard should use `suggestedMove` prop, not internal state

### AI vs AI Won't Stop
- Need to add stop flag in state
- Break loop when flag is set or when switching modes

## 📚 File Organization

### Core Files (Frequently Modified)
- `App.tsx` - Main app component, orchestrates everything
- `src/components/board/chess-board.tsx` - Interactive board
- `src/components/analysis/analysis-panel.tsx` - Analysis display
- `src/services/xboard-engine.ts` - Engine communication
- `STATUS.md` - Progress tracking (UPDATE FREQUENTLY)

### Configuration Files
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `metro.config.js` - Metro bundler config

### Scripts
- `run-app.ps1` - Automated launcher (PowerShell)
- `setup-engines.ps1` - NNUE downloader (PowerShell)
- `test-engine.sh` - Engine test (Bash)

## ⚠️ Important Reminders

1. **Never commit credentials.json** - Already in .gitignore
2. **Always use PowerShell for builds** - Not WSL
3. **Update STATUS.md after each feature** - Keep it current
4. **Filter XBoard output** - Remove numeric fields from moves
5. **Platform check for Windows** - Skip react-native-fs operations
6. **Reset game state properly** - Prevent invalid move errors
7. **Use descriptive commit messages** - Include "feat:", "fix:", "refactor:", etc.

## 🚀 Session Resume Checklist

When resuming a session:
1. ✅ Read STATUS.md to understand current state
2. ✅ Check "Currently Working On" section
3. ✅ Review "Recent Changes Log" for context
4. ✅ Run `git status` to see uncommitted changes
5. ✅ Continue from last task or address user's new request

## 📞 User Preferences

- **Concise responses** - User prefers brief, direct communication
- **No unnecessary emojis** - Keep it professional
- **Focus on solutions** - Fix root causes, not symptoms
- **Update STATUS.md** - Document all significant changes
- **Git commits at session end** - Always push completed work
