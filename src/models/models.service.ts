import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { Config } from 'src/config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { Response } from 'express';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class ModelsService {
  private llm = new ChatOllama({
    baseUrl: Config.ollama.host,
    model: Config.ollama.chatModel,
    temperature: Config.ollama.temperature,
    think: false,
    numPredict: 512,
    // other params...
  });

  async baseChat(message: string) {
    // 在这里实现调用 Ollama API 的逻辑，发送消息并获取响应
    const response = await this.llm.invoke([new HumanMessage(message)]);
    return {
      question: message,
      answer: response.content,
      usage: response.usage_metadata,
    };
  }

  async chatSystem(system: string, message: string) {
    // 在这里实现调用 Ollama API 的逻辑，发送系统消息和用户消息并获取响应
    const response = await this.llm.invoke([
      new SystemMessage(system),
      new HumanMessage(message),
    ]);
    return {
      system,
      question: message,
      answer: response.content,
      usage: response.usage_metadata,
    };
  }

  async chatStream(message: string, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // 跨域设置（如果需要）
    res.setHeader('Access-Control-Allow-Origin', '*');
    // 在这里实现调用 Ollama API 的流式聊天逻辑，发送消息并获取流式响应
    const stream = await this.llm.stream([new HumanMessage(message)]);

    for await (const chunk of stream) {
      console.log('Received chunk:', chunk);
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }

  async chatParser(message: string) {
    const chain = this.llm.pipe(new StringOutputParser());
    const response = await chain.invoke([new HumanMessage(message)]);
    return {
      question: message,
      answer: response,
    };
  }
}
