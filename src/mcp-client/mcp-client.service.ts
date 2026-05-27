import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {
  private client: Client | undefined;
  private transport: StdioClientTransport | undefined;
  // ── 模块启动时连接 MCP Server ──────────────────────
  async onModuleInit() {
    this.client = new Client(
      { name: 'mcp-client', version: '1.0.0' },
      { capabilities: {} },
    );
    // stdio 模式：NestJS 以子进程方式启动 MCP Server
    this.transport = new StdioClientTransport({
      command: 'ts-node',
      args: ['src/mcp-server/server.ts'],
      // 把当前环境变量传给子进程（包含 DATABASE_URL 等）
      env: Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(process.env).filter(([_, v]) => v !== undefined),
      ) as Record<string, string>,
    });
    await this.client.connect(this.transport);
    console.log('✅ MCP Client 已连接到 MCP Server');
  }
  async listTools() {
    const res = await this.client!.listTools();
    return res.tools.map((tool) => ({
      toolName: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }
  // ── 调用指定工具 ──────────────────────────────────
  async callTool(toolName: string, args: Record<string, any>) {
    const response = await this.client!.callTool({
      name: toolName,
      arguments: args,
    });

    // 🔥 类型守卫：确保 content 是合法的文本内容数组
    const isTextContent = (
      content: unknown,
    ): content is { type: 'text'; text: string }[] => {
      return (
        Array.isArray(content) &&
        content.every(
          (item) =>
            typeof item === 'object' &&
            item !== null &&
            'type' in item &&
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            item.type === 'text' &&
            'text' in item &&
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            typeof item.text === 'string',
        )
      );
    };

    // 安全获取
    const content = isTextContent(response.content) ? response.content : [];
    const textContent = content.find((c) => c.type === 'text');
    return {
      tool: toolName,
      result: textContent?.text ?? '工具无返回内容',
      isError: response.isError ?? false,
    };
  }
  // ── 应用退出时断开连接 ─────────────────────────────
  async onModuleDestroy() {
    await this.client!.close();
    console.log('MCP Client 已断开连接');
  }
}
