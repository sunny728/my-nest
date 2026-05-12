import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { PostService } from './post.service';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post('create')
  create(@Body() createPostDto: CreatePostDto) {
    // Logic to create a post using the data from createPostDto
    return this.postService.create(createPostDto);
  }

  @Get('list')
  findAll(@Query('published') published?: string) {
    const filter =
      published === 'true' ? true : published === 'false' ? false : undefined;
    return this.postService.findAll(filter);
  }

  @Get('author/:authorId')
  findByAuthor(@Param('authorId', ParseIntPipe) authorId: string) {
    return this.postService.findByAuthor(authorId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: string) {
    return this.postService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postService.update(id, updatePostDto);
  }

  @Patch(':id/publish')
  publish(@Param('id', ParseIntPipe) id: string) {
    return this.postService.publish(id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: string) {
    return this.postService.delete(id);
  }
}
