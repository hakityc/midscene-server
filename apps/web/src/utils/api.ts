/**
 * API 调用工具函数
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * 获取最新的 report 文件信息
 */
export async function getLatestReport(): Promise<{
  fileName: string;
  filePath: string;
  timestamp: number;
}> {
  const response = await fetch(`${API_BASE_URL}/api/report/latest`);

  if (!response.ok) {
    throw new Error('获取 report 文件失败');
  }

  return response.json();
}

/**
 * 获取 report 文件的访问 URL
 */
export function getReportFileUrl(fileName: string): string {
  return `${API_BASE_URL}/api/report/file/${fileName}`;
}

/**
 * 获取所有 report 文件列表
 */
export async function getReportList(): Promise<{
  total: number;
  files: Array<{
    name: string;
    path: string;
    mtime: number;
    size: number;
  }>;
}> {
  const response = await fetch(`${API_BASE_URL}/api/report/list`);

  if (!response.ok) {
    throw new Error('获取 report 文件列表失败');
  }

  return response.json();
}
