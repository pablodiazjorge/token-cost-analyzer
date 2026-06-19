import { Injectable, Signal, signal } from '@angular/core';
import { TokenAnalysisResult, TokenDistribution } from '../models/token-analysis.model';

/**
 * Service that orchestrates communication with the Web Worker
 * responsible for tokenizing text via tiktoken WASM.
 *
 * The heavy WASM computation runs off the main thread so the UI
 * stays responsive even with large prompts.
 */
@Injectable({ providedIn: 'root' })
export class TokenizerService {
  /** Signal holding the latest analysis result (null when no analysis done yet) */
  readonly analysisResult: Signal<TokenAnalysisResult | null>;

  /** Signal indicating whether a tokenization is currently in progress */
  readonly isProcessing: Signal<boolean>;

  // Internal writable signals
  private readonly _analysisResult = signal<TokenAnalysisResult | null>(null);
  private readonly _isProcessing = signal<boolean>(false);

  /** Reference to the currently active worker (so we can terminate it on cancel) */
  private currentWorker: Worker | null = null;

  constructor() {
    this.analysisResult = this._analysisResult.asReadonly();
    this.isProcessing = this._isProcessing.asReadonly();
  }

  /**
   * Tokenize the given text for the specified model.
   * If a previous analysis is still running it will be cancelled.
   */
  analyze(text: string, model: string): void {
    // Cancel any in-flight worker
    this.cancelCurrentWorker();

    if (!text || text.trim().length === 0) {
      this._analysisResult.set({
        tokens: 0,
        tokenIds: [],
        distribution: [],
      });
      return;
    }

    this._isProcessing.set(true);

    // Create a new Web Worker (module type for ESM imports)
    const worker = new Worker(
      new URL('../workers/tokenizer.worker', import.meta.url),
      { type: 'module' },
    );
    this.currentWorker = worker;

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data;

      if (data.error) {
        console.error('Tokenizer Worker error:', data.error);
        this._analysisResult.set(null);
      } else {
        // Enrich distribution with percentage values
        const total = data.tokens as number;
        const distribution: TokenDistribution[] = (data.distribution as { type: string; count: number }[]).map(
          (d) => ({
            type: d.type,
            count: d.count,
            percentage: total > 0 ? (d.count / total) * 100 : 0,
          }),
        );

        this._analysisResult.set({
          tokens: data.tokens,
          tokenIds: data.tokenIds,
          distribution,
        });
      }

      this._isProcessing.set(false);
      this.terminateWorker();
    };

    worker.onerror = (err: ErrorEvent) => {
      console.error('Worker error event:', err);
      this._analysisResult.set(null);
      this._isProcessing.set(false);
      this.terminateWorker();
    };

    // Send the text to the worker
    worker.postMessage({ text, model });
  }

  /** Cancel the currently running worker (if any) and reset processing state */
  private cancelCurrentWorker(): void {
    if (this.currentWorker) {
      this.currentWorker.terminate();
      this.currentWorker = null;
      this._isProcessing.set(false);
    }
  }

  /** Clean up the worker reference after a successful or failed run */
  private terminateWorker(): void {
    if (this.currentWorker) {
      this.currentWorker.terminate();
      this.currentWorker = null;
    }
  }
}
