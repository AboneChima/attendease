# Deployment Guide - Render

This guide will help you deploy the Automated Attendance System backend to Render.

## Prerequisites

1. GitHub account with your code pushed to a repository
2. Render account (free tier available)

## Step-by-Step Deployment

### 1. Create Render Account
- Go to [render.com](https://render.com)
- Sign up using your GitHub account
- This will automatically connect your GitHub repositories

### 2. Deploy Backend to Render

#### Option A: Using render.yaml (Recommended)
1. Your repository already contains a `render.yaml` file
2. In Render dashboard, click "New" → "Blueprint"
3. Connect your GitHub repository: `https://github.com/AboneChima/attendease.git`
4. Render will automatically detect the `render.yaml` file
5. Click "Apply" to start deployment

#### Option B: Manual Setup
1. In Render dashboard, click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `attendease-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free

### 3. Environment Variables
Set these environment variables in Render dashboard:

**Required:**
- `NODE_ENV`: `production`
- `JWT_SECRET`: Generate a secure random string (Render can auto-generate)
- `PORT`: `10000` (Render's default)

**Optional (for MySQL, if needed later):**
- `DB_HOST`: Your MySQL host
- `DB_USER`: Your MySQL username
- `DB_PASSWORD`: Your MySQL password
- `DB_NAME`: Your database name

**SQLite (Default):**
- `SQLITE_DB_PATH`: `/opt/render/project/src/backend/database/attendance.db`

### 4. Health Check
- **Health Check Path**: `/api/health`
- This endpoint is already configured in your backend

### 5. After Deployment
1. Your backend will be available at: `https://your-service-name.onrender.com`
2. Test the health endpoint: `https://your-service-name.onrender.com/api/health`
3. Update your frontend to use the new backend URL

## Important Notes

### Database Considerations
- **SQLite**: Works on Render's free tier but data may not persist between deployments
- **PostgreSQL**: Recommended for production (Render offers free PostgreSQL)
- **MySQL**: Available on paid plans

### Free Tier Limitations
- Service spins down after 15 minutes of inactivity
- First request after spin-down may take 30+ seconds
- 750 hours/month limit (sufficient for most use cases)

### Upgrading to Paid Plan
For production use, consider upgrading to:
- **Starter Plan ($7/month)**: Always-on service, faster builds
- **Standard Plan ($25/month)**: More resources, better performance

## Troubleshooting

### Common Issues
1. **Build Fails**: Check that `package.json` is in the backend directory
2. **Database Errors**: Verify environment variables are set correctly
3. **Port Issues**: Ensure your app listens on `process.env.PORT`

### Logs
- View deployment logs in Render dashboard
- Check runtime logs for debugging

## Next Steps
After backend deployment:
1. Deploy frontend to Netlify
2. Update frontend API URLs to point to Render backend
3. Test all functionality end-to-end

## Support
- Render Documentation: [render.com/docs](https://render.com/docs)
- GitHub Issues: Create issues in your repository for project-specific problems