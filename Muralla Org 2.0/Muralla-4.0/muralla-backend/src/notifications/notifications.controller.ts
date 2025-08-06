import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Public } from '../auth/public.decorator';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  CreateNotificationRuleDto,
  UpdateNotificationRuleDto,
  SendNotificationDto,
  NotificationQueryDto,
} from '@muralla/common';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ==================== TEMPLATES ====================

  @Post('templates')
  @Roles('admin', 'manager')
  async createTemplate(
    @Body() createTemplateDto: CreateNotificationTemplateDto,
    @Request() req: any,
  ) {
    return this.notificationsService.createTemplate(createTemplateDto, req.user.id);
  }

  @Get('templates')
  @Roles('admin', 'manager')
  async getTemplates(@Query() query: NotificationQueryDto) {
    return this.notificationsService.getTemplates(query);
  }

  @Get('templates/:id')
  @Roles('admin', 'manager')
  async getTemplate(@Param('id') id: string) {
    return this.notificationsService.getTemplate(id);
  }

  @Put('templates/:id')
  @Roles('admin', 'manager')
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateNotificationTemplateDto,
    @Request() req: any,
  ) {
    return this.notificationsService.updateTemplate(id, updateTemplateDto, req.user.id);
  }

  @Delete('templates/:id')
  @Roles('admin', 'manager')
  async deleteTemplate(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.deleteTemplate(id, req.user.id);
  }

  // ==================== RULES ====================

  @Post('rules')
  @Roles('admin', 'manager')
  async createRule(
    @Body() createRuleDto: CreateNotificationRuleDto,
    @Request() req: any,
  ) {
    return this.notificationsService.createRule(createRuleDto, req.user.id);
  }

  @Get('rules')
  @Roles('admin', 'manager')
  async getRules(@Query() query: NotificationQueryDto) {
    return this.notificationsService.getRules(query);
  }

  @Put('rules/:id')
  @Roles('admin', 'manager')
  async updateRule(
    @Param('id') id: string,
    @Body() updateRuleDto: UpdateNotificationRuleDto,
    @Request() req: any,
  ) {
    return this.notificationsService.updateRule(id, updateRuleDto, req.user.id);
  }

  // ==================== NOTIFICATIONS ====================

  @Post('send')
  @Roles('admin', 'manager')
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
    @Request() req: any,
  ) {
    return this.notificationsService.sendNotification(sendNotificationDto, req.user.id);
  }

  @Get('my')
  async getMyNotifications(
    @Query() query: NotificationQueryDto,
    @Request() req: any,
  ) {
    return this.notificationsService.getUserNotifications(req.user.id, query);
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Put('read-all')
  async markAllAsRead(@Request() req: any) {
    // TODO: Implement markAllAsRead method
    return { message: 'Mark all as read not implemented yet' };
  }

  // ==================== WEBHOOK FOR TESTING ====================

  @Post('webhook/test')
  @Public()
  async testWebhook(@Body() body: any) {
    // This endpoint can be used for testing rule-based notifications
    // In a real scenario, this would be called by other services or external webhooks
    
    const context = {
      entityType: body.entityType || 'Task',
      entityId: body.entityId || 'test-id',
      entityData: body.entityData || { title: 'Test Task', status: 'completed' },
      userId: body.userId,
      metadata: body.metadata || {},
    };

    await this.notificationsService.processRules(context.entityType, context.entityId, context.entityData);
    
    return { message: 'Webhook processed successfully' };
  }
}
