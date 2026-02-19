# Deployment Checklist

## ✅ Pre-Deployment Checks

### 1. Environment Variables
- ✅ `.env` file is in `.gitignore` (not committed)
- ✅ `.env.example` has placeholder values (safe to commit)
- ✅ Firebase config uses environment variables with fallbacks
- ✅ GitHub Secrets are configured for GitHub Pages deployment

### 2. Firebase Setup
- ✅ Firestore rules deployed (`firestore.rules`)
- ✅ Phone Authentication enabled
- ✅ reCAPTCHA Enterprise configured (or use test phone numbers)
- ✅ Blaze plan enabled (for Phone Auth)

### 3. Code Ready
- ✅ All features implemented
- ✅ Session handling working
- ✅ Clear Data button working
- ✅ Form validation working
- ✅ Results display correctly

## 🚀 Deployment Steps

### Step 1: Verify .env is Ignored
```bash
git status
# Should NOT show frontend/.env
```

### Step 2: Commit Changes
```bash
git add .
git commit -m "Ready for deployment - session handling, clear data, Firebase integration"
```

### Step 3: Push to GitHub
```bash
git push origin main
```

### Step 4: GitHub Pages Deployment
- GitHub Actions will automatically build and deploy
- Uses GitHub Secrets for Firebase config
- Deploys to `gh-pages` branch

## 📝 Important Notes

### Environment Variables
- **Local development**: Uses fallback values in `firebase.js`
- **GitHub Pages**: Uses GitHub Secrets (set in repo settings)
- **Never commit**: `.env` file with real credentials

### Firebase Secrets in GitHub
Make sure these are set in GitHub → Settings → Secrets:
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`

### After Deployment
1. Test phone authentication
2. Test form submission
3. Test session restoration
4. Test Clear Data functionality
5. Verify Firestore rules are deployed

## 🔒 Security
- ✅ No secrets in code
- ✅ Environment variables properly handled
- ✅ Firestore rules deployed
- ✅ Phone numbers hashed in database
