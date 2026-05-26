import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { PrismaModule } from './prisma/prisma.module';
import { PostModule } from './post/post.module';
import { ModelsModule } from './models/models.module';
import { PromptModule } from './prompts/prompts.module';
import { ChainsModule } from './chains/chains.module';
import { AgentsModule } from './agents/agents.module';
import { MemoryModule } from './memory/memory.module';
import { RagModule } from './rag/rag.module';
import { FunctionCallingModule } from './function-calling/function-calling.module';
import { RagDbModule } from './rag-db/rag-db.module';

@Module({
  imports: [UserModule, OrderModule, PrismaModule, PostModule, ModelsModule, PromptModule, ChainsModule, AgentsModule, MemoryModule, RagModule, FunctionCallingModule, RagDbModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
