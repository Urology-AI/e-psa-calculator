# Firestore Database Admin Setup Guide

## 🔐 Admin User Management (Firestore Database)

Admin users are now managed through the Firestore database using an `admins` collection. This provides better control and auditability compared to custom claims.

## 👥 Setting Up Admin Users

### Step 1: Create User Account
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `epsa-30d0b`
3. Navigate to **Authentication** → **Users**
4. Click **"Add User"**
5. Enter email and password
6. Click **"Add User"**
7. **Note the User ID** (you'll need this for Step 2)

### Step 2: Grant Admin Privileges in Firestore
1. In Firebase Console, go to **Firestore Database**
2. Navigate to the **"admins"** collection (create if it doesn't exist)
3. Click **"Add document"**
4. Use the **User ID** from Step 1 as the **Document ID**
5. Set the document with the following fields:
```json
{
  "isActive": true,
  "email": "user@example.com",
  "createdAt": "2026-02-24T10:00:00Z",
  "createdBy": "admin-uid-here"
}
```

### Step 3: Verify Admin Access
1. User should sign out and sign back in
2. Go to admin dashboard: https://admin-epsa-30d0b.web.app
3. Login with the admin credentials
4. System will check Firestore `admins` collection
5. Verify dashboard access is granted

## 📊 Admin Document Structure

### Required Fields
```json
{
  "isActive": true,        // Must be true for access
  "email": "user@example.com",  // User's email for reference
  "createdAt": "timestamp",     // When admin was added
  "createdBy": "uid"            // Who added this admin
}
```

### Optional Fields
```json
{
  "role": "super_admin",        // Admin role/level
  "permissions": ["read", "write", "delete"],  // Specific permissions
  "lastLogin": "timestamp",     // Track last login
  "notes": "Department head"    // Additional notes
}
```

## 🔍 Managing Admin Users

### To Add New Admin
1. Create user account in Firebase Authentication
2. Add document to `admins` collection with User ID as document ID
3. Set `"isActive": true`
4. User can now access admin dashboard

### To Deactivate Admin (Soft Delete)
1. Go to Firestore Database → `admins` collection
2. Find the admin document
3. Update `"isActive"` field to `false`
4. User will lose admin access immediately

### To Remove Admin (Hard Delete)
1. Go to Firestore Database → `admins` collection
2. Find the admin document
3. Delete the entire document
4. User will lose admin access immediately

### To List Current Admins
```javascript
// In Firebase Console or using admin SDK
const adminsSnapshot = await db.collection('admins')
  .where('isActive', '==', true)
  .get();

adminsSnapshot.forEach(doc => {
  console.log(`Admin: ${doc.data().email}, ID: ${doc.id}`);
});
```

## 🛡️ Security Benefits

### Database-Level Control
- Admin status stored in secure Firestore database
- No hardcoded credentials in source code
- Immediate access control through database updates

### Audit Trail
- All admin changes tracked in Firestore
- Document creation/modification timestamps
- Can track who added/removed admins

### Granular Permissions
- Can add role-based permissions in future
- Can track last login times
- Can add notes or department information

## 🔧 Technical Implementation

### Backend Check
```typescript
// Function to check admin status in Firestore
async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const adminDoc = await db.collection('admins').doc(userId).get();
    return adminDoc.exists && adminDoc.data()?.isActive === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
```

### Frontend Check
```javascript
// Check admin status on login
const { adminLogin } = await import('./services/adminService');
await adminLogin(user.email); // Verifies admin in Firestore
```

## 📋 Admin Access Workflow

### For New Admins
1. **Account Creation**: Firebase Admin creates user account
2. **Get User ID**: Copy User ID from Authentication section
3. **Database Entry**: Add document to `admins` collection
4. **First Login**: User logs into admin dashboard
5. **Verification**: System checks Firestore and grants access

### For Existing Users
1. **Find User ID**: Get User ID from Authentication
2. **Add Admin Document**: Create document in `admins` collection
3. **Grant Access**: Set `"isActive": true`
4. **Notify User**: Inform user they now have admin access
5. **Login**: User can access admin dashboard

## 🚨 Important Notes

### Security
- Only Firestore project owners can manage `admins` collection
- Admin status cannot be forged (requires database access)
- All admin access is logged for HIPAA compliance

### Best Practices
- Use meaningful User IDs (copy from Authentication)
- Always include `createdAt` and `createdBy` fields
- Set `isActive` to `false` instead of deleting when possible
- Regularly review who has admin access

### Troubleshooting
- **"Access Denied"**: Verify user exists in `admins` collection with `isActive: true`
- **Still No Access**: User must sign out and sign back in after admin document is added
- **Cannot Find User ID**: Go to Authentication → Users → click on user to see UID

## 📊 Firestore Security Rules

Add these rules to your `firestore.rules` to secure the admin collection:

```javascript
// Admins collection - only project owners can manage
match /admins/{userId} {
  allow read, write: if request.auth != null && 
    request.auth.token.email.matches('.*@nyulangone.org$');
}
```

## 🔄 Migration from Custom Claims

If you were previously using custom claims:

1. **List Current Admins**: Use Firebase Console to see users with admin claims
2. **Create Admin Documents**: Add each admin to `admins` collection
3. **Test Access**: Verify each admin can still access dashboard
4. **Remove Custom Claims**: Clean up old custom claims (optional)

This approach provides a secure, scalable, and HIPAA-compliant way to manage admin users using the Firestore database.
