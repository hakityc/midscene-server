# Windows Midscene 解耦方案研究

## 一、现有平台解耦架构分析

### 1.1 核心架构（@midscene/core）

**核心抽象层**：

```typescript
// AbstractInterface - 所有平台必须实现的抽象接口
abstract class AbstractInterface {
  abstract interfaceType: string;
  abstract screenshotBase64(): Promise<string>;
  abstract size(): Promise<Size>;
  abstract actionSpace(): DeviceAction[] | Promise<DeviceAction[]>;
  abstract destroy?(): Promise<void>;
  abstract describe?(): string;
  // ... 其他可选方法
}

// Agent - 泛型代理类
class Agent<InterfaceType extends AbstractInterface = AbstractInterface> {
  interface: InterfaceType;
  // ... 核心逻辑
}
```

**动作定义系统**：

- `defineAction` - 通用动作定义工厂函数
- `defineActionTap`, `defineActionScroll` 等 - 预定义标准动作
- 每个平台通过 `actionSpace()` 返回支持的动作列表

### 1.2 Android 包解耦架构（@midscene/android）

**包结构**：

```
@midscene/android/
├── src/
│   ├── agent.ts       # AndroidAgent 继承 Agent<AndroidDevice>
│   ├── device.ts      # AndroidDevice 实现 AbstractInterface
│   ├── utils.ts       # 工具函数
│   └── index.ts       # 导出接口
├── bin/               # 二进制工具（yadb）
└── package.json
```

**关键特性**：

1. **设备实现**：

   ```typescript
   export class AndroidDevice implements AbstractInterface {
     interfaceType: InterfaceType = 'android';
     
     actionSpace(): DeviceAction<any>[] {
       return [
         defineActionTap(async (param) => { /* 实现 */ }),
         defineAction({
           name: 'AndroidBackButton',
           description: 'Trigger the system "back" operation',
           paramSchema: z.object({}),
           call: async () => { await this.back(); }
         }),
         // ... 其他 Android 特有动作
       ];
     }
   }
   ```

2. **Agent 实现**：

   ```typescript
   export class AndroidAgent extends PageAgent<AndroidDevice> {
     async launch(uri: string): Promise<void> {
       await this.page.launch(uri);
     }
   }
   ```

3. **依赖关系**：
   - `@midscene/core` - 核心抽象
   - `@midscene/shared` - 共享工具
   - `appium-adb` - ADB 通信层

### 1.3 iOS 包解耦架构（@midscene/ios）

**包结构**：

```
@midscene/ios/
├── src/
│   ├── agent.ts              # IOSAgent 继承 Agent<IOSDevice>
│   ├── device.ts             # IOSDevice 实现 AbstractInterface
│   ├── ios-webdriver-client.ts  # WDA 客户端封装
│   ├── utils.ts              # 工具函数
│   └── index.ts              # 导出接口
└── package.json
```

**关键特性**：

1. **使用 WebDriverAgent**：通过 `@midscene/webdriver` 包封装 WDA 通信
2. **依赖关系**：
   - `@midscene/core` - 核心抽象
   - `@midscene/shared` - 共享工具
   - `@midscene/webdriver` - WebDriver 通信层

### 1.4 Web Integration 包（@midscene/web）

**包结构**：

```
@midscene/web/
├── src/
│   ├── web-page.ts           # WebPage 基类
│   ├── puppeteer/            # Puppeteer 集成
│   ├── playwright/           # Playwright 集成
│   ├── chrome-extension/     # Chrome Extension 集成
│   ├── bridge-mode/          # Bridge 模式
│   └── static/               # 静态页面
```

**特点**：

- 通过继承 `WebPage` 实现不同浏览器驱动的适配
- 支持多种集成方式（Puppeteer、Playwright、Chrome Extension）

---

## 二、Windows 解耦方案设计

### 2.1 推荐架构：独立包方案

参考 Android 和 iOS 的设计，创建独立的 `@midscene/windows` 包。

**包结构**：

```
packages/windows/
├── src/
│   ├── index.ts              # 导出接口
│   ├── agent.ts              # WindowsAgent 继承 Agent<WindowsDevice>
│   ├── device.ts             # WindowsDevice 实现 AbstractInterface
│   ├── windows-client.ts     # Windows 自动化客户端封装
│   └── utils.ts              # 工具函数
├── tests/                    # 测试文件
├── demo/                     # 示例代码
├── bin/                      # 可选的二进制工具
├── package.json
├── tsconfig.json
└── README.md
```

