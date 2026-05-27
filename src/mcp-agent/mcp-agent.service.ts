import { ChatOllama } from '@langchain/ollama';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { Config } from 'src/config';
import { DynamicStructuredTool } from '@langchain/core/tools';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';

@Injectable()
export class McpAgentService implements OnModuleInit, OnModuleDestroy {
  private llm = new ChatOllama({
    model: Config.ollama.chatModel,
    baseUrl: Config.ollama.host,
    temperature: 0.1,
    think: false,
    numPredict: 1024,
  });
  // MultiServerMCPClient：同时连接多个 MCP Server
  private mcpClient: MultiServerMCPClient | undefined;

  // 从 MCP 转换来的 LangChain Tools
  private mcpTools: DynamicStructuredTool[] = [];

  // ── 模块启动时初始化 MCP 连接 ─────────────────────
  async onModuleInit() {
    // 连接配置：可以同时连接多个 MCP Server
    this.mcpClient = new MultiServerMCPClient({
      mcpServers: {
        // 自定义的本地 MCP Server（stdio 模式）
        'local-tools': {
          transport: 'stdio',
          command: 'ts-node',
          args: ['src/mcp-server/server.ts'],
          env: { ...process.env } as Record<string, string>,
        },

        // 也可以连接社区现成的 MCP Server（举例，需要单独安装）
        // filesystem: {
        //   transport: 'stdio',
        //   command: 'npx',
        //   args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        // },
      },
    });
    this.mcpTools = await this.mcpClient.getTools();
    console.log(`✅ MCP Agent 已加载 ${this.mcpTools.length} 个工具：`);
    this.mcpTools.forEach((t) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      console.log(`   - ${t.name}: ${t.description?.slice(0, 50)}`),
    );
  }
  listMcpTools() {
    return this.mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
  }
  // ── Agent 执行（LLM 自主决策调用 MCP 工具）─────────
  async runAgent(userMessage: string) {
    const llmWithTools = this.llm.bindTools(this.mcpTools);
    const toolMap = Object.fromEntries(
      this.mcpTools.map((tool) => [tool.name, tool]),
    );

    const messages: BaseMessage[] = [
      new SystemMessage(`你是一个智能助手，可以使用以下工具帮助用户：
      - query_users：查询用户数据库
      - read_file：读取项目文件
      - write_file：写入文件
      - get_weather：查询城市天气

      根据用户的问题，选择合适的工具获取信息后回答。用中文回答。`),
      new HumanMessage(userMessage),
    ];

    const steps: string[] = [];
    let roundCount = 0;
    while (roundCount < 6) {
      roundCount++;
      const response = await llmWithTools.invoke(messages);
      messages.push(response);
      if (!response.tool_calls?.length) {
        steps.push(`💬 [最终回答] ${response.text}`);
        break;
      }
      for (const toolCall of response.tool_calls) {
        steps.push(
          `🔧 [调用MCP工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`,
        );
        const toolFn = toolMap[toolCall.name];
        if (!toolFn) {
          const errMsg = `工具不存在: ${toolCall.name}`;
          steps.push(`[错误]：${errMsg}`);
          messages.push(
            new ToolMessage({
              content: errMsg,
              tool_call_id: toolCall.id ?? '',
            }),
          );
          continue;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const result = await toolFn.invoke(toolCall.args);
        steps.push(`✅ [工具结果] ${String(result).slice(0, 200)}`);

        messages.push(
          new ToolMessage({
            content: String(result),
            tool_call_id: toolCall.id ?? '',
          }),
        );
      }
      const lastAI = [...messages]
        .reverse()
        .find((m) => m instanceof AIMessage);

      return {
        userMessage,
        steps,
        totalRounds: roundCount,
        answer: lastAI?.content ?? '抱歉，无法完成请求',
      };
    }
  }

  // src/mcp-agent/mcp-agent.service.ts 里追加以下方法

  // ── 综合业务场景：电商配送助手 ────────────────────────
  async runShoppingAssistant(userMessage: string) {
    const llmWithTools = this.llm.bindTools(this.mcpTools);
    const toolMap = Object.fromEntries(this.mcpTools.map((t) => [t.name, t]));

    const messages: any[] = [
      new SystemMessage(
        `你是「极速购」电商平台的智能配送助手。
  你可以使用以下工具帮助用户：
  - query_users：查询用户信息和收货地址
  - get_weather：查询配送地区天气，判断是否适合配送
  - read_file：读取产品说明书或配送政策文件

  工作原则：
  1. 先确认用户信息，再查配送地区天气
  2. 雨天/恶劣天气提醒用户可能延迟
  3. 基于实际情况给出配送预估
  4. 回答简洁友好，使用中文`,
      ),
      new HumanMessage(userMessage),
    ];

    const steps: string[] = [];

    for (let i = 0; i < 6; i++) {
      const response = await llmWithTools.invoke(messages);
      messages.push(response);

      if (!response.tool_calls?.length) {
        steps.push(`💬 [最终回答] ${response.text}`);
        break;
      }

      for (const toolCall of response.tool_calls) {
        steps.push(
          `🔧 [调用工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`,
        );
        const toolFn = toolMap[toolCall.name];
        if (!toolFn) continue;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const result = await toolFn.invoke(toolCall.args);
        const resultStr = String(result).slice(0, 300);
        steps.push(`✅ [工具结果] ${resultStr}`);

        messages.push(
          new ToolMessage({
            content: String(result),
            tool_call_id: toolCall.id ?? '',
          }),
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const lastAI = [...messages].reverse().find((m) => m instanceof AIMessage);
    return {
      userMessage,
      steps,
      answer: lastAI?.content ?? '抱歉，无法处理您的请求',
    };
  }
  async onModuleDestroy() {
    await this.mcpClient!.close();
  }
}
