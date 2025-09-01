import { AgentOverChromeBridge } from "@midscene/web/bridge-mode";
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 定义任务步骤接口
interface TaskStep {
  name: string;
  action: string;
  waitTime?: number;
  assertion?: string;
}

// 定义任务配置
const searchTask: TaskStep[] = [
  {
    name: "打开百度",
    action: "打开网页 https://www.baidu.com",
    waitTime: 3000
  },
  {
    name: "搜索AI",
    action: "搜索AI",
    waitTime: 3000
  },
  {
    name: "点击第一条搜索结果",
    action: "点击第一条搜索结果",
    waitTime: 3000,
    assertion: "页面应该显示搜索结果详情"
  }
];

// 执行任务的函数
async function executeTask(agent: AgentOverChromeBridge, steps: TaskStep[]) {
  console.log("开始执行任务...");

  for (const step of steps) {
    try {
      console.log(`执行步骤: ${step.name}`);

      // 执行 AI 动作
      await agent.aiAction(step.action);

      // 等待指定时间
      if (step.waitTime) {
        console.log(`等待 ${step.waitTime}ms...`);
        await sleep(step.waitTime);
      }

      // 如果有断言，执行验证
      if (step.assertion) {
        console.log(`验证: ${step.assertion}`);
        // 这里可以添加具体的验证逻辑
      }

      console.log(`步骤 "${step.name}" 完成`);

    } catch (error) {
      console.error(`步骤 "${step.name}" 执行失败:`, error);
      throw error;
    }
  }

  console.log("所有任务步骤执行完成");
}

export const start = Promise.resolve(
  (async () => {
    const agent = new AgentOverChromeBridge();

    try {
      // 连接到新的 Chrome 标签页
      console.log("正在连接到 Chrome 新标签页...");
      await agent.connectNewTabWithUrl("https://www.bing.com");
      console.log("成功连接到 Chrome");

      // 执行搜索任务
      await executeTask(agent, searchTask);

      console.log("任务执行完成");

    } catch (error) {
      console.error("任务执行过程中发生错误:", error);
    } finally {
      // 清理资源
      await agent.destroy();
      console.log("代理已销毁");
    }
  })()
);