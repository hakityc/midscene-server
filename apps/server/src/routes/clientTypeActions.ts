import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  type ClientType,
  getActionConfigs,
  getAllClientTypes,
  getFullActionConfig,
  getSupportedActions,
} from '../config/clientTypeActions';

const app = new Hono();

// 启用 CORS
app.use('*', cors());

/**
 * 获取完整的客户端类型和 Actions 配置
 * GET /api/client-type-actions
 */
app.get('/', (c) => {
  try {
    const config = getFullActionConfig();
    return c.json({
      success: true,
      data: config,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: '获取配置失败',
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * 获取所有客户端类型
 * GET /api/client-type-actions/types
 */
app.get('/types', (c) => {
  try {
    const types = getAllClientTypes();
    return c.json({
      success: true,
      data: types,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: '获取客户端类型失败',
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * 获取指定客户端类型支持的 Actions
 * GET /api/client-type-actions/:clientType
 */
app.get('/:clientType', (c) => {
  try {
    const clientType = c.req.param('clientType') as ClientType;

    // 验证 clientType
    if (!getAllClientTypes().includes(clientType)) {
      return c.json(
        {
          success: false,
          error: `无效的客户端类型: ${clientType}`,
          validTypes: getAllClientTypes(),
        },
        400,
      );
    }

    const actions = getSupportedActions(clientType);
    const configs = getActionConfigs(clientType);

    return c.json({
      success: true,
      data: {
        clientType,
        actions,
        configs,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: '获取 Actions 失败',
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * 获取指定客户端类型的完整配置（带详细信息）
 * GET /api/client-type-actions/:clientType/configs
 */
app.get('/:clientType/configs', (c) => {
  try {
    const clientType = c.req.param('clientType') as ClientType;

    // 验证 clientType
    if (!getAllClientTypes().includes(clientType)) {
      return c.json(
        {
          success: false,
          error: `无效的客户端类型: ${clientType}`,
          validTypes: getAllClientTypes(),
        },
        400,
      );
    }

    const configs = getActionConfigs(clientType);

    return c.json({
      success: true,
      data: {
        clientType,
        configs,
        total: configs.length,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: '获取配置失败',
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export default app;
