import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Comprehensive Firebase Testing Suite for ePSA Session Management
 * Tests all session creation, linking, unlinking, and data persistence scenarios
 */

class FirebaseSessionTester {
  constructor() {
    this.testResults = [];
    this.testSessions = [];
  }

  log(message, type = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      type,
      success: type === 'success'
    };
    this.testResults.push(logEntry);
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  async runAllTests() {
    this.log('Starting comprehensive Firebase session tests...');
    
    try {
      await this.testSessionCreation();
      await this.testProfileUpdates();
      await this.testSessionLinking();
      await this.testJSONImport();
      await this.testSessionUnlinking();
      await this.testDataPersistence();
      await this.cleanupTestSessions();
      
      this.log('All Firebase tests completed successfully!', 'success');
      return this.generateReport();
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async testSessionCreation() {
    this.log('=== Testing Session Creation ===');
    
    // Test 1: Create anonymous session
    const sessionId1 = this.generateSessionId();
    const sessionData1 = {
      uid: sessionId1,
      sessionId: sessionId1,
      authMethod: 'anonymous',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isAnonymous: true,
      email: null,
      phone: null,
      hasFirebaseUser: false
    };

    await setDoc(doc(db, 'users', sessionId1), sessionData1);
    this.testSessions.push(sessionId1);
    
    // Verify session was created
    const createdDoc = await getDoc(doc(db, 'users', sessionId1));
    if (!createdDoc.exists()) {
      throw new Error('Failed to create anonymous session');
    }
    this.log(`✓ Anonymous session created: ${sessionId1}`, 'success');

    // Test 2: Create session with email
    const sessionId2 = this.generateSessionId();
    const sessionData2 = {
      ...sessionData1,
      uid: sessionId2,
      sessionId: sessionId2,
      email: 'test@example.com',
      phone: null
    };

    await setDoc(doc(db, 'users', sessionId2), sessionData2);
    this.testSessions.push(sessionId2);
    
    const emailDoc = await getDoc(doc(db, 'users', sessionId2));
    const emailData = emailDoc.data();
    if (emailData.email !== 'test@example.com') {
      throw new Error('Failed to create session with email');
    }
    this.log(`✓ Session with email created: ${sessionId2}`, 'success');

    // Test 3: Create session with phone
    const sessionId3 = this.generateSessionId();
    const sessionData3 = {
      ...sessionData1,
      uid: sessionId3,
      sessionId: sessionId3,
      email: null,
      phone: '+15551234567'
    };

    await setDoc(doc(db, 'users', sessionId3), sessionData3);
    this.testSessions.push(sessionId3);
    
    const phoneDoc = await getDoc(doc(db, 'users', sessionId3));
    const phoneData = phoneDoc.data();
    if (phoneData.phone !== '+15551234567') {
      throw new Error('Failed to create session with phone');
    }
    this.log(`✓ Session with phone created: ${sessionId3}`, 'success');
  }

  async testProfileUpdates() {
    this.log('=== Testing Profile Updates ===');
    
    const sessionId = this.testSessions[0];
    
    // Test adding email to anonymous session
    await updateDoc(doc(db, 'users', sessionId), {
      email: 'updated@example.com',
      lastLoginAt: new Date().toISOString()
    });
    
    const updatedDoc = await getDoc(doc(db, 'users', sessionId));
    const updatedData = updatedDoc.data();
    if (updatedData.email !== 'updated@example.com') {
      throw new Error('Failed to update email');
    }
    this.log(`✓ Email update successful for session: ${sessionId}`, 'success');

    // Test adding phone to session
    await updateDoc(doc(db, 'users', sessionId), {
      phone: '+15559876543',
      lastLoginAt: new Date().toISOString()
    });
    
    const phoneUpdatedDoc = await getDoc(doc(db, 'users', sessionId));
    const phoneUpdatedData = phoneUpdatedDoc.data();
    if (phoneUpdatedData.phone !== '+15559876543') {
      throw new Error('Failed to update phone');
    }
    this.log(`✓ Phone update successful for session: ${sessionId}`, 'success');

    // Test removing contact info
    await updateDoc(doc(db, 'users', sessionId), {
      email: null,
      phone: null,
      lastLoginAt: new Date().toISOString()
    });
    
    const clearedDoc = await getDoc(doc(db, 'users', sessionId));
    const clearedData = clearedDoc.data();
    if (clearedData.email !== null || clearedData.phone !== null) {
      throw new Error('Failed to clear contact info');
    }
    this.log(`✓ Contact info cleared successfully for session: ${sessionId}`, 'success');
  }

  async testSessionLinking() {
    this.log('=== Testing Session Linking ===');
    
    // Simulate JSON import with session ID
    const existingSessionId = this.testSessions[1];
    const importData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      part: 'part1',
      formData: {
        age: '65',
        race: 'black',
        heightFt: '5',
        heightIn: '10',
        weight: '180'
      },
      userInfo: {
        sessionId: existingSessionId,
        email: 'test@example.com'
      }
    };

    // Test linking to existing session
    await updateDoc(doc(db, 'users', existingSessionId), {
      importedData: importData.formData,
      importDate: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    });
    
    const linkedDoc = await getDoc(doc(db, 'users', existingSessionId));
    const linkedData = linkedDoc.data();
    if (!linkedData.importedData || linkedData.importedData.age !== '65') {
      throw new Error('Failed to link import data to session');
    }
    this.log(`✓ Import data linked to session: ${existingSessionId}`, 'success');

    // Test creating new session for import without session ID
    const newSessionId = this.generateSessionId();
    const newSessionData = {
      uid: newSessionId,
      sessionId: newSessionId,
      authMethod: 'anonymous',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isAnonymous: true,
      email: 'imported@example.com',
      phone: null,
      hasFirebaseUser: false,
      importedData: importData.formData,
      importDate: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', newSessionId), newSessionData);
    this.testSessions.push(newSessionId);
    
    const newDoc = await getDoc(doc(db, 'users', newSessionId));
    const newData = newDoc.data();
    if (!newData.importedData || newData.email !== 'imported@example.com') {
      throw new Error('Failed to create new session with import data');
    }
    this.log(`✓ New session created with import data: ${newSessionId}`, 'success');
  }

  async testJSONImport() {
    this.log('=== Testing JSON Import Scenarios ===');
    
    // Test 1: Import with existing session ID
    const sessionId = this.testSessions[2];
    const jsonWithSession = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      part: 'complete',
      part1Data: {
        age: '70',
        race: 'white',
        heightFt: '6',
        heightIn: '0',
        weight: '200'
      },
      part2Data: {
        psa: '4.5',
        knowPsa: true,
        pirads: '3'
      },
      userInfo: {
        sessionId: sessionId,
        phone: '+15551112222'
      }
    };

    await updateDoc(doc(db, 'users', sessionId), {
      importedData: jsonWithSession.part1Data,
      importDate: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    });
    
    const importDoc = await getDoc(doc(db, 'users', sessionId));
    const importData = importDoc.data();
    if (!importData.importedData || importData.importedData.age !== '70') {
      throw new Error('Failed to import complete data with session ID');
    }
    this.log(`✓ Complete JSON import with session ID successful: ${sessionId}`, 'success');

    // Test 2: Import without session ID (creates new session)
    const newImportSessionId = this.generateSessionId();
    const jsonWithoutSession = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      part: 'part1',
      formData: {
        age: '55',
        race: 'asian',
        heightFt: '5',
        heightIn: '8',
        weight: '160'
      },
      userInfo: {
        email: 'newimport@example.com'
      }
    };

    const newImportData = {
      uid: newImportSessionId,
      sessionId: newImportSessionId,
      authMethod: 'anonymous',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isAnonymous: true,
      email: 'newimport@example.com',
      phone: null,
      hasFirebaseUser: false,
      importedData: jsonWithoutSession.formData,
      importDate: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', newImportSessionId), newImportData);
    this.testSessions.push(newImportSessionId);
    
    const newImportDoc = await getDoc(doc(db, 'users', newImportSessionId));
    const newImportDataResult = newImportDoc.data();
    if (!newImportDataResult.importedData || newImportDataResult.email !== 'newimport@example.com') {
      throw new Error('Failed to create new session from JSON import');
    }
    this.log(`✓ New session created from JSON import: ${newImportSessionId}`, 'success');
  }

  async testSessionUnlinking() {
    this.log('=== Testing Session Unlinking ===');
    
    // Test unlinking a session
    const sessionIdToDelete = this.testSessions.pop(); // Remove last session for deletion test
    
    if (sessionIdToDelete) {
      // Verify session exists before deletion
      const beforeDoc = await getDoc(doc(db, 'users', sessionIdToDelete));
      if (!beforeDoc.exists()) {
        throw new Error('Session to delete does not exist');
      }
      
      // Delete session
      await deleteDoc(doc(db, 'users', sessionIdToDelete));
      
      // Verify session was deleted
      const afterDoc = await getDoc(doc(db, 'users', sessionIdToDelete));
      if (afterDoc.exists()) {
        throw new Error('Failed to delete session');
      }
      
      this.log(`✓ Session successfully deleted: ${sessionIdToDelete}`, 'success');
    }
  }

  async testDataPersistence() {
    this.log('=== Testing Data Persistence ===');
    
    // Test that data persists across updates
    const sessionId = this.testSessions[0];
    
    // Add assessment data
    const assessmentData = {
      age: '62',
      race: 'hispanic',
      heightFt: '5',
      heightIn: '9',
      weight: '175',
      bmi: 25.8,
      familyHistory: 'yes',
      brcaStatus: 'no'
    };

    await updateDoc(doc(db, 'users', sessionId), {
      assessmentData: assessmentData,
      lastAssessmentDate: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    });
    
    // Add consent data
    const consentData = {
      consentToContact: true,
      consentTimestamp: new Date().toISOString()
    };

    await updateDoc(doc(db, 'users', sessionId), {
      consentToContact: consentData.consentToContact,
      consentTimestamp: consentData.consentTimestamp
    });
    
    // Verify all data persists
    const finalDoc = await getDoc(doc(db, 'users', sessionId));
    const finalData = finalDoc.data();
    
    if (!finalData.assessmentData || finalData.assessmentData.age !== '62') {
      throw new Error('Assessment data not persisted');
    }
    
    if (finalData.consentToContact !== true) {
      throw new Error('Consent data not persisted');
    }
    
    this.log(`✓ All data types persisted correctly for session: ${sessionId}`, 'success');
  }

  async cleanupTestSessions() {
    this.log('=== Cleaning Up Test Sessions ===');
    
    for (const sessionId of this.testSessions) {
      try {
        await deleteDoc(doc(db, 'users', sessionId));
        this.log(`✓ Cleaned up session: ${sessionId}`, 'success');
      } catch (error) {
        this.log(`Failed to cleanup session ${sessionId}: ${error.message}`, 'error');
      }
    }
    
    this.testSessions = [];
  }

  generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let sessionId = 'TEST_';
    for (let i = 0; i < 8; i++) {
      sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return sessionId;
  }

  generateReport() {
    const successCount = this.testResults.filter(r => r.success).length;
    const errorCount = this.testResults.filter(r => r.type === 'error').length;
    
    return {
      summary: {
        total: this.testResults.length,
        successful: successCount,
        failed: errorCount,
        successRate: `${((successCount / this.testResults.length) * 100).toFixed(1)}%`
      },
      details: this.testResults,
      timestamp: new Date().toISOString()
    };
  }
}

// Export for use in components
export { FirebaseSessionTester };

// Auto-run function for testing
export const runFirebaseTests = async () => {
  const tester = new FirebaseSessionTester();
  try {
    const results = await tester.runAllTests();
    console.log('Firebase Test Results:', results);
    return results;
  } catch (error) {
    console.error('Firebase tests failed:', error);
    throw error;
  }
};
