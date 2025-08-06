import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async validateUser(username: string, pass: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(pass, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { sub: user.id, username: user.username, role: user.role?.name };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(data: any) {
    const hashed = await bcrypt.hash(data.password, 10);
    // Generate username from email if not provided
    const username = data.username || data.email.split('@')[0];
    return this.usersService.create({ 
      ...data, 
      username,
      password: hashed 
    });
  }

  async sendMagicLink(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: 'If the email exists, a magic link has been sent.' };
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in database
    await this.prisma.magicToken.create({
      data: {
        userId: user.id,
        purpose: 'magic',
        tokenHash,
        expiresAt,
        tenantId: user.tenantId,
      },
    });

    // Send email via notifications service
    await this.notificationsService.sendNotification({
      templateId: 'magic-link-template',
      recipientIds: [user.id],
      tenantId: user.tenantId,
      createdBy: user.id,
      variables: {
        firstName: user.firstName,
        magicLinkUrl: `${process.env.FRONTEND_URL}/auth/magic-link/verify?token=${token}`,
      },
    }, user.id);

    return { message: 'If the email exists, a magic link has been sent.' };
  }

  async verifyMagicLink(token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const magicToken = await this.prisma.magicToken.findFirst({
      where: {
        tokenHash,
        purpose: 'magic',
        expiresAt: { gt: new Date() },
        isDeleted: false,
      },
      include: { user: true },
    });

    if (!magicToken) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    // Delete the token (one-time use)
    await this.prisma.magicToken.update({
      where: { id: magicToken.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    // Generate JWT for the user
    const payload = { 
      sub: magicToken.user.id, 
      username: magicToken.user.username, 
      role: (magicToken.user as any).role?.name 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: magicToken.user.id,
        email: magicToken.user.email,
        firstName: magicToken.user.firstName,
        lastName: magicToken.user.lastName,
      },
    };
  }

  async sendPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store token in database
    await this.prisma.magicToken.create({
      data: {
        userId: user.id,
        purpose: 'reset',
        tokenHash,
        expiresAt,
        tenantId: user.tenantId,
      },
    });

    // Send email via notifications service
    await this.notificationsService.sendNotification({
      templateId: 'password-reset-template',
      recipientIds: [user.id],
      tenantId: user.tenantId,
      createdBy: user.id,
      variables: {
        firstName: user.firstName,
        resetUrl: `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`,
      },
    }, user.id);

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const resetToken = await this.prisma.magicToken.findFirst({
      where: {
        tokenHash,
        purpose: 'reset',
        expiresAt: { gt: new Date() },
        isDeleted: false,
      },
      include: { user: true },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Delete the token (one-time use)
    await this.prisma.magicToken.update({
      where: { id: resetToken.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return { message: 'Password has been reset successfully.' };
  }
}
