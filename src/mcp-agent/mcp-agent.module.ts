import { Module } from '@nestjs/common';
import { McpAgentService } from './mcp-agent.service';
import { McpAgentController } from './mcp-agent.controller';

@Module({
  providers: [McpAgentService],
  controllers: [McpAgentController]
})
export class McpAgentModule {}
