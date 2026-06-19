/**
 * CLI script to tokenize a prompt using tiktoken directly (no Angular needed).
 *
 * Usage:
 *   npx tsx scripts/analyze.ts "Your prompt here" [model]
 *
 * The script loads the tiktoken WASM module, tokenizes the text,
 * and prints the token count and distribution.
 */

async function main(): Promise<void> {
  const prompt = process.argv[2];
  const model = process.argv[3] ?? 'gpt-4o';

  if (!prompt) {
    console.error('Usage: npx tsx scripts/analyze.ts "<prompt>" [model]');
    process.exit(1);
  }

  // Shared Node.js imports for file I/O
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const url = await import('node:url');
  const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

  // Mapping from model names to tiktoken encodings
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
    default: 'cl100k_base',
  };

  const encodingName = MODEL_TO_ENCODING[model] ?? MODEL_TO_ENCODING['default'];

  // Dynamically import tiktoken via init (manual WASM loading)
  const tiktoken = await import('tiktoken/init');

  // Initialize WASM from node_modules
  await tiktoken.init(async (imports) => {
    const wasmPath = path.join(__dirname, '..', 'node_modules', 'tiktoken', 'tiktoken_bg.wasm');
    const wasmBytes = await fs.readFile(wasmPath);
    return WebAssembly.instantiate(wasmBytes, imports);
  });
  const encoder = tiktoken.get_encoding(encodingName);

  const tokenIds: number[] = Array.from(encoder.encode(prompt));

  // Classify tokens
  const categoryCounts = new Map<string, number>();
  for (const id of tokenIds) {
    const tokenBytes = encoder.decode(new Uint32Array([id]));
    const text = new TextDecoder().decode(tokenBytes);

    let category: string;
    if (!text) {
      category = 'empty';
    } else if (/^\s+$/.test(text)) {
      category = 'whitespace';
    } else if (/^[\p{P}\p{S}]+$/u.test(text)) {
      category = 'punctuation';
    } else if (/^[0-9]+$/.test(text)) {
      category = 'numbers';
    } else if (/[\p{L}\p{N}]/u.test(text) && /[\p{P}\p{S}]/u.test(text)) {
      category = 'mixed';
    } else if (/[\p{L}]/u.test(text)) {
      category = 'words';
    } else {
      category = 'special';
    }

    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  encoder.free();

  // Print results
  console.log(`Model:       ${model}`);
  console.log(`Encoding:    ${encodingName}`);
  console.log(`Tokens:      ${tokenIds.length}`);
  console.log(`Characters:  ${prompt.length}`);
  console.log('─'.repeat(50));
  console.log('Token Distribution by Type:');
  console.log('');

  const sorted = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sorted) {
    const pct = ((count / tokenIds.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round((count / tokenIds.length) * 40));
    console.log(`  ${type.padEnd(14)} ${String(count).padStart(6)}  ${pct.padStart(5)}%  ${bar}`);
  }

  // Cost estimation using pricing data
  const pricing = await loadPricing(fs, path, __dirname);
  const modelPricing = pricing.find((p) => p.model === model);
  if (modelPricing) {
    const inputCost = (tokenIds.length / 1_000_000) * modelPricing.inputPricePer1M;
    const outputCost = (tokenIds.length / 1_000_000) * modelPricing.outputPricePer1M;
    console.log('');
    console.log('─'.repeat(50));
    console.log('Cost Estimation:');
    console.log(`  As input:   $${inputCost.toFixed(6)}`);
    console.log(`  As output:  $${outputCost.toFixed(6)}`);
  }

  // Print first 20 token IDs for inspection
  console.log('');
  console.log('─'.repeat(50));
  console.log(`First 20 token IDs: [${tokenIds.slice(0, 20).join(', ')}${tokenIds.length > 20 ? ', ...' : ''}]`);
}

interface PricingEntry {
  model: string;
  displayName: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPricing(fs: any, path: any, __dirname: string): Promise<PricingEntry[]> {
  const pricingPath = path.join(__dirname, '..', 'src', 'assets', 'pricing-data.json');
  const data = await fs.readFile(pricingPath, 'utf-8');
  return JSON.parse(data);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
