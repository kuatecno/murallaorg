import { NextResponse } from 'next/server';

export async function GET() {
  const vars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'GOOGLE_TASKS_ENABLED',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'GOOGLE_CHAT_CLIENT_EMAIL',
    'GOOGLE_CHAT_PRIVATE_KEY',
    'GOOGLE_CHAT_ADMIN_EMAIL',
    'OPENFACTURA_API_KEY',
    'OPENFACTURA_API_KEY_MURALLA',
    'OPENFACTURA_API_KEY_MURALLITA',
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_CUSTOM_SEARCH_API_KEY',
    'GOOGLE_SEARCH_ENGINE_ID',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'SEED_SECRET',
    'CRON_SECRET'
  ];

  const status: Record<string, boolean> = {};
  const prefixes: Record<string, string> = {};

  vars.forEach(key => {
    const value = process.env[key];
    status[key] = !!value;
    if (value && value.length > 4) {
      // Show first 4 chars for verification, except for short values
      prefixes[key] = value.substring(0, 4) + '...';
    }
  });

  return NextResponse.json({
    status,
    prefixes,
    nodeEnv: process.env.NODE_ENV
  });
}
