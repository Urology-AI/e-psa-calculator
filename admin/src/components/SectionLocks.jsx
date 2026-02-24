import React, { useState, useEffect } from 'react';
import { getSectionLocks, lockSection, unlockSection } from '../services/adminService';
import './SectionLocks.css';

const SectionLocks = ({ userId }) => {
  const [locks, setLocks] = useState({});
  const [loading, setLoading] = useState(false);
  const [unlockDialog, setUnlockDialog] = useState({ open: false, section: '', reason: '' });
  const [lockDialog, setLockDialog] = useState({ open: false, section: '', reason: '' });

  useEffect(() => {
    if (userId) {
      loadLocks();
    }
  }, [userId]);

  const loadLocks = async () => {
    setLoading(true);
    try {
      const data = await getSectionLocks(userId);
      setLocks(data.locks || {});
    } catch (error) {
      console.error('Error loading locks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    try {
      await unlockSection(userId, unlockDialog.section, unlockDialog.reason);
      await loadLocks();
      setUnlockDialog({ open: false, section: '', reason: '' });
    } catch (error) {
      console.error('Error unlocking section:', error);
      alert('Failed to unlock section');
    }
  };

  const handleLock = async () => {
    try {
      await lockSection(userId, lockDialog.section, lockDialog.reason);
      await loadLocks();
      setLockDialog({ open: false, section: '', reason: '' });
    } catch (error) {
      console.error('Error locking section:', error);
      alert('Failed to lock section');
    }
  };

  const getSectionName = (section) => {
    const names = {
      part1: 'Part 1 - Initial Assessment',
      part2: 'Part 2 - Follow-up Assessment'
    };
    return names[section] || section;
  };

  const getSectionStatus = (section) => {
    const lock = locks[section];
    if (!lock) return { status: 'unlocked', text: 'Unlocked', color: '#dcfce7' };
    
    return {
      status: lock.locked ? 'locked' : 'unlocked',
      text: lock.locked ? 'Locked' : 'Unlocked',
      color: lock.locked ? '#fee2e2' : '#dcfce7'
    };
  };

  if (!userId) {
    return <div className="section-locks">Select a user to view section locks</div>;
  }

  return (
    <div className="section-locks">
      <div className="locks-header">
        <h3>Section Locks</h3>
        <button onClick={loadLocks} disabled={loading} className="btn btn-secondary">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="locks-content">
        {['part1', 'part2'].map(section => {
          const lock = locks[section];
          const status = getSectionStatus(section);
          
          return (
            <div key={section} className="lock-item">
              <div className="lock-info">
                <h4>{getSectionName(section)}</h4>
                <div className="lock-status" style={{ backgroundColor: status.color }}>
                  {status.text}
                </div>
              </div>
              
              {lock && (
                <div className="lock-details">
                  <p><strong>Locked:</strong> {lock.lockedAt ? new Date(lock.lockedAt).toLocaleString() : 'Unknown'}</p>
                  <p><strong>Reason:</strong> {lock.reason || 'No reason provided'}</p>
                  {lock.unlockedAt && (
                    <p><strong>Unlocked:</strong> {new Date(lock.unlockedAt).toLocaleString()}</p>
                  )}
                  {lock.adminReason && (
                    <p><strong>Admin Reason:</strong> {lock.adminReason}</p>
                  )}
                </div>
              )}
              
              <div className="lock-actions">
                {lock?.locked ? (
                  <button 
                    onClick={() => setUnlockDialog({ open: true, section, reason: '' })}
                    className="btn btn-warning"
                  >
                    Unlock Section
                  </button>
                ) : (
                  <button 
                    onClick={() => setLockDialog({ open: true, section, reason: '' })}
                    className="btn btn-primary"
                  >
                    Lock Section
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unlock Dialog */}
      {unlockDialog.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Unlock Section</h3>
              <button onClick={() => setUnlockDialog({ open: false, section: '', reason: '' })}>×</button>
            </div>
            <div className="modal-body">
              <p>Unlock <strong>{getSectionName(unlockDialog.section)}</strong>?</p>
              <textarea
                placeholder="Admin reason for unlocking..."
                value={unlockDialog.reason}
                onChange={(e) => setUnlockDialog({ ...unlockDialog, reason: e.target.value })}
                className="reason-input"
                rows={3}
              />
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setUnlockDialog({ open: false, section: '', reason: '' })}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleUnlock}
                disabled={!unlockDialog.reason.trim()}
                className="btn btn-warning"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Dialog */}
      {lockDialog.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Lock Section</h3>
              <button onClick={() => setLockDialog({ open: false, section: '', reason: '' })}>×</button>
            </div>
            <div className="modal-body">
              <p>Lock <strong>{getSectionName(lockDialog.section)}</strong>?</p>
              <textarea
                placeholder="Reason for locking..."
                value={lockDialog.reason}
                onChange={(e) => setLockDialog({ ...lockDialog, reason: e.target.value })}
                className="reason-input"
                rows={3}
              />
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setLockDialog({ open: false, section: '', reason: '' })}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleLock}
                disabled={!lockDialog.reason.trim()}
                className="btn btn-primary"
              >
                Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionLocks;
