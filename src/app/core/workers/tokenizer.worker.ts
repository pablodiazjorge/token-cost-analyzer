/**
 * Web Worker that loads the tiktoken WASM module and tokenizes text
 * without blocking the main thread.
 *
 * Uses tiktoken/init to avoid the ESM WASM import that Vite cannot handle.
 * The WASM binary is loaded manually via fetch and passed to the init() function.
 *
 * Communication protocol:
 *   Receive → { text: string; model: string }
 *   Send    → { tokens: number; tokenIds: number[]; distribution: { type: string; count: number }[] }
 */

/// <reference lib="webworker" />

/** Mapping from user-facing model names to tiktoken encoding names */
const MODEL_TO_ENCODING: Record<string, string> = {
  'gpt-4o': 'o200k_base',
  'gpt-4-turbo': 'cl100k_base',
  'gpt-3.5-turbo': 'cl100k_base',
  'claude-3.5-sonnet': 'cl100k_base',
  'claude-3-opus': 'cl100k_base',
  'claude-3-haiku': 'cl100k_base',
  'gemini-2.0-flash': 'cl100k_base',
  'gemini-1.5-pro': 'cl100k_base',
  'llama-3.3-70b': 'cl100k_base',
  'mixtral-8x22b': 'cl100k_base',
  // Fallback for unknown models
  'default': 'cl100k_base',
};

/** Cached reference to the initialized tiktoken module */
let tiktokenModule: typeof import('tiktoken/init') | null = null;

/**
 * Initialize the tiktoken WASM module.
 * Uses tiktoken/init to manually load the WASM binary, avoiding
 * the ESM WASM import that is incompatible with Vite's dev server.
 */
async function ensureTiktoken(): Promise<typeof import('tiktoken/init')> {
  if (tiktokenModule) {
    return tiktokenModule;
  }

  // Import tiktoken/init which does NOT use ESM WASM import
  const mod = await import('tiktoken/init');

  // Manually load and instantiate the WASM binary
  await mod.init(async (imports) => {
    // The WASM file is served from the assets directory
    const response = await fetch('/assets/tiktoken_bg.wasm');
    const wasmBytes = await response.arrayBuffer();
    return WebAssembly.instantiate(wasmBytes, imports);
  });

  tiktokenModule = mod;
  return mod;
}

/**
 * Heuristic classification of token IDs into broad categories.
 * This uses tiktoken's decode to get the text representation and then
 * classifies based on Unicode character properties.
 */
function classifyToken(text: string): string {
  if (!text || text.length === 0) {
    return 'empty';
  }

  // Check for purely whitespace
  if (/^\s+$/.test(text)) {
    return 'whitespace';
  }

  // Check for punctuation
  if (/^[\p{P}\p{S}]+$/u.test(text)) {
    return 'punctuation';
  }

  // Check for purely numeric
  if (/^[0-9]+$/.test(text)) {
    return 'numbers';
  }

  // Check for mixed alphanumeric (likely code or identifiers)
  if (/[\p{L}\p{N}]/u.test(text) && /[\p{P}\p{S}]/u.test(text)) {
    return 'mixed';
  }

  // Default: word tokens (letters, possibly with diacritics)
  if (/[\p{L}]/u.test(text)) {
    return 'words';
  }

  return 'special';
}

addEventListener('message', async (event: MessageEvent<{ text: string; model: string }>) => {
  try {
    const { text, model } = event.data;

    if (!text || text.trim().length === 0) {
      postMessage({
        tokens: 0,
        tokenIds: [],
        distribution: [],
      });
      return;
    }

    // Load tiktoken via init (manual WASM loading, Vite-compatible)
    const tiktoken = await ensureTiktoken();

    // Resolve encoding for the requested model
    const encodingName = MODEL_TO_ENCODING[model] ?? MODEL_TO_ENCODING['default'];

    // Get the tokenizer instance
    const encoder = tiktoken.get_encoding(encodingName);

    // Encode the text
    const tokenIds: number[] = Array.from(encoder.encode(text));

    // Build distribution by decoding each token and classifying it
    const categoryCounts = new Map<string, number>();
    for (const id of tokenIds) {
      const tokenBytes = encoder.decode(new Uint32Array([id]));
      const tokenText = new TextDecoder().decode(tokenBytes);
      const category = classifyToken(tokenText);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    const distribution = Array.from(categoryCounts.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    // Free the encoder (tiktoken recommends this to release WASM memory)
    encoder.free();

    postMessage({
      tokens: tokenIds.length,
      tokenIds,
      distribution,
    });
  } catch (error) {
    // Post error back to main thread
    postMessage({
      error: error instanceof Error ? error.message : 'Unknown tokenization error',
      tokens: 0,
      tokenIds: [],
      distribution: [],
    });
  }
});
