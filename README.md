# next-maia

> Run [Maia2](https://maiachess.com/) chess models entirely in the browser — human-like move predictions conditioned on Elo, powered by `onnxruntime-web`.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## Overview

**next-maia** is a TypeScript library that brings the [Maia2](https://github.com/CSSLab/maia2) neural network to the browser. Maia2 is trained to play chess the way humans at specific Elo levels actually play — not optimally, but authentically. This library handles the full inference pipeline client-side with no server required.

**Why an opening book?**
Maia2 was [not trained on the first 5 plies](https://github.com/CSSLab/maia2/issues/5), making its opening play unreliable (e.g. shuffling knights back and forth). next-maia includes a pre-computed ECO opening book that covers the early game, automatically handing off to the neural network once the position leaves the book.

---

## Features

- **Browser-native inference** — ONNX model runs entirely in the browser via WebAssembly; no server-side compute needed
- **ECO opening book** — 3,639 opening lines covering all ECO codes (A–E); weighted-random move selection for natural variety
- **Automatic model caching** — downloaded models are stored in the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) for instant subsequent loads
- **Elo-conditioned evaluation** — pass self and opponent Elo ratings (1100–2000) to get skill-appropriate move predictions
- **Full policy distribution** — returns probabilities over all legal moves (UCI notation) and a white win probability

---

## Installation

```bash
npm install next-maia
```

---

## Quick Start

```typescript
import Maia from "next-maia";

const engine = new Maia({
  modelPath: "/models/maia2.onnx",
  // optional: custom paths for onnxruntime-web WASM binaries
  // wasmPaths: "/wasm/",
});

// Wait for the model to load and cache
await engine.Ready;

// Evaluate a position
const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const result = await engine.evaluate(fen, 1500, 1500);

console.log(result.policy);   // { "e7e5": 0.32, "c7c5": 0.18, ... }
console.log(result.value);    // 0.48 — white win probability
console.log(result.fromBook); // true — move came from the opening book
```

---

## API

### `new Maia(options)`

Creates an engine instance and begins loading the ONNX model asynchronously.

| Option | Type | Required | Description |
|---|---|---|---|
| `modelPath` | `string` | Yes | URL or path to the `.onnx` model file |
| `wasmPaths` | `ort.Env.WasmPrefixOrFilePaths` | No | Custom paths for ONNX Runtime WASM binaries |
| `externalDataPath` | `string` | No | Path to an external `.onnx.data` file for split models |

---

### `engine.Ready`

```typescript
engine.Ready: Promise<boolean>
```

Resolves to `true` when the model has loaded and is ready for inference. Always `await` this before calling `evaluate`.

---

### `engine.evaluate(fen, eloSelf, eloOppo)`

```typescript
engine.evaluate(fen: string, eloSelf: number, eloOppo: number): Promise<EvaluationResult>
```

Evaluates a chess position. Checks the opening book first; falls back to ONNX inference for positions not in the book.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `fen` | `string` | Board position in [FEN notation](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation) |
| `eloSelf` | `number` | Elo of the player to move (clamped to 1100–2000) |
| `eloOppo` | `number` | Elo of the opponent (clamped to 1100–2000) |

**Returns** `Promise<EvaluationResult>`

```typescript
type EvaluationResult = {
  policy: Record<string, number>; // UCI move → predicted probability, e.g. { "e2e4": 0.31, ... }
  value: number;                  // White win probability in [0, 1]
  fromBook: boolean;              // true if the move was sourced from the opening book
}
```

- When `fromBook` is `true`, `policy` contains a single entry with probability `1` and `value` is `0.5`.
- When `fromBook` is `false`, `policy` is a full softmax distribution over all legal moves.

---

## How It Works

### Inference pipeline

```
evaluate(fen, eloSelf, eloOppo)
  │
  ├─► Opening book lookup
  │     Position found  → return book move (weighted random)
  │     Position not found ↓
  │
  ├─► Preprocess FEN
  │     Mirror board if black's turn (model always sees white's perspective)
  │     Encode to 18-channel 8×8 float tensor
  │     Bucket Elo ratings into discrete categories (1100–2000, steps of 100)
  │     Build legal move mask via chess.js
  │
  ├─► ONNX inference (onnxruntime-web / WebAssembly)
  │     Inputs:  boards [1×18×8×8], elo_self [int64], elo_oppo [int64]
  │     Outputs: logits_maia (policy head), logits_value (value head)
  │
  └─► Post-process
        Mask illegal moves → softmax → policy probabilities
        Convert value head → white win probability [0, 1]
        Mirror moves back if position was flipped
```

### Board encoding

The board is encoded as an `[1, 18, 8, 8]` float tensor:

| Channels | Content |
|---|---|
| 0–5 | White piece occupancy (P, N, B, R, Q, K) |
| 6–11 | Black piece occupancy (p, n, b, r, q, k) |
| 12 | Side to move (1.0 = white, 0.0 = black) |
| 13–16 | Castling rights (K, Q, k, q) |
| 17 | En passant target square |

### Opening book

The book is pre-computed from the full [ECO opening database](https://www.365chess.com/eco.php) (A00–E99, 3,639 lines). At build time, each opening line is replayed move-by-move and every intermediate position is indexed by its first four FEN fields (ignoring move clocks). The resulting `opening-book.json` maps each position to a frequency-weighted counter of known continuations.

At runtime, `getBookMove` looks up the position, filters to legal moves, and samples proportionally to frequency — so popular moves (e.g. 1. e4, 1. d4) appear more often, while rare sidelines still occur occasionally.

---

## Project Structure

```
src/
├── index.ts                  # Public entry point — exports Maia class
├── constants/                # Board dimensions, Elo range, cache key
├── data/
│   ├── all_moves.json        # UCI move → model index (8,835 entries)
│   ├── all_moves_reversed.json
│   └── opening-book.json     # Pre-computed position → moves map (5,188 positions)
├── elo/                      # Elo → discrete category mapping
├── encode/                   # FEN → 18-channel float tensor
├── mirror/                   # Board and move mirroring (black ↔ white perspective)
├── model/
│   ├── maia.ts               # Maia class: constructor, evaluate()
│   ├── session.ts            # ONNX session creation + Cache API model caching
│   └── process-outputs.ts    # Softmax, legal move masking, value conversion
├── openings/                 # Opening book lookup
└── preprocess/               # Preprocessing orchestration
```

---

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

Compiles TypeScript to CommonJS in `dist/`.

### Test

```bash
npm test           # run all tests once
npm run test:watch # watch mode
```

Tests cover the four pure modules — opening book, Elo mapping, board mirroring, and tensor encoding — using [Vitest](https://vitest.dev/). The `Maia` class itself is not unit-tested here since it depends on the ONNX runtime and a model file.

### Demo

A full Next.js demo is available in the [`demo/`](demo/) directory. It shows the engine running live in the browser with an interactive chess board, Elo sliders, and a move probability panel.

```bash
cd demo
npm install
npm run dev
```

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| [`chess.js`](https://github.com/jhlywa/chess.js) | ^1.4.0 | FEN parsing, legal move generation |
| [`onnxruntime-web`](https://onnxruntime.ai/) | ^1.24.2 | ONNX model inference via WebAssembly |

---

## License

[ISC](LICENSE)
