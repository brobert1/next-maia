import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { preprocess } from "../src/preprocess";
import { processOutputs } from "../src/model/process-outputs";
import { ALL_MOVES } from "../src/data/all-moves";

// Uniform logits, so every legal move gets the same probability.
const LOGITS = new Float32Array(ALL_MOVES.length);

describe("preprocess + processOutputs", () => {
  it.each([
    ["white", "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"],
    ["black", "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"],
  ])("returns a policy over exactly the legal moves (%s to move)", (_, fen) => {
    const { legalMoves } = preprocess(fen, 1500, 1500);
    const { policy } = processOutputs(fen, LOGITS, 0, legalMoves);

    const expected = new Chess(fen).moves({ verbose: true }).map((m) => m.lan);
    expect(Object.keys(policy).sort()).toEqual(expected.sort());
    const total = Object.values(policy).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("reports the value as white win probability for both sides", () => {
    // rawValue 1 = the side to move is winning.
    expect(processOutputs("8/8/8/8/8/8/8/8 w - - 0 1", LOGITS, 1, []).value).toBe(1);
    expect(processOutputs("8/8/8/8/8/8/8/8 b - - 0 1", LOGITS, 1, []).value).toBe(0);
  });
});
