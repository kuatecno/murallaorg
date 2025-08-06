import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Resolver('User')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query('users')
  @Roles('admin')
  async getUsers() {
    return this.usersService.findAll();
  }

  @Query('user')
  @Roles('admin', 'manager')
  async getUser(@Args('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Mutation('createUser')
  @Roles('admin')
  async createUser(@Args('input') input: any) {
    return this.usersService.create(input);
  }

  @Mutation('updateUser')
  @Roles('admin')
  async updateUser(@Args('id') id: string, @Args('input') input: any) {
    return this.usersService.update(id, input);
  }

  @Mutation('deleteUser')
  @Roles('admin')
  async deleteUser(@Args('id') id: string) {
    await this.usersService.remove(id);
    return true;
  }
}
