# next-maia

Run [Maia](https://maiachess.com/) chess ONNX models directly in the browser. Maia is a human-like chess engine trained to play at specific Elo skill levels. This library wraps `onnxruntime-web` and `chess.js` to provide a simple API for evaluating chess positions client-side.

## Features

- **Browser-native inference** — runs ONNX models entirely in the browser via WebAssembly
- **Automatic model caching** — downloaded models are stored in the Cache API so subsequent loads are instant
- **Elo-conditioned evaluation** — provide self and opponent Elo ratings (1100–2000) to get human-like move predictions at that skill level
- **Move probabilities + win probability** — returns a full policy distribution over legal moves and a win-probability score

## Installation

```bash
npm install next-maia
```

## Quick Start

```typescript
import Maia from "next-maia";

const engine = new Maia({
  modelPath: "/models/maia2.onnx",
  // optional: custom WASM binary paths for onnxruntime-web
  // wasmPaths: "/wasm/",
});

// Wait for the model to load
await engine.Ready;

// Evaluate a position
const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
const result = await engine.evaluate(fen, 1500, 1500);

console.log(result.policy); // { "e7e5": 0.32, "c7c5": 0.18, ... }
console.log(result.value);  // 0.48 (white win probability)
```

## API

### `new Maia(options)`

Creates a new engine instance and begins loading the ONNX model.

| Option | Type | Required | Description |
|---|---|---|---|
| `modelPath` | `string` | Yes | URL or path to the `.onnx` model file |
| `wasmPaths` | `ort.Env.WasmPrefixOrFilePaths` | No | Custom paths for ONNX Runtime WASM binaries |

### `engine.Ready: Promise<boolean>`

Resolves to `true` once the model has been loaded and is ready for inference.

### `engine.evaluate(fen, eloSelf, eloOppo)`

Evaluates a chess position and returns move probabilities conditioned on the given Elo ratings.

| Parameter | Type | Description |
|---|---|---|
| `fen` | `string` | Board position in [FEN](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation) notation |
| `eloSelf` | `number` | Elo rating of the player to move (1100–2000) |
| `eloOppo` | `number` | Elo rating of the opponent (1100–2000) |

**Returns** `Promise<{ policy: Record<string, number>; value: number }>`

- `policy` — object mapping legal moves (UCI notation, e.g. `"e2e4"`) to their predicted probabilities
- `value` — white's win probability (0 to 1), regardless of whose turn it is

## Architecture

```
src/
├── index.ts              # Entry point — exports the Maia class
├── constants/            # Board dimensions, Elo ranges, cache key
├── data/                 # Move-index mapping JSONs (UCI ↔ index)
├── elo/                  # Maps Elo ratings into discrete categories
├── encode/               # FEN → 18-channel 8×8 float tensor
├── mirror/               # Board/move mirroring for black's perspective
├── model/
│   ├── maia.ts           # Maia class (load model, run inference)
│   ├── session.ts        # ONNX session creation with Cache API
│   └── process-outputs.ts# Softmax over legal moves, win probability
└── preprocess/           # Orchestrates encoding, mirroring & masking
```

### How it works

1. **Preprocessing** — the FEN is parsed with `chess.js`. If it's black's turn, the board is mirrored so the model always sees the position from white's perspective. The board is encoded into an 18-channel 8×8 tensor (12 piece planes + turn + 4 castling + en passant). Elo ratings are bucketed into categories.
2. **Inference** — the board tensor and Elo category tensors are fed into the ONNX model via `onnxruntime-web`.
3. **Post-processing** — raw logits are masked to legal moves only, then softmax-normalized into probabilities. The value head output is converted to a white win probability between 0 and 1.

## Dependencies

| Package | Purpose |
|---|---|
| [`chess.js`](https://github.com/jhlywa/chess.js) | FEN parsing, legal move generation |
| [`onnxruntime-web`](https://onnxruntime.ai/) | ONNX model inference via WebAssembly |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build
```

The compiled output goes to `dist/`.

## License

ISC
