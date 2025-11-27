import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { serverLogger } from './logger';

const execAsync = promisify(exec);

/**
 * 检测端口是否被占用
 * @param port 端口号
 * @returns 如果端口被占用，返回占用该端口的进程 PID 数组；否则返回空数组
 */
async function checkPortInUse(port: number): Promise<string[]> {
  try {
    // 使用更宽松的检测，不限制状态，同时检测 IPv4 和 IPv6
    const { stdout } = await execAsync(`lsof -i :${port} -t`);
    const pids = stdout
      .trim()
      .split('\n')
      .filter((pid) => pid.length > 0);
    return pids;
  } catch {
    // lsof 在端口未被占用时会返回错误，这是正常情况
    return [];
  }
}

/**
 * 获取占用端口的进程信息
 * @param port 端口号
 * @returns 进程信息字符串
 */
async function getPortProcessInfo(port: number): Promise<string> {
  try {
    const { stdout } = await execAsync(`lsof -i :${port} -P -n`);
    return stdout.trim();
  } catch {
    return '无法获取进程信息';
  }
}

/**
 * 杀死占用端口的进程
 * @param pid 进程 ID
 * @returns 是否成功杀死进程
 */
async function killProcess(pid: string): Promise<boolean> {
  try {
    // 先尝试优雅地关闭进程（SIGTERM）
    await execAsync(`kill ${pid}`);

    // 等待一小段时间，让进程有机会优雅退出
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 检查进程是否还在运行
    try {
      await execAsync(`ps -p ${pid}`);
      // 如果进程还在运行，强制杀死（SIGKILL）
      serverLogger.warn({ pid }, '进程未响应 SIGTERM，使用 SIGKILL 强制终止');
      await execAsync(`kill -9 ${pid}`);
    } catch {
      // 进程已经不存在，说明 SIGTERM 成功了
    }

    return true;
  } catch (error) {
    serverLogger.error({ pid, error }, '终止进程失败');
    return false;
  }
}

/**
 * 批量杀死进程
 * @param pids 进程 ID 数组
 * @returns 是否全部成功
 */
async function killProcesses(pids: string[]): Promise<boolean> {
  if (pids.length === 0) {
    return true;
  }

  const results = await Promise.all(pids.map((pid) => killProcess(pid)));
  return results.every((result) => result);
}

/**
 * 确保端口可用，如果被占用则释放
 * @param port 端口号
 * @param maxRetries 最大重试次数
 * @returns 端口是否可用
 */
export async function ensurePortAvailable(
  port: number,
  maxRetries = 3,
): Promise<boolean> {
  serverLogger.debug({ port }, '检查端口占用情况');

  for (let retry = 0; retry < maxRetries; retry++) {
    const pids = await checkPortInUse(port);

    if (pids.length === 0) {
      serverLogger.debug({ port }, '端口可用');
      return true;
    }

    // 端口被占用，获取详细信息
    const processInfo = await getPortProcessInfo(port);
    serverLogger.debug(
      { port, pids, processInfo },
      `端口 ${port} 被 ${pids.length} 个进程占用: ${pids.join(', ')}`,
    );

    // 尝试终止占用端口的进程
    serverLogger.debug({ pids }, '正在终止占用端口的进程');
    const killed = await killProcesses(pids);

    if (!killed) {
      serverLogger.error({ port, pids }, '部分进程无法终止');
      if (retry < maxRetries - 1) {
        serverLogger.debug(
          `将在 2 秒后重试 (${retry + 1}/${maxRetries - 1})`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      return false;
    }

    // 等待一段时间确保端口完全释放
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 再次检查端口是否已释放
    const stillInUse = await checkPortInUse(port);
    if (stillInUse.length > 0) {
      serverLogger.debug(
        { port, pids: stillInUse },
        `端口仍被占用: ${stillInUse.join(', ')}`,
      );
      if (retry < maxRetries - 1) {
        serverLogger.debug(
          `将在 2 秒后重试 (${retry + 1}/${maxRetries - 1})`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      serverLogger.error(
        { port, pids: stillInUse },
        '端口仍被占用，无法释放',
      );
      return false;
    }

    serverLogger.debug({ port, pids }, '成功释放端口');
    return true;
  }

  return false;
}
