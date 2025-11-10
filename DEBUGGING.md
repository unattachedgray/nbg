# Debugging Guide

## 📋 Copying Logs from Metro Console

### In PowerShell:
1. **Select text**: Click and drag to highlight text in the PowerShell window
2. **Copy**: Press `Ctrl+C` or right-click the selected text
3. **Paste**: Use `Ctrl+V` in any text editor

### Alternative: Save Logs to File

Run Metro with output redirection:

```powershell
npm start > metro-log.txt 2>&1
```

Then open `metro-log.txt` in any text editor.

### Alternative: Use Windows Terminal

If using Windows Terminal (modern):
- Select text normally with mouse
- Right-click → Copy
- Or press `Ctrl+Shift+C`

## 🐛 Common Issues and Fixes

### Issue: "Initializing engine..." doesn't go away

**Cause**: Engine failed to spawn or initialize

**Debug**:
1. Check Metro console for error messages
2. Look for "Failed to spawn engine" or "Failed to initialize engine"
3. Check if engine file exists:
   ```
   windows\chessapp\assets\engines\fairy-stockfish-largeboard_x86-64-bmi2.exe
   ```

**Fix**: Ensure engine file is in the correct location

### Issue: Black doesn't move after White moves

**Cause**: Engine not responding or not initialized

**Debug**:
1. Check if "Engine ready" appears in the UI
2. Check Metro console for XBoard protocol messages:
   - Should see: `XBoard >>> xboard`
   - Should see: `XBoard >>> protover 2`
   - Should see: `XBoard <<< [engine responses]`

**Fix**:
- Reload the app (press `r` in Metro console)
- Or restart: Close app, run `npm run windows` again

### Issue: NativeEventEmitter warning

**Status**: ✅ Fixed in latest code

**If still seeing**: Reload the app

## 🔍 Enable Verbose Logging

Add this to your `App.tsx` at the top:

```typescript
// Add after imports
console.log('========== APP STARTING ==========');
console.log('Platform:', Platform.OS);
console.log('React Native version:', Platform.Version);
```

## 📊 Check Engine Status

Add a test button to your app (temporary):

```typescript
// In App.tsx, add to controls section:
<Pressable
  style={styles.controlButton}
  onPress={async () => {
    console.log('=== ENGINE DEBUG ===');
    console.log('Engine ready:', engineReady);
    console.log('Engine ref exists:', !!engineRef.current);
    console.log('Native bridge available:', nativeEngineBridge.isAvailable());

    if (engineRef.current) {
      try {
        const running = await nativeEngineBridge.isEngineRunning();
        console.log('Engine process running:', running);
      } catch (e) {
        console.error('Failed to check engine:', e);
      }
    }
  }}>
  <Text style={styles.controlButtonText}>Debug Engine</Text>
</Pressable>
```

## 🔧 Fix Build Issues

### Clean Build

If you encounter strange errors:

```powershell
# Stop Metro
# Close app

# Clean build artifacts
Remove-Item -Recurse -Force windows\x64
Remove-Item -Recurse -Force windows\ARM64
Remove-Item -Recurse -Force windows\chessapp\Generated Files

# Rebuild
npm run windows
```

### Reset Metro Cache

```powershell
npm start -- --reset-cache
```

## 📝 Export Full Log

To capture everything for debugging:

```powershell
# Terminal 1: Metro with logging
npm start 2>&1 | Tee-Object -FilePath metro-full.log

# Terminal 2: Run app
npm run windows 2>&1 | Tee-Object -FilePath build-full.log
```

This saves all output to files while still showing it in the console.

## 🎯 Success Indicators

When everything is working correctly, you should see:

### In Metro Console:
```
 LOG  Initializing chess engine...
 LOG  Spawning engine at: assets\engines\fairy-stockfish-largeboard_x86-64-bmi2.exe
 LOG  XBoard >>> xboard
 LOG  XBoard >>> protover 2
 LOG  XBoard <<< feature done=1
 LOG  ✅ Engine ready!
```

### In App UI:
- ✅ Green dot next to "Engine ready"
- ✅ When you move: "Engine thinking..." appears briefly
- ✅ Black moves automatically after White moves
- ✅ No error messages

### After Making a Move:
```
 LOG  Player move: e2 -> e4
 LOG  XBoard >>> force
 LOG  XBoard >>> setboard [FEN string]
 LOG  XBoard >>> st 2
 LOG  XBoard >>> go
 LOG  XBoard <<< move e7e5
```

## 🚨 Critical Errors

### "Native engine module not available"
**Cause**: C++ module not compiled or loaded

**Fix**: Rebuild the project
```powershell
npm run windows
```

### "Failed to spawn engine process"
**Cause**: Engine executable not found or can't be launched

**Fix**:
1. Check file exists: `windows\chessapp\assets\engines\fairy-stockfish-largeboard_x86-64-bmi2.exe`
2. Check file size is ~1.8MB (not 0 bytes)
3. Try running engine manually to test:
   ```powershell
   cd windows\chessapp\assets\engines
   .\fairy-stockfish-largeboard_x86-64-bmi2.exe
   ```
   Type `quit` to exit

### App crashes on startup
**Cause**: JavaScript error or native module crash

**Fix**: Check Metro console for the error stack trace

---

**Tip**: Keep Metro console visible while playing to see real-time XBoard communication!
