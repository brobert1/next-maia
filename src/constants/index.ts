/** Board tensor: 18 channels (12 pieces + turn + 4 castling + en passant), 8×8. */
export const BOARD_CHANNELS = 18;
export const BOARD_SIZE = 8;
export const TENSOR_SHAPE = [
  1,
  BOARD_CHANNELS,
  BOARD_SIZE,
  BOARD_SIZE,
] as const;

/** ELO buckets: 1100–2000 in steps of 100; below/above map to first/last category. */
export const ELO_START = 1100;
export const ELO_END = 2000;
export const ELO_INTERVAL = 100;

/** Cache API key for the ONNX model. */
export const MODEL_CACHE_NAME = "maia2-model";
