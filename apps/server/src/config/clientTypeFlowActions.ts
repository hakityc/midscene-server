/**
 * 客户端类型的 Flow Action 配置
 *
 * FlowAction 是用户在调试界面编排任务流程时可以使用的动作类型
 * 不同的客户端类型可能支持不同的 FlowAction
 *
 * 这是唯一的配置源，Web 端和服务端都从这里同步
 */

import type { ClientType } from './clientTypeActions';

/**
 * Flow Action 类型
 * 对应 Midscene Agent 提供的各种操作方法
 */
export type FlowActionType =
  // 基础操作
  | 'aiTap' // AI 点击
  | 'aiInput' // AI 输入
  | 'aiAssert' // AI 断言
  | 'aiHover' // AI 悬停
  | 'aiScroll' // AI 滚动
  | 'aiWaitFor' // AI 等待条件
  | 'aiKeyboardPress' // AI 按键
  | 'aiDoubleClick' // AI 双击
  | 'aiRightClick' // AI 右键
  // 查询操作
  | 'aiQuery' // AI 查询（任意类型）
  | 'aiString' // AI 查询字符串
  | 'aiNumber' // AI 查询数字
  | 'aiBoolean' // AI 查询布尔值
  // 高级操作
  | 'aiAction' // AI 自动规划
  | 'aiLocate' // AI 定位
  // 工具方法
  | 'sleep' // 等待/延迟
  | 'screenshot' // 截图
  | 'logText' // 记录文本
  | 'logScreenshot' // 记录截图到报告
  // Web 特有
  | 'javascript' // 执行 JavaScript 代码
  // Windows 特有
  | 'getClipboard' // 获取剪贴板
  | 'setClipboard' // 设置剪贴板
  | 'getWindowList' // 获取窗口列表
  | 'activateWindow' // 激活窗口
  | 'pressHotkey' // 按下快捷键（未来扩展）
  | 'launchApp' // 启动应用（未来扩展）
  | 'closeApp'; // 关闭应用（未来扩展）

/**
 * Flow Action 配置信息
 */
export interface FlowActionConfig {
  type: FlowActionType;
  label: string;
  description: string;
  category:
    | 'basic'
    | 'query'
    | 'advanced'
    | 'utility'
    | 'web-specific'
    | 'windows-specific';
  /** 参数定义 */
  params: {
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
    placeholder?: string;
    description?: string;
    /** 是否属于 options 对象 */
    isOption?: boolean;
    /** 参数默认值 */
    defaultValue?: any;
  }[];
  /** 示例用法 */
  example?: string;
}

/**
 * 客户端类型支持的 Flow Actions 配置
 */
