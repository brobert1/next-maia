import { describe, it, expect } from "vitest";
import { boardToTensor } from "../src/encode/board-to-tensor";
import { BOARD_CHANNELS, BOARD_SIZE } from "../src/constants";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_1E4_FEN =
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const WITH_EP_FEN =
  "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3";
const NO_CASTLING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1";

const TOTAL_SQUARES = BOARD_SIZE * BOARD_SIZE; // 64
const TENSOR_LENGTH = BOARD_CHANNELS * TOTAL_SQUARES; // 18 * 64 = 1152

function channelSum(tensor: Float32Array, channel: number): number {
  let sum = 0;
  const start = channel * TOTAL_SQUARES;
  for (let i = 0; i < TOTAL_SQUARES; i++) sum += tensor[start + i];
  return sum;
}

describe("boardToTensor", () => {
  it("returns a Float32Array of length 18 × 64 = 1152", () => {
    const tensor = boardToTensor(STARTING_FEN);
    expect(tensor).toBeInstanceOf(Float32Array);
    expect(tensor.length).toBe(TENSOR_LENGTH);
  });

  it("piece channels (0–11) sum to total number of pieces on the board", () => {
    const tensor = boardToTensor(STARTING_FEN);
    let pieceSum = 0;
    for (let ch = 0; ch < 12; ch++) pieceSum += channelSum(tensor, ch);
    // 16 white pieces + 16 black pieces = 32
    expect(pieceSum).toBe(32);
  });

  it("each piece channel contains only 0s and 1s", () => {
    const tensor = boardToTensor(STARTING_FEN);
    for (let i = 0; i < 12 * TOTAL_SQUARES; i++) {
      expect(tensor[i] === 0 || tensor[i] === 1).toBe(true);
    }
  });

  it("turn channel (12) is all 1.0 when it is white's turn", () => {
    const tensor = boardToTensor(STARTING_FEN);
    expect(channelSum(tensor, 12)).toBe(64);
  });

  it("turn channel (12) is all 0.0 when it is black's turn", () => {
    const tensor = boardToTensor(AFTER_1E4_FEN);
    expect(channelSum(tensor, 12)).toBe(0);
  });

  it("all 4 castling channels (13–16) are filled when KQkq", () => {
    const tensor = boardToTensor(STARTING_FEN);
    for (let ch = 13; ch <= 16; ch++) {
      expect(channelSum(tensor, ch)).toBe(64);
    }
  });

  it("all castling channels are zero when castling rights are '-'", () => {
    const tensor = boardToTensor(NO_CASTLING_FEN);
    for (let ch = 13; ch <= 16; ch++) {
      expect(channelSum(tensor, ch)).toBe(0);
    }
  });

  it("en passant channel (17) is all zeros when there is no EP square", () => {
    const tensor = boardToTensor(STARTING_FEN);
    expect(channelSum(tensor, 17)).toBe(0);
  });

  it("en passant channel (17) has exactly one 1 when EP square is set", () => {
    const tensor = boardToTensor(WITH_EP_FEN);
    expect(channelSum(tensor, 17)).toBe(1);
  });

  it("white pawn channel (0) has 8 pieces in starting position", () => {
    const tensor = boardToTensor(STARTING_FEN);
    expect(channelSum(tensor, 0)).toBe(8);
  });

  it("black pawn channel (6) has 8 pieces in starting position", () => {
    const tensor = boardToTensor(STARTING_FEN);
    expect(channelSum(tensor, 6)).toBe(8);
  });

  it("white king channel (5) has exactly 1 piece", () => {
    const tensor = boardToTensor(STARTING_FEN);
    expect(channelSum(tensor, 5)).toBe(1);
  });

  it("black king channel (11) has exactly 1 piece", () => {
    const tensor = boardToTensor(STARTING_FEN);
    expect(channelSum(tensor, 11)).toBe(1);
  });

  it("all values are non-negative", () => {
    const tensor = boardToTensor(STARTING_FEN);
    for (const v of tensor) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});
