# Railway DockerHub Deployment Guide

This guide covers deploying the Muralla Admin application to Railway using pre-built Docker images from DockerHub.

## Overview

The application consists of:
- **Backend**: NestJS API with Prisma ORM (`kavidoi/muralla-admin:backend-latest`)
- **Frontend**: Vite/React SPA (`kavidoi/muralla-admin:frontend-latest`)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7

## Prerequisites

1. Railway account with CLI installed
2. Docker images pushed to DockerHub (✅ Complete)
3. GitHub repository with latest code (kavidoi/murallaadmin)

## Deployment Steps

### Option 1: Docker Compose Deployment

1. **Create New Railway Project**
   ```bash
   railway login
   railway new muralla-dockerhub
   cd /path/to/project
   railway link
   ```

2. **Deploy with Docker Compose**
   ```bash
   railway up --detach
   ```

3. **Set Environment Variables**
   ```bash
   # Required for all services
   railway variables set POSTGRES_PASSWORD=your_secure_password
   railway variables set JWT_SECRET=your_jwt_secret_key
   railway variables set JWT_EXPIRES_IN=7d
   railway variables set LOG_LEVEL=info
   
   # Backend-specific
   railway variables set BACKEND_DOMAIN=https://your-backend.railway.app
   railway variables set FRONTEND_DOMAIN=https://your-frontend.railway.app
   railway variables set ALLOWED_ORIGINS=https://your-frontend.railway.app
   
   # Frontend-specific  
   railway variables set VITE_API_BASE_URL=https://your-backend.railway.app
   ```

### Option 2: Individual Service Deployment

1. **Create Services Individually**
   ```bash
   # Create PostgreSQL service
   railway add --database postgresql
   
   # Create Redis service  
   railway add --database redis
   
   # Create backend service
   railway service create backend
   railway service use backend
   railway deploy --image kavidoi/muralla-admin:backend-latest
   
   # Create frontend service
   railway service create frontend
   railway service use frontend  
   railway deploy --image kavidoi/muralla-admin:frontend-latest
   ```

2. **Configure Service Variables**
   ```bash
   # Backend service variables
   railway service use backend
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
   railway variables set REDIS_URL=${{Redis.REDIS_URL}}
   railway variables set JWT_SECRET=your_jwt_secret
   railway variables set JWT_EXPIRES_IN=7d
   railway variables set BACKEND_URL=${{Backend.RAILWAY_PUBLIC_DOMAIN}}
   railway variables set FRONTEND_URL=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
   railway variables set ALLOWED_ORIGINS=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
   
   # Frontend service variables
   railway service use frontend
   railway variables set VITE_API_BASE_URL=${{Backend.RAILWAY_PUBLIC_DOMAIN}}
   ```

## Environment Variables Reference

### Backend Service
- `NODE_ENV`: production
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string  
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration time (e.g., "7d")
- `LOG_LEVEL`: Logging level (info, debug, error)
- `PORT`: Service port (auto-assigned by Railway)
- `BACKEND_URL`: Backend public domain
- `FRONTEND_URL`: Frontend public domain
- `ALLOWED_ORIGINS`: CORS allowed origins

### Frontend Service
- `PORT`: Service port (auto-assigned by Railway)
- `VITE_API_BASE_URL`: Backend API base URL

### Database Services
- `POSTGRES_PASSWORD`: PostgreSQL password
- `POSTGRES_DB`: muralla (default)
- `POSTGRES_USER`: muralla (default)

## Health Checks

Both services include health check endpoints:
- **Backend**: `GET /healthz`
- **Frontend**: Nginx serves static files with built-in health

## Troubleshooting

### Common Issues

1. **Service Connection Errors**
   - Verify environment variables are set correctly
   - Check service-to-service communication using Railway variable referencing

2. **Database Connection Issues**
   - Ensure DATABASE_URL uses correct format
   - Verify PostgreSQL service is running and accessible

3. **CORS Errors**
   - Check ALLOWED_ORIGINS matches frontend domain exactly
   - Verify VITE_API_BASE_URL points to correct backend domain

4. **Build/Deploy Failures**
   - Verify Docker images exist on DockerHub
   - Check Railway service logs for specific error messages

### Useful Commands

```bash
# View service logs
railway logs --service backend
railway logs --service frontend

# Check service status
railway status

# Redeploy service
railway service use backend
railway redeploy

# View environment variables
railway variables
```

## Production Checklist

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] Health checks passing
- [ ] CORS configured correctly
- [ ] SSL/HTTPS enabled (automatic with Railway)
- [ ] Custom domains configured (if needed)
- [ ] Monitoring and logging set up

## Docker Images

The following images are available on DockerHub:

- `kavidoi/muralla-admin:backend-latest` - NestJS backend API
- `kavidoi/muralla-admin:frontend-latest` - React frontend with Nginx

Images are automatically built from the monorepo and include:
- Production optimizations
- Security best practices
- Health check endpoints
- Multi-stage builds for smaller image sizes

## Next Steps

After successful deployment:

1. Run database migrations if needed
2. Configure custom domains
3. Set up monitoring and alerts
4. Configure backup strategies
5. Set up CI/CD for automatic deployments

For support, refer to Railway documentation or create an issue in the GitHub repository.
