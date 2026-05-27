import { Body, Controller, Get, Post } from '@nestjs/common';
import { McpClientService } from './mcp-client.service';

@Controller('mcp-client')
export class McpClientController {
  constructor(private readonly mcpClientService: McpClientService) {}

  @Get('tools')
  listTools() {
    return this.mcpClientService.listTools();
  }

  @Post('call')
  callTool(@Body() body: { tool: string; args: Record<string, any> }) {
    return this.mcpClientService.callTool(body.tool, body.args);
  }
}
