# ePSA - Prostate-Specific Awareness Tool

A modern React-based risk assessment tool for prostate cancer awareness.

## 🎯 Overview

ePSA (Prostate-Specific Awareness) is an educational risk assessment tool that helps individuals understand their risk factors for prostate cancer. The tool evaluates both modifiable and non-modifiable risk factors to provide personalized recommendations.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
cd frontend
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

## 📁 Project Structure

```
e-psa/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── utils/         # Calculator logic
│   │   └── App.js         # Main app
│   ├── public/            # Static assets
│   └── package.json       # Dependencies
└── README.md              # This file
```

## 🌐 Deployment

### GitHub Pages

1. Update `homepage` in `frontend/package.json`:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/e-psa"
   ```

2. Deploy:
   ```bash
   cd frontend
   npm run deploy
   ```

3. Enable GitHub Pages in repository settings (gh-pages branch)

See `frontend/DEPLOYMENT.md` for detailed instructions.

## 🔮 Future Enhancements

- **Backend Integration**: Connect to trained ML model for improved predictions
- **Data Collection**: Store anonymized patient data for model training
- **User Accounts**: Save assessment history
- **Analytics**: Track usage patterns
- **Export Results**: PDF download functionality
- **Multi-language**: Support for multiple languages

## 🧮 Risk Calculation

The tool calculates risk based on:

- **Non-Modifiable Factors**: Age, family history, genetic risk, race
- **Biomarkers**: PSA levels, PIRADS scores
- **Modifiable Factors**: BMI, comorbidities, smoking, exercise, diet
- **Symptoms**: IPSS (International Prostate Symptom Score)

Risk categories:
- 🟢 Low (0-40 points)
- 🟡 Moderate (41-80 points)
- 🟠 High (81-120 points)
- 🔴 Very High (>120 points)

## 📚 Research Citations

All recommendations include citations from peer-reviewed medical literature. Hover over the (i) icons to see references.

## 🛠️ Technology Stack

- **Frontend**: React 18
- **Styling**: CSS3 with modern features
- **Build Tool**: Create React App
- **Deployment**: GitHub Pages

## 📝 License

This project is for educational purposes.

## 🤝 Contributing

This is a medical education tool. All changes should be reviewed for medical accuracy.

## 📧 Contact

For questions or issues, please open an issue in the repository.
