import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { Config } from 'src/config';
import type { Response } from 'express';

@Injectable()
export class MemoryService {
  private llm = new ChatOllama({
    baseUrl: Config.ollama.host,
    model: Config.ollama.chatModel,
    temperature: Config.ollama.temperature,
    think: false,
    numPredict: 512,
  });
  private sessions = new Map<string, BaseMessage[]>();
  private systemMessage = new SystemMessage(
    '你是一个智能助手，能记住对话历史，根据上下文准确回答',
  );
  private getOrCreate(sessionId: string): BaseMessage[] {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, [this.systemMessage]);
    }
    return this.sessions.get(sessionId)!;
  }
  async chat(sessionId: string, message: string) {
    const history = this.getOrCreate(sessionId);
    history.push(new HumanMessage(message));

    const response = await this.llm.invoke(history);
    history.push(response);

    return {
      sessionId,
      message,
      reply: response.content,
      turns: Math.floor((history.length - 1) / 2),
    };
  }

  // 查看会话历史
  getHistory(sessionId: string) {
    const history = this.sessions.get(sessionId);
    if (!history) {
      return {
        sessionId,
        exists: false,
        message: [],
      };
    }
    const messages = history
      .filter((m) => !(m instanceof SystemMessage))
      .map((m, i) => ({
        index: i + 1,
        role: m instanceof HumanMessage ? 'user' : 'assistant',
        content: m.content,
      }));
    return {
      sessionId,
      exists: true,
      turn: Math.floor(messages.length / 2),
      messages,
    };
  }

  // 清空会话
  clearSession(sessionId: string) {
    const session = this.sessions.has(sessionId);
    if (!session) {
      return {
        sessionId,
        cleared: false,
        message: '会话不存在',
      };
    }
    this.sessions.set(sessionId, [this.systemMessage]);
    return {
      sessionId,
      cleared: true,
      message: '会话已清空',
    };
  }

  // 所有会话列表
  listSessions() {
    const sessions = Array.from(this.sessions.entries()).filter(([id, h]) => ({
      sessionId: id,
      turn: Math.floor((h.length - 1) / 2),
    }));
    return {
      total: sessions.length,
      sessions,
    };
  }

  // ── 多轮对话（SSE 流式版本）──────────────────────────
  async chatStream(sessionId: string, message: string, res: Response) {
    if (!message || typeof message !== 'string') {
      res.write(
        `data: ${JSON.stringify({ text: '消息不能为空', sessionId })}\n\n`,
      );
      res.write(`data: ${JSON.stringify({ text: '[DONE]' })}\n\n`);
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const history = this.getOrCreate(sessionId);
    history.push(new HumanMessage(message));

    let fullReply = '';

    const stream = await this.llm.stream(history);
    for await (const chunk of stream) {
      if (chunk.content) {
        const text = String(chunk.content);
        fullReply += text;
        res.write(`data: ${JSON.stringify({ text, sessionId })}\n\n`);
      }
    }

    // 流结束后把完整回复存入历史
    history.push(new AIMessage(fullReply));
    res.write(
      `data: ${JSON.stringify({ text: '[DONE]', turns: Math.floor((history.length - 1) / 2) })}\n\n`,
    );
    res.end();
  }
}
