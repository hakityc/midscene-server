import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getAllClientTypes } from '../config/clientTypeActions';
import {
  type ClientType,
  type FlowActionType,
  getFlowActionConfig,
  getFlowActionConfigs,
  getFlowActionsByCategory,
  getFullFlowActionConfig,
  getSupportedFlowActions,
  isFlowActionSupported,
} from '../config/clientTypeFlowActions';

const app = new Hono();

// 启用 CORS
app.use('*', cors());

/**
 * 获取完整的客户端类型和 Flow Actions 配置
 * GET /api/client-type-flow-actions
 */
app.get('/', (c) => {
  try {
    const config = getFullFlowActionConfig();
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
 * GET /api/client-type-flow-actions/types
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
 * 获取指定客户端类型支持的 Flow Actions
 * GET /api/client-type-flow-actions/:clientType
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

    const flowActions = getSupportedFlowActions(clientType);
    const configs = getFlowActionConfigs(clientType);

    return c.json({
      success: true,
      data: {
        clientType,
        flowActions,
        configs,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: '获取 Flow Actions 失败',
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * 获取指定客户端类型的完整配置（带详细信息）
 * GET /api/client-type-flow-actions/:clientType/configs
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

    const configs = getFlowActionConfigs(clientType);

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

/**
 * 按类别获取 Flow Actions
 * GET /api/client-type-flow-actions/:clientType/by-category
 */
app.get('/:clientType/by-category', (c) => {
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

    const actionsByCategory = getFlowActionsByCategory(clientType);

    return c.json({
      success: true,
      data: {
        clientType,
        categories: actionsByCategory,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: '获取分类配置失败',
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * 检查指定 Flow Action 是否支持
 * GET /api/client-type-flow-actions/:clientType/check/:actionType
 */
app.get('/:clientType/check/:actionType', (c) => {
  try {
    const clientType = c.req.param('clientType') as ClientType;
    const actionType = c.req.param('actionType') as FlowActionType;

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

    const supported = isFlowActionSupported(clientType, actionType);
    const config = getFlowActionConfig(clientType, actionType);

    return c.json({
      success: true,
      data: {
        clientType,
        actionType,
        supported,
        config,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: '检查失败',
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export default app;
