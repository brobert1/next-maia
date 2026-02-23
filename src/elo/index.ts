import { ELO_END, ELO_INTERVAL, ELO_START } from "../constants";

export function createEloDict(): Record<string, number> {
  const eloDict: Record<string, number> = { [`<${ELO_START}`]: 0 };
  let rangeIndex = 1;

  for (
    let lowerBound = ELO_START;
    lowerBound < ELO_END;
    lowerBound += ELO_INTERVAL
  ) {
    const upperBound = lowerBound + ELO_INTERVAL;
    eloDict[`${lowerBound}-${upperBound - 1}`] = rangeIndex;
    rangeIndex += 1;
  }

  eloDict[`>=${ELO_END}`] = rangeIndex;
  return eloDict;
}

export function mapToCategory(
  elo: number,
  eloDict: Record<string, number>,
): number {
  if (elo < ELO_START) return eloDict[`<${ELO_START}`];
  if (elo >= ELO_END) return eloDict[`>=${ELO_END}`];

  for (
    let lowerBound = ELO_START;
    lowerBound < ELO_END;
    lowerBound += ELO_INTERVAL
  ) {
    const upperBound = lowerBound + ELO_INTERVAL;
    if (elo >= lowerBound && elo < upperBound) {
      return eloDict[`${lowerBound}-${upperBound - 1}`];
    }
  }
  throw new Error("Elo value is out of range.");
}
