#!/bin/bash

# Setup script for e-psa-calculator GitHub repository

echo "🚀 Setting up git repository for e-psa-calculator..."

# Navigate to project directory
cd "$(dirname "$0")"

# Check if .git exists
if [ -d ".git" ]; then
    echo "⚠️  Git repository already initialized"
else
    echo "📦 Initializing git repository..."
    git init
fi

# Set remote
echo "🔗 Setting remote repository..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/Urology-AI/e-psa-calculator.git

# Add all files
echo "📝 Adding files..."
git add .

# Commit
echo "💾 Committing changes..."
git commit -m "Initial commit: React-based ePSA risk calculator with modern UI" || echo "⚠️  No changes to commit or already committed"

# Set branch to main
git branch -M main 2>/dev/null || true

# Push
echo "🚀 Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Git setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy to GitHub Pages:"
echo "   cd frontend"
echo "   npm install"
echo "   npm run deploy"
echo ""
echo "2. Enable GitHub Pages in repository settings:"
echo "   - Go to: https://github.com/Urology-AI/e-psa-calculator/settings/pages"
echo "   - Source: gh-pages branch"
echo "   - Your site will be at: https://urology-ai.github.io/e-psa-calculator"
