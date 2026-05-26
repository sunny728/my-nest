import { Body, Controller, Post } from '@nestjs/common';
import { PromptService } from './prompts.service';

@Controller('prompts')
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Post('translate')
  translate(@Body() body: { text: string; lang: string }) {
    // 在这里处理翻译请求，调用 Ollama API 获取响应
    return this.promptService.translate(body.text, body.lang);
  }

  @Post('summarize')
  summarize(@Body() body: { text: string; maxWords?: number }) {
    // 在这里处理总结请求，调用 Ollama API 获取响应
    return this.promptService.summarize(body.text, body.maxWords);
  }

  @Post('classify')
  classify(@Body() body: { text: string }) {
    // 在这里处理分类请求，调用 Ollama API 获取响应
    return this.promptService.classify(body.text);
  }

  @Post('code-review')
  codeReview(@Body() body: { code: string; language: string }) {
    // 在这里处理代码审查请求，调用 Ollama API 获取响应
    return this.promptService.codeReview(body.code, body.language);
  }
}
