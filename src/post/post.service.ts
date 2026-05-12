import { Injectable } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createPostDto: CreatePostDto) {
    // Logic to create a post using the data from createPostDto
    // This is a placeholder implementation. You would typically interact with a database here.
    const author = await this.prisma.user.findUnique({
      where: { id: createPostDto.authorId },
    });
    if (!author) {
      return {
        success: false,
        message: `Author with id ${createPostDto.authorId} not found`,
      };
    }
    const post = await this.prisma.post.create({
      data: {
        title: createPostDto.title,
        content: createPostDto.content,
        published: createPostDto.published ?? false,
        authorId: createPostDto.authorId,
      },
    });
    return {
      success: true,
      message: 'Post created successfully',
      post,
    };
  }

  async findAll(published?: boolean) {
    // Logic to retrieve all posts, optionally filtering by published status
    // This is a placeholder implementation. You would typically interact with a database here.
    const posts = await this.prisma.post.findMany({
      where: published !== undefined ? { published } : {},
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      total: posts.length,
      data: posts,
    };
  }

  async findByAuthor(authorId: string) {
    // Logic to retrieve posts by a specific author
    // This is a placeholder implementation. You would typically interact with a database here.
    const posts = await this.prisma.post.findMany({
      where: { authorId: parseInt(authorId) },
      orderBy: { createdAt: 'desc' },
    });
    return {
      total: posts.length,
      data: posts,
    };
  }

  async findOne(id: string) {
    // Logic to retrieve a single post by its ID
    // This is a placeholder implementation. You would typically interact with a database here.
    const post = await this.prisma.post.findUnique({
      where: { id: parseInt(id) },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: true,
          },
        },
      },
    });
    if (!post) {
      return {
        success: false,
        message: `Post with id ${id} not found`,
      };
    }
    return {
      success: true,
      post,
    };
  }

  async update(id: string, updatePostDto: UpdatePostDto) {
    // Logic to update a post by its ID using the data from updatePostDto
    // This is a placeholder implementation. You would typically interact with a database here.
    const post = await this.prisma.post.findUnique({
      where: { id: parseInt(id) },
    });
    if (!post) {
      return {
        success: false,
        message: `Post with id ${id} not found`,
      };
    }
    const updatedPost = await this.prisma.post.update({
      where: { id: parseInt(id) },
      data: updatePostDto,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return {
      success: true,
      message: `Post with id ${id} updated successfully`,
      post: updatedPost,
    };
  }

  async publish(id: string) {
    // Logic to publish a post by its ID
    // This is a placeholder implementation. You would typically interact with a database here.
    const post = await this.prisma.post.findUnique({
      where: { id: parseInt(id) },
    });
    if (!post) {
      return {
        success: false,
        message: `Post with id ${id} not found`,
      };
    }
    const updatedPost = await this.prisma.post.update({
      where: { id: parseInt(id) },
      data: { published: !post.published },
    });
    return {
      success: true,
      message: `Post with id ${id} is now ${updatedPost.published ? 'published' : 'unpublished'}`,
      post: updatedPost,
    };
  }

  async delete(id: string) {
    // Logic to delete a post by its ID
    // This is a placeholder implementation. You would typically interact with a database here.
    const post = await this.prisma.post.findUnique({
      where: { id: parseInt(id) },
    });
    if (!post) {
      return {
        success: false,
        message: `Post with id ${id} not found`,
      };
    }
    const deletedPost = await this.prisma.post.delete({
      where: { id: parseInt(id) },
    });
    return {
      success: true,
      message: `Post with id ${id} deleted successfully`,
      post: deletedPost,
    };
  }
}
