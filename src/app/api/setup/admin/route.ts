/**
 * POST /api/setup/admin
 * One-time setup endpoint to create production admin account
 * Should be removed after initial setup
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, password, setupKey } = await request.json();

    // Simple protection - require a setup key
    if (setupKey !== 'muralla-setup-2025') {
      return NextResponse.json(
        { error: 'Invalid setup key' },
        { status: 403 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.staff.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Get the first tenant (or create one if none exists)
    let tenant = await prisma.tenant.findFirst();
    
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Muralla Cafe',
          slug: 'muralla-cafe',
          domain: 'murallacafe.cl',
          email: 'contacto@murallacafe.cl',
          isActive: true,
        }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const user = await prisma.staff.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Muralla',
        role: 'ADMIN',
        department: 'Management',
        position: 'Administrator',
        phone: '+56 9 0000 0000',
        tenantId: tenant.id,
        isActive: true,
      }
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: 'Admin account created successfully',
      user: userWithoutPassword,
      tenant: tenant.name,
    });

  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
