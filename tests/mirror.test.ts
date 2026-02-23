import { describe, it, expect } from "vitest";
import { mirrorSquare, mirrorMove, mirrorFEN } from "../src/mirror";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("mirrorSquare", () => {
  it("e1 ↔ e8", () => {
    expect(mirrorSquare("e1")).toBe("e8");
    expect(mirrorSquare("e8")).toBe("e1");
  });

  it("a1 ↔ a8", () => {
    expect(mirrorSquare("a1")).toBe("a8");
    expect(mirrorSquare("a8")).toBe("a1");
  });

  it("h4 ↔ h5", () => {
    expect(mirrorSquare("h4")).toBe("h5");
    expect(mirrorSquare("h5")).toBe("h4");
  });

  it("is its own inverse for all squares", () => {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];
    for (const file of files) {
      for (const rank of ranks) {
        const sq = file + rank;
        expect(mirrorSquare(mirrorSquare(sq))).toBe(sq);
      }
    }
  });

  it("preserves the file", () => {
    expect(mirrorSquare("d3")[0]).toBe("d");
    expect(mirrorSquare("g6")[0]).toBe("g");
  });
});

describe("mirrorMove", () => {
  it("e2e4 ↔ e7e5", () => {
    expect(mirrorMove("e2e4")).toBe("e7e5");
    expect(mirrorMove("e7e5")).toBe("e2e4");
  });

  it("g1f3 ↔ g8f6 (Nf3 / Nf6)", () => {
    expect(mirrorMove("g1f3")).toBe("g8f6");
    expect(mirrorMove("g8f6")).toBe("g1f3");
  });

  it("preserves promotion piece suffix", () => {
    expect(mirrorMove("e7e8q")).toBe("e2e1q");
    expect(mirrorMove("a2a1r")).toBe("a7a8r");
  });

  it("is its own inverse", () => {
    const moves = ["e2e4", "d7d5", "g1f3", "b8c6", "f1b5", "a7a8q"];
    for (const move of moves) {
      expect(mirrorMove(mirrorMove(move))).toBe(move);
    }
  });
});

describe("mirrorFEN", () => {
  it("swaps active color", () => {
    const mirrored = mirrorFEN(STARTING_FEN);
    expect(mirrored.split(" ")[1]).toBe("b");
  });

  it("double mirror is the identity", () => {
    expect(mirrorFEN(mirrorFEN(STARTING_FEN))).toBe(STARTING_FEN);
  });

  it("swaps castling rights (KQkq ↔ kqKQ)", () => {
    const mirrored = mirrorFEN(STARTING_FEN);
    // Original KQkq → mirrored should have kqKQ (lowercased ↔ uppercased)
    const castling = mirrored.split(" ")[2];
    expect(castling).toContain("k");
    expect(castling).toContain("q");
    expect(castling).toContain("K");
    expect(castling).toContain("Q");
  });

  it("mirrors en passant square", () => {
    // After 1.e4, FEN has en passant on e3 (rank 3)
    const after1e4 =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const mirrored = mirrorFEN(after1e4);
    // e3 should become e6
    expect(mirrored.split(" ")[3]).toBe("e6");
  });

  it("no en passant stays as '-'", () => {
    const mirrored = mirrorFEN(STARTING_FEN);
    expect(mirrored.split(" ")[3]).toBe("-");
  });

  it("piece colors are swapped (former white rank moves to top as black pieces)", () => {
    const mirrored = mirrorFEN(STARTING_FEN);
    const position = mirrored.split(" ")[0];
    const ranks = position.split("/");
    // Original rank 1 (RNBQKBNR) moves to index 0 and gets color-swapped → rnbqkbnr
    expect(ranks[0]).toBe("rnbqkbnr");
    // Original rank 8 (rnbqkbnr) moves to index 7 and gets color-swapped → RNBQKBNR
    expect(ranks[7]).toBe("RNBQKBNR");
  });
});
