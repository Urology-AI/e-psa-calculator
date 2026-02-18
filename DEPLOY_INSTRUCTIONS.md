# Deployment Instructions

## The Issue
The build is failing due to Node v23 compatibility issues with react-scripts. 

## Solution Options

### Option 1: Use Node v18 (Recommended)
```bash
nvm install 18
nvm use 18
cd /Users/aditya/e-psa/frontend
rm -rf node_modules yarn.lock
yarn install
yarn build
yarn deploy
```

### Option 2: Push Code and Use GitHub Actions
Push your code and let GitHub Actions build it (uses Node 18 by default):

```bash
cd /Users/aditya/e-psa
git push -f origin main
```

Then create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install and Build
        run: |
          cd frontend
          yarn install
          yarn build
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/build
```

### Option 3: Use Netlify/Vercel
These platforms handle builds automatically and use compatible Node versions:

1. **Netlify:**
   - Connect your GitHub repo
   - Build command: `cd frontend && yarn build`
   - Publish directory: `frontend/build`

2. **Vercel:**
   - Import your GitHub repo
   - Framework preset: Create React App
   - Root directory: `frontend`

## Quick Commands (After Switching to Node 18)

```bash
# Push code
cd /Users/aditya/e-psa
git push -f origin main

# Build and deploy
cd frontend
yarn install
yarn build
yarn deploy
```

## Current Status
- ✅ Code is ready
- ✅ Yarn configured
- ✅ Dependencies installed
- ⚠️ Build needs Node v18/v20 (not v23)
