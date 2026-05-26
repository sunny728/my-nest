import { Module } from '@nestjs/common';
import { FunctionCallingService } from './function-calling.service';
import { FunctionCallingController } from './function-calling.controller';

@Module({
  providers: [FunctionCallingService],
  controllers: [FunctionCallingController]
})
export class FunctionCallingModule {}
