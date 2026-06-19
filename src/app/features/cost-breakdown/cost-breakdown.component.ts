import { Component, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TokenizerService } from '../../core/services/tokenizer.service';
import { CostCalculatorService } from '../../core/services/cost-calculator.service';

@Component({
  selector: 'app-cost-breakdown',
  imports: [DecimalPipe],
  templateUrl: './cost-breakdown.component.html',
  styleUrls: ['./cost-breakdown.component.scss'],
})
export class CostBreakdownComponent {
  /** Current analysis result from the tokenizer service */
  analysisResult = this.tokenizer.analysisResult;

  /** Selected model from the cost service */
  selectedModel = this.costCalc.selectedModel;

  /** Currently selected input type */
  inputType = this.costCalc.inputType;

  /** Pricing for currently selected model */
  currentPricing = this.costCalc.currentPricing;

  /** Total token count derived from analysis result */
  totalTokens = computed(() => this.analysisResult()?.tokens ?? 0);

  /** Calculated cost in USD */
  calculatedCost = computed(() => {
    const tokens = this.totalTokens();
    const model = this.selectedModel();
    const type = this.inputType();
    return this.costCalc.calculateCost(tokens, model, type);
  });

  /** Price per 1M tokens for the current model & type */
  pricePer1M = computed(() => {
    const pricing = this.currentPricing();
    if (!pricing) return 0;
    return this.inputType() === 'input'
      ? pricing.inputPricePer1M
      : pricing.outputPricePer1M;
  });

  constructor(
    private tokenizer: TokenizerService,
    public costCalc: CostCalculatorService,
  ) {}
}
