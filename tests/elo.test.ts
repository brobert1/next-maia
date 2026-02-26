import { describe, it, expect } from "vitest";
import { mapToCategory } from "../src/elo";

describe("mapToCategory", () => {
  it("maps elo below 1100 to category 0", () => {
    expect(mapToCategory(500)).toBe(0);
    expect(mapToCategory(1099)).toBe(0);
    expect(mapToCategory(0)).toBe(0);
  });

  it("maps 1100 to category 1", () => {
    expect(mapToCategory(1100)).toBe(1);
  });

  it("maps values within the 1100-1199 bucket to category 1", () => {
    expect(mapToCategory(1150)).toBe(1);
    expect(mapToCategory(1199)).toBe(1);
  });

  it("maps 1200 to category 2", () => {
    expect(mapToCategory(1200)).toBe(2);
  });

  it("maps each 100-point boundary to the correct category", () => {
    const boundaries = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900];
    boundaries.forEach((elo, idx) => {
      expect(mapToCategory(elo)).toBe(idx + 1);
    });
  });

  it("maps 1999 to category 9 (last full bucket)", () => {
    expect(mapToCategory(1999)).toBe(9);
  });

  it("maps 2000 to category 10 (above-max)", () => {
    expect(mapToCategory(2000)).toBe(10);
  });

  it("maps values above 2000 to category 10", () => {
    expect(mapToCategory(2500)).toBe(10);
    expect(mapToCategory(3000)).toBe(10);
  });
});
