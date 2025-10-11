import type { Template } from '@/types/debug';
import { generateMeta } from './messageBuilder';

/**
 * 预设模板库
 */
export const templates: Template[] = [
  {
    id: 'search-and-click',
    name: '搜索并点击第一个结果',
    description: '在搜索框输入内容，等待结果，点击第一个结果',
    action: 'aiScript',
    message: {
      meta: generateMeta(),
      payload: {
        action: 'aiScript',
        params: {
          tasks: [
            {
              name: '搜索并点击',
              continueOnError: false,
              flow: [
                {
                  aiTap: '搜索图标',
                },
                {
                  aiInput: '搜索内容',
                  locate: '搜索输入框',
                },
                {
                  sleep: 2000,
                },
                {
                  aiTap: '第一个搜索结果',
                },
              ],
            },
          ],
        },
        option: 'LOADING_SHADE',
      },
    },
  },
  {
    id: 'form-fill',
    name: '表单填写',
    description: '填写表单的多个字段',
    action: 'aiScript',
    message: {
      meta: generateMeta(),
      payload: {
        action: 'aiScript',
        params: {
          tasks: [
            {
              name: '填写表单',
              continueOnError: false,
              flow: [
                {
                  aiInput: '张三',
                  locate: '姓名输入框',
                },
                {
                  aiInput: 'zhangsan@example.com',
                  locate: '邮箱输入框',
                },
                {
                  aiInput: '13800138000',
                  locate: '手机号输入框',
                },
                {
                  aiTap: '提交按钮',
                },
              ],
            },
          ],
        },
        option: 'LOADING_SHADE',
      },
    },
  },
  {
    id: 'close-popup',
    name: '关闭弹窗',
    description: '检测并关闭页面弹窗',
    action: 'aiScript',
    message: {
      meta: generateMeta(),
      payload: {
        action: 'aiScript',
        params: {
          tasks: [
            {
              name: '关闭弹窗',
              continueOnError: true,
              flow: [
                {
                  aiWaitFor: {
                    assertion: '页面上出现弹窗或对话框',
                    timeoutMs: 5000,
                  },
                },
                {
                  aiTap: '关闭按钮或X按钮',
                },
              ],
            },
          ],
        },
      },
    },
  },
  {
    id: 'scroll-and-load',
    name: '滚动加载更多',
    description: '向下滚动直到底部，加载更多内容',
    action: 'aiScript',
    message: {
      meta: generateMeta(),
      payload: {
        action: 'aiScript',
        params: {
          tasks: [
            {
              name: '滚动加载',
              continueOnError: false,
              flow: [
                {
                  aiScroll: {
                    direction: 'down',
                    scrollType: 'untilBottom',
                  },
                },
                {
                  sleep: 1000,
                },
                {
                  aiAssert: '已经滚动到页面底部',
                },
              ],
            },
          ],
        },
      },
    },
  },
  {
    id: 'check-text',
    name: '检查文本内容',
    description: '验证页面上是否包含特定文本',
    action: 'aiScript',
    message: {
      meta: generateMeta(),
      payload: {
        action: 'aiScript',
        params: {
          tasks: [
            {
              name: '检查文本',
              continueOnError: false,
              flow: [
                {
                  aiAssert: '页面包含"成功"或"完成"字样',
                },
              ],
            },
          ],
        },
      },
    },
  },
];

/**
 * 根据 ID 获取模板
 */
export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

/**
 * 获取所有模板
 */
export function getAllTemplates(): Template[] {
  return templates;
}
