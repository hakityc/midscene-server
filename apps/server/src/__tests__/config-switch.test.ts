import { describe, expect, it, vi } from 'vitest';
import { config, updateRuntimeConfig } from '../config';

describe('Configuration Switching', () => {
  it('should update config and process.env when updateRuntimeConfig is called', () => {
    const originalName = config.model.name;
    const originalApiKey = config.model.apiKey;
    const originalBaseUrl = config.model.baseUrl;
    const originalUseQwen = process.env.MIDSCENE_USE_QWEN3_VL;

    const newConfig = {
      model: {
        name: 'test-model',
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
      },
      useQwen3Vl: true,
    };

    updateRuntimeConfig(newConfig);

    expect(config.model.name).toBe('test-model');
    expect(config.model.apiKey).toBe('test-key');
    expect(config.model.baseUrl).toBe('https://test.api');
    expect(process.env.MIDSCENE_MODEL_NAME).toBe('test-model');
    expect(process.env.OPENAI_API_KEY).toBe('test-key');
    expect(process.env.OPENAI_BASE_URL).toBe('https://test.api');
    expect(process.env.MIDSCENE_USE_QWEN3_VL).toBe('1');

    // Restore (optional, but good practice if other tests run)
    updateRuntimeConfig({
      model: {
        name: originalName,
        apiKey: originalApiKey,
        baseUrl: originalBaseUrl,
      },
      useQwen3Vl: originalUseQwen === '1',
    });
  });
});
