/**
 * Cloudinary Upload API
 * POST /api/cloudinary/upload - Upload image URL to Cloudinary
 */

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadRequest {
  imageUrl: string;
  productName?: string;
  folder?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UploadRequest = await request.json();
    const { imageUrl, productName, folder = 'products' } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 400 }
      );
    }

    console.log('📤 Uploading image to Cloudinary:', imageUrl);

    // Upload to Cloudinary from URL
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: folder,
      resource_type: 'image',
      public_id: productName ? `${folder}/${productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}` : undefined,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Max size 1200x1200
        { quality: 'auto:good' }, // Automatic quality optimization
        { fetch_format: 'auto' }, // Automatic format (WebP if supported)
      ],
    });

    console.log('✅ Image uploaded to Cloudinary:', result.secure_url);

    return NextResponse.json({
      success: true,
      cloudinaryUrl: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });

  } catch (error: any) {
    console.error('❌ Error uploading to Cloudinary:', error);

    return NextResponse.json(
      { error: 'Failed to upload image to Cloudinary', details: error.message },
      { status: 500 }
    );
  }
}
