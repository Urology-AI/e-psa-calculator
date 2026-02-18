# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Install Dependencies
```bash
cd epsa-react
npm install
```

### Step 2: Run Locally
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Step 3: Test It Out
- Fill out the risk assessment form
- Click "Calculate Risk"
- See your results!

## 📦 What's Included

- ✅ Modern React components
- ✅ Responsive design (mobile-friendly)
- ✅ All original calculation logic
- ✅ Beautiful UI with smooth animations
- ✅ Tooltips with research citations
- ✅ GitHub Pages ready

## 🎨 Features

- **Real-time BMI calculation** as you enter height/weight
- **Conditional fields** that show/hide based on selections
- **Risk categories** with color-coded results
- **Next steps** with actionable recommendations
- **External links** to Mount Sinai resources

## 🔧 Project Structure

```
epsa-react/
├── public/
│   ├── logo.png          # Million Strong logo
│   └── index.html        # HTML template
├── src/
│   ├── components/       # React components
│   │   ├── FormField.js
│   │   ├── FormSection.js
│   │   ├── Results.js
│   │   └── Tooltip.js
│   ├── utils/
│   │   └── riskCalculator.js  # All calculation logic
│   ├── App.js            # Main app component
│   └── index.js          # Entry point
├── package.json
└── README.md
```

## 🚢 Deploy to GitHub Pages

See `DEPLOYMENT.md` for detailed instructions.

Quick version:
1. Update `homepage` in `package.json` with your GitHub username
2. `npm run deploy`
3. Enable GitHub Pages in repo settings

## 🐛 Troubleshooting

**Port 3000 already in use?**
```bash
PORT=3001 npm start
```

**Dependencies won't install?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build fails?**
- Check for console errors
- Ensure all imports are correct
- Verify Node.js version (14+)

## 📝 Next Steps

1. **Customize styling** - Edit `src/App.css` and component CSS files
2. **Add backend** - Ready for API integration in `riskCalculator.js`
3. **Add analytics** - Track form submissions
4. **Add tests** - Write unit tests for calculator logic

## 💡 Tips

- The calculator logic is in `src/utils/riskCalculator.js` - easy to modify
- All form state is managed in `App.js` - centralized and clean
- Components are reusable - easy to extend
- CSS is modular - each component has its own stylesheet
