# Building the Chess App

## ✅ Project Configuration Fixed

**Latest Update**: November 9, 2025 - Fixed PlatformToolset configuration for all build configurations.

The project has been configured with:
- **Platform Toolset**: v143 (Visual Studio 2022) for ALL configurations
- **Windows SDK**: 10.0 (uses latest installed)
- **Configuration-specific PropertyGroups**: Each Debug/Release × Win32/x64/ARM64 combination now has complete build settings

---

## 🛠️ Prerequisites

### Required Software

1. **Visual Studio 2022** (Community, Professional, or Enterprise)
   - Workload: "Universal Windows Platform development"
   - Workload: "Desktop development with C++"
   - Component: "C++ (v143) Universal Windows Platform tools"
   - Component: "Windows 10 SDK" (any recent version 10.0.x)

2. **Node.js** 20+ (✅ Already installed)

3. **npm** 10+ (✅ Already installed)

---

## 🚀 Build Steps

### Option 1: npm run windows (Easiest - Recommended)

This handles everything automatically including building and running:

```cmd
# Open PowerShell or CMD (NOT WSL)
cd C:\Users\unatt\OneDrive\dev\nbg\ChessApp

# Terminal 1: Start Metro bundler
npm start

# Terminal 2: Build and run
npm run windows
```

This will:
- Build the C++ project automatically
- Bundle the JavaScript
- Deploy and launch the app
- Connect to Metro bundler

### Option 2: Visual Studio GUI (For Development)

1. **Open the Solution**
   ```bash
   cd C:\Users\unatt\OneDrive\dev\nbg\ChessApp
   start windows\chessapp.sln
   ```

2. **If prompted to retarget**:
   - Click "OK" to retarget to your installed SDK
   - Or click "Cancel" (project should work with 10.0)

3. **Select Configuration**:
   - Configuration: `Debug` (recommended - no bundling required)
   - Platform: `x64`

4. **Build**:
   - Menu: Build > Build Solution
   - Or press: `Ctrl + Shift + B`
   - Wait for build to complete (~2-5 minutes first time)

5. **Check Output**:
   - Look for "Build succeeded" in the Output window
   - Any errors? See Troubleshooting section below

**Note**: Use **Debug** configuration to avoid bundling issues. Debug mode loads JavaScript from Metro bundler instead of bundling it into the .exe.

### Option 2: Command Line

```bash
# Open Developer Command Prompt for VS 2022
# (Search for it in Start Menu)

cd C:\Users\unatt\OneDrive\dev\nbg\ChessApp\windows

# Build
msbuild chessapp.sln /p:Configuration=Release /p:Platform=x64

# Or Debug build
msbuild chessapp.sln /p:Configuration=Debug /p:Platform=x64
```

---

## ▶️ Running the App

### Method 1: npm run windows (Recommended)

```bash
# Terminal 1: Start Metro bundler
cd C:\Users\unatt\OneDrive\dev\nbg\ChessApp
npm start

# Terminal 2: Build and run Windows app
npm run windows
```

This will:
- Build the C++ project automatically
- Bundle the JavaScript
- Deploy and launch the app

### Method 2: Visual Studio

```bash
# Terminal 1: Start Metro bundler
npm start

# Visual Studio: Press F5 or Debug > Start Debugging
```

---

## 🐛 Troubleshooting

### Error: "react-native bundle exited with code 1"

**This happens in Release configuration** because it tries to bundle JavaScript into the .exe.

**Solution 1** (Recommended): Use Debug configuration instead
- In Visual Studio: Change Configuration dropdown from "Release" to "Debug"
- Debug mode loads JavaScript from Metro bundler (no bundling needed)

**Solution 2**: Use `npm run windows` which handles bundling correctly
```cmd
# In PowerShell/CMD (not WSL)
npm start          # Terminal 1
npm run windows    # Terminal 2
```

**Solution 3**: Pre-create the bundle manually
```bash
npx react-native bundle --platform windows --entry-file index.js --bundle-output windows/chessapp/Bundle/index.windows.bundle --assets-dest windows/chessapp/Bundle --dev false --minify false
```
Then build in Visual Studio.

See **BUILD-WORKAROUND.md** for detailed explanations.

### Error: "Windows SDK version X.X.X not found"

**Solution 1**: Install the requested SDK version
- Open Visual Studio Installer
- Modify Visual Studio 2022
- Go to "Individual Components"
- Search for "Windows 10 SDK"
- Check the requested version
- Click Modify

**Solution 2**: Retarget to your installed SDK
- In Visual Studio: Right-click solution > "Retarget solution"
- Select your installed SDK version
- Click OK

**Solution 3**: Use latest SDK (already configured)
- The project is set to use `WindowsTargetPlatformVersion=10.0`
- This automatically uses the latest installed SDK
- Just rebuild the project

