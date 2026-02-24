import { useState, useEffect, useCallback } from 'react';
import { auth } from '../config/firebase';
import { getSectionLocks, lockSection } from '../services/phiBackendService';

export const useSectionLocks = (storageMode = null) => {
  const [locks, setLocks] = useState({});
  const [loading, setLoading] = useState(false);

  // Load locks on mount
  useEffect(() => {
    loadLocks();
  }, [storageMode]);

  const loadLocks = useCallback(async () => {
    // Only load locks for cloud storage mode or when there's an authenticated user
    if (storageMode === 'local' || !auth.currentUser) {
      // For local storage mode, use localStorage for locks
      const localLocks = localStorage.getItem('epsa_section_locks');
      if (localLocks) {
        try {
          setLocks(JSON.parse(localLocks));
        } catch (error) {
          console.error('Error parsing local locks:', error);
          setLocks({});
        }
      }
      return;
    }

    setLoading(true);
    try {
      const data = await getSectionLocks();
      setLocks(data.locks || {});
    } catch (error) {
      console.error('Error loading locks:', error);
      // Fallback to empty locks for cloud mode if error occurs
      setLocks({});
    } finally {
      setLoading(false);
    }
  }, [storageMode]);

  const isLocked = useCallback((section) => {
    return locks[section]?.locked === true;
  }, [locks]);

  const lockUserSection = useCallback(async (section, reason) => {
    try {
      if (storageMode === 'local' || !auth.currentUser) {
        // For local storage mode, store locks in localStorage
        const newLocks = {
          ...locks,
          [section]: {
            locked: true,
            reason,
            timestamp: new Date().toISOString()
          }
        };
        setLocks(newLocks);
        localStorage.setItem('epsa_section_locks', JSON.stringify(newLocks));
        return true;
      } else {
        // For cloud storage mode, use backend service
        await lockSection(section, reason);
        await loadLocks(); // Refresh locks
        return true;
      }
    } catch (error) {
      console.error('Error locking section:', error);
      return false;
    }
  }, [locks, storageMode, loadLocks]);

  const getLockInfo = useCallback((section) => {
    return locks[section] || null;
  }, [locks]);

  return {
    locks,
    loading,
    isLocked,
    lockSection: lockUserSection,
    getLockInfo,
    refreshLocks: loadLocks
  };
};
