# next-maia Package Quality and Size Reduction Design

## Goal

Improve `next-maia` as a publishable TypeScript package. The package should be easier to maintain, import correctly from built output, ship valid type declarations, reduce published size, and expose a cleaner API where doing so provides a meaningful long-term benefit.

## Current Evidence

The current package baseline from `npm pack --json --dry-run` is:

- Packed size: `70,622` bytes.
- Unpacked size: `471,631` bytes.
- Largest shipped file: `dist/data/opening-book.json` at `421,200` bytes.
- Second-largest shipped data file: `dist/data/all_moves.json` at `22,651` bytes.

Current correctness problems:

- `import("./dist/index.js")` fails with `ERR_UNSUPPORTED_DIR_IMPORT` because emitted ESM imports extensionless directories.
- `package.json` advertises `dist/index.d.ts`, but the build does not emit declaration files.
- README project-structure details are stale: it references `all_moves_reversed.json` and an incorrect `all_moves.json` entry count.

Current data facts:

- Opening book has `5,188` positions.
- Opening book has `7,654` candidate move entries.
- Opening book uses only `480` unique move strings.
- Model move table has `1,880` UCI move strings.

## Non-Goals

- Do not bundle Maia ONNX model files.
- Do not change the required ONNX model input or output tensor names.
- Do not add a frontend, server runtime, or framework dependency.
- Do not optimize by removing tests, type safety, or package verification.
- Do not preserve internal file paths if they conflict with a cleaner design.

## API Direction

API compatibility is valuable but not absolute. The implementation should prefer a clean, typed API even if that requires a major-version change. The recommended shape is:

- Keep the current default `Maia` export as a compatibility facade where practical.
- Add named exports for the main public types and helpers.
- Add explicit result and option types instead of relying on inline object signatures.
- Allow a clearer initialization API if it simplifies lifecycle handling and error reporting.

The current API should remain supported unless a proposed change provides a concrete benefit in at least one of these areas:

- Smaller package output.
- Clearer model-loading lifecycle.
- Better tree-shaking or optional data loading.
- Safer TypeScript types.
- Less ambiguous runtime behavior.

Acceptable breaking changes include:

- Renaming `Ready` to a more idiomatic `ready` or replacing it with an async factory, if a compatibility alias is not worth carrying.
- Making the opening book optional or separately importable.
- Splitting lower-level utilities into named subpath exports.
- Returning richer metadata from evaluation results, if the current result shape is preserved through a compatibility facade or documented as a major-version change.

## Recommended Public Surface

The preferred endpoint is a cleaner API with a compatibility path:

```ts
import Maia, { createMaia, type MaiaEngine, type EvaluationResult } from "next-maia";

const engine = await createMaia({
  modelPath: "/models/maia_rapid_onnx.onnx",
  wasmPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/dist/",
  openingBook: "default",
});

const result = await engine.evaluate(fen, {
  eloSelf: 1500,
  eloOpponent: 1500,
});
```

Compatibility target:

```ts
const engine = new Maia({ modelPath: "/models/maia_rapid_onnx.onnx" });
await engine.Ready;
const result = await engine.evaluate(fen, 1500, 1500);
```

The implementation plan should decide whether this ships as a compatible v1 API expansion or a deliberate v2 breaking API. If both can be supported cleanly, prefer supporting both.

## Architecture

The package should be organized around explicit runtime boundaries.

### Public Facade

Owns user-facing lifecycle, `evaluate`, `pickMove`, and compatibility methods. It should coordinate book lookup, preprocessing, ONNX inference, output processing, and move sampling without owning low-level details.

### Session Runtime

Owns ONNX Runtime setup, backend fallback, optional WASM path configuration, optional external data loading, and model caching. It should expose a narrow `loadSession(...)` API and handle missing browser APIs with clear errors.

### Chess Pipeline

Owns FEN validation through `chess.js`, black-to-move mirroring, tensor encoding, Elo category mapping, and legal move mask creation.

### Output Processing

Owns value conversion, legal-policy softmax, move-index to UCI conversion, and black-perspective move restoration.

### Opening Book

Owns opening-book lookup. It should not know about ONNX, tensors, or Elo. It should expose behavior equivalent to the current `getBookMove(fen): string | null`, plus a typed interface that allows custom or disabled books.

### Generated Data

Owns compact representations for the model move table and opening book. Generated files should be deterministic and checked in, so consumers do not need a generation step after installing the package.

## Data Size Strategy

The size reduction should focus on replacing raw JSON files with compact generated TypeScript or JavaScript modules.

### Model Move Table

Replace `all_moves.json` with a compact generated module. Acceptable formats include:

- A delimiter-separated string table decoded at module load.
- A generated `const` array if it is smaller after TypeScript emit and package compression.

The lookup API should provide:

