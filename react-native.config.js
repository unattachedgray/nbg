module.exports = {
  project: {
    windows: {
      sourceDir: 'windows',
      solutionFile: 'chessapp.sln',
      project: {
        projectFile: 'chessapp\\chessapp.vcxproj',
      },
    },
  },
  dependencies: {
    'react-native-fs': {
      platforms: {
        windows: null, // Disable for now, using native module instead
      },
    },
  },
};
