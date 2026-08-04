import React, { useState, useCallback } from 'react';
import { CheckIcon, ClockIcon, CircleIcon } from 'lucide-react';

const STATUS_CYCLE = ['pending', 'scheduled', 'done'];
const STATUS_META = {
  pending: { label: 'Pending', Icon: CircleIcon },
  scheduled: { label: 'Scheduled', Icon: ClockIcon },
  done: { label: 'Done', Icon: CheckIcon },
};

const storageKey = (sessionId) => `epsa_care_plan_${sessionId || 'local'}`;

const readStatuses = (sessionId) => {
  try {
    const raw = window.localStorage.getItem(storageKey(sessionId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

/**
 * Turns the static "My Care Plan" checklist into a navigation tool the
 * patient actually updates over time — click an item to cycle Pending ->
 * Scheduled -> Done, persisted per-session to localStorage so it survives a
 * reload. `items` is [{key, label}]; items not yet touched default to
 * 'pending' (or a caller-supplied initial status via `items[].defaultStatus`).
 */
export const CarePlanChecklist = ({ items = [], sessionId = null }) => {
  const [statuses, setStatuses] = useState(() => {
    const saved = readStatuses(sessionId);
    const initial = {};
    items.forEach((item) => {
      initial[item.key] = saved[item.key] || item.defaultStatus || 'pending';
    });
    return initial;
  });

  const cycleStatus = useCallback((key) => {
    setStatuses((prev) => {
      const cur = prev[key] || 'pending';
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
      const updated = { ...prev, [key]: next };
      try { window.localStorage.setItem(storageKey(sessionId), JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, [sessionId]);

  if (!items.length) return null;

  return (
    <div className="care-plan-checklist" role="list" aria-label="My care plan">
      {items.map((item) => {
        const status = statuses[item.key] || 'pending';
        const { label, Icon } = STATUS_META[status];
        return (
          <div key={item.key} className="care-plan-checklist__item" role="listitem">
            <span className="care-plan-checklist__label">{item.label}</span>
            <button
              type="button"
              className={`care-plan-checklist__status-btn care-plan-checklist__status-btn--${status}`}
              onClick={() => cycleStatus(item.key)}
              aria-label={`${item.label}: ${label}. Click to change status.`}
            >
              <Icon size={12} aria-hidden="true" />
              {label}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default CarePlanChecklist;
