# GitHub Pages Deployment Guide

## Quick Deploy Steps

### 1. Update package.json

Edit `package.json` and replace `YOUR_USERNAME` with your GitHub username:

```json
"homepage": "https://YOUR_USERNAME.github.io/epsa-react"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create GitHub Repository

1. Go to GitHub and create a new repository named `epsa-react`
2. **Do NOT initialize with README** (if you already have files)

### 4. Initialize Git and Push

```bash
git init
git add .
git commit -m "Initial commit - ePSA React app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/epsa-react.git
git push -u origin main
```

### 5. Deploy to GitHub Pages

```bash
npm run deploy
```

This will:
- Build your React app
- Create a `gh-pages` branch
- Push it to GitHub
- Make your site live

### 6. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **gh-pages branch**
4. Click **Save**

Your site will be live at: `https://YOUR_USERNAME.github.io/epsa-react`

## Updating Your Site

After making changes:

```bash
# Make your changes, then:
git add .
git commit -m "Your update message"
git push origin main

# Deploy:
npm run deploy
```

## Troubleshooting

### Site shows blank page
- Check that `homepage` in `package.json` matches your GitHub username
- Ensure you've run `npm run deploy` after setting up the repo
- Check browser console for errors

### Build fails
- Make sure all dependencies are installed: `npm install`
- Check for syntax errors in your code
- Try deleting `node_modules` and `package-lock.json`, then `npm install` again

### Changes not showing
- Clear browser cache
- Wait a few minutes for GitHub Pages to update
- Check that you ran `npm run deploy` after changes

## Custom Domain (Optional)

If you want to use a custom domain:

1. Add a `CNAME` file in the `public` folder with your domain name
2. Configure DNS settings with your domain provider
3. Update GitHub Pages settings to use your custom domain
