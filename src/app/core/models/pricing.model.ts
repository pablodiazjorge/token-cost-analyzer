/**
 * Pricing information for a single LLM model.
 * Prices are expressed in USD per 1 million tokens.
 * Reflects market pricing as of March–June 2025.
 */
export interface ModelPricing {
  model: string;
  displayName: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
  currency: string;
}