- `MODEL_MOVES`: index to UCI move.
- `MODEL_MOVE_INDEX`: UCI move to index, built once at module load.
- `MODEL_MOVE_COUNT`: exact move count for mask allocation.

The implementation must keep the current `1,880` move order exactly, because ONNX policy logits depend on index order.

### Opening Book

Replace `opening-book.json` with compact generated data based on dictionary encoding:

- Store each unique book move once in a move dictionary.
- Store each position entry as a compact key plus encoded move-index/count pairs.
- Decode lazily or build a lookup map once at module load, whichever gives the better balance of size, startup cost, and implementation clarity.

The implementation must preserve current lookup semantics:

- Position key is the first four FEN fields.
- Book moves are filtered against legal moves from `chess.js`.
- Returned move is sampled proportionally to stored frequency.
- Unknown positions return `null`.

The default package may also expose an option to disable the book:

```ts
const engine = await createMaia({ modelPath, openingBook: false });
```

This is useful for consumers that prefer pure model inference or want to avoid opening-book behavior.

## Package Size Target

The initial target is a substantial unpacked-size drop. The implementation should reduce unpacked package size by at least 25 percent versus the current `471,631` byte baseline.

If optional opening-book packaging is introduced, there should be two measured sizes:

- Default package install size with the default book included.
- Core import size when the default book is disabled or not imported, if the package design makes this measurable through subpath exports.

Packed tarball reduction may be smaller because npm compression already compresses JSON well. The unpacked package size is the primary metric.

## Build and Packaging

The package output must be valid for ESM consumers:

- Built `dist/index.js` must import successfully in Node ESM.
- Exported declarations must exist at the paths declared by `package.json`.
- The export map must point to real files.
- `npm pack --dry-run` must include only intended package files.

The preferred build fix is to keep `tsc` if it can produce valid ESM and declarations with explicit `.js` imports. If this becomes noisy or brittle, introduce a small bundler such as `tsup`, but only if it simplifies package output and does not obscure generated data.

## Error Handling

The package should fail with clear errors for common runtime problems:

- Invalid FEN should surface as an invalid-position error from `chess.js` or a small wrapper message.
- Calling `evaluate` before the model is ready should produce a clear lifecycle error in the new API. The compatibility facade may keep current behavior if preserving it is simpler.
- Missing `caches` or `fetch` APIs should produce an actionable model-loading error.
- ONNX WebGPU failure should still fall back to single-thread WASM.

## Testing

Existing tests for Elo mapping, mirroring, board tensor encoding, and opening-book behavior remain required.

New tests should cover:

- Generated model move table preserves exact move order and count.
- Generated opening book decodes to the same candidate move/count data as the current source data during development.
- `getBookMove` behavior remains compatible for known, unknown, and legal-filtered positions.
- `processOutputs` produces legal move probabilities that sum close to `1`.
- Black-to-move processing mirrors policy moves back to original orientation.
- Built `dist/index.js` imports successfully.
- Declaration files exist after build.
- `npm pack --dry-run` reports a reduced unpacked size below the chosen threshold.
- New API lifecycle behavior, if `createMaia` or typed option-object evaluation is added.
- Compatibility behavior for the existing constructor and positional `evaluate` arguments, if retained.

## Documentation

README should be updated to match actual package behavior:

- Correct the data-file description and move count.
- Document the recommended public API.
- Document compatibility support or migration notes if a breaking API ships.
- Mention `pickMove`, because it is part of the public facade.
- State that model files remain externally hosted by the consuming app.
- State the package is ESM.

## Verification Gates

Implementation is not complete until these commands pass:

- `npm run build`
- `npm test`
- `node -e "import('./dist/index.js').then(() => console.log('import ok'))"`
- `npm_config_cache=/private/tmp/npm-cache npm pack --json --dry-run`

The pack command output must prove the package has valid files and a substantially reduced unpacked size versus the current `471,631` byte baseline.

## Risks and Tradeoffs

Compact generated data can make the package harder to inspect manually. Generation scripts and parity tests should keep the source-of-truth transformation clear.

Raw JSON is simple and gzip-friendly, so packed tarball reduction may be smaller than unpacked reduction. The primary win is installed package footprint, cleaner package contents, and faster parsing of smaller runtime data.

Changing TypeScript module settings can expose import-extension issues across the source tree. This is desirable because it catches the same problem users hit after installation.

API cleanup can improve long-term usability, but it may require a major-version release. The implementation plan should make the compatibility cost explicit before deciding whether to preserve or break each existing API shape.

## Approved Direction

Proceed with a package quality and size pass:

- Prefer a cleaner typed API, even if a major-version change is justified.
- Preserve a compatibility facade when it is cheap and does not compromise the cleaner design.
- Fix package correctness.
- Replace raw data with compact generated modules.
- Add tests that prove behavior parity and package integrity.
- Update documentation to match the implementation.
