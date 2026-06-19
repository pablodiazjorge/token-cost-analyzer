/**
 * Represents the distribution count for a single token category
 * (e.g. words, punctuation, numbers, whitespace, special tokens).
 */
export interface TokenDistribution {
  type: string;
  count: number;
  percentage: number;
}

/**
 * Full result returned by the Web Worker after tokenizing a text.
 */
export interface TokenAnalysisResult {
  tokens: number;
  tokenIds: number[];
  distribution: TokenDistribution[];
}
