import { describe, it, expect, vi, afterEach } from "vitest";
import { Chess } from "chess.js";
import { getBookMove } from "../src/openings";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const UNKNOWN_FEN =
  "r1bqkb1r/pp3ppp/2n1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 7";

// Generate these via chess.js so the FENs match exactly what was stored in the book
function fenAfterMoves(...sans: string[]): string {
  const chess = new Chess();
  for (const san of sans) chess.move(san);
  return chess.fen();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getBookMove", () => {
  it("returns null for a position not in the book", () => {
    expect(getBookMove(UNKNOWN_FEN)).toBeNull();
  });

  it("returns a string for the starting position", () => {
    const move = getBookMove(STARTING_FEN);
    expect(typeof move).toBe("string");
    expect(move).not.toBeNull();
  });

  it("returned move is legal in the position", () => {
    // Run several times because of weighted random sampling
    for (let i = 0; i < 20; i++) {
      const move = getBookMove(STARTING_FEN);
      expect(move).not.toBeNull();
      const board = new Chess(STARTING_FEN);
      const legalUci = new Set(
        board.moves({ verbose: true }).map((m) => m.lan),
      );
      expect(legalUci.has(move!)).toBe(true);
    }
  });

  it("starting position includes common first moves (e4, d4, Nf3)", () => {
    // Mock Math.random to sweep through the distribution
    const moves = new Set<string>();
    const spy = vi.spyOn(Math, "random");

    const steps = 100;
    for (let i = 0; i < steps; i++) {
      spy.mockReturnValueOnce(i / steps);
      const move = getBookMove(STARTING_FEN);
      if (move) moves.add(move);
    }

    expect(moves.has("e2e4")).toBe(true); // 1. e4
    expect(moves.has("d2d4")).toBe(true); // 1. d4
    expect(moves.has("g1f3")).toBe(true); // 1. Nf3
  });

  it("after 1.e4, common black responses are present", () => {
    const after1e4 = fenAfterMoves("e4");

    const moves = new Set<string>();
    const spy = vi.spyOn(Math, "random");

    const steps = 100;
    for (let i = 0; i < steps; i++) {
      spy.mockReturnValueOnce(i / steps);
      const move = getBookMove(after1e4);
      if (move) moves.add(move);
    }

    // The Sicilian (c5), Open Game (e5), French (e6), Caro-Kann (c6)
    const commonResponses = ["c7c5", "e7e5", "e7e6", "c7c6"];
    const found = commonResponses.filter((m) => moves.has(m));
    expect(found.length).toBeGreaterThan(0);
  });

  it("after 1.d4, common black responses are present", () => {
    const after1d4 = fenAfterMoves("d4");

    const moves = new Set<string>();
    const spy = vi.spyOn(Math, "random");

    const steps = 100;
    for (let i = 0; i < steps; i++) {
      spy.mockReturnValueOnce(i / steps);
      const move = getBookMove(after1d4);
      if (move) moves.add(move);
    }

    // KID (Nf6), Queen's Gambit accepted/declined (d5)
    const commonResponses = ["g8f6", "d7d5", "e7e6", "c7c5"];
    const found = commonResponses.filter((m) => moves.has(m));
    expect(found.length).toBeGreaterThan(0);
  });
});
