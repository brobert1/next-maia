import { Chess } from "chess.js";
import { boardToTensor } from "../encode/board-to-tensor.js";
import { mirrorFEN } from "../mirror/index.js";
import { mapToCategory } from "../elo/index.js";
import { ALL_MOVES } from "../data/all-moves.js";

const MOVE_INDEX = new Map(ALL_MOVES.map((move, index) => [move, index]));

export function preprocess(
  fen: string,
  eloSelf: number,
  eloOppo: number,
): {
  boardInput: Float32Array;
  eloSelfCategory: number;
  eloOppoCategory: number;
  /** Policy indices (into ALL_MOVES) of the legal moves, as the model sees the board. */
  legalMoves: number[];
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

  const legalMoves: number[] = [];
  for (const move of board.moves({ verbose: true })) {
    const moveIndex = MOVE_INDEX.get(move.lan);
    if (moveIndex !== undefined) legalMoves.push(moveIndex);
  }

  return { boardInput, eloSelfCategory, eloOppoCategory, legalMoves };
}