### 2.2 核心实现

#### 2.2.1 WindowsDevice 实现

```typescript
// src/device.ts
import {
  type DeviceAction,
  type InterfaceType,
  type Size,
  getMidsceneLocationSchema,
  z,
} from '@midscene/core';
import {
  AbstractInterface,
  defineActionTap,
  defineActionDoubleClick,
  defineActionScroll,
  defineAction,
  // ... 其他标准动作
} from '@midscene/core/device';

export type WindowsDeviceOpt = {
  // Windows 特定选项
  automationBackend?: 'uiautomation' | 'win32' | 'accessibility';
  windowHandle?: string;
  customActions?: DeviceAction<any>[];
};

export class WindowsDevice implements AbstractInterface {
  interfaceType: InterfaceType = 'windows';
  private options?: WindowsDeviceOpt;
  private client: WindowsAutomationClient; // 待实现的自动化客户端
  
  constructor(options?: WindowsDeviceOpt) {
    this.options = options;
    // 初始化 Windows 自动化客户端
  }

  async connect(): Promise<void> {
    // 连接到 Windows 自动化后端
  }

  async screenshotBase64(): Promise<string> {
    // 截图实现
  }

  async size(): Promise<Size> {
    // 获取窗口/屏幕尺寸
  }

  actionSpace(): DeviceAction<any>[] {
    const defaultActions = [
      // 标准动作
      defineActionTap(async (param) => {
        const element = param.locate;
        await this.click(element.center[0], element.center[1]);
      }),
      
      defineActionDoubleClick(async (param) => {
        const element = param.locate;
        await this.doubleClick(element.center[0], element.center[1]);
      }),
      
      defineActionScroll(async (param) => {
        // 滚动实现
      }),
      
      // Windows 特有动作
      defineAction({
        name: 'WindowsHotkey',
        description: 'Execute Windows hotkey combination (e.g., Win+D, Alt+Tab)',
        paramSchema: z.object({
          keys: z.array(z.string()).describe('Key combination to press'),
        }),
        call: async (param) => {
          await this.sendHotkey(param.keys);
        },
      }),
      
      defineAction({
        name: 'WindowsContextMenu',
        description: 'Open context menu at specified location',
        paramSchema: z.object({
          locate: getMidsceneLocationSchema().describe('Element to right-click'),
        }),
        call: async (param) => {
          await this.rightClick(param.locate.center[0], param.locate.center[1]);
        },
      }),
      
      defineAction({
        name: 'WindowsMinimize',
        description: 'Minimize the current window',
        paramSchema: z.object({}),
        call: async () => {
          await this.minimizeWindow();
        },
      }),
      
      defineAction({
        name: 'WindowsMaximize',
        description: 'Maximize the current window',
        paramSchema: z.object({}),
        call: async () => {
          await this.maximizeWindow();
        },
      }),
    ];

    const customActions = this.options?.customActions || [];
    return [...defaultActions, ...customActions];
  }

  // Windows 特定方法
  private async click(x: number, y: number): Promise<void> {
    // 实现鼠标点击
  }

  private async doubleClick(x: number, y: number): Promise<void> {
    // 实现双击
  }

  private async rightClick(x: number, y: number): Promise<void> {
    // 实现右键点击
  }

  private async sendHotkey(keys: string[]): Promise<void> {
    // 实现快捷键发送
  }

  private async minimizeWindow(): Promise<void> {
    // 最小化窗口
  }

  private async maximizeWindow(): Promise<void> {
    // 最大化窗口
  }

  async destroy(): Promise<void> {
    // 清理资源
  }
}
```

#### 2.2.2 WindowsAgent 实现

```typescript
// src/agent.ts
import { type AgentOpt, Agent as PageAgent } from '@midscene/core/agent';
import { WindowsDevice, type WindowsDeviceOpt } from './device';

type WindowsAgentOpt = AgentOpt;

export class WindowsAgent extends PageAgent<WindowsDevice> {
  async launch(target: string): Promise<void> {
    // target 可以是应用程序路径、窗口句柄等
    const device = this.page;
    await device.connect();
  }
}

export async function agentFromWindowsDevice(
  opts?: WindowsAgentOpt & WindowsDeviceOpt,
): Promise<WindowsAgent> {
  const device = new WindowsDevice({
    automationBackend: opts?.automationBackend,
    windowHandle: opts?.windowHandle,
    customActions: opts?.customActions,
  });

  await device.connect();

  return new WindowsAgent(device, opts);
}
```

