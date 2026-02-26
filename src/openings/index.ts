import { Chess } from "chess.js";
import bookData from "../data/opening-book.json";

// opening-book.json stores moves as compact "move:freq,move:freq" strings.
// Parse them back into Record<string, number> once at module load time.
const book: Record<string, Record<string, number>> = {};
for (const [key, val] of Object.entries(bookData as Record<string, string>)) {
  const moves: Record<string, number> = {};
  for (const part of val.split(",")) {
    const colon = part.indexOf(":");
    moves[part.slice(0, colon)] = Number(part.slice(colon + 1));
  }
  book[key] = moves;
}

/** Returns the position key: first 4 FEN fields (ignores move clocks) */
function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/**
 * Looks up a book move for the given FEN position.
 *
 * Returns a UCI move string (e.g. "e2e4") sampled proportionally to
 * frequency in the opening database, or null if the position is not in
 * the book / has no legal book moves.
 */
export function getBookMove(fen: string): string | null {
  const key = positionKey(fen);
  const candidates = book[key];
  if (!candidates) return null;

  // Filter to moves that are actually legal in the current position
  const board = new Chess(fen);
  const legalUci = new Set(board.moves({ verbose: true }).map((m) => m.lan));

  const validMoves: string[] = [];
  const weights: number[] = [];

  for (const [move, count] of Object.entries(candidates)) {
    if (legalUci.has(move)) {
      validMoves.push(move);
      weights.push(count);
    }
  }

  if (validMoves.length === 0) return null;

  // Weighted random sampling
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < validMoves.length; i++) {
    r -= weights[i];
    if (r <= 0) return validMoves[i];
  }

  return validMoves[validMoves.length - 1];
}
