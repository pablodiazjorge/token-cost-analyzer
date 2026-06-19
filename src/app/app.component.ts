import { Component } from '@angular/core';
import { PromptInputComponent } from './features/prompt-input/prompt-input.component';
import { TokenDisplayComponent } from './features/token-display/token-display.component';
import { CostBreakdownComponent } from './features/cost-breakdown/cost-breakdown.component';
import { TokenizerService } from './core/services/tokenizer.service';

@Component({
  selector: 'app-root',
  imports: [
    PromptInputComponent,
    TokenDisplayComponent,
    CostBreakdownComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'Token Cost Analyzer';

  /** Expose tokenizer service to template for signal bindings */
  tokenizer: TokenizerService;

  constructor(tokenizer: TokenizerService) {
    this.tokenizer = tokenizer;
  }
}
