import * as ort from "onnxruntime-web";
import { loadSession, TENSOR_SHAPE } from "./session";
import { processOutputs } from "./process-outputs";
import { preprocess } from "../preprocess";
import { getBookMove } from "../openings";

export class Maia {
  public Ready: Promise<boolean>;
  public model!: ort.InferenceSession;

  constructor(options: {
    modelPath: string;
    wasmPaths?: ort.Env.WasmPrefixOrFilePaths;
    externalDataPath?: string;
  }) {
    this.Ready = new Promise((resolve, reject) => {
      loadSession(
        options.modelPath,
        options.wasmPaths,
        options.externalDataPath,
      )
        .then((session) => {
          this.model = session;
          resolve(true);
        })
        .catch(reject);
    });
  }

  async evaluate(
    board: string,
    eloSelf: number,
    eloOppo: number,
  ): Promise<{
    policy: Record<string, number>;
    value: number;
    fromBook: boolean;
  }> {
    const bookMove = getBookMove(board);
    if (bookMove) {
      return { policy: { [bookMove]: 1 }, value: 0.5, fromBook: true };
    }

    const { boardInput, legalMoves, eloSelfCategory, eloOppoCategory } =
      preprocess(board, eloSelf, eloOppo);

    const feeds: Record<string, ort.Tensor> = {
      boards: new ort.Tensor("float32", boardInput, [...TENSOR_SHAPE]),
      elo_self: new ort.Tensor(
        "int64",
        BigInt64Array.from([BigInt(eloSelfCategory)]),
      ),
      elo_oppo: new ort.Tensor(
        "int64",
        BigInt64Array.from([BigInt(eloOppoCategory)]),
      ),
    };

    const { logits_maia, logits_value } = await this.model.run(feeds);

    return {
      ...processOutputs(board, logits_maia, logits_value, legalMoves),
      fromBook: false,
    };
  }

  /**
   * Picks a single move for the given position by sampling from the policy
   * distribution returned by `evaluate`. Sampling (rather than argmax) preserves
   * Maia's human-like move variety — the policy already encodes how often a human
   * at the given Elo would play each legal move.
   *
   * @param board    - FEN string of the current position
   * @param eloSelf  - Elo of the side to move (the bot's target strength)
   * @param eloOppo  - Elo of the opponent (the human player's estimated strength)
   * @returns UCI move string (e.g. "e2e4") and whether it came from the opening book
   */
  async pickMove(
    board: string,
    eloSelf: number,
    eloOppo: number,
  ): Promise<{ move: string; fromBook: boolean }> {
    // Clamp the model Elo to the trained range so the neural network always
    // uses the closest available embedding. Weakness for sub-1100 play is
    // simulated separately by blending the policy with a uniform distribution.
    const modelElo = Math.max(eloSelf, 1100);
    const { policy, fromBook } = await this.evaluate(board, modelElo, eloOppo);

    const entries = Object.entries(policy);

    // Opening book moves are always played as-is.
    // Above 1100 the pure Maia policy is used unchanged.
    if (fromBook || eloSelf >= 1100) {
      return { move: this._sample(entries), fromBook };
    }

    // Below 1100: blend the Maia policy with a uniform distribution.
    // Divisor of 600 means 500 Elo hits t=1.0 (fully random),
    // 700 Elo ≈ 0.67, 900 Elo ≈ 0.33 — making low-rated bots feel genuinely weak.
    const t = Math.min((1100 - eloSelf) / 600, 1);
    const uniform = 1 / entries.length;
    const blended = entries.map(([move, prob]): [string, number] => [
      move,
      (1 - t) * prob + t * uniform,
    ]);

    return { move: this._sample(blended), fromBook };
  }

  private _sample(entries: [string, number][]): string {
    const total = entries.reduce((sum, [, p]) => sum + p, 0);
    let r = Math.random() * total;
    for (const [move, prob] of entries) {
      r -= prob;
      if (r <= 0) return move;
    }
    return entries[entries.length - 1][0];
  }
}

export default Maia;
