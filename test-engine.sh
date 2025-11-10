#!/bin/bash
# Test script for Fairy-Stockfish engine

echo "Testing Fairy-Stockfish engine..."
echo "=================================="
echo ""

ENGINE_PATH="./src/assets/engines/fairy-stockfish"

if [ ! -f "$ENGINE_PATH" ]; then
    echo "Error: Engine not found at $ENGINE_PATH"
    exit 1
fi

echo "1. Testing UCI protocol..."
echo "uci" | $ENGINE_PATH | grep -E "(id name|id author|uciok)" | head -3
echo ""

echo "2. Testing chess variant..."
echo -e "uci\nsetoption name UCI_Variant value chess\nisready\nposition startpos\ngo depth 10\nquit" | $ENGINE_PATH | grep -E "(bestmove|depth)" | tail -5
echo ""

echo "3. Testing janggi variant..."
echo -e "uci\nsetoption name UCI_Variant value janggi\nisready\nquit" | $ENGINE_PATH | grep -E "(readyok|uciok)"
echo ""

echo "4. Available variants:"
echo "uci" | $ENGINE_PATH | grep "option name UCI_Variant" | sed 's/.*var /- /g' | tr ' ' '\n' | head -20
echo "   ... and 30+ more!"
echo ""

echo "✅ Engine test complete!"
echo ""
echo "To use the engine interactively:"
echo "  $ENGINE_PATH"
echo ""
echo "Example commands:"
echo "  uci                              # Initialize UCI mode"
echo "  setoption name UCI_Variant value chess"
echo "  isready                          # Wait for ready"
echo "  position startpos                # Set starting position"
echo "  go depth 15                      # Analyze to depth 15"
echo "  quit                             # Exit"
