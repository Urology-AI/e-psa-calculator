# Deployment Instructions

## Step 1: Setup Git Repository

Run the setup script:

```bash
chmod +x setup-git.sh
./setup-git.sh
```

Or manually:

```bash
# Initialize git (if not already done)
cd /Users/aditya/e-psa
git init

# Add remote
git remote add origin https://github.com/Urology-AI/e-psa-calculator.git
# Or if remote exists:
git remote set-url origin https://github.com/Urology-AI/e-psa-calculator.git

# Add and commit files
git add .
git commit -m "Initial commit: React-based ePSA risk calculator with modern UI"

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Install Dependencies

```bash
cd frontend
npm install
```

## Step 3: Deploy to GitHub Pages

```bash
cd frontend
npm run deploy
```

This will:
- Build the React app
- Create a `gh-pages` branch
- Push it to GitHub
- Make your site live

## Step 4: Enable GitHub Pages

1. Go to: https://github.com/Urology-AI/e-psa-calculator/settings/pages
2. Under **Source**, select **gh-pages branch**
3. Click **Save**

Your site will be live at: **https://urology-ai.github.io/e-psa-calculator**

## Troubleshooting

### If git commands fail due to permissions:

The repository might be nested in a parent git repo. You have two options:

**Option A: Create a separate repo (Recommended)**
```bash
cd /Users/aditya/e-psa
rm -rf .git  # Remove existing git if any
git init
git remote add origin https://github.com/Urology-AI/e-psa-calculator.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

**Option B: Work with parent repo**
If you want to keep it in the parent repo, you'll need to:
- Add the files to the parent repo
- Push from there
- The GitHub Pages URL will be different

### If deploy fails:

1. Make sure `gh-pages` is installed:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Check that `homepage` in `frontend/package.json` is correct:
   ```json
   "homepage": "https://urology-ai.github.io/e-psa-calculator"
   ```

3. Try deploying again:
   ```bash
   cd frontend
   npm run deploy
   ```

## Updating the Site

After making changes:

```bash
# Commit changes
git add .
git commit -m "Your update message"
git push origin main

# Deploy updated site
cd frontend
npm run deploy
```
