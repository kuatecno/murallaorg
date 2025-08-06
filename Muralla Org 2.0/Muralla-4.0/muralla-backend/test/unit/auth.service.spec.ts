import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashedPassword',
    isActive: true,
    roleId: 'role1',
    role: {
      id: 'role1',
      name: 'admin',
      permissions: ['*'],
    },
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByUsername: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data without password when credentials are valid', async () => {
      const password = 'testPassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      usersService.findByUsername.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await service.validateUser('testuser', password);

      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        roleId: 'role1',
        role: {
          id: 'role1',
          name: 'admin',
          permissions: ['*'],
        },
      });
      expect(usersService.findByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      usersService.findByUsername.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent', 'password'))
        .rejects
        .toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      usersService.findByUsername.mockResolvedValue(mockUser);

      await expect(service.validateUser('testuser', 'wrongpassword'))
        .rejects
        .toThrow('Invalid credentials');
    });
  });

  describe('login', () => {
    it('should return access token', async () => {
      const expectedToken = 'jwt-token';
      jwtService.sign.mockReturnValue(expectedToken);

      const result = await service.login(mockUser);

      expect(result).toEqual({
        access_token: expectedToken,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
        role: mockUser.role?.name,
      });
    });
  });

  describe('register', () => {
    it('should create user with hashed password and generated username', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };

      const createdUser = {
        ...mockUser,
        email: registerData.email,
        username: 'new',
      };

      usersService.create.mockResolvedValue(createdUser);

      const result = await service.register(registerData);

      expect(result).toEqual(createdUser);
      expect(usersService.create).toHaveBeenCalledWith({
        ...registerData,
        username: 'new',
        password: expect.any(String), // hashed password
      });

      // Verify password was hashed
      const createCall = usersService.create.mock.calls[0][0];
      expect(createCall.password).not.toBe(registerData.password);
      expect(await bcrypt.compare(registerData.password, createCall.password)).toBe(true);
    });
  });
});
