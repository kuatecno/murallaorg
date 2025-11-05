/**
 * CORS helper utilities for API routes
 * Allows qr.murallacafe.cl to access the Admin API
 */

import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://qr.murallacafe.cl',
  'https://murallacafe.cl',
  'http://localhost:3000',
  'http://localhost:8000',
];

export function getCorsHeaders(origin?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  // Check if origin is allowed
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

export function corsResponse(data: any, status: number = 200, origin?: string | null) {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(origin),
  });
}

export function corsError(error: string, status: number = 500, origin?: string | null) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: getCorsHeaders(origin),
    }
  );
}
