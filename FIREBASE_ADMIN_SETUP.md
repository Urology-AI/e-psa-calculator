# Firebase Console Admin Setup Guide

## 🔐 Admin User Management (Firebase Console Only)

Admin users are now managed exclusively through Firebase Console using custom claims. No hardcoded email lists in the backend code.

## 👥 Setting Up Admin Users

### Step 1: Create User Account
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `epsa-30d0b`
3. Navigate to **Authentication** → **Users**
4. Click **"Add User"**
5. Enter email and password
6. Click **"Add User"**

### Step 2: Grant Admin Privileges
1. In the Users list, find the user you want to make admin
2. Click the menu icon (⋮) next to the user
3. Select **"Add custom claim"**
4. Enter the following JSON:
```json
{
  "admin": true
}
```
5. Click **"Add custom claim"**

### Step 3: Verify Admin Access
1. User should sign out and sign back in
2. Go to admin dashboard: https://admin-epsa-30d0b.web.app
3. Login with the admin credentials
4. Verify dashboard access is granted

## 🔍 Managing Admin Users

### To Add New Admin
Repeat Steps 1-2 above for each new admin user.

### To Remove Admin Access
1. Go to Firebase Console → Authentication → Users
2. Find the admin user
3. Click the menu icon (⋮) → "Add custom claim"
4. Enter empty JSON: `{}`
5. Click "Add custom claim"

### To List Current Admins
1. In Firebase Console → Authentication → Users
2. Look for users with custom claims containing `"admin": true`
3. Alternatively, use the admin dashboard to view admin access

## 🛡️ Security Benefits

### No Hardcoded Admins
- Admin list not stored in source code
- No need to redeploy when adding/removing admins
- Admin access managed securely through Firebase Console

### Centralized Management
- All user management in one place
- Firebase handles authentication securely
- Custom claims provide role-based access

### Audit Trail
- All admin access logged in backend
- Firebase Console tracks user management
- Complete audit trail for compliance

## 📋 Admin Access Workflow

### For New Admins
1. **Account Creation**: Firebase Admin creates user account
2. **Privilege Grant**: Admin adds `{"admin": true}` custom claim
3. **First Login**: User logs into admin dashboard
4. **Verification**: System verifies admin claim and grants access

### For Existing Users
1. **Identify User**: Find user in Firebase Console
2. **Grant Access**: Add admin custom claim
3. **Notify User**: Inform user they now have admin access
4. **Login**: User can access admin dashboard

## 🔧 Technical Implementation

### Backend Check
```typescript
// Function to check admin claims
function hasAdminClaim(context: functions.https.CallableContext): boolean {
  return !!(context.auth?.token?.admin === true);
}
```

### Frontend Check
```javascript
// Check admin claims on login
const idTokenResult = await user.getIdTokenResult();
if (idTokenResult.claims.admin === true) {
  // Grant admin access
}
```

## 🚨 Important Notes

### Security
- Only Firebase project owners can manage custom claims
- Admin claims are signed by Firebase and cannot be forged
- All admin access is logged for HIPAA compliance

### Best Practices
- Use strong passwords for admin accounts
- Enable 2FA on Firebase Console accounts
- Regularly review who has admin access
- Remove admin access when no longer needed

### Troubleshooting
- **"Access Denied"**: Verify custom claim is set correctly
- **Still No Access**: User must sign out and sign back in after claim is added
- **Cannot Add Claims**: Ensure you have sufficient permissions in Firebase Console

## 📊 Compliance & Auditing

### HIPAA Compliance
- ✅ Admin access controlled via Firebase Console
- ✅ All admin actions logged in audit trail
- ✅ No hardcoded admin credentials in code
- ✅ Centralized user management

### Audit Requirements
- Admin user additions/removals tracked in Firebase Console
- Backend logs all admin access attempts
- Custom claim changes are auditable
- Complete audit trail available for compliance reviews

This approach provides a secure, scalable, and HIPAA-compliant way to manage admin users without hardcoding credentials in the application code.