#### 2.2.3 导出接口

```typescript
// src/index.ts
export { WindowsDevice, type WindowsDeviceOpt } from './device';
export { WindowsAgent, agentFromWindowsDevice } from './agent';
export { overrideAIConfig } from '@midscene/shared/env';
```

### 2.3 自动化后端选择

#### 方案 A：使用 Windows UI Automation（推荐）

- **库**：使用 Node.js 的 Windows UI Automation 绑定
- **优点**：官方支持，功能完整
- **缺点**：需要 native 模块

#### 方案 B：使用 RobotJS/nut.js

- **库**：`robotjs` 或 `@nut-tree/nut-js`
- **优点**：跨平台，易于使用
- **缺点**：功能相对基础

#### 方案 C：使用 Appium WinAppDriver

- **库**：通过 `appium-windows-driver`
- **优点**：成熟的自动化框架
- **缺点**：需要额外的服务进程

#### 方案 D：混合方案（推荐）

- 基础操作：使用 RobotJS/nut.js
- 高级功能：集成 UI Automation
- 灵活性：通过 `automationBackend` 选项切换

### 2.4 package.json 配置

```json
{
  "name": "@midscene/windows",
  "version": "0.1.0",
  "description": "Windows automation library for Midscene",
  "keywords": [
    "Windows UI automation",
    "Windows AI testing",
    "Windows automation library",
    "Desktop automation"
  ],
  "main": "./dist/lib/index.js",
  "module": "./dist/es/index.mjs",
  "types": "./dist/types/index.d.ts",
  "files": ["dist", "bin", "README.md"],
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/es/index.mjs",
      "require": "./dist/lib/index.js"
    },
    "./package.json": "./package.json"
  },
  "scripts": {
    "dev": "npm run build:watch",
    "build": "rslib build",
    "build:watch": "rslib build --watch",
    "playground": "DEBUG=midscene:* tsx demo/playground.ts",
    "test": "vitest --run",
    "test:ai": "AI_TEST_TYPE=windows npm run test"
  },
  "dependencies": {
    "@midscene/core": "workspace:*",
    "@midscene/shared": "workspace:*",
    "@nut-tree/nut-js": "^4.2.0"
  },
  "devDependencies": {
    "@rslib/core": "^0.11.2",
    "@types/node": "^18.0.0",
    "dotenv": "^16.4.5",
    "typescript": "^5.8.3",
    "tsx": "^4.19.2",
    "vitest": "3.0.5"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "os": ["win32"],
  "license": "MIT"
}
```

---

## 三、与其他平台的对比

| 特性 | Android | iOS | Windows（推荐方案） |
|------|---------|-----|---------------------|
| **包名** | `@midscene/android` | `@midscene/ios` | `@midscene/windows` |
| **Device 类** | `AndroidDevice` | `IOSDevice` | `WindowsDevice` |
| **Agent 类** | `AndroidAgent` | `IOSAgent` | `WindowsAgent` |
| **底层通信** | `appium-adb` | `@midscene/webdriver` + WDA | `@nut-tree/nut-js` / UI Automation |
| **特有动作** | Back, Home, RecentApps | iOS 手势 | Hotkey, ContextMenu, Window 操作 |
| **依赖数量** | 3个 | 3个 | 3个 |
| **平台限制** | 需要 ADB | 需要 WDA | 仅支持 Windows |

---

## 四、实施步骤

### 阶段一：基础架构（1-2周）

1. ✅ 创建 `packages/windows` 目录结构
2. ✅ 实现 `WindowsDevice` 基本框架
3. ✅ 实现 `WindowsAgent` 封装
4. ✅ 集成基础自动化库（如 `@nut-tree/nut-js`）

### 阶段二：核心功能（2-3周）

1. ✅ 实现标准动作（Tap, DoubleClick, Scroll, Input 等）
2. ✅ 实现截图功能
3. ✅ 实现窗口尺寸获取
4. ✅ 添加 Windows 特有动作（Hotkey, ContextMenu 等）

