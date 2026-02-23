import HyperFormula, { type RawCellContent } from 'hyperformula';

/** @internal Cache key for storing a HyperFormula instance in a metadata map */
const HF_CACHE_KEY = '__pupt_hyperformula__';

/**
 * Evaluate an Excel-style formula with the given inputs.
 *
 * @param formula - The formula to evaluate (e.g., "=count>5", "=AND(a>1, b<10)")
 * @param inputs - Map of variable names to their values
 * @param cache - Optional map used to cache the HyperFormula instance across
 *   calls within the same render pass. When provided, the instance is created
 *   once and reused, avoiding the overhead of construction/destruction on every
 *   `<If>` evaluation. The caller is responsible for discarding the map (and
 *   thereby the cached instance) when the render pass completes.
 * @returns The boolean result of the formula evaluation
 */
export function evaluateFormula(
  formula: string,
  inputs: Map<string, unknown>,
  cache?: Map<string, unknown>,
): boolean {
  // If not a formula (doesn't start with =), return as truthy check
  if (!formula.startsWith('=')) {
    return Boolean(formula);
  }

  // Strip the leading = for processing
  const formulaBody = formula.slice(1);

  // Obtain (or create) a HyperFormula instance
  let hf: HyperFormula;
  let owned: boolean; // whether we created the instance and must destroy it

  if (cache && cache.has(HF_CACHE_KEY)) {
    hf = cache.get(HF_CACHE_KEY) as HyperFormula;
    owned = false;

    // Clear the existing sheet so we start fresh
    hf.removeSheet(0);
    hf.addSheet('Sheet1');
  } else {
    hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    hf.addSheet('Sheet1');
    owned = !cache; // if no cache, we own the instance

    if (cache) {
      cache.set(HF_CACHE_KEY, hf);
    }
  }

  // Create named expressions for each input variable
  const inputArray = Array.from(inputs.entries());

  // Build a mapping of variable names to cell addresses
  const varToCell = new Map<string, string>();

  inputArray.forEach(([name, value], index) => {
    const row = index;
    const cellAddress = { sheet: 0, col: 0, row };

    // Set the cell value
    hf.setCellContents(cellAddress, formatValueForHyperFormula(value));

    // Map variable name to A1 notation
    varToCell.set(name, `A${row + 1}`);
  });

  // Replace variable names in formula with cell references
  let processedFormula = formulaBody;
  for (const [varName, cellRef] of varToCell) {
    // Replace variable references with cell references
    // Use word boundary regex to avoid partial matches
    const regex = new RegExp(`\\b${escapeRegExp(varName)}\\b`, 'g');
    processedFormula = processedFormula.replace(regex, cellRef);
  }

  // Set the formula in a cell and evaluate
  const resultAddress = { sheet: 0, col: 1, row: 0 };
  hf.setCellContents(resultAddress, `=${processedFormula}`);

  const result = hf.getCellValue(resultAddress);

  // Clean up only if we own the instance (no cache provided)
  if (owned) {
    hf.destroy();
  }

  // Convert result to boolean
  if (typeof result === 'boolean') {
    return result;
  }
  if (typeof result === 'number') {
    return result !== 0;
  }
  if (typeof result === 'string') {
    return result.length > 0;
  }

  // Handle HyperFormula error objects
  if (result && typeof result === 'object' && 'type' in result) {
    // This is an error object from HyperFormula
    return false;
  }

  return Boolean(result);
}

/**
 * Format a value for HyperFormula cell contents
 */
function formatValueForHyperFormula(value: unknown): RawCellContent {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === null || value === undefined) {
    return null;
  }
  // value has been narrowed past string/number/boolean/null/undefined
  return typeof value === 'object' ? JSON.stringify(value) : String(value as bigint);
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
