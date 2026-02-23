import { describe, it, expect, beforeAll } from "vitest";
import { createEloDict, mapToCategory } from "../src/elo";

let eloDict: Record<string, number>;

beforeAll(() => {
  eloDict = createEloDict();
});

describe("createEloDict", () => {
  it("produces 11 entries (<1100 + 9 buckets + >=2000)", () => {
    // <1100, 1100-1199, 1200-1299, ..., 1900-1999, >=2000
    expect(Object.keys(eloDict)).toHaveLength(11);
  });

  it("below-min bucket is category 0", () => {
    expect(eloDict["<1100"]).toBe(0);
  });

  it("above-max bucket is the last category", () => {
    const max = Math.max(...Object.values(eloDict));
    expect(eloDict[">=2000"]).toBe(max);
  });

  it("all category values are unique", () => {
    const values = Object.values(eloDict);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("mapToCategory", () => {
  it("maps elo below 1100 to category 0", () => {
    expect(mapToCategory(500, eloDict)).toBe(0);
    expect(mapToCategory(1099, eloDict)).toBe(0);
    expect(mapToCategory(0, eloDict)).toBe(0);
  });

  it("maps 1100 to category 1", () => {
    expect(mapToCategory(1100, eloDict)).toBe(1);
  });

  it("maps values within the 1100-1199 bucket to category 1", () => {
    expect(mapToCategory(1150, eloDict)).toBe(1);
    expect(mapToCategory(1199, eloDict)).toBe(1);
  });

  it("maps 1200 to category 2", () => {
    expect(mapToCategory(1200, eloDict)).toBe(2);
  });

  it("maps each 100-point boundary to the correct category", () => {
    const boundaries = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900];
    boundaries.forEach((elo, idx) => {
      expect(mapToCategory(elo, eloDict)).toBe(idx + 1);
    });
  });

  it("maps 1999 to category 9 (last full bucket)", () => {
    expect(mapToCategory(1999, eloDict)).toBe(9);
  });

  it("maps 2000 to the max category", () => {
    const max = Math.max(...Object.values(eloDict));
    expect(mapToCategory(2000, eloDict)).toBe(max);
  });

  it("maps values above 2000 to the max category", () => {
    const max = Math.max(...Object.values(eloDict));
    expect(mapToCategory(2500, eloDict)).toBe(max);
    expect(mapToCategory(3000, eloDict)).toBe(max);
  });
});
