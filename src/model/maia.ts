import * as ort from "onnxruntime-web";
import { loadSession, TENSOR_SHAPE } from "./session";
import { processOutputs } from "./process-outputs";
import { preprocess } from "../preprocess";

export class Maia {
  public Ready: Promise<boolean>;
  public model!: ort.InferenceSession;

  constructor(options: {
    modelPath: string;
    wasmPaths?: ort.Env.WasmPrefixOrFilePaths;
  }) {
    this.Ready = new Promise((resolve, reject) => {
      loadSession(options.modelPath, options.wasmPaths)
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
  ): Promise<{ policy: Record<string, number>; value: number }> {
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

    return processOutputs(board, logits_maia, logits_value, legalMoves);
  }
}

export default Maia;
