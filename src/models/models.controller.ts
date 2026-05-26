import { Body, Controller, Post, Res } from '@nestjs/common';
import { ModelsService } from './models.service';
import type { Response } from 'express';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Post('chat')
  baseChat(@Body() body: { message: string }) {
    // 在这里处理聊天请求，调用 Ollama API 获取响应
    return this.modelsService.baseChat(body.message);
  }

  @Post('chat-system')
  chatSystem(@Body() body: { system: string; message: string }) {
    return this.modelsService.chatSystem(body.system, body.message);
  }

  @Post('chat-stream')
  chatStream(@Body() { message }: { message: string }, @Res() res: Response) {
    return this.modelsService.chatStream(message, res);
  }

  @Post('chat-parser')
  chatParser(@Body() body: { message: string }) {
    // 在这里处理聊天请求，调用 Ollama API 获取响应
    return this.modelsService.chatParser(body.message);
  }
}
