import { Injectable, Signal, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ModelPricing } from '../models/pricing.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, shareReplay } from 'rxjs/operators';

/**
 * Service that loads model pricing data from the local assets file
 * and provides cost-calculation helpers.
 *
 * All prices are in USD per 1 000 000 tokens.
 */
@Injectable({ providedIn: 'root' })
export class CostCalculatorService {
  readonly availableModels: Signal<ModelPricing[]>;

  readonly selectedModel = signal<string>('gpt-4o');

  readonly inputType = signal<'input' | 'output'>('input');

  readonly currentPricing: Signal<ModelPricing | undefined>;

  constructor(private http: HttpClient) {
    const pricing$ = this.http.get<ModelPricing[]>('assets/pricing-data.json').pipe(
      shareReplay(1),
    );

    this.availableModels = toSignal(pricing$, { initialValue: [] });

    this.currentPricing = computed(() => {
      const models = this.availableModels();
      const selected = this.selectedModel();
      return models.find((m) => m.model === selected);
    });
  }

  /**
   * Calculate the dollar cost for a given number of tokens.
   *
   * @param tokens  Absolute token count
   * @param model   Model identifier (must exist in pricing data)
   * @param type    Whether these are input or output tokens
   * @returns       Cost in USD
   */
  calculateCost(tokens: number, model: string, type: 'input' | 'output'): number {
    const pricing = this.availableModels().find((m) => m.model === model);
    if (!pricing) {
      return 0;
    }

    const pricePer1M = type === 'input' ? pricing.inputPricePer1M : pricing.outputPricePer1M;
    return (tokens / 1_000_000) * pricePer1M;
  }

  /**
   * Get the pricing details for a specific model.
   */
  getModelPricing(model: string): ModelPricing | undefined {
    return this.availableModels().find((m) => m.model === model);
  }

  /**
   * Format a cost value for display.
   * - If ≥ $0.01, show with up to 4 decimal places
   * - If < $0.01, show with up to 6 decimal places (no scientific notation)
   */
  formatCost(cost: number): string {
    if (cost === 0) {
      return '$0.00';
    }
    if (cost >= 0.01) {
      return `$${cost.toFixed(4)}`;
    }
    if (cost >= 0.000001) {
      return `$${cost.toFixed(6)}`;
    }
    return `$${cost.toFixed(8)}`;
  }
}
