import { BOARD_CHANNELS, BOARD_SIZE } from "../constants";

const PIECE_TYPES = [
  "P",
  "N",
  "B",
  "R",
  "Q",
  "K",
  "p",
  "n",
  "b",
  "r",
  "q",
  "k",
];
const SQUARES_PER_CHANNEL = BOARD_SIZE * BOARD_SIZE;

export function boardToTensor(fen: string): Float32Array {
  const tokens = fen.split(" ");
  const piecePlacement = tokens[0];
  const activeColor = tokens[1];
  const castlingAvailability = tokens[2];
  const enPassantTarget = tokens[3];

  const tensor = new Float32Array(BOARD_CHANNELS * SQUARES_PER_CHANNEL);
  const rows = piecePlacement.split("/");

  for (let rank = 0; rank < BOARD_SIZE; rank++) {
    const row = 7 - rank;
    let file = 0;
    for (const char of rows[rank]) {
      if (isNaN(parseInt(char, 10))) {
        const index = PIECE_TYPES.indexOf(char);
        const tensorIndex = index * 64 + row * 8 + file;
        tensor[tensorIndex] = 1.0;
        file += 1;
      } else {
        file += parseInt(char, 10);
      }
    }
  }

  const turnChannelStart = 12 * 64;
  const turnChannelEnd = turnChannelStart + 64;
  const turnValue = activeColor === "w" ? 1.0 : 0.0;
  tensor.fill(turnValue, turnChannelStart, turnChannelEnd);

  const castlingRights = [
    castlingAvailability.includes("K"),
    castlingAvailability.includes("Q"),
    castlingAvailability.includes("k"),
    castlingAvailability.includes("q"),
  ];
  for (let i = 0; i < 4; i++) {
    if (castlingRights[i]) {
      const channelStart = (13 + i) * 64;
      const channelEnd = channelStart + 64;
      tensor.fill(1.0, channelStart, channelEnd);
    }
  }

  const epChannel = 17 * 64;
  if (enPassantTarget !== "-") {
    const file = enPassantTarget.charCodeAt(0) - "a".charCodeAt(0);
    const rank = parseInt(enPassantTarget[1], 10) - 1;
    const row = 7 - rank;
    const index = epChannel + row * 8 + file;
    tensor[index] = 1.0;
  }

  return tensor;
}
