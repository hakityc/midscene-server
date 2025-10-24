import type { Task, Template, WsInboundMessage } from '@/types/debug';
import { generateMeta } from './messageBuilder';

const STORAGE_KEY = 'midscene-templates';

/**
 * 从 localStorage 加载所有模板
 */
export function loadTemplatesFromStorage(): Template[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as Template[];
  } catch (error) {
    console.error('加载模板失败:', error);
    return [];
  }
}

/**
 * 保存模板到 localStorage
 */
export function saveTemplatesToStorage(templates: Template[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('保存模板失败:', error);
  }
}

/**
 * 从任务创建模板
 */
export function createTemplateFromTasks(
  tasks: Task[],
  name: string,
  description: string,
  enableLoadingShade: boolean,
  clientType?: 'web' | 'windows',
): Template {
  const meta = generateMeta();
  if (clientType) {
    meta.clientType = clientType;
  }

  return {
    id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    action: 'aiScript',
    clientType,
    message: {
      meta,
      payload: {
        action: 'aiScript',
        params: {
          tasks,
        },
        option: enableLoadingShade ? 'LOADING_SHADE' : undefined,
      },
    } as WsInboundMessage,
  };
}

/**
 * 添加模板
 */
export function addTemplate(template: Template): void {
  const templates = loadTemplatesFromStorage();
  templates.push(template);
  saveTemplatesToStorage(templates);
}

/**
 * 删除模板
 */
export function deleteTemplate(templateId: string): void {
  const templates = loadTemplatesFromStorage();
  const filtered = templates.filter((t) => t.id !== templateId);
  saveTemplatesToStorage(filtered);
}

/**
 * 更新模板
 */
export function updateTemplate(
  templateId: string,
  updates: Partial<Template>,
): void {
  const templates = loadTemplatesFromStorage();
  const index = templates.findIndex((t) => t.id === templateId);
  if (index !== -1) {
    templates[index] = { ...templates[index], ...updates };
    saveTemplatesToStorage(templates);
  }
}

/**
 * 获取所有模板
 */
export function getAllTemplates(): Template[] {
  return loadTemplatesFromStorage();
}

/**
 * 根据 ID 获取模板
 */
export function getTemplateById(id: string): Template | undefined {
  const templates = loadTemplatesFromStorage();
  return templates.find((t) => t.id === id);
}

/**
 * 批量更新模板的客户端类型
 * @param templateNames 模板名称数组（支持部分匹配）
 * @param clientType 要设置的客户端类型
 */
export function updateTemplatesClientType(
  templateNames: string[],
  clientType: 'web' | 'windows',
): number {
  const templates = loadTemplatesFromStorage();
  let updatedCount = 0;

  templates.forEach((template) => {
    // 检查模板名称是否匹配（支持部分匹配）
    const isMatch = templateNames.some((name) =>
      template.name.toLowerCase().includes(name.toLowerCase()),
    );

    if (isMatch) {
      template.clientType = clientType;
      // 同时更新消息元数据中的 clientType
      if (template.message.meta) {
        template.message.meta.clientType = clientType;
      }
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    saveTemplatesToStorage(templates);
    window.dispatchEvent(new Event('templates-updated'));
  }

  return updatedCount;
}
