import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TokenizerService } from '../../core/services/tokenizer.service';
import { CostCalculatorService } from '../../core/services/cost-calculator.service';
import { ModelPricing } from '../../core/models/pricing.model';

@Component({
  selector: 'app-prompt-input',
  imports: [FormsModule],
  templateUrl: './prompt-input.component.html',
  styleUrls: ['./prompt-input.component.scss'],
})
export class PromptInputComponent implements OnInit {
  /** The prompt text entered by the user */
  promptText = '';

  /** Available models from pricing data */
  models: ModelPricing[] = [];

  /** Currently selected model (two-way bound with service signal) */
  selectedModel = 'gpt-4o';

  /** Whether to simulate input or output pricing */
  inputType: 'input' | 'output' = 'input';

  /** Expose processing signal from the service */
  isProcessing = this.tokenizer.isProcessing;

  constructor(
    private tokenizer: TokenizerService,
    public costCalc: CostCalculatorService,
  ) {}

  ngOnInit(): void {
    // Sync initial values from the service
    this.selectedModel = this.costCalc.selectedModel();
    this.inputType = this.costCalc.inputType();
  }

  /** Called when the user clicks the Analyze button */
  onAnalyze(): void {
    // Sync selections to the cost service
    this.costCalc.selectedModel.set(this.selectedModel);
    this.costCalc.inputType.set(this.inputType);

    // Trigger tokenization
    this.tokenizer.analyze(this.promptText, this.selectedModel);
  }

  /** Update selected model when dropdown changes */
  onModelChange(value: string): void {
    this.selectedModel = value;
    this.costCalc.selectedModel.set(value);
  }

  /** Update input type when radio toggles */
  onInputTypeChange(value: 'input' | 'output'): void {
    this.inputType = value;
    this.costCalc.inputType.set(value);
  }
}
