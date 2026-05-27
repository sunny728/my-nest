import * as path from 'path';
import * as fs from 'fs';
// 安全根目录（只允许读写这个目录下的文件）
const SAFE_ROOT = process.cwd();

function resolveSafePath(filePath: string) {
  // 防止路径穿越攻击（如 ../../etc/passwd）
  const resolved = path.resolve(SAFE_ROOT, filePath);
  if (!resolved.startsWith(SAFE_ROOT)) {
    throw new Error(`不允许访问项目目录外的文件：${filePath}`);
  }
  return resolved;
}
// eslint-disable-next-line @typescript-eslint/require-await
export async function handleFileOperation(
  operation,
  args: { path: string; content?: string },
) {
  if (operation === 'read') {
    const { path } = args;
    const fullPath = resolveSafePath(path);
    if (!fs.existsSync(fullPath)) {
      return `文件不存在：${path}`;
    }
    const stat = fs.statSync(fullPath);
    if (stat.size > 100 * 1024) {
      // 文件超过 100KB，只返回前 2000 字符
      const content = fs.readFileSync(path, 'utf-8');
      return `文件较大，只返回前 2000 字符：\n\n${content.slice(0, 2000)}\n\n...(文件共 ${stat.size} 字节)`;
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    return `文件内容（${path}）：\n\n${content}`;
  }
  if (operation === 'write') {
    const { path: filePath, content } = args;
    const fullPath = resolveSafePath(filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.appendFileSync(fullPath, content ?? '', 'utf-8');
    return `已成功写入 ${content?.length} 个字符到 ${filePath}`;
  }
  throw new Error(`不支持的操作：${operation}`);
}
