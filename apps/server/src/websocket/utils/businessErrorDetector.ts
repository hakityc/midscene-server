export interface BusinessErrorResult {
  hasError: boolean;
  errorMsg: string;
  rawResult?: any;
}

/**
 * 检测执行结果中的业务错误
 * 支持多种格式:
 * 1. executeScript map format: { "0": { status: "failed", msg: "..." }, ... }
 * 2. Direct object: { status: "failed", msg: "..." }
 * 3. CDP result wrapper: { result: { value: { status: "failed", msg: "..." } } }
 */
export function detectBusinessError(result: any): BusinessErrorResult {
  if (!result || typeof result !== 'object') {
    return { hasError: false, errorMsg: '' };
  }

  // Helper to check a single object for failure
  const isFailed = (item: any) =>
    item && typeof item === 'object' && item.status === 'failed';

  // Case 1: Direct object (e.g. simple return from JS)
  if (isFailed(result)) {
    return {
      hasError: true,
      errorMsg: result.msg || 'Unknown business error',
      rawResult: result,
    };
  }

  // Case 2: CDP result wrapper (e.g. { result: { value: ... } })
  if (result.result?.value && isFailed(result.result.value)) {
    return {
      hasError: true,
      errorMsg: result.result.value.msg || 'Unknown business error',
      rawResult: result.result.value,
    };
  }

  // Case 3: Map/Array of results (e.g. executeScript result)
  // Iterate over values to find any failure
  const values = Object.values(result);
  for (const item of values) {
    if (isFailed(item)) {
      return {
        hasError: true,
        errorMsg: (item as any).msg || 'Unknown business error',
        rawResult: item,
      };
    }
  }

  return { hasError: false, errorMsg: '' };
}
