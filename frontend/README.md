# ePSA - Prostate-Specific Awareness Tool

A modern React-based risk assessment tool for prostate cancer awareness.

## Features

- 🎯 Comprehensive risk factor assessment
- 📊 Real-time BMI calculation
- 🧮 Advanced risk scoring algorithm
- 📱 Fully responsive design
- 🎨 Modern, clean UI/UX
- 📚 Evidence-based recommendations with citations

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

## Deployment to GitHub Pages

1. Update the `homepage` field in `package.json` with your GitHub username:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/epsa-react"
   ```

2. Install gh-pages if not already installed:
   ```bash
   npm install --save-dev gh-pages
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

4. In your GitHub repository settings:
   - Go to Settings → Pages
   - Set Source to "gh-pages branch"
   - Your site will be available at `https://YOUR_USERNAME.github.io/epsa-react`

## Future Enhancements

- Integration with backend API for trained model predictions
- Data collection and analytics
- User accounts and history
- Export results as PDF
- Multi-language support

## License

This project is for educational purposes.
