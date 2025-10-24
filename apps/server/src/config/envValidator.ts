/**
 * 环境变量验证模块
 * 负责检查必需和可选的环境变量，并返回模块启用状态
 */

export interface ModuleStatus {
  enabled: boolean;
  reason?: string;
}

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  modules: {
    ai: ModuleStatus;
    cls: ModuleStatus;
    cos: ModuleStatus;
    database: ModuleStatus;
    taskAgent: ModuleStatus;
  };
}

/**
 * 验证环境变量配置
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 验证 AI 核心配置（必需）
  const aiEnabled = validateAIConfig(errors, warnings);

  // 2. 验证 CLS 配置（可选）
  const clsEnabled = validateCLSConfig(warnings);

  // 3. 验证 COS 配置（可选）
  const cosEnabled = validateCOSConfig(warnings);

  // 4. 验证 Database 配置（可选）
  const databaseEnabled = validateDatabaseConfig(warnings);

  // 5. 验证 Task Agent 配置（可选）
  const taskAgentEnabled = validateTaskAgentConfig(warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    modules: {
      ai: aiEnabled,
      cls: clsEnabled,
      cos: cosEnabled,
      database: databaseEnabled,
      taskAgent: taskAgentEnabled,
    },
  };
}

/**
 * 验证 AI 核心配置
 */
function validateAIConfig(errors: string[], warnings: string[]): ModuleStatus {
  const apiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.MIDSCENE_MODEL_NAME;

  if (!apiKey) {
    errors.push('缺少必需的环境变量: OPENAI_API_KEY - AI 核心功能无法使用');
    return { enabled: false, reason: '缺少 OPENAI_API_KEY' };
  }

  if (!modelName) {
    warnings.push('未设置 MIDSCENE_MODEL_NAME，将使用默认模型 (gpt-4o-mini)');
  }

  return { enabled: true };
}

/**
 * 验证 CLS 配置
 */
function validateCLSConfig(warnings: string[]): ModuleStatus {
  const endpoint = process.env.CLS_ENDPOINT;
  const topicId = process.env.CLS_TOPIC_ID;
  const secretId = process.env.CLS_SECRET_ID;
  const secretKey = process.env.CLS_SECRET_KEY;

  // CLS 需要所有配置都存在才能启用
  if (!endpoint || !topicId || !secretId || !secretKey) {
    const missing: string[] = [];
    if (!endpoint) missing.push('CLS_ENDPOINT');
    if (!topicId) missing.push('CLS_TOPIC_ID');
    if (!secretId) missing.push('CLS_SECRET_ID');
    if (!secretKey) missing.push('CLS_SECRET_KEY');

    warnings.push(
      `腾讯云 CLS 日志服务未配置 (缺少: ${missing.join(', ')})，日志不会上报到云端`,
    );
    return { enabled: false, reason: `缺少配置: ${missing.join(', ')}` };
  }

  return { enabled: true };
}

/**
 * 验证 COS 配置
 */
function validateCOSConfig(warnings: string[]): ModuleStatus {
  const secretId = process.env.COS_SECRET_ID;
  const secretKey = process.env.COS_SECRET_KEY;
  const bucket = process.env.COS_BUCKET;
  const region = process.env.COS_REGION;

  // COS 需要所有配置都存在才能启用
  if (!secretId || !secretKey || !bucket || !region) {
    const missing: string[] = [];
    if (!secretId) missing.push('COS_SECRET_ID');
    if (!secretKey) missing.push('COS_SECRET_KEY');
    if (!bucket) missing.push('COS_BUCKET');
    if (!region) missing.push('COS_REGION');

    warnings.push(
      `腾讯云 COS 对象存储未配置 (缺少: ${missing.join(', ')})，文件上传功能不可用`,
    );
    return { enabled: false, reason: `缺少配置: ${missing.join(', ')}` };
  }

  return { enabled: true };
}

/**
 * 验证 Database 配置
 */
function validateDatabaseConfig(warnings: string[]): ModuleStatus {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    warnings.push('未配置 DATABASE_URL，将使用默认的本地数据库');
    return { enabled: false, reason: '未配置，使用默认本地数据库' };
  }

  return { enabled: true };
}

/**
 * 验证 Task Agent 配置
 */
function validateTaskAgentConfig(warnings: string[]): ModuleStatus {
  const apiKey = process.env.TASK_OPENAI_API_KEY;
  const modelName = process.env.TASK_MIDSCENE_MODEL_NAME;

  if (!apiKey) {
    warnings.push(
      '未配置 TASK_OPENAI_API_KEY，增强任务 Agent 功能将使用默认 AI 配置',
    );
    return { enabled: false, reason: '未配置，将使用默认 AI 配置' };
  }

  if (!modelName) {
    warnings.push(
      '未设置 TASK_MIDSCENE_MODEL_NAME，增强任务 Agent 将使用默认模型',
    );
  }

  return { enabled: true };
}

/**
 * 打印验证结果
 */
export function printValidationResult(result: EnvValidationResult): void {
  console.log('\n========================================');
  console.log('🔍 环境变量验证结果');
  console.log('========================================\n');

  // 打印错误
  if (result.errors.length > 0) {
    console.log('❌ 错误:');
    for (const error of result.errors) {
      console.log(`   ${error}`);
    }
    console.log('');
  }

  // 打印警告
  if (result.warnings.length > 0) {
    console.log('⚠️  警告:');
    for (const warning of result.warnings) {
      console.log(`   ${warning}`);
    }
    console.log('');
  }

  // 打印模块状态
  console.log('📦 模块状态:');
  console.log(
    `   AI 核心服务:      ${result.modules.ai.enabled ? '✅ 已启用' : '❌ 已禁用'}${result.modules.ai.reason ? ` (${result.modules.ai.reason})` : ''}`,
  );
  console.log(
    `   CLS 日志服务:     ${result.modules.cls.enabled ? '✅ 已启用' : '⚪ 未配置'}${result.modules.cls.reason ? ` (${result.modules.cls.reason})` : ''}`,
  );
  console.log(
    `   COS 对象存储:     ${result.modules.cos.enabled ? '✅ 已启用' : '⚪ 未配置'}${result.modules.cos.reason ? ` (${result.modules.cos.reason})` : ''}`,
  );
  console.log(
    `   数据库:          ${result.modules.database.enabled ? '✅ 已启用' : '⚪ 使用默认'}${result.modules.database.reason ? ` (${result.modules.database.reason})` : ''}`,
  );
  console.log(
    `   增强任务 Agent:   ${result.modules.taskAgent.enabled ? '✅ 已启用' : '⚪ 未配置'}${result.modules.taskAgent.reason ? ` (${result.modules.taskAgent.reason})` : ''}`,
  );

  console.log('\n========================================\n');
}