### Error: "PlatformToolset not defined"

**Fixed!** The project now has platform-specific configurations for each Configuration|Platform combination:
```xml
<PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Release|x64'" Label="Configuration">
  <ConfigurationType>Application</ConfigurationType>
  <PlatformToolset>v143</PlatformToolset>
  <WindowsTargetPlatformVersion>10.0</WindowsTargetPlatformVersion>
  <CharacterSet>Unicode</CharacterSet>
  ...
</PropertyGroup>
```

This ensures that every build configuration (Debug/Release × Win32/x64/ARM64) has the correct toolset defined.

If you still see this error:
- Ensure Visual Studio 2022 is installed
- Ensure "Desktop development with C++" workload is installed
- Close and reopen Visual Studio to reload the project file
- Right-click the solution in Solution Explorer → Reload Project

### Error: "Cannot find <windows.h>"

**Solution**: Install Windows SDK
- Open Visual Studio Installer
- Modify Visual Studio 2022
- Check "Universal Windows Platform development"
- Check "Desktop development with C++"
- Install

### Error: "MSB8020: Build tools cannot be found"

**Solution**: Install C++ build tools
- Open Visual Studio Installer
- Modify Visual Studio 2022
- Go to "Individual Components"
- Check: "MSVC v143 - VS 2022 C++ x64/x86 build tools"
- Check: "C++ (v143) Universal Windows Platform tools"
- Install

### Error: "react-native-windows not found"

**Solution**: Ensure dependencies are installed
```bash
cd ChessApp
npm install
```

### Build succeeds but app won't start

**Check 1**: Is Metro bundler running?
```bash
npm start
```

**Check 2**: Is the engine executable in the right place?
```
windows\chessapp\assets\engines\fairy-stockfish-largeboard_x86-64-bmi2.exe
```

**Check 3**: Check the console output for errors

---

## 📦 Build Output Location

After successful build, binaries are in:
```
windows\chessapp\bin\<Platform>\<Configuration>\
```

For example:
```
windows\chessapp\bin\x64\Release\chessapp.exe
```

---

## 🧹 Clean Build

If you encounter strange build errors:

```bash
# In Visual Studio
Build > Clean Solution
Build > Rebuild Solution

# Or command line
cd windows
msbuild chessapp.sln /t:Clean
msbuild chessapp.sln /t:Rebuild /p:Configuration=Release /p:Platform=x64
```

---

## 🔍 Verify Installation

### Check Visual Studio Components

```powershell
# Check VS 2022 installation
Get-ChildItem "C:\Program Files\Microsoft Visual Studio\2022"

# Check for v143 toolset
Test-Path "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC"

# Check for Windows SDK
Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\Include"
```

### Check Node.js

```bash
node --version  # Should be v20+
npm --version   # Should be v10+
```

---

## 📝 Build Configuration Details

### Platform Toolset (v143)
- Visual Studio 2022 C++ compiler
- Latest C++20 features
- Best performance

### Windows SDK (10.0)
- Uses latest installed Windows 10 SDK
- Provides Windows API headers
- UWP application support

### Configuration Types

**Debug**:
- Symbols included
- No optimization
- Easier debugging
- Larger binary (~50MB)

**Release**:
- Optimized code
- Smaller binary (~15MB)
- Better performance
- Deploy this version

---

## 🎯 Quick Start Summary

```bash
# 1. Ensure prerequisites installed
# - Visual Studio 2022 with UWP and C++ workloads
# - Node.js 20+

# 2. Install dependencies
cd C:\Users\unatt\OneDrive\dev\nbg\ChessApp
npm install

# 3. Start Metro bundler
npm start

# 4. In another terminal, run Windows app
npm run windows

# Done! App should launch and engine should initialize.
```

---

## 🆘 Still Having Issues?

1. **Check the IMPLEMENTATION.md** file for detailed architecture
2. **Check console output** for specific error messages
3. **Verify all prerequisites** are installed
4. **Try a clean build** (Clean Solution → Rebuild)
5. **Check the engine path** is correct

### Common First-Time Issues

✅ **Already Fixed**:
- Platform Toolset configured (v143)
- Windows SDK configured (10.0)
- Project files include EngineModule

❓ **If you see**:
- "Engine not found" → Check engine executable location
- "Native module not available" → Rebuild C++ project
- "Metro bundler error" → Clear cache: `npm start -- --reset-cache`

---

## ✨ Success Indicators

When build succeeds, you should see:
- ✅ "Build: X succeeded, 0 failed"
- ✅ App window opens
- ✅ "Engine ready" status (green dot)
- ✅ Chess board visible
- ✅ Can make moves

If you see "Engine ready" with a green dot, everything is working perfectly! 🎉

---

**Last Updated**: November 9, 2025
**Project Configuration**: ✅ Fixed and ready to build
