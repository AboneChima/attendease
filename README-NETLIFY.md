# Netlify Deployment Guide for AttendEase Frontend

This guide will help you deploy the AttendEase frontend to Netlify.

## Prerequisites

1. **GitHub Repository**: Your code should be pushed to GitHub
2. **Netlify Account**: Create a free account at [netlify.com](https://netlify.com)
3. **Backend Deployed**: Your backend should be running on Render at `https://attendease-backend-ovl6.onrender.com`

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

1. **Connect GitHub to Netlify**:
   - Log in to your Netlify dashboard
   - Click "New site from Git"
   - Choose "GitHub" as your Git provider
   - Authorize Netlify to access your repositories
   - Select your AttendEase repository

2. **Configure Build Settings**:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`

3. **Environment Variables**:
   - Go to Site settings → Environment variables
   - Add the following variable:
     - `REACT_APP_API_URL` = `https://attendease-backend-ovl6.onrender.com/api`

4. **Deploy**:
   - Click "Deploy site"
   - Netlify will automatically build and deploy your site

### Method 2: Manual Deployment

1. **Build the Project Locally**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify**:
   - Go to your Netlify dashboard
   - Drag and drop the `frontend/build` folder to the deploy area
   - Or use Netlify CLI:
     ```bash
     npm install -g netlify-cli
     netlify deploy --prod --dir=build
     ```

## Configuration Files

### netlify.toml
The `netlify.toml` file in the frontend directory contains:
- Build settings
- SPA redirect rules (for React Router)
- Environment variables

### Environment Variables
- `REACT_APP_API_URL`: Points to your Render backend URL
- This is automatically configured in `netlify.toml`

## Post-Deployment Steps

1. **Test the Deployment**:
   - Visit your Netlify site URL
   - Test user registration and login
   - Verify QR code generation and scanning
   - Check attendance management features

2. **Custom Domain (Optional)**:
   - Go to Site settings → Domain management
   - Add your custom domain
   - Configure DNS settings as instructed

3. **HTTPS Configuration**:
   - Netlify automatically provides HTTPS
   - Ensure your backend (Render) also uses HTTPS

## Important Notes

### CORS Configuration
Make sure your backend allows requests from your Netlify domain:
- Update CORS settings in your backend if needed
- The backend should accept requests from `https://your-site-name.netlify.app`

### Environment Variables
- All React environment variables must start with `REACT_APP_`
- Variables are embedded at build time, not runtime
- Changes to environment variables require a rebuild

### SPA Routing
- The `netlify.toml` includes redirect rules for React Router
- This ensures direct URL access works correctly

## Troubleshooting

### Build Failures
- Check build logs in Netlify dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### API Connection Issues
- Verify `REACT_APP_API_URL` is set correctly
- Check browser console for CORS errors
- Ensure backend is running and accessible

### 404 Errors on Direct URLs
- Verify `netlify.toml` redirect rules are in place
- Check that the file is in the correct location

## Netlify Features

### Automatic Deployments
- Netlify will automatically redeploy when you push to GitHub
- Configure branch-based deployments if needed

### Preview Deployments
- Pull requests automatically get preview URLs
- Test changes before merging

### Analytics
- Enable Netlify Analytics for visitor insights
- Monitor site performance and usage

## Next Steps

After successful deployment:
1. Update any documentation with the new frontend URL
2. Test all features end-to-end
3. Set up monitoring and error tracking
4. Consider setting up a custom domain
5. Configure any additional security headers if needed

## Support

If you encounter issues:
1. Check Netlify build logs
2. Verify environment variables
3. Test the build locally first
4. Check browser console for errors
5. Ensure backend is accessible from the frontend domain