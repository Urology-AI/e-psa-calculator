/**
 * Admin Authentication with Email OTP
 * Secure admin login using Firebase Auth email links
 */

import { adminAuth } from '../config/adminFirebase';
import { sendSignInLinkToEmail, signInWithEmailLink, isSignInWithEmailLink } from 'firebase/auth';
import { firebaseAdminAuthService } from './firebaseAdminAuthService';

const ADMIN_ACTION_CODE_SETTINGS = {
  // URL to redirect back to after email verification
  url: window.location.origin + '/',
  // This must be true for email link sign-in
  handleCodeInApp: true,
  // iOS and Android app bundle IDs
  iOS: {
    bundleId: 'com.urologyai.epsa.admin'
  },
  android: {
    packageName: 'com.urologyai.epsa.admin',
    installApp: true,
    minimumVersion: '12'
  }
};

export class AdminAuthService {
  constructor() {
    this.email = null;
  }

  // Send OTP link to admin email
  async sendAdminOTP(email) {
    try {
      this.email = email;
      
      await sendSignInLinkToEmail(adminAuth, email, ADMIN_ACTION_CODE_SETTINGS);
      
      // Save email for later use
      window.localStorage.setItem('adminEmailForSignIn', email);
      
      return {
        success: true,
        message: 'Admin login link sent to your email. Check your inbox and click the link to continue.',
        method: 'email_otp'
      };
    } catch (error) {
      console.error('Error sending admin OTP:', error);
      
      // Check if it's the "operation not allowed" error
      if (error.code === 'auth/operation-not-allowed') {
        return {
          success: false,
          message: 'Email link authentication is not enabled in Firebase. Please enable it in Firebase Console → Authentication → Sign-in method → Email/Password → Enable "Email link (passwordless sign-in)"',
          code: error.code,
          requiresFirebaseSetup: true
        };
      }
      
      return {
        success: false,
        message: this.getErrorMessage(error.code),
        code: error.code
      };
    }
  }

  // Complete sign-in with email link
  async completeAdminSignIn(emailLink) {
    try {
      let email = window.localStorage.getItem('adminEmailForSignIn');
      
      if (!email) {
        // If email not stored, try to extract from link
        email = prompt('Please enter your email address for verification:');
      }
      
      if (!email) {
        throw new Error('Email address required');
      }

      const result = await signInWithEmailLink(adminAuth, email, emailLink);
      
      // Clear stored email
      window.localStorage.removeItem('adminEmailForSignIn');
      
      // Check if user is authorized admin (using Firebase-based system)
      if (await this.isAdminAuthorized(result.user.email, result.user.uid)) {
        // Set admin session
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_user', JSON.stringify({
          email: result.user.email,
          uid: result.user.uid
        }));
        
        return {
          success: true,
          user: result.user,
          message: 'Successfully logged in as admin'
        };
      } else {
        await adminAuth.signOut();
        throw new Error('You are not authorized to access the admin dashboard');
      }
    } catch (error) {
      console.error('Error completing admin sign-in:', error);
      return {
        success: false,
        message: this.getErrorMessage(error.code) || error.message,
        code: error.code
      };
    }
  }

  // Check if current page load is from email link
  checkForEmailLink() {
    if (isSignInWithEmailLink(adminAuth, window.location.href)) {
      return this.completeAdminSignIn(window.location.href);
    }
    return null;
  }

  // Check if user is authorized admin (using Firebase-based system)
  async isAdminAuthorized(email, uid) {
    const authResult = await firebaseAdminAuthService.isAdminAuthorized(email, uid);
    
    if (authResult.authorized) {
      // Update login tracking
      try {
        await firebaseAdminAuthService.updateAdminLogin(uid);
      } catch (updateError) {
        console.error('Error updating admin login tracking:', updateError);
      }
      
      return true;
    } else {
      if (authResult.error) {
        console.error('Authorization error:', authResult.error);
      }
      return false;
    }
  }

  // Get current admin user
  getCurrentAdmin() {
    const adminUser = sessionStorage.getItem('admin_user');
    return adminUser ? JSON.parse(adminUser) : null;
  }

  // Check if admin is authenticated
  isAdminAuthenticated() {
    return sessionStorage.getItem('admin_authenticated') === 'true' && 
           this.getCurrentAdmin() !== null;
  }

  // Logout admin
  async logoutAdmin() {
    try {
      await adminAuth.signOut();
      sessionStorage.removeItem('admin_authenticated');
      sessionStorage.removeItem('admin_user');
      window.localStorage.removeItem('adminEmailForSignIn');
      
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('Error during logout:', error);
      return { success: false, message: 'Error during logout' };
    }
  }

  // Get user-friendly error messages
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/invalid-email': 'Invalid email address',
      'auth/user-not-found': 'Admin account not found',
      'auth/too-many-requests': 'Too many requests. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/internal-error': 'Internal error. Please try again.',
      'auth/configuration-not-found': 'Firebase configuration error',
      'auth/insufficient-permission': 'Insufficient permissions',
      'auth/missing-email': 'Email address is required',
      'auth/operation-not-allowed': 'Email link authentication is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method → Email/Password → Enable "Email link (passwordless sign-in)"',
      'auth/invalid-action-code': 'Invalid or expired login link. Please request a new login link.',
      'auth/expired-action-code': 'Login link has expired. Please request a new link (links expire in 24 hours).',
      'auth/user-disabled': 'Account has been disabled',
      'auth/weak-password': 'Password is too weak',
      'auth/email-already-in-use': 'Email is already in use',
      'auth/invalid-password': 'Invalid password'
    };
    
    return errorMessages[errorCode] || 'Authentication failed. Please try again.';
  }
}

// Create singleton instance
export const adminAuthService = new AdminAuthService();
