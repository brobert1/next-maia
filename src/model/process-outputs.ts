import { mirrorMove } from "../mirror/index.js";
import { ALL_MOVES } from "../data/all-moves.js";

/**
 * Softmaxes the logits of the legal moves into a policy and converts the value
 * head into a white win probability. For black to move the model saw a mirrored
 * board, so moves are mirrored back and the value is flipped.
 */
export function processOutputs(
  fen: string,
  logits: Float32Array,
  rawValue: number,
  legalMoves: number[],
): { policy: Record<string, number>; value: number } {
  const blackFlag = fen.split(" ")[1] === "b";

  let winProb = Math.min(Math.max(rawValue / 2 + 0.5, 0), 1);
  if (blackFlag) winProb = 1 - winProb;
  winProb = Math.round(winProb * 10000) / 10000;

  const legalLogits = legalMoves.map((index) => logits[index]);
  const maxLogit = Math.max(...legalLogits);
  const exps = legalLogits.map((logit) => Math.exp(logit - maxLogit));
  const sumExp = exps.reduce((a, b) => a + b, 0);

  const policy: Record<string, number> = {};
  legalMoves.forEach((moveIndex, i) => {
    const move = ALL_MOVES[moveIndex];
    policy[blackFlag ? mirrorMove(move) : move] = exps[i] / sumExp;
  });

  return { policy, value: winProb };
}
