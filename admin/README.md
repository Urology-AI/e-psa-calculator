# ePSA Admin Dashboard

A HIPAA-compliant administrative interface for managing ePSA (Prostate-Specific Awareness) application data and user information.

## Features

### 🔐 Security & Compliance
- **Admin Authentication**: Phone-based authentication with admin role verification
- **HIPAA Compliant**: All access logged and audited
- **Role-Based Access**: Only authorized admins can access sensitive data
- **Phone Number Privacy**: Hashed phone numbers with secure lookup system

### 📊 Dashboard Overview
- User statistics and metrics
- Recent activity monitoring
- Quick access to common tasks
- Real-time data updates

### 👥 User Management
- View all users with consent to contact
- Search and filter users
- Access user details and assessment history
- Phone number lookup (hashed for privacy)

### 📋 Session Management
- Complete assessment session details
- Part 1 (Pre-PSA) and Part 2 (PSA/MRI) data
- Risk assessment results
- Session status tracking

### 📄 Reporting
- Generate PDF reports for individual users
- Export user data (GDPR/CCPA compliant)
- Upload and store scanned PDFs
- Print-friendly assessment summaries

## Installation

### Prerequisites
- Node.js 18+ 
- Firebase CLI
- Admin privileges on the ePSA Firebase project

### Setup

1. **Clone and navigate to admin directory:**
```bash
cd /Users/aditya/e-psa/admin
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
   - Copy `.env` file and update Firebase configuration if needed
   - Ensure admin phone numbers have custom claims set

4. **Start development server:**
```bash
npm run dev
```

## Deployment

### Deploy to Firebase Hosting
```bash
# From admin directory
npm run build
firebase deploy --only hosting:admin
```

### URLs
- **Main App**: https://epsa-30d0b.web.app
- **Admin Dashboard**: https://admin-epsa-30d0b.web.app

## Admin Setup

### Grant Admin Access
1. Use Firebase Console or CLI to set custom claims:
```javascript
// In Firebase Console or using Admin SDK
await admin.auth().setCustomUserClaims(userUid, { admin: true });
```

2. Admin users must:
   - Have phone authentication enabled
   - Be granted admin custom claims
   - Consent to contact (for phone lookup features)

### Phone Number Access
Phone numbers are stored as SHA-256 hashes for privacy. To access actual numbers:

1. **Use the admin dashboard** to view phone hashes
2. **Implement secure decryption** (see PHONE_ACCESS_SYSTEM.md)
3. **Maintain audit trail** for all phone number access

## Usage

### Login
1. Enter admin phone number
2. Receive SMS verification code
3. System verifies admin privileges
4. Access granted to dashboard

### Navigation
- **Dashboard**: Overview and statistics
- **Users**: List of users with consent
- **User Detail**: Individual user information and sessions
- **Session Detail**: Complete assessment data

### Data Export
- Individual user reports (PDF)
- Bulk data export (CSV/JSON)
- GDPR/CCPA compliance exports

## Security Features

### Authentication
- Firebase Auth with phone verification
- Custom admin claims verification
- Session-based authentication

### Access Control
- All operations require admin privileges
- User can only access their own data
- Phone number access strictly controlled

### Audit Logging
- All data access logged
- Phone number lookups tracked
- User actions recorded

### Data Protection
- Phone numbers hashed (SHA-256)
- No raw PHI in client code
- Secure backend processing

## Development

### Project Structure
```
admin/
├── src/
│   ├── components/     # Reusable components
│   ├── pages/         # Main pages
│   ├── services/      # Firebase services
│   ├── config/        # Firebase configuration
│   └── utils/         # Utility functions
├── public/            # Static assets
└── build/             # Build output
```

### Adding New Features
1. Create components in `src/components/`
2. Add pages in `src/pages/`
3. Update routing in `App.jsx`
4. Add services in `src/services/`

## Compliance

### HIPAA Requirements Met
- ✅ Access Controls
- ✅ Audit Controls
- ✅ Integrity Controls
- ✅ Transmission Security
- ✅ Data Encryption

### User Rights
- ✅ Data export (GDPR/CCPA)
- ✅ Data deletion
- ✅ Access to own data
- ✅ Consent management

## Troubleshooting

### Common Issues

**"Access Denied" Error**
- Verify admin custom claims are set
- Check phone authentication is working
- Ensure user is logged in with correct account

**Phone Hash Not Found**
- User may not have completed consent
- Check user has consentToContact: true
- Verify backend functions are deployed

**PDF Generation Fails**
- Check browser permissions
- Ensure all data is loaded
- Try refreshing the page

## Support

For technical support:
1. Check Firebase Console logs
2. Review audit logs in Firestore
3. Verify backend function deployment
4. Check network connectivity

## License

© 2026 ePSA - Prostate-Specific Awareness
Unauthorized access is prohibited and will be logged.
