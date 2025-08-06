# Muralla 4.0 Railway Deployment Guide

## Overview

This guide explains how to deploy the Muralla 4.0 application to Railway following Railway's recommended approach for monorepo deployments.

## Prerequisites

- Railway account
- Git repository with the Muralla 4.0 codebase
- Docker installed (for local testing)

## Critical Railway Configuration Notes

The most common cause of deployment failures in Railway monorepo setups is incorrect dashboard configuration. Even with correct code structure and Dockerfiles, deployments will fail if the Railway dashboard is not properly configured.

Key points to remember:
1. Each service must have its Source set to your GitHub repository (not a Docker image)
2. Root directories must be set to the full nested path from your repository root
3. Custom build and start commands must be explicitly defined
4. Environment variables using Railway's referencing system must be set in the dashboard

## Config-as-Code Approach (Recommended)

Railway supports defining deployment configuration in code using `railway.json` files. This approach is more reliable and reproducible than dashboard configuration:

1. Create a `railway.json` file in each service directory (`muralla-backend/railway.json` and `muralla-frontend/railway.json`)
2. These files will override dashboard settings
3. Configuration defined in code will always take precedence over dashboard settings

This approach eliminates many common deployment issues by ensuring consistent configuration across environments.

## Deployment Steps

### 1. Create Railway Project

1. From your Railway dashboard, click `+ New Project`
2. Choose `Empty project`
3. Give your project a recognizable name (e.g., "Muralla 4.0")

### 2. Create Services

1. Add two new empty services from the `+ Create` button:
   - Backend service (name it "Backend")
   - Frontend service (name it "Frontend")

### 3. Configure Service Root Directories

For each service, you need to set the root directory where the code is located. This is CRITICAL for monorepo deployments:

#### Backend Service Configuration
1. Click on the Backend service to open its settings
2. Go to the Settings tab
3. Set the Source to your GitHub repository
4. Set the Root Directory to `Muralla Org 2.0/Muralla-4.0/muralla-backend` (full path from repo root)
5. In the Deploy tab, set the Build Command to `pnpm install --frozen-lockfile && pnpm run build`
6. Set the Start Command to `node dist/main.js`

#### Frontend Service Configuration
1. Click on the Frontend service to open its settings
2. Go to the Settings tab
3. Set the Source to your GitHub repository
4. Set the Root Directory to `Muralla Org 2.0/Muralla-4.0/muralla-frontend` (full path from repo root)
5. In the Deploy tab, set the Build Command to `npm install --legacy-peer-deps && npm run build`
6. The start command is handled by the nginx Dockerfile, so no explicit start command is needed

#### Alternative: Config-as-Code Approach (Recommended)

Instead of configuring these settings in the dashboard, you can use Railway's config-as-code feature:

1. The `muralla-backend/railway.json` file already contains the backend configuration
2. The `muralla-frontend/railway.json` file already contains the frontend configuration
3. These files will automatically override any dashboard settings
4. Configuration defined in code will always take precedence over dashboard settings

With this approach, you only need to ensure:
1. Each service has its Source set to your GitHub repository
2. Each service has the correct Root Directory set
3. Environment variables are still set in the dashboard (as they cannot be defined in code for security reasons)

### 4. Set Environment Variables

Environment variables MUST be set in the Railway dashboard for each service. These cannot be set through code alone.

#### Backend Environment Variables

Set these variables in the Backend service's Variables tab:

- `DATABASE_URL`: PostgreSQL connection string (will be provided by Railway Postgres plugin)
- `REDIS_URL`: Redis connection string (will be provided by Railway Redis plugin)
- `JWT_SECRET`: Secret key for JWT token generation (generate a secure random string)
- `JWT_EXPIRES_IN`: Token expiration time (e.g., "24h")
- `LOG_LEVEL`: Logging level (e.g., "info")
- `ALLOWED_ORIGINS`: `${{Frontend.RAILWAY_PUBLIC_DOMAIN}}` (Railway's variable referencing system)
- `PORT`: `3000` (Railway will override this at runtime, but good to set as default)

#### Frontend Environment Variables

Set these variables in the Frontend service's Variables tab:

- `VITE_API_BASE_URL`: `${{Backend.RAILWAY_PUBLIC_DOMAIN}}` (Railway's variable referencing system)
- `PORT`: `80` (nginx will listen on this port)

### 5. Add Database and Redis Services

1. Add a PostgreSQL database service to your project
2. Add a Redis service to your project
3. Railway will automatically provide the connection strings as environment variables
4. Ensure the database service is linked to your Backend service

### 6. Deploy Services

1. Click the Deploy button for each service
2. Railway will automatically build and deploy both services
3. The services will be accessible via their public domains

IMPORTANT: The first deployment may take longer as Railway needs to build Docker images. Subsequent deployments will be faster due to caching.

## Local Development

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Environment Setup

1. Create `.env` file in `muralla-backend` directory
2. Set required environment variables

## Troubleshooting

### Most Common Deployment Issues

1. **Root Directory Not Set Correctly**: The root directory must be the full path from your repository root (e.g., `Muralla Org 2.0/Muralla-4.0/muralla-backend`), not just `/muralla-backend`
2. **Source Not Set to GitHub**: Services must use your GitHub repository as the source, not a Docker image
3. **Missing Custom Build/Start Commands**: Railway needs explicit build and start commands in the Deploy tab
4. **Environment Variables Not Set in Dashboard**: Variables using Railway's referencing system (`${{...}}`) must be set in the dashboard

### Build Issues

- Check that Dockerfiles are correctly configured
- Ensure all dependencies are properly listed
- Verify environment variables are set
- Check that the root directory is set to the full nested path
- Ensure custom build commands are set in the Deploy tab

### Runtime Issues

- Check service logs in Railway dashboard
- Verify environment variables are correctly set
- Ensure database migrations have been run
- Check that the PORT environment variable is set (3000 for backend, 80 for frontend)

### Common Solutions

1. If the backend fails to start:
   - Check that the `PORT` environment variable is set to 3000
   - Verify the start command is `node dist/main.js`
   - Check that the root directory is set correctly

2. If the frontend fails to connect to the backend:
   - Verify `VITE_API_BASE_URL` is set to `${{Backend.RAILWAY_PUBLIC_DOMAIN}}`
   - Check that both services are deployed and running
   - Ensure the backend service is accessible

3. If database connections fail:
   - Ensure `DATABASE_URL` is correctly configured by the PostgreSQL plugin
   - Check that the database service is linked to the backend service
   - Verify the database service is running

### Railway-Specific Issues

1. If services aren't building correctly:
   - Verify the root directory is set to the full nested path
   - Check that custom build commands are set in the Deploy tab
   - Ensure the source is set to your GitHub repository

2. If services can't communicate:
   - Check that environment variables using Railway referencing are set correctly
   - Verify both services are deployed and running
   - Ensure the ALLOWED_ORIGINS variable is set correctly on the backend

3. If builds are timing out:
   - Check the Dockerfile optimization
   - Ensure dependencies are properly cached
   - Consider using frozen lockfiles for faster installs

## Architecture Notes

- The application uses a monorepo structure with separate backend and frontend directories
- Backend is a NestJS application with PostgreSQL and Redis
- Frontend is a React/Vite application served by nginx
- Services communicate over HTTP REST APIs
- Authentication uses JWT tokens
- Environment variables are used for configuration
- Railway's variable referencing system enables inter-service communication
