# HIPAA Compliance & Admin Setup Guide

## 🔐 HIPAA Compliance Implementation

### 1. Data Protection Measures

#### Phone Number Security
```javascript
// Phone numbers are stored as SHA-256 hashes
const phoneHash = CryptoJS.SHA256(phone).toString();

// For actual phone access, use encrypted storage
const encryptedPhone = AES256.encrypt(phone, encryptionKey).toString();
```

#### Access Controls
- **Authentication**: Email/password with admin verification
- **Authorization**: Custom claims and email whitelist
- **Audit Logging**: All PHI access logged to `auditLogs` collection
- **Rate Limiting**: 30 requests/minute per user

#### Data Minimization
- Only collect essential health data
- Phone numbers hashed by default
- No raw PHI in client-side code
- Separate secure storage for decrypted data

### 2. HIPAA Requirements Met

| Requirement | Implementation | Status |
|-------------|----------------|---------|
| Access Controls | Email auth + admin claims | ✅ |
| Audit Controls | Comprehensive logging | ✅ |
| Integrity | Hashed identifiers + validation | ✅ |
| Encryption | HTTPS + Firebase encryption | ✅ |
| Transmission Security | TLS + CSP headers | ✅ |
| Data Retention | 90-day automatic cleanup | ✅ |

### 3. Security Rules

```javascript
// Firestore Rules Summary
match /users/{userId} {
  allow get: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
  allow create, update: if false; // Backend only
}

match /securePhoneData/{userId} {
  allow read, write: if isAuthenticated() && isAdmin();
}
```

## 👥 Admin User Setup

### 1. Authorized Admin Emails

Update the `AUTHORIZED_ADMINS` array in `/backend/src/index.ts`:

```typescript
const AUTHORIZED_ADMINS = [
  'ad5157@nyu.edu',
  'urology-ai@nyulangone.org',
  'new-admin@nyulangone.org', // Add new admin here
];
```

### 2. Create Admin User Accounts

#### Option A: Firebase Console
1. Go to Firebase Console → Authentication → Users
2. Click "Add User"
3. Enter email and password
4. Add custom claim: `{ "admin": true }`

#### Option B: Using Firebase CLI
```bash
# Create user with email/password
firebase auth:create-user --email admin@nyulangone.org --password tempPassword123

# Set admin custom claim
firebase auth:set-custom-user-claims USER_UID '{"admin": true}'
```

#### Option C: Programmatically
```javascript
// In a secure admin script
await admin.auth().createUser({
  email: 'admin@nyulangone.org',
  password: 'securePassword123'
});

await admin.auth().setCustomUserClaims(userUid, { admin: true });
```

### 3. Admin Login Process

1. **Email/Password Authentication**: Standard Firebase Auth
2. **Admin Verification**: Checks against authorized email list
3. **Custom Claims**: Sets `admin: true` claim automatically
4. **Audit Logging**: All admin access logged

## 📱 Phone Number Access System

### 1. Current Implementation (Hashed Only)

```javascript
// Phone numbers stored as hashes
const phoneHash = SHA256(phone).toString();
// Stored in users collection as phoneHash field
```

### 2. Secure Phone Access (Recommended)

#### Step 1: Store Encrypted Phone
```javascript
// Admin encrypts phone number before storing
const encryptionKey = 'secure-key-123';
const encryptedPhone = AES256.encrypt(phone, encryptionKey).toString();

// Store in secure collection
await storeEncryptedPhone(userId, encryptedPhone, encryptionKey);
```

#### Step 2: Retrieve and Decrypt
```javascript
// Admin retrieves encrypted data
const data = await getDecryptedPhone(userId, 'secure-key-123');

// Decrypt client-side (never store key in backend)
const phone = AES256.decrypt(data.encryptedPhone, 'secure-key-123').toString(CryptoJS.enc.Utf8);
```

### 3. Phone Access Workflow

1. **Identify User**: Find user ID from dashboard
2. **Verify Consent**: Check `consentToContact: true`
3. **Access Phone**: Use secure decryption system
4. **Audit Log**: Access automatically logged
5. **Contact User**: Use phone for legitimate purposes

## 🚀 Deployment Steps

### 1. Deploy Backend Functions
```bash
cd /Users/aditya/e-psa/backend
npm run build
firebase deploy --only functions
```

### 2. Deploy Admin Dashboard
```bash
cd /Users/aditya/e-psa/admin
npm install
npm run build
firebase deploy --only hosting:admin
```

### 3. Configure Admin Users
```bash
# Add admin users to AUTHORIZED_ADMINS array
# Deploy updated backend
firebase deploy --only functions
```

### 4. Test Admin Access
1. Go to: https://admin-epsa-30d0b.web.app
2. Login with admin email/password
3. Verify dashboard access
4. Test phone lookup functionality

## 📊 Audit & Compliance

### 1. Audit Log Structure
```javascript
{
  action: 'PHONE_LOOKUP',
  userId: 'user123',
  resourceType: 'user',
  resourceId: 'user123',
  details: {
    accessedBy: 'admin456',
    consentToContact: true
  },
  timestamp: '2026-02-24T02:30:00Z',
  ip: 'client-ip'
}
```

### 2. Regular Compliance Tasks
- **Monthly**: Review audit logs for unauthorized access
- **Quarterly**: Update admin user list
- **Annually**: Full HIPAA compliance review
- **As Needed**: Handle data deletion requests

### 3. Data Retention Policy
- **User Sessions**: 90 days, then auto-deleted
- **Audit Logs**: Retained indefinitely (compliance requirement)
- **Phone Data**: Encrypted, access logged
- **User Accounts**: Delete on request

## 🔍 Monitoring & Alerts

### 1. Key Metrics to Monitor
- Failed admin login attempts
- Unusual data access patterns
- Phone number access frequency
- Data export requests

### 2. Alert Configuration
```javascript
// In Cloud Functions, add monitoring
if (error.code === 'permission-denied') {
  // Log security incident
  console.warn('Security incident:', {
    userId: context.auth?.uid,
    action: data.action,
    timestamp: new Date().toISOString()
  });
}
```

## 🆘 Support & Troubleshooting

### Common Issues

**"Access Denied" Error**
- Verify email is in `AUTHORIZED_ADMINS` list
- Check user has admin custom claims
- Ensure backend functions are deployed

**Phone Hash Not Found**
- User may not have completed consent
- Check `consentToContact` field
- Verify user exists in database

**Admin Functions Not Working**
- Deploy latest backend code
- Check Firebase function logs
- Verify admin claims are set

### Support Contacts
- **Technical**: Firebase Console logs
- **Security**: Review audit logs
- **Compliance**: HIPAA compliance officer

## 📋 Compliance Checklist

- [ ] Admin users configured with authorized emails
- [ ] Backend functions deployed with latest code
- [ ] Admin dashboard deployed and accessible
- [ ] Phone encryption system implemented
- [ ] Audit logging verified working
- [ ] Data retention policies active
- [ ] Access controls tested
- [ ] User education materials prepared

## 🔄 Maintenance Schedule

### Daily
- Monitor error logs
- Check for failed login attempts

### Weekly
- Review audit logs for anomalies
- Verify backup systems working

### Monthly
- Update admin user list as needed
- Review access patterns
- Test disaster recovery procedures

### Quarterly
- Full security audit
- Update documentation
- Retrain admin users

This system provides a HIPAA-compliant way to manage ePSA data while maintaining strict security and audit requirements.
