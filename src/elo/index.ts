import { ELO_END, ELO_INTERVAL, ELO_START } from "../constants";

/**
 * Maps an Elo rating to the discrete category index used by the model.
 * Category 0  = below ELO_START (< 1100)
 * Categories 1–9 = 100-point buckets from 1100 to 1999
 * Category 10 = ELO_END and above (>= 2000)
 */
export function mapToCategory(elo: number): number {
  if (elo < ELO_START) return 0;
  if (elo >= ELO_END) return (ELO_END - ELO_START) / ELO_INTERVAL + 1;
  return Math.floor((elo - ELO_START) / ELO_INTERVAL) + 1;
}
