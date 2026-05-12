import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  create(@Body() userData: CreateUserDto) {
    // 这里可以添加创建用户的逻辑
    return this.userService.create(userData);
  }

  @Get('list')
  findAll() {
    return this.userService.findAll();
  }

  @Get('search')
  search(@Query() query: QueryUserDto) {
    // 这里可以添加搜索用户的逻辑
    return this.userService.search(query);
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put('/:id')
  updateUser(@Param('id') id: string, @Body() userData: UpdateUserDto) {
    // 这里可以添加更新用户的逻辑
    return this.userService.updateUser(id, userData);
  }

  @Delete('/:id')
  deleteUser(@Param('id') id: string) {
    // 这里可以添加删除用户的逻辑
    return this.userService.deleteUser(id);
  }
}
