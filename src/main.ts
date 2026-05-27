import { v4 as uuidv4 } from 'uuid';

// 强行修复 langchain 内部错误的 uuid 引用
Object.defineProperty(globalThis, '__langchain_core_uuid_v4', {
  value: uuidv4,
  writable: false,
  configurable: false,
});

import 'dotenv/config'; // 👈 必须加在第一行！
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
