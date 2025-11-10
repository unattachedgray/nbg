# Running the Chess App

## ✅ Quick Start (Recommended)

**IMPORTANT: Run these commands in Windows PowerShell or CMD, NOT in WSL/Ubuntu terminal!**

### Step 1: Open PowerShell

Press `Win + X` and select "Windows PowerShell" or "Terminal"

### Step 2: Navigate to Project

```powershell
cd C:\Users\unatt\OneDrive\dev\nbg\ChessApp
```

### Step 3: Start Metro Bundler (Terminal 1)

```powershell
npm start
```

Keep this terminal open - it will show Metro bundler logs.

### Step 4: Build and Run (Terminal 2)

Open a **second** PowerShell window and run:

```powershell
cd C:\Users\unatt\OneDrive\dev\nbg\ChessApp
npm run windows
```

This will:
1. ✅ Build the C++ native code
2. ✅ Link native modules
3. ✅ Deploy the app
4. ✅ Launch the Chess App window

## Expected Result

When successful, you should see:
- ✅ App window opens
- ✅ "Engine ready" status with green dot
- ✅ Chess board displayed
- ✅ Can click squares to make moves

## Troubleshooting

### Error: "autolink-windows exited with code 1"

This happens when running from WSL instead of Windows PowerShell.

**Solution**: Run the commands in **Windows PowerShell** (not WSL terminal)

### Error: "Cannot connect to Metro bundler"

**Solution**: Make sure `npm start` is running in Terminal 1

### Error: "Build failed"

**Solution**: Open the project in Visual Studio and build there first:
```powershell
start windows\chessapp.sln
# Then: Build > Build Solution (Ctrl+Shift+B)
```

After building successfully in Visual Studio, run `npm run windows` again.

## Alternative: Visual Studio + Metro

If `npm run windows` has issues:

### Terminal 1: Start Metro
```powershell
npm start
```

### Visual Studio:
1. Open `windows\chessapp.sln`
2. Configuration: **Debug**
3. Platform: **x64**
4. Press **F5** (Start Debugging)

## Verification Checklist

- [ ] Running from Windows PowerShell (not WSL)
- [ ] Metro bundler is running (`npm start`)
- [ ] App launches with a window
- [ ] Chess board is visible
- [ ] "Engine ready" status appears
- [ ] Can interact with the board

## Next Steps After Launch

Once the app is running:
1. Try making moves by clicking chess pieces
2. Check the status indicator (should show "Engine ready")
3. Try the "AI vs AI" button to watch the engine play itself
4. Check console logs in Metro terminal for any errors

---

**Note**: The first build takes longer (2-5 minutes). Subsequent builds are much faster.
