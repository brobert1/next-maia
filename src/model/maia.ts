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
}

export default Maia;