export const CLIENT_TYPE_FLOW_ACTIONS: Record<ClientType, FlowActionConfig[]> =
  {
    web: [
      // ==================== 基础操作 ====================
      {
        type: 'aiTap',
        label: 'AI 点击',
        description: '点击指定元素',
        category: 'basic',
        params: [
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: true,
            placeholder: '例如：登录按钮',
            description: '用自然语言描述要点击的元素',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式（更准确但更慢）',
          },
          {
            name: 'xpath',
            label: 'XPath 表达式',
            type: 'string',
            required: false,
            isOption: true,
            placeholder: '//button[@id="login"]',
            description: '可选的 XPath 选择器',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiTap("登录按钮", { deepThink: true })',
      },
      {
        type: 'aiInput',
        label: 'AI 输入',
        description: '在指定元素输入文本',
        category: 'basic',
        params: [
          {
            name: 'text',
            label: '输入内容',
            type: 'string',
            required: true,
            placeholder: '要输入的文本',
            description: '要输入的文本内容',
          },
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: true,
            placeholder: '例如：用户名输入框',
            description: '用自然语言描述目标输入框',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'xpath',
            label: 'XPath 表达式',
            type: 'string',
            required: false,
            isOption: true,
            placeholder: '//input[@name="username"]',
            description: '可选的 XPath 选择器',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example:
          'await agent.aiInput("admin", "用户名输入框", { xpath: "//input[@name=\'username\']" })',
      },
      {
        type: 'aiAssert',
        label: 'AI 断言',
        description: '验证条件是否满足',
        category: 'basic',
        params: [
          {
            name: 'assertion',
            label: '断言条件',
            type: 'string',
            required: true,
            placeholder: '例如：页面显示"登录成功"',
            description: '要验证的条件描述',
          },
          {
            name: 'errorMessage',
            label: '错误消息',
            type: 'string',
            required: false,
            placeholder: '可选，断言失败时的错误信息',
            description: '可选，当断言失败时打印的错误信息',
          },
          {
            name: 'name',
            label: '名称',
            type: 'string',
            required: false,
            placeholder: '可选，断言的名称',
            description: '可选，给断言一个名称，会在 JSON 输出中作为 key 使用',
          },
        ],
        example: 'await agent.aiAssert("页面显示\\"登录成功\\"")',
      },
      {
        type: 'aiHover',
        label: 'AI 悬停',
        description: '鼠标悬停在指定元素',
        category: 'basic',
        params: [
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: true,
            placeholder: '例如：更多菜单',
            description: '用自然语言描述要悬停的元素',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'xpath',
            label: 'XPath 表达式',
            type: 'string',
            required: false,
            isOption: true,
            placeholder: '//*[@class="menu"]',
            description: '可选的 XPath 选择器',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiHover("更多菜单")',
      },
      {
        type: 'aiScroll',
        label: 'AI 滚动',
        description: '滚动页面或元素',
        category: 'basic',
        params: [
          {
            name: 'direction',
            label: '滚动方向',
            type: 'string',
            required: true,
            placeholder: 'up/down/left/right',
            description: '滚动方向',
          },
          {
            name: 'scrollType',
            label: '滚动类型',
            type: 'string',
            required: false,
            placeholder: 'once/untilTop/untilBottom/untilLeft/untilRight',
            description: '滚动类型：once 滚动一次，或滚动到顶部/底部/最左/最右',
          },
          {
            name: 'distance',
            label: '滚动距离',
            type: 'number',
            required: false,
            placeholder: '像素值',
            description: '可选，滚动距离，单位为像素',
          },
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: false,
            placeholder: '例如：滚动区域',
            description: '可选，指定要滚动的元素',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'xpath',
            label: 'XPath 表达式',
            type: 'string',
            required: false,
            isOption: true,
            placeholder: '//*[@class="scroll-area"]',
            description: '可选的 XPath 选择器',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example:
          'await agent.aiScroll({ direction: "down", scrollType: "once", distance: 200 })',
      },
      {
        type: 'aiWaitFor',
        label: 'AI 等待条件',
        description: '等待条件满足',
        category: 'basic',
        params: [
          {
            name: 'assertion',
            label: '等待条件',
            type: 'string',
            required: true,
            placeholder: '例如：对话框出现',
            description: '等待的条件描述',
          },
          {
            name: 'timeout',
            label: '超时时间(ms)',
            type: 'number',
            required: false,
            placeholder: '默认 30000',
            description: '超时时间，单位为毫秒',
          },
        ],
        example: 'await agent.aiWaitFor("对话框出现", { timeout: 5000 })',
      },
      {
        type: 'aiKeyboardPress',
        label: 'AI 按键',
        description: '按下键盘按键',
        category: 'basic',
        params: [
          {
            name: 'key',
            label: '按键名称',
            type: 'string',
            required: true,
            placeholder: '例如：Enter, Escape, Tab',
            description: '要按下的键名',
          },
          {
            name: 'locate',
            label: '元素定位（可选）',
            type: 'string',
            required: false,
            placeholder: '例如：输入框',
            description: '可选，在特定元素上按键',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'xpath',
            label: 'XPath 表达式',
            type: 'string',
            required: false,
            isOption: true,
            placeholder: '//input',
            description: '可选的 XPath 选择器',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiKeyboardPress("Enter", "搜索框")',
      },
      {
        type: 'aiDoubleClick',
        label: 'AI 双击',
        description: '双击指定元素',
        category: 'basic',
        params: [
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: true,
            placeholder: '例如：文件图标',
            description: '用自然语言描述要双击的元素',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'xpath',
            label: 'XPath 表达式',
            type: 'string',
            required: false,
            isOption: true,
            placeholder: '//*[@class="file-icon"]',
            description: '可选的 XPath 选择器',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiDoubleClick("文件图标")',
      },
      {
        type: 'aiRightClick',
        label: 'AI 右键',
        description: '右键点击指定元素',
        category: 'basic',
        params: [
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: true,
            placeholder: '例如：文件夹',
            description: '用自然语言描述要右键点击的元素',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'xpath',
            label: 'XPath 表达式',
            type: 'string',
            required: false,
            isOption: true,
            placeholder: '//*[@class="folder"]',
            description: '可选的 XPath 选择器',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiRightClick("文件夹")',
      },

      // ==================== 查询操作 ====================
      {
        type: 'aiQuery',
        label: 'AI 查询',
        description: 'AI 查询，返回任意类型数据',
        category: 'query',
        params: [
          {
            name: 'demand',
            label: '查询需求',
            type: 'string',
            required: true,
            placeholder: '例如：获取当前页面标题',
            description: '查询的需求描述，记得在提示词中描述输出结果的格式',
          },
          {
            name: 'name',
            label: '名称',
            type: 'string',
            required: false,
            placeholder: '可选，查询结果的名称',
            description: '可选，查询结果在 JSON 输出中的 key',
          },
        ],
        example: 'const result = await agent.aiQuery("获取当前页面标题")',
      },
      {
        type: 'aiString',
        label: 'AI 查询字符串',
        description: 'AI 查询，返回字符串',
        category: 'query',
        params: [
          {
            name: 'prompt',
            label: '查询内容',
            type: 'string',
            required: true,
            placeholder: '例如：获取用户名',
          },
        ],
        example: 'const name = await agent.aiString("获取用户名")',
      },
      {
        type: 'aiNumber',
        label: 'AI 查询数字',
        description: 'AI 查询，返回数字',
        category: 'query',
        params: [
          {
            name: 'prompt',
            label: '查询内容',
            type: 'string',
            required: true,
            placeholder: '例如：获取商品价格',
          },
        ],
        example: 'const price = await agent.aiNumber("获取商品价格")',
      },
      {
        type: 'aiBoolean',
        label: 'AI 查询布尔值',
        description: 'AI 查询，返回布尔值',
        category: 'query',
        params: [
          {
            name: 'prompt',
            label: '查询内容',
            type: 'string',
            required: true,
            placeholder: '例如：按钮是否可点击',
          },
        ],
        example: 'const enabled = await agent.aiBoolean("按钮是否可点击")',
      },

      // ==================== 高级操作 ====================
      {
        type: 'aiAction',
        label: 'AI 自动规划',
        description: '执行复杂任务，AI 自动规划步骤',
        category: 'advanced',
        params: [
          {
            name: 'prompt',
            label: '任务描述',
            type: 'string',
            required: true,
            placeholder: '例如：填写登录表单并提交',
            description: '任务的自然语言描述，AI 会自动规划执行步骤',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiAction("填写登录表单并提交")',
      },
      {
        type: 'aiLocate',
        label: 'AI 定位',
        description: '定位页面元素',
        category: 'advanced',
        params: [
          {
            name: 'prompt',
            label: '元素描述',
            type: 'string',
            required: true,
            placeholder: '例如：搜索按钮',
          },
        ],
        example: 'const element = await agent.aiLocate("搜索按钮")',
      },

      // ==================== 工具方法 ====================
      {
        type: 'sleep',
        label: '等待',
        description: '等待指定时间',
        category: 'utility',
        params: [
          {
            name: 'ms',
            label: '等待时间(ms)',
            type: 'number',
            required: true,
            placeholder: '毫秒数',
          },
        ],
        example: 'await sleep(1000)',
      },
      {
        type: 'screenshot',
        label: '截图',
        description: '截取当前页面',
        category: 'utility',
        params: [
          {
            name: 'name',
            label: '截图名称',
            type: 'string',
            required: false,
            placeholder: '可选，用于标识',
          },
        ],
        example: 'await agent.screenshot()',
      },
      {
        type: 'logText',
        label: '记录文本',
        description: '记录文本到报告',
        category: 'utility',
        params: [
          {
            name: 'text',
            label: '文本内容',
            type: 'string',
            required: true,
            placeholder: '要记录的文本',
          },
        ],
        example: 'await agent.logText("测试步骤1完成")',
      },
      {
        type: 'logScreenshot',
        label: '记录截图',
        description: '在报告文件中记录当前截图',
        category: 'utility',
        params: [
          {
            name: 'title',
            label: '截图标题',
            type: 'string',
            required: false,
            placeholder: '可选，截图的标题',
            description: '可选，截图的标题，如果未提供，则标题为 "untitled"',
          },
          {
            name: 'content',
            label: '截图描述',
            type: 'string',
            required: false,
            placeholder: '可选，截图的描述内容',
            description: '可选，截图的描述',
          },
        ],
        example: 'await agent.logScreenshot("登录页面", "用户登录后的页面")',
      },

      // ==================== Web 特有操作 ====================
      {
        type: 'javascript',
        label: '执行 JavaScript',
        description: '在页面上下文中执行 JavaScript 代码',
        category: 'web-specific',
        params: [
          {
            name: 'code',
            label: 'JavaScript 代码',
            type: 'string',
            required: true,
            placeholder: '例如：document.title',
            description: '要执行的 JavaScript 代码',
          },
          {
            name: 'name',
            label: '名称',
            type: 'string',
            required: false,
            placeholder: '可选，返回值的名称',
            description:
              '可选，给返回值一个名称，会在 JSON 输出中作为 key 使用',
          },
        ],
        example: 'const title = await agent.javascript("document.title")',
      },
    ],

    windows: [
      // ==================== 基础操作 ====================
      // Windows 支持所有 Web 的基础操作，但不支持 xpath
      {
        type: 'aiTap',
        label: 'AI 点击',
        description: '点击指定元素',
        category: 'basic',
        params: [
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: true,
            placeholder: '例如：开始菜单',
            description: '用自然语言描述要点击的元素',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式（更准确但更慢）',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiTap("开始菜单", { deepThink: true })',
      },
      {
        type: 'aiInput',
        label: 'AI 输入',
        description: '在指定元素输入文本',
        category: 'basic',
        params: [
          {
            name: 'text',
            label: '输入内容',
            type: 'string',
            required: true,
            placeholder: '要输入的文本',
            description: '要输入的文本内容',
          },
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: true,
            placeholder: '例如：搜索框',
            description: '用自然语言描述目标输入框',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiInput("notepad", "搜索框")',
      },
      {
        type: 'aiAssert',
        label: 'AI 断言',
        description: '验证条件是否满足',
        category: 'basic',
        params: [
          {
            name: 'assertion',
            label: '断言条件',
            type: 'string',
            required: true,
            placeholder: '例如：窗口标题包含"记事本"',
            description: '要验证的条件描述',
          },
          {
            name: 'errorMessage',
            label: '错误消息',
            type: 'string',
            required: false,
            placeholder: '可选，断言失败时的错误信息',
            description: '可选，当断言失败时打印的错误信息',
          },
          {
            name: 'name',
            label: '名称',
            type: 'string',
            required: false,
            placeholder: '可选，断言的名称',
            description: '可选，给断言一个名称，会在 JSON 输出中作为 key 使用',
          },
        ],
        example: 'await agent.aiAssert("窗口标题包含\\"记事本\\"")',
      },
      {
        type: 'aiHover',
        label: 'AI 悬停',
        description: '鼠标悬停在指定元素',
        category: 'basic',
        params: [
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: true,
            placeholder: '例如：文件菜单',
            description: '用自然语言描述要悬停的元素',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiHover("文件菜单")',
      },
      {
        type: 'aiScroll',
        label: 'AI 滚动',
        description: '滚动窗口或元素',
        category: 'basic',
        params: [
          {
            name: 'direction',
            label: '滚动方向',
            type: 'string',
            required: true,
            placeholder: 'up/down/left/right',
            description: '滚动方向',
          },
          {
            name: 'scrollType',
            label: '滚动类型',
            type: 'string',
            required: false,
            placeholder: 'once/untilTop/untilBottom/untilLeft/untilRight',
            description: '滚动类型：once 滚动一次，或滚动到顶部/底部/最左/最右',
          },
          {
            name: 'distance',
            label: '滚动距离',
            type: 'number',
            required: false,
            placeholder: '像素值',
            description: '可选，滚动距离，单位为像素',
          },
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: false,
            placeholder: '例如：滚动区域',
            description: '可选，指定要滚动的元素',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example:
          'await agent.aiScroll({ direction: "down", scrollType: "once", distance: 200 })',
      },
      {
        type: 'aiWaitFor',
        label: 'AI 等待条件',
        description: '等待条件满足',
        category: 'basic',
        params: [
          {
            name: 'assertion',
            label: '等待条件',
            type: 'string',
            required: true,
            placeholder: '例如：对话框出现',
            description: '等待的条件描述',
          },
          {
            name: 'timeout',
            label: '超时时间(ms)',
            type: 'number',
            required: false,
            placeholder: '默认 30000',
            description: '超时时间，单位为毫秒',
          },
        ],
        example: 'await agent.aiWaitFor("对话框出现", { timeout: 5000 })',
      },
      {
        type: 'aiKeyboardPress',
        label: 'AI 按键',
        description: '按下键盘按键',
        category: 'basic',
        params: [
          {
            name: 'key',
            label: '按键名称',
            type: 'string',
            required: true,
            placeholder: '例如：Enter, Escape, Tab',
            description: '要按下的键名',
          },
          {
            name: 'locate',
            label: '元素定位（可选）',
            type: 'string',
            required: false,
            placeholder: '例如：输入框',
            description: '可选，在特定元素上按键',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiKeyboardPress("Enter")',
      },
      {
        type: 'aiDoubleClick',
        label: 'AI 双击',
        description: '双击指定元素',
        category: 'basic',
        params: [
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: true,
            placeholder: '例如：文件图标',
            description: '用自然语言描述要双击的元素',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiDoubleClick("文件图标")',
      },
      {
        type: 'aiRightClick',
        label: 'AI 右键',
        description: '右键点击指定元素',
        category: 'basic',
        params: [
          {
            name: 'locate',
            label: '元素定位',
            type: 'string',
            required: true,
            placeholder: '例如：桌面空白处',
            description: '用自然语言描述要右键点击的元素',
          },
          {
            name: 'deepThink',
            label: '深度思考',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否使用深度推理模式',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiRightClick("桌面空白处")',
      },

      // ==================== 查询操作 ====================
      {
        type: 'aiQuery',
        label: 'AI 查询',
        description: 'AI 查询，返回任意类型数据',
        category: 'query',
        params: [
          {
            name: 'demand',
            label: '查询需求',
            type: 'string',
            required: true,
            placeholder: '例如：获取当前窗口标题',
            description: '查询的需求描述，记得在提示词中描述输出结果的格式',
          },
          {
            name: 'name',
            label: '名称',
            type: 'string',
            required: false,
            placeholder: '可选，查询结果的名称',
            description: '可选，查询结果在 JSON 输出中的 key',
          },
        ],
        example: 'const result = await agent.aiQuery("获取当前窗口标题")',
      },
      {
        type: 'aiString',
        label: 'AI 查询字符串',
        description: 'AI 查询，返回字符串',
        category: 'query',
        params: [
          {
            name: 'prompt',
            label: '查询内容',
            type: 'string',
            required: true,
            placeholder: '例如：获取窗口标题',
          },
        ],
        example: 'const title = await agent.aiString("获取窗口标题")',
      },
      {
        type: 'aiNumber',
        label: 'AI 查询数字',
        description: 'AI 查询，返回数字',
        category: 'query',
        params: [
          {
            name: 'prompt',
            label: '查询内容',
            type: 'string',
            required: true,
            placeholder: '例如：获取窗口数量',
          },
        ],
        example: 'const count = await agent.aiNumber("获取窗口数量")',
      },
      {
        type: 'aiBoolean',
        label: 'AI 查询布尔值',
        description: 'AI 查询，返回布尔值',
        category: 'query',
        params: [
          {
            name: 'prompt',
            label: '查询内容',
            type: 'string',
            required: true,
            placeholder: '例如：窗口是否最大化',
          },
        ],
        example: 'const maximized = await agent.aiBoolean("窗口是否最大化")',
      },

      // ==================== 高级操作 ====================
      {
        type: 'aiAction',
        label: 'AI 自动规划',
        description: '执行复杂任务，AI 自动规划步骤',
        category: 'advanced',
        params: [
          {
            name: 'prompt',
            label: '任务描述',
            type: 'string',
            required: true,
            placeholder: '例如：打开记事本并输入文本',
            description: '任务的自然语言描述，AI 会自动规划执行步骤',
          },
          {
            name: 'cacheable',
            label: '可缓存',
            type: 'boolean',
            required: false,
            isOption: true,
            defaultValue: false,
            description: '是否缓存 AI 结果',
          },
        ],
        example: 'await agent.aiAction("打开记事本并输入文本")',
      },
      {
        type: 'aiLocate',
        label: 'AI 定位',
        description: '定位界面元素',
        category: 'advanced',
        params: [
          {
            name: 'prompt',
            label: '元素描述',
            type: 'string',
            required: true,
            placeholder: '例如：关闭按钮',
          },
        ],
        example: 'const element = await agent.aiLocate("关闭按钮")',
      },

      // ==================== 工具方法 ====================
      {
        type: 'sleep',
        label: '等待',
        description: '等待指定时间',
        category: 'utility',
        params: [
          {
            name: 'ms',
            label: '等待时间(ms)',
            type: 'number',
            required: true,
            placeholder: '毫秒数',
          },
        ],
        example: 'await sleep(1000)',
      },
      {
        type: 'screenshot',
        label: '截图',
        description: '截取当前屏幕',
        category: 'utility',
        params: [
          {
            name: 'name',
            label: '截图名称',
            type: 'string',
            required: false,
            placeholder: '可选，用于标识',
          },
        ],
        example: 'await agent.screenshot()',
      },
      {
        type: 'logText',
        label: '记录文本',
        description: '记录文本到报告',
        category: 'utility',
        params: [
          {
            name: 'text',
            label: '文本内容',
            type: 'string',
            required: true,
            placeholder: '要记录的文本',
          },
        ],
        example: 'await agent.logText("测试步骤1完成")',
      },
      {
        type: 'logScreenshot',
        label: '记录截图',
        description: '在报告文件中记录当前截图',
        category: 'utility',
        params: [
          {
            name: 'title',
            label: '截图标题',
            type: 'string',
            required: false,
            placeholder: '可选，截图的标题',
            description: '可选，截图的标题，如果未提供，则标题为 "untitled"',
          },
          {
            name: 'content',
            label: '截图描述',
            type: 'string',
            required: false,
            placeholder: '可选，截图的描述内容',
            description: '可选，截图的描述',
          },
        ],
        example: 'await agent.logScreenshot("窗口截图", "当前窗口状态")',
      },

      // ==================== Windows 特有操作 ====================
      {
        type: 'getClipboard',
        label: '获取剪贴板',
        description: '获取剪贴板内容',
        category: 'windows-specific',
        params: [],
        example: 'const text = await agent.getClipboard()',
      },
      {
        type: 'setClipboard',
        label: '设置剪贴板',
        description: '设置剪贴板内容',
        category: 'windows-specific',
        params: [
          {
            name: 'text',
            label: '剪贴板内容',
            type: 'string',
            required: true,
            placeholder: '要设置的文本',
          },
        ],
        example: 'await agent.setClipboard("Hello World")',
      },
      {
        type: 'getWindowList',
        label: '获取窗口列表',
        description: '获取所有打开的窗口',
        category: 'windows-specific',
        params: [],
        example: 'const windows = await agent.getWindowList()',
      },
      {
        type: 'activateWindow',
        label: '激活窗口',
        description: '激活指定窗口',
        category: 'windows-specific',
        params: [
          {
            name: 'windowHandle',
            label: '窗口句柄',
            type: 'string',
            required: true,
            placeholder: '窗口的句柄ID',
          },
        ],
        example: 'await agent.activateWindow("0x123456")',
      },
    ],
  };

/**
 * 获取指定客户端类型支持的所有 Flow Actions
 */
export function getSupportedFlowActions(
  clientType: ClientType,
): FlowActionType[] {
  return CLIENT_TYPE_FLOW_ACTIONS[clientType].map((config) => config.type);
}

/**
 * 获取指定客户端类型的完整 Flow Action 配置
 */
export function getFlowActionConfigs(
  clientType: ClientType,
): FlowActionConfig[] {
  return CLIENT_TYPE_FLOW_ACTIONS[clientType];
}

/**
 * 检查指定 flow action 是否被客户端类型支持
 */
export function isFlowActionSupported(
  clientType: ClientType,
  actionType: FlowActionType,
): boolean {
  return getSupportedFlowActions(clientType).includes(actionType);
}

/**
 * 获取指定 Flow Action 的配置
 */
export function getFlowActionConfig(
  clientType: ClientType,
  actionType: FlowActionType,
): FlowActionConfig | undefined {
  return CLIENT_TYPE_FLOW_ACTIONS[clientType].find(
    (config) => config.type === actionType,
  );
}

/**
 * 按类别分组 Flow Actions
 */
export function getFlowActionsByCategory(clientType: ClientType) {
  const actions = getFlowActionConfigs(clientType);
  return {
    basic: actions.filter((a) => a.category === 'basic'),
    query: actions.filter((a) => a.category === 'query'),
    advanced: actions.filter((a) => a.category === 'advanced'),
    utility: actions.filter((a) => a.category === 'utility'),
    'web-specific': actions.filter((a) => a.category === 'web-specific'),
    'windows-specific': actions.filter(
      (a) => a.category === 'windows-specific',
    ),
  };
}

/**
 * 获取完整的配置（用于 API 返回）
 */
export function getFullFlowActionConfig() {
  const clientTypes = Object.keys(CLIENT_TYPE_FLOW_ACTIONS) as ClientType[];
  return {
    clientTypes,
    flowActions: CLIENT_TYPE_FLOW_ACTIONS,
  };
}

/**
 * 获取 action 的主要参数（非 options）
 */
export function getMainParams(
  clientType: ClientType,
  actionType: FlowActionType,
) {
  const config = getFlowActionConfig(clientType, actionType);
  if (!config) return [];
  return config.params.filter((p) => !p.isOption);
}

/**
 * 获取 action 的 options 参数
 */
export function getOptionParams(
  clientType: ClientType,
  actionType: FlowActionType,
) {
  const config = getFlowActionConfig(clientType, actionType);
  if (!config) return [];
  return config.params.filter((p) => p.isOption);
}

/**
 * 检查 action 是否有 options 参数
 */
export function hasOptions(clientType: ClientType, actionType: FlowActionType) {
  return getOptionParams(clientType, actionType).length > 0;
}

/**
 * 检查客户端类型是否支持 xpath
 * web 支持，windows 不支持
 */
export function supportsXPath(clientType: ClientType): boolean {
  return clientType === 'web';
}
