# Deployment Guide - Automated Attendance System

This guide provides comprehensive instructions for deploying the Automated Attendance System to various platforms.

## 📋 Prerequisites

- Node.js 18+ installed locally
- Git repository access
- Domain name (optional but recommended)
- SSL certificate (for production)

## 🚀 Frontend Deployment (Netlify)

### Option 1: Git Integration (Recommended)

1. **Push your code to GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Connect your repository
   - Select the `frontend` folder as base directory

3. **Configure Build Settings**
   ```
   Base directory: frontend
   Build command: npm run build
   Publish directory: frontend/build
   ```

4. **Environment Variables**
   ```
   REACT_APP_API_URL=https://your-backend-url.com
   GENERATE_SOURCEMAP=false
   ```

### Option 2: Manual Deploy

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify**
   - Drag and drop the `build` folder to Netlify
   - Configure custom domain if needed

## 🖥️ Backend Deployment (Render)

### Step 1: Prepare for Deployment

1. **Create render.yaml** (optional)
   ```yaml
   services:
     - type: web
       name: attendance-backend
       env: node
       plan: free
       buildCommand: npm install
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: JWT_SECRET
           generateValue: true
         - key: PORT
           value: 10000
   ```

2. **Update package.json**
   ```json
   {
     "engines": {
       "node": ">=18.0.0"
     },
     "scripts": {
       "start": "node server.js"
     }
   }
   ```

### Step 2: Deploy to Render

1. **Connect Repository**
   - Go to [Render](https://render.com)
   - Click "New Web Service"
   - Connect your GitHub repository
   - Select the `backend` folder

2. **Configure Service**
   ```
   Name: attendance-backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Environment Variables**
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secure-jwt-secret
   PORT=10000
   DB_PATH=./database/attendance.db
   ```

## 🐳 Docker Deployment

### Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Backend Dockerfile
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-jwt-secret
    volumes:
      - ./backend/database:/app/database

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:3000
```

## ☁️ Alternative Deployment Options

### Vercel (Frontend)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel --cwd frontend`
3. Follow the prompts

### Heroku (Backend)
1. Install Heroku CLI
2. Create app: `heroku create your-app-name`
3. Set buildpack: `heroku buildpacks:set heroku/nodejs`
4. Deploy: `git push heroku main`

### Railway (Full Stack)
1. Connect GitHub repository
2. Deploy both frontend and backend services
3. Configure environment variables

## 🔧 Production Configuration

### Backend Environment Variables
```bash
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
PORT=3000
DB_PATH=./database/attendance.db
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend Environment Variables
```bash
REACT_APP_API_URL=https://your-backend-domain.com
GENERATE_SOURCEMAP=false
REACT_APP_VERSION=1.0.0
```

## 🛡️ Security Checklist

- [ ] Use HTTPS for both frontend and backend
- [ ] Set strong JWT secret (32+ characters)
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular security updates
- [ ] Database backups
- [ ] Environment variable security

## 📊 Monitoring & Maintenance

### Health Checks
```javascript
// Add to backend routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Logging
- Use structured logging (Winston, Pino)
- Monitor error rates
- Set up alerts for critical issues

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci && npm run build
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=frontend/build
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs for specific errors

2. **CORS Errors**
   - Update backend CORS configuration
   - Verify frontend API URL

3. **Database Issues**
   - Ensure database directory exists
   - Check file permissions
   - Verify SQLite installation

4. **Environment Variables**
   - Double-check variable names
   - Ensure no trailing spaces
   - Verify deployment platform configuration

### Support
- Check deployment platform documentation
- Review application logs
- Test locally before deploying
- Use staging environment for testing

---

**Note**: Always test your deployment in a staging environment before going to production.