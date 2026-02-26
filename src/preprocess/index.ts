import { Chess } from "chess.js";
import { boardToTensor } from "../encode/board-to-tensor";
import { mirrorFEN } from "../mirror";
import { mapToCategory } from "../elo";
import allPossibleMovesArray from "../data/all_moves.json";

// Build move→index lookup once at load time from the flat sorted array
const allPossibleMoves: Record<string, number> = Object.fromEntries(
  (allPossibleMovesArray as string[]).map((move, index) => [move, index]),
);

export function preprocess(
  fen: string,
  eloSelf: number,
  eloOppo: number,
): {
  boardInput: Float32Array;
  eloSelfCategory: number;
  eloOppoCategory: number;
  legalMoves: Float32Array;
} {
  let board = new Chess(fen);

  // If black's turn, mirror the board so the model evaluates from White's perspective
  if (fen.split(" ")[1] === "b") {
    board = new Chess(mirrorFEN(board.fen()));
  } else if (fen.split(" ")[1] !== "w") {
    throw new Error(`Invalid FEN: ${fen}`);
  }

  const boardInput = boardToTensor(board.fen());
  const eloSelfCategory = mapToCategory(eloSelf);
  const eloOppoCategory = mapToCategory(eloOppo);

  // Mask out illegal moves
  const legalMoves = new Float32Array(Object.keys(allPossibleMoves).length);
  for (const move of board.moves({ verbose: true })) {
    const moveIndex = allPossibleMoves[move.lan];
    if (moveIndex !== undefined) {
      legalMoves[moveIndex] = 1.0;
    }
  }

  return { boardInput, eloSelfCategory, eloOppoCategory, legalMoves };
}
