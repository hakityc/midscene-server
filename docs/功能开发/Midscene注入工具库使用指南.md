# Midscene 注入工具库使用指南

本文档记录了注入到 Midscene 浏览器环境中的自定义工具方法（`custom-utils.ts`）。这些方法会自动注入到目标页面，挂载在 `window` 对象上，带有 `LEBO_` 前缀，旨在简化自动化脚本编写并提供健壮的错误处理。

## 注入机制

* **源文件**: `midscene/packages/web-integration/src/chrome-extension/custom-utils.ts`
* **触发时机**: 在 `ChromeExtensionProxyPage` 连接页面或刷新页面时自动注入。
* **命名空间**: 所有方法均挂载在全局 `window` 对象下，前缀为 `LEBO_`。

## API 详解

### 1. `window.LEBO_shortcutKey(key, ctrl, shift, alt, target)`

模拟键盘快捷键操作。

**参数:**

* `key` (string): 键名，如 'Enter', 'a', 'ArrowDown' 等。支持 `KeyA` 或 `Digit1` 格式，也支持直接字符。
* `ctrl` (boolean, 可选): 是否按下 Ctrl 键 (Mac 上对应 Meta/Command 键)。默认 `false`。
* `shift` (boolean, 可选): 是否按下 Shift 键。默认 `false`。
* `alt` (boolean, 可选): 是否按下 Alt 键。默认 `false`。
* `target` (HTMLElement, 可选): 接收事件的目标元素。默认为 `document`。

**错误处理:**

* 如果 `target` 无效或不支持 `dispatchEvent`，抛出错误：`LEBO_shortcutKey: Target element is invalid or does not support dispatchEvent. Key: {key}`。

---

### 2. `window.LEBO_insertSingleLine(el, text, opts)`

在 `contentEditable` 元素中插入文本。通常用于富文本编辑器。

**参数:**

* `el` (HTMLElement): 目标元素，必须是 `contentEditable="true"`。
* `text` (string): 要插入的文本内容。
* `opts` (object, 可选):
  * `clearFirst` (boolean): 是否先清空已有内容。默认 `true`。
  * `placeAtEnd` (boolean): `clearFirst` 为 `false` 时，是否追加到末尾。默认 `false`。

**错误处理:**

* 如果 `el` 为空，抛出 `LEBO_insertSingleLine: Target element is null or undefined.`。
* 如果 `el` 不是可编辑元素，抛出 `LEBO_insertSingleLine: Target element is not contentEditable...`。
* 内部使用 `document.execCommand('insertText')`，如果失败会打印警告。

---

### 3. `window.LEBO_setInputValue(el, value)`

设置 `<input>` 或 `<textarea>` 的值，并触发 `input` 和 `change` 事件，以确保 React/Vue 等框架能感知到变化。

**参数:**

* `el` (HTMLElement): 目标输入框元素。
* `value` (string): 要设置的值。

**错误处理:**

* 如果 `el` 为空，抛出错误。
* 如果 `el` 不是 Input 或 Textarea 元素，抛出类型错误。

---

### 4. `window.LEBO_Flow()`

创建一个链式调用的流程控制对象，支持异步等待和操作。

**返回值:** `Flow` 对象，包含以下链式方法：

* `.wait(ms)`: 等待指定毫秒数。
* `.do(fn)`: 执行一个函数（支持 async）。如果函数抛错，流程终止。
* `.click(selOrEl)`: 点击元素。
  * `selOrEl`: 选择器字符串或 DOM 元素。如果传字符串，会自动等待元素出现。
* `.waitFor(sel, opts)`: 等待元素出现。
  * `sel`: 选择器字符串。
  * `opts`: `{ timeout: 4000, interval: 50 }`。
* `.typeCE(elOrSel, text, opt)`: 在可编辑元素中输入（封装了 `LEBO_insertSingleLine`）。
* `.key(key, ...rest)`: 发送按键（封装了 `LEBO_shortcutKey`）。
* `.run()`: **终结方法**。开始执行链式任务并返回 Promise。

**错误处理:**

* 链中任何一步失败（如元素找不到、超时、执行报错），都会中断后续步骤，并将错误向上传递给 `.run()` 的调用者。
* 错误信息会包含具体的失败原因（如 "Timeout waiting for selector..."）。

## 使用示例

```javascript
(async () => {
  const flow = window.LEBO_Flow();

  try {
    await flow
      .wait(1000)
      // 查找并点击
      .click('.my-button')
      // 等待输入框出现
      .waitFor('#search-input')
      // 输入内容
      .do(() => {
        const input = document.querySelector('#search-input');
        window.LEBO_setInputValue(input, 'Hello World');
      })
      // 快捷键提交
      .key('Enter')
      .run();
      
    console.log('流程执行成功');
  } catch (e) {
    console.error('流程失败:', e.message);
  }
})();
```
