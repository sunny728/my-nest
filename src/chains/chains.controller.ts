import { Body, Controller, Post } from '@nestjs/common';
import { ChainsService } from './chains.service';

@Controller('chains')
export class ChainsController {
  constructor(private readonly chainsService: ChainsService) {}

  @Post('polish')
  polish(@Body() body: { article: string }) {
    return this.chainsService.polish(body.article);
  }

  @Post('blog')
  generateBlog(@Body() body: { keywords: string; style: string }) {
    return this.chainsService.generateBlog(body.keywords, body.style);
  }

  @Post('router')
  smarterRouter(@Body() body: { question: string }) {
    return this.chainsService.smarterRouter(body.question);
  }
}