### 阶段三：测试与优化（1-2周）

1. ✅ 编写单元测试
2. ✅ 编写 AI 集成测试
3. ✅ 性能优化
4. ✅ 文档完善

### 阶段四：高级功能（可选）

1. ⏳ 集成 UI Automation 支持
2. ⏳ 支持多窗口管理
3. ⏳ 支持桌面应用程序启动与管理
4. ⏳ 添加更多 Windows 特定功能

---

## 五、示例代码

### 5.1 基础使用

```typescript
import { agentFromWindowsDevice } from '@midscene/windows';

async function main() {
  // 创建 Windows Agent
  const agent = await agentFromWindowsDevice({
    automationBackend: 'nut-js',
  });

  // 执行自动化任务
  await agent.aiAction('打开计算器应用');
  await agent.aiAction('输入 123 + 456 并按等号');
  
  // 提取数据
  const result = await agent.aiQuery('获取计算结果');
  console.log('计算结果:', result);

  // 断言
  await agent.aiAssert('结果显示为 579');

  // 清理
  await agent.destroy();
}

main();
```

### 5.2 高级用法

```typescript
import { WindowsDevice, WindowsAgent } from '@midscene/windows';

async function advancedExample() {
  // 自定义设备配置
  const device = new WindowsDevice({
    automationBackend: 'uiautomation',
    customActions: [
      {
        name: 'CustomScreenshotWithDelay',
        description: 'Take screenshot after delay',
        paramSchema: z.object({
          delayMs: z.number().describe('Delay in milliseconds'),
        }),
        call: async (param) => {
          await new Promise(resolve => setTimeout(resolve, param.delayMs));
          return await device.screenshotBase64();
        },
      },
    ],
  });

  await device.connect();

  const agent = new WindowsAgent(device, {
    cacheId: 'windows-test',
    useCache: true,
  });

  // 使用自定义动作
  await agent.aiAction('等待 2 秒后截图', {
    actionName: 'CustomScreenshotWithDelay',
    params: { delayMs: 2000 },
  });

  await agent.destroy();
}
```

---

## 六、关键优势

### 6.1 完全解耦

- Windows 特定代码完全独立在 `@midscene/windows` 包中
- 不影响核心包和其他平台包
- 可独立版本发布和维护

### 6.2 一致的 API

- 与 Android、iOS 保持相同的 API 设计
- 用户学习成本低
- 便于跨平台开发

### 6.3 灵活扩展

- 支持自定义动作
- 支持多种自动化后端
- 易于添加 Windows 特有功能

### 6.4 易于维护

- 清晰的代码结构
- 完善的类型定义
- 独立的测试覆盖

---

## 七、潜在挑战与解决方案

### 挑战 1：Native 依赖

**问题**：某些自动化库需要 native 模块（如 RobotJS）
**解决方案**：

- 提供纯 JS 的备选方案（如 nut.js）
- 提供预编译的二进制文件
- 详细的安装文档

### 挑战 2：Windows 版本兼容性

**问题**：不同 Windows 版本 API 可能不同
**解决方案**：

- 版本检测和兼容性处理
- 明确支持的 Windows 版本范围
- 提供降级方案

### 挑战 3：权限问题

**问题**：某些操作可能需要管理员权限
**解决方案**：

- 在文档中明确说明权限要求
- 提供权限检测工具
- 优雅处理权限错误

---

## 八、总结

推荐采用**独立包方案**，创建 `@midscene/windows` 包，完全参照 Android 和 iOS 的架构设计：

1. **核心设计**：
   - `WindowsDevice implements AbstractInterface`
   - `WindowsAgent extends Agent<WindowsDevice>`
   - 通过 `actionSpace()` 定义支持的动作

2. **技术栈**：
   - 基础：`@nut-tree/nut-js` 或 `robotjs`
   - 高级：可选集成 Windows UI Automation
   - 依赖：`@midscene/core` + `@midscene/shared`

3. **优势**：
   - ✅ 完全解耦，不影响其他包
   - ✅ 一致的 API 设计
   - ✅ 易于维护和扩展
   - ✅ 支持自定义动作和后端

这个方案既保持了架构的一致性，又提供了足够的灵活性来适应 Windows 平台的特殊需求。
