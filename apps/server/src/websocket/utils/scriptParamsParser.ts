import yaml from 'yaml';

export interface StepMetadata {
  /**
   * 客户端自定义的步骤提示文案，例如 leboStepName
   */
  customTip?: string;
  /**
   * 该步骤附带的所有自定义字段，便于后续扩展
   */
  customFields: Record<string, unknown>;
}

export interface ScriptParamsParseResult {
  /**
   * 转换后的 YAML 字符串
   */
  script: string;
  /**
   * 解析后的原始参数（可能是对象或字符串）
   */
  parsedParams: unknown;
  /**
   * stepIndex 到自定义元数据的映射
   */
  stepMetadata: Map<number, StepMetadata>;
}

const STEP_STANDARD_KEYS = new Set([
  'aiTap',
  'aiInput',
  'aiHover',
  'aiKeyboardPress',
  'aiScroll',
  'aiWaitFor',
  'aiAssert',
  'aiExpect',
  'aiAsk',
  'aiQuery',
  'aiString',
  'aiNumber',
  'aiBoolean',
  'aiAction',
  'aiLocate',
  'sleep',
  'screenshot',
  'logText',
  'logScreenshot',
  'runYaml',
  'setAIActionContext',
  'freezePageContext',
  'unfreezePageContext',
  'script',
  'javascript',
  'evaluateJavaScript',
  'xpath',
  'css',
  'selector',
  'locate',
  'xpathList',
  'retry',
  'continueOnError',
  'timeout',
  'delay',
  'args',
  'value',
  'text',
  'url',
  'mask',
  'options',
  'condition',
  'waitFor',
  'assert',
  'name',
  'flow',
]);

export function parseScriptParams(rawParams: unknown): ScriptParamsParseResult {
  const parsedParams = normalizeParams(rawParams);
  const stepMetadata = extractStepMetadata(parsedParams);

  const script = yaml.stringify(parsedParams);

  return {
    script,
    parsedParams,
    stepMetadata,
  };
}

function normalizeParams(rawParams: unknown): unknown {
  if (typeof rawParams !== 'string') {
    return rawParams ?? {};
  }

  // 优先尝试 JSON 解析，失败后尝试 YAML 解析，最后保持原始字符串
  try {
    return JSON.parse(rawParams);
  } catch {
    try {
      return yaml.parse(rawParams);
    } catch {
      return rawParams;
    }
  }
}

function extractStepMetadata(parsedParams: unknown): Map<number, StepMetadata> {
  const metadata = new Map<number, StepMetadata>();

  if (!parsedParams || typeof parsedParams !== 'object') {
    return metadata;
  }

  const tasks = (parsedParams as any).tasks;
  if (!Array.isArray(tasks)) {
    return metadata;
  }

  let globalStepIndex = 0;

  for (const task of tasks) {
    const flow = task?.flow;
    if (!Array.isArray(flow)) {
      continue;
    }

    for (const flowItem of flow) {
      if (flowItem && typeof flowItem === 'object') {
        const customFields = extractCustomFields(flowItem);

        if (Object.keys(customFields).length > 0) {
          const customTip = deriveCustomTip(customFields);
          metadata.set(globalStepIndex, {
            customTip,
            finalTip: customTip,
            customFields,
          });
        }
      }

      globalStepIndex++;
    }
  }

  return metadata;
}

function extractCustomFields(
  flowItem: Record<string, unknown>,
): Record<string, unknown> {
  const customFields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flowItem)) {
    if (value === undefined) {
      continue;
    }

    if (STEP_STANDARD_KEYS.has(key)) {
      continue;
    }

    customFields[key] = value;
  }

  return customFields;
}

function deriveCustomTip(
  customFields: Record<string, unknown>,
): string | undefined {
  const candidate = customFields['leboStepName'];
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }

  const alias = customFields['customTip'];
  if (typeof alias === 'string' && alias.trim().length > 0) {
    return alias;
  }

  return undefined;
}
