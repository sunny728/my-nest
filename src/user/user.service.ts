import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly mailService: MailService,
    private readonly prismaService: PrismaService,
  ) {}

  async create(userData: CreateUserDto) {
    console.log('Creating user with data:', userData);
    const newUser = await this.prismaService.user.create({
      data: {
        name: userData.name,
        age: userData.age,
        email: userData.email,
        password: userData.password,
        roles: userData.roles || 'user',
      },
    });
    return {
      success: true,
      message: `User ${newUser.name} created successfully`,
      data: newUser,
    };
  }

  async findAll() {
    const users = await this.prismaService.user.findMany({
      select: {
        id: true,
        name: true,
        age: true,
        email: true,
        roles: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true,
      message: 'Users retrieved successfully',
      total: users.length,
      data: users,
    };
  }
  async search(query: QueryUserDto) {
    const { page = '1', pageSize = '10', name, roles } = query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where: any = {};
    if (name) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where.name = { contains: name, mode: 'insensitive' };
    }
    if (roles) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where.roles = { equals: roles };
    }

    const [total, users] = await this.prismaService.$transaction([
      this.prismaService.user.count({ where }),
      this.prismaService.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          age: true,
          email: true,
          roles: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / take);
    return {
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        pageSize: take,
        hasNextPage: parseInt(page) < totalPages,
        hasPreviousPage: parseInt(page) > 1,
      },
      data: users,
    };
  }

  search1(query: QueryUserDto) {
    const { page = '1', pageSize = '10', name, roles } = query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    return this.prismaService.user
      .findMany({
        where: {
          name: name ? { contains: name, mode: 'insensitive' } : undefined,
          roles: roles ? { equals: roles } : undefined,
        },
        select: {
          id: true,
          name: true,
          age: true,
          email: true,
          roles: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      })
      .then((users) => ({
        success: true,
        page,
        pageSize,
        total: users.length,
        data: users,
      }))
      .catch((error) => ({
        success: false,
        message: `Failed to retrieve users: ${error.message}`,
      }));
  }

  async findOne(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        age: true,
        email: true,
        roles: true,
        posts: {
          select: {
            id: true,
            title: true,
            content: true,
            published: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) {
      return {
        success: false,
        message: `User with id ${id} not found`,
      };
    }
    return {
      success: true,
      message: `User with id ${id} retrieved successfully`,
      data: user,
    };
  }

  updateUser(id: string, userData: UpdateUserDto) {
    return this.prismaService.user
      .update({
        where: { id: Number(id) },
        data: {
          name: userData.name,
          age: userData.age,
          email: userData.email,
          password: userData.password,
          roles: userData.roles,
        },
      })
      .then((updatedUser) => ({
        success: true,
        message: `User with id ${id} updated successfully`,
        data: updatedUser,
      }))
      .catch((error) => ({
        success: false,
        message: `Failed to update user with id ${id}: ${error.message}`,
      }));
  }

  deleteUser(id: string) {
    return this.prismaService.user
      .delete({
        where: { id: Number(id) },
      })
      .then(() => ({
        success: true,
        message: `User with id ${id} deleted successfully`,
      }))
      .catch((error) => ({
        success: false,
        message: `Failed to delete user with id ${id}: ${error.message}`,
      }));
  }
}
