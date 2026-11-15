import { Chess } from "chess.js";
import { OPENING_BOOK } from "../data/opening-book.js";

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
  const entry = OPENING_BOOK[positionKey(fen)];
  if (!entry) return null;

  // Filter to moves that are actually legal in the current position
  const legalUci = new Set(
    new Chess(fen).moves({ verbose: true }).map((m) => m.lan),
  );
  const candidates: [string, number][] = [];
  for (const part of entry.split(",")) {
    const [move, count] = part.split(":");
    if (legalUci.has(move)) candidates.push([move, Number(count)]);
  }
  if (candidates.length === 0) return null;

  // Weighted random sampling
  const total = candidates.reduce((sum, [, count]) => sum + count, 0);
  let r = Math.random() * total;
  for (const [move, count] of candidates) {
    r -= count;
    if (r <= 0) return move;
  }
  return candidates[candidates.length - 1][0];
}
