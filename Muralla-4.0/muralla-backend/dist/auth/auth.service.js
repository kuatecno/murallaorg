"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
let AuthService = class AuthService {
    constructor(usersService, jwtService, prisma, notificationsService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.notificationsService = notificationsService;
    }
    async validateUser(username, pass) {
        const user = await this.usersService.findByUsername(username);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const match = await bcrypt.compare(pass, user.password);
        if (!match)
            throw new common_1.UnauthorizedException('Invalid credentials');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user;
        return result;
    }
    async login(user) {
        var _a;
        const payload = { sub: user.id, username: user.username, role: (_a = user.role) === null || _a === void 0 ? void 0 : _a.name };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
    async register(data) {
        const hashed = await bcrypt.hash(data.password, 10);
        // Generate username from email if not provided
        const username = data.username || data.email.split('@')[0];
        return this.usersService.create({
            ...data,
            username,
            password: hashed
        });
    }
    async sendMagicLink(email) {
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
    async verifyMagicLink(token) {
        var _a;
        if (!token) {
            throw new common_1.BadRequestException('Token is required');
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
            throw new common_1.UnauthorizedException('Invalid or expired magic link');
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
            role: (_a = magicToken.user.role) === null || _a === void 0 ? void 0 : _a.name
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
    async sendPasswordReset(email) {
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
    async resetPassword(token, newPassword) {
        if (!token || !newPassword) {
            throw new common_1.BadRequestException('Token and new password are required');
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
            throw new common_1.UnauthorizedException('Invalid or expired reset token');
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], AuthService);
