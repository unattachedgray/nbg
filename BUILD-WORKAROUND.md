# Build Workaround for Bundle Error

## Issue
The Release build tries to bundle JavaScript which may fail in Visual Studio due to environment differences.

## Solution 1: Build in Debug Mode (Recommended for Testing)

Debug mode doesn't bundle the JavaScript, making it faster and avoiding the bundling error:

### Visual Studio:
1. Open `windows/chessapp.sln`
2. **Set Configuration to: Debug** (not Release)
3. Set Platform to: x64
4. Build > Build Solution

### Command Line:
```cmd
cd C:\Users\unatt\OneDrive\dev\nbg\ChessApp\windows
msbuild chessapp.sln /p:Configuration=Debug /p:Platform=x64
```

### Running Debug Build:
```bash
# Terminal 1: Start Metro bundler
npm start

# Terminal 2: Run the app
npm run windows -- --no-build
```

The app will load JavaScript from the Metro bundler instead of a bundled file.

## Solution 2: Use npm run windows (Easiest)

This handles everything automatically:

### In PowerShell or CMD (NOT WSL):
```cmd
cd C:\Users\unatt\OneDrive\dev\nbg\ChessApp

# Terminal 1
npm start

# Terminal 2 (in PowerShell/CMD)
npm run windows
```

This builds the C++ project and runs the app with Metro serving the JavaScript.

## Solution 3: Pre-Bundle for Release

If you need a Release build with bundling:

### Step 1: Create bundle manually
```bash
npx react-native bundle --platform windows --entry-file index.js --bundle-output windows/chessapp/Bundle/index.windows.bundle --assets-dest windows/chessapp/Bundle --dev false --minify false
```

### Step 2: Build in Visual Studio
The bundle already exists, so the build should succeed.

## Why This Happens

- **Debug mode**: Loads JavaScript from Metro bundler (localhost:8081)
- **Release mode**: Bundles JavaScript into the .exe file
- The bundle command works fine but may have environment issues in Visual Studio

## Recommended Workflow

1. **Development**: Use Debug mode + Metro bundler (fastest iteration)
2. **Testing**: Use `npm run windows`
3. **Release**: Pre-bundle manually if needed

## Verification

After building, the app should:
- ✅ Launch with a window
- ✅ Show "Engine ready" status
- ✅ Display the chess board
- ✅ Respond to moves

If you see "Could not connect to development server", make sure Metro is running with `npm start`.
