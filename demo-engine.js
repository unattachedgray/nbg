#!/usr/bin/env node
/**
 * Demo script showing how to communicate with Fairy-Stockfish engine
 * This demonstrates the UCI protocol communication that will be used in React Native
 */

const { spawn } = require('child_process');
const readline = require('readline');

const ENGINE_PATH = './src/assets/engines/fairy-stockfish';

class ChessEngine {
  constructor(enginePath) {
    this.process = null;
    this.enginePath = enginePath;
    this.outputBuffer = '';
    this.callbacks = new Map();
  }

  async start() {
    console.log('🚀 Starting Fairy-Stockfish engine...\n');

    this.process = spawn(this.enginePath);

    this.process.stdout.on('data', (data) => {
      const output = data.toString();
      this.handleOutput(output);
    });

    this.process.stderr.on('data', (data) => {
      console.error(`Engine Error: ${data}`);
    });

    this.process.on('close', (code) => {
      console.log(`\n🔴 Engine process exited with code ${code}`);
    });

    // Initialize UCI
    await this.sendCommand('uci');
    await this.waitFor('uciok');
    console.log('✅ Engine initialized\n');
  }

  sendCommand(cmd) {
    console.log(`>>> ${cmd}`);
    this.process.stdin.write(cmd + '\n');
  }

  handleOutput(data) {
    this.outputBuffer += data;
    const lines = this.outputBuffer.split('\n');
    this.outputBuffer = lines.pop();

    lines.forEach(line => {
      if (line.trim()) {
        console.log(`<<< ${line}`);

        // Trigger callbacks
        this.callbacks.forEach((callback, key) => {
          if (line.includes(key)) {
            callback(line);
          }
        });
      }
    });
  }

  waitFor(text) {
    return new Promise((resolve) => {
      this.callbacks.set(text, (line) => {
        this.callbacks.delete(text);
        resolve(line);
      });
    });
  }

  async setVariant(variant = 'chess') {
    console.log(`\n🎮 Setting variant to: ${variant}`);
    this.sendCommand(`setoption name UCI_Variant value ${variant}`);
    this.sendCommand('isready');
    await this.waitFor('readyok');
    console.log(`✅ Variant set to ${variant}\n`);
  }

  async analyze(fen = 'startpos', depth = 15) {
    console.log(`\n🧠 Analyzing position (depth ${depth})...`);
    this.sendCommand(`position ${fen === 'startpos' ? 'startpos' : 'fen ' + fen}`);
    this.sendCommand(`go depth ${depth}`);

    return new Promise((resolve) => {
      let bestMove = null;
      let evaluation = null;

      const callback = (line) => {
        if (line.includes('info') && line.includes('score')) {
          const match = line.match(/score cp (-?\d+)/);
          if (match) {
            evaluation = parseInt(match[1]) / 100;
          }
        }
        if (line.startsWith('bestmove')) {
          this.callbacks.delete('bestmove');
          bestMove = line.split(' ')[1];
          console.log(`\n✅ Analysis complete!`);
          console.log(`   Best move: ${bestMove}`);
          console.log(`   Evaluation: ${evaluation > 0 ? '+' : ''}${evaluation}\n`);
          resolve({ bestMove, evaluation });
        }
      };

      this.callbacks.set('bestmove', callback);
    });
  }

  async quit() {
    console.log('\n👋 Shutting down engine...');
    this.sendCommand('quit');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Demo usage
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Fairy-Stockfish Engine Demo            ║');
  console.log('║  React Native Integration Example       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const engine = new ChessEngine(ENGINE_PATH);

  try {
    // Start engine
    await engine.start();

    // Demo 1: Chess analysis
    console.log('═══════════════════════════════════════════');
    console.log('📋 DEMO 1: Standard Chess Position');
    console.log('═══════════════════════════════════════════');
    await engine.setVariant('chess');
    await engine.analyze('startpos', 12);

    // Demo 2: After 1.e4
    console.log('\n═══════════════════════════════════════════');
    console.log('📋 DEMO 2: After 1.e4');
    console.log('═══════════════════════════════════════════');
    await engine.analyze('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 10);

    // Demo 3: Janggi variant
    console.log('\n═══════════════════════════════════════════');
    console.log('📋 DEMO 3: Janggi (Korean Chess)');
    console.log('═══════════════════════════════════════════');
    await engine.setVariant('janggi');
    await engine.analyze('startpos', 8);

    // Quit
    await engine.quit();
    console.log('✅ Demo complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ChessEngine };
