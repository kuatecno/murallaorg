import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Resolver('Project')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectsService) {}

  @Query('projects')
  @Roles('admin', 'manager')
  async getProjects() {
    return this.projectsService.findAll();
  }

  @Query('project')
  @Roles('admin', 'manager')
  async getProject(@Args('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Mutation('createProject')
  @Roles('admin', 'manager')
  async createProject(@Args('input') input: any) {
    return this.projectsService.create(input);
  }

  @Mutation('updateProject')
  @Roles('admin', 'manager')
  async updateProject(@Args('id') id: string, @Args('input') input: any) {
    return this.projectsService.update(id, input);
  }

  @Mutation('deleteProject')
  @Roles('admin', 'manager')
  async deleteProject(@Args('id') id: string) {
    await this.projectsService.remove(id);
    return true;
  }
}
