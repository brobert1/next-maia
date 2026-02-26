import * as ort from "onnxruntime-web";
import { mirrorMove } from "../mirror";
import allPossibleMovesArray from "../data/all_moves.json";

// Flat sorted array: index → move string (derived at load time, O(1) lookup)
const allPossibleMovesReversed = allPossibleMovesArray as string[];

export function processOutputs(
  fen: string,
  logitsMaia: ort.Tensor,
  logitsValue: ort.Tensor,
  legalMoves: Float32Array,
): { policy: Record<string, number>; value: number } {
  const logits = logitsMaia.data as Float32Array;
  const value = logitsValue.data as Float32Array;

  let winProb = Math.min(Math.max((value[0] as number) / 2 + 0.5, 0), 1);
  const blackFlag = fen.split(" ")[1] === "b";
  if (blackFlag) {
    winProb = 1 - winProb;
  }
  winProb = Math.round(winProb * 10000) / 10000;

  const legalMoveIndices = legalMoves
    .map((val, index) => (val > 0 ? index : -1))
    .filter((index) => index !== -1);

  const legalMovesMirrored: string[] = [];
  for (const moveIndex of legalMoveIndices) {
    let move = allPossibleMovesReversed[moveIndex];
    if (blackFlag) move = mirrorMove(move);
    legalMovesMirrored.push(move);
  }

  const legalLogits = legalMoveIndices.map((idx) => logits[idx]);
  const maxLogit = Math.max(...legalLogits);
  const expLogits = legalLogits.map((logit) => Math.exp(logit - maxLogit));
  const sumExp = expLogits.reduce((a, b) => a + b, 0);
  const probs = expLogits.map((expLogit) => expLogit / sumExp);

  const moveProbs: Record<string, number> = {};
  for (let i = 0; i < legalMoveIndices.length; i++) {
    moveProbs[legalMovesMirrored[i]] = probs[i];
  }

  return { policy: moveProbs, value: winProb };
}
