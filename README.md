# ePSA - Prostate-Specific Awareness Risk Assessment Tool

A comprehensive medical assessment tool for evaluating prostate cancer risk factors and providing educational resources to patients and healthcare providers.

## 🚀 Live Demos

- **Firebase Production**: [https://epsa-30d0b.web.app](https://epsa-30d0b.web.app) - Full cloud version with authentication and data storage
- **GitHub Pages Demo**: [https://urology-ai.github.io/e-psa-calculator/](https://urology-ai.github.io/e-psa-calculator/) - Static demo version (local storage only)

## 📋 Overview

ePSA is a two-stage risk assessment tool designed to help patients understand their prostate cancer risk factors through evidence-based questionnaires and personalized results.

### Key Features

- **Part 1 Assessment**: Lifestyle, family history, and symptom evaluation
- **Part 2 Assessment**: Clinical data and PSA level analysis
- **Risk Calculations**: Evidence-based algorithms for risk stratification
- **Educational Content**: Comprehensive information and next steps
- **Data Management**: Import/export functionality for continuity of care
- **Mobile Responsive**: Optimized for all device sizes
- **Professional UI**: Medical-appropriate interface design

## 🏗️ Architecture

### Frontend (React + Vite)
- **Technology**: React 18, Vite, Modern JavaScript
- **Styling**: CSS with responsive design
- **State Management**: React Hooks
- **Build Tools**: Vite for fast development and production builds

### Backend (Firebase + Node.js)
- **Authentication**: Firebase Auth with phone verification
- **Database**: Firestore for scalable data storage
- **Functions**: Cloud Functions for backend logic
- **Hosting**: Firebase Hosting for production deployment

### Admin Dashboard
- **Technology**: React + Vite
- **Features**: User management, data export, session tracking
- **Security**: Role-based access control
- **Analytics**: Comprehensive usage statistics

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Urology-AI/e-psa-calculator.git
   cd e-psa-calculator
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install admin dashboard dependencies**
   ```bash
   cd ../admin
   npm install
   ```

4. **Install backend dependencies**
   ```bash
   cd ../backend
   npm install
   ```

### Environment Configuration

1. **Frontend Environment**
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your Firebase configuration
   ```

2. **Backend Environment**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your Firebase configuration
   ```

### Local Development

1. **Start frontend development server**
   ```bash
   cd frontend
   npm run dev
   # Visit http://localhost:5173
   ```

2. **Start admin dashboard**
   ```bash
   cd admin
   npm run dev
   # Visit http://localhost:5174
   ```

3. **Start backend functions**
   ```bash
   cd backend
   npm run dev
   # Functions will be available on localhost:5001
   ```

## 🚀 Deployment

### Automatic Deployment (GitHub Actions)

The project uses GitHub Actions for automatic deployment:

1. **Firebase Hosting**: Deploys on push to `main` branch
2. **GitHub Pages**: Deploys static demo on push to `main` branch

#### Required GitHub Secrets

- `FIREBASE_SERVICE_ACCOUNT_EPSA_30D0B`: Firebase service account JSON

### Manual Deployment

#### Firebase Hosting
```bash
# Deploy frontend and admin
firebase deploy --only hosting

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy backend functions
firebase deploy --only functions
```

#### GitHub Pages
```bash
cd frontend
npm run build:gh-pages
npm run deploy
```

## 📁 Project Structure

```
e-psa-calculator/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── utils/          # Utility functions
│   │   ├── config/         # Firebase configuration
│   │   └── services/       # API services
│   ├── public/             # Static assets
│   └── package.json
├── admin/                   # Admin dashboard
│   ├── src/
│   │   ├── components/      # Admin components
│   │   ├── pages/          # Admin pages
│   │   └── services/       # Admin services
│   └── package.json
├── backend/                 # Firebase Functions backend
│   ├── src/                # TypeScript source
│   └── package.json
├── .github/workflows/       # GitHub Actions workflows
├── firebase.json           # Firebase configuration
├── firestore.rules         # Firestore security rules
└── README.md
```

## 🔧 Configuration

### Firebase Configuration

1. **Create Firebase Project**
   - Visit [Firebase Console](https://console.firebase.google.com/)
   - Create new project or use existing one

2. **Enable Services**
   - Authentication (Phone provider)
   - Firestore Database
   - Functions
   - Hosting

3. **Configure Environment Variables**
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## 📊 Features

### Assessment Tools
- **Part 1**: Lifestyle factors, family history, symptoms
- **Part 2**: Clinical data, PSA levels, risk calculations
- **Results**: Detailed risk analysis with educational content

### Data Management
- **Local Storage**: Browser-based storage for demo use
- **Cloud Storage**: Firebase integration for production
- **Import/Export**: JSON-based data transfer
- **Session Management**: Persistent user sessions

### User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Accessibility**: WCAG compliant interface
- **Professional UI**: Medical-appropriate design
- **Multi-language**: Ready for internationalization

## 🔒 Security

- **HIPAA Compliance**: Designed with healthcare privacy in mind
- **Data Encryption**: End-to-end encryption for sensitive data
- **Access Control**: Role-based permissions
- **Audit Logging**: Comprehensive activity tracking
- **Secure Authentication**: Phone-based verification

## 🧪 Testing

### Running Tests
```bash
# Frontend tests
cd frontend
npm test

# Admin tests
cd admin
npm test

# Backend tests
cd backend
npm test
```

### Build Verification
```bash
# Production build test
cd frontend
npm run build

# GitHub Pages build test
npm run build:gh-pages
```

## 📈 Monitoring

### Firebase Console
- **Analytics**: User engagement and behavior
- **Performance**: App performance metrics
- **Crash Reporting**: Error tracking and reporting
- **Remote Config**: Dynamic configuration management

### Admin Dashboard
- **User Management**: Monitor registered users
- **Session Tracking**: View assessment sessions
- **Data Export**: Export user data for analysis
- **System Health**: Monitor backend services

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write comprehensive commit messages
- Include tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- **Redmine**: Project documentation and requirements
- **GitHub Wiki**: Technical documentation
- **Code Comments**: Inline documentation

### Contact
- **Issues**: [GitHub Issues](https://github.com/Urology-AI/e-psa-calculator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Urology-AI/e-psa-calculator/discussions)

## 🙏 Acknowledgments

- **Mount Sinai Health System**: Medical expertise and guidance
- **Urology Department**: Clinical validation and oversight
- **Firebase**: Backend infrastructure and hosting
- **Open Source Community**: Tools and libraries used

---

**⚠️ Medical Disclaimer**: This tool is for educational purposes only and should not replace professional medical advice. Always consult with qualified healthcare providers for medical decisions.
