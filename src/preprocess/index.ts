import { Chess } from "chess.js";
import { boardToTensor } from "../encode/board-to-tensor";
import { mirrorFEN } from "../mirror";
import { createEloDict, mapToCategory } from "../elo";
import allPossibleMovesDict from "../data/all_moves.json";

const allPossibleMoves = allPossibleMovesDict as Record<string, number>;
const eloDict = createEloDict();

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
  const eloSelfCategory = mapToCategory(eloSelf, eloDict);
  const eloOppoCategory = mapToCategory(eloOppo, eloDict);

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
