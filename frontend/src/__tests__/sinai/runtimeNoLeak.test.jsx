// @vitest-environment jsdom
/**
 * Runtime guard for the Sinai promise: answering every question and reading the
 * result makes no storage or network call. Every channel is spied on; the only
 * acceptable number of calls is zero (so no call can contain the answers).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderSinaiResult } from './driveSinai.jsx';

describe('Sinai build at runtime', () => {
  const calls = [];
  const record = (name) => (...args) => { calls.push({ name, args: JSON.stringify(args).slice(0, 200) }); };
  let restore = [];

  beforeEach(() => {
    calls.length = 0;
    restore = [];
    const spy = (obj, key, name) => {
      const orig = obj[key];
      obj[key] = record(name);
      restore.push(() => { obj[key] = orig; });
    };
    spy(globalThis, 'fetch', 'fetch');
    spy(XMLHttpRequest.prototype, 'open', 'XMLHttpRequest.open');
    spy(XMLHttpRequest.prototype, 'send', 'XMLHttpRequest.send');
    spy(Storage.prototype, 'setItem', 'Storage.setItem');
    spy(Navigator.prototype, 'sendBeacon', 'sendBeacon');
    if (globalThis.indexedDB) spy(globalThis.indexedDB, 'open', 'indexedDB.open');
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', { configurable: true, get: () => '', set: record('document.cookie') });
    restore.push(() => { delete document.cookie; if (cookie) Object.defineProperty(Document.prototype, 'cookie', cookie); });
    const OrigWS = globalThis.WebSocket;
    globalThis.WebSocket = function WebSocketSpy() { record('WebSocket')(); throw new Error('blocked'); };
    restore.push(() => { globalThis.WebSocket = OrigWS; });
  });

  afterEach(() => { restore.forEach((r) => r()); document.body.innerHTML = ''; });

  it('canary: the spies really do record storage and network calls', () => {
    window.localStorage.setItem('k', 'v');
    globalThis.fetch('/x');
    navigator.sendBeacon('/y', 'z');
    expect(calls.map((c) => c.name)).toEqual(['Storage.setItem', 'fetch', 'sendBeacon']);
  });

  it('answering all questions and viewing the result touches no storage or network API', async () => {
    const { container, unmount } = await renderSinaiResult({ age: 61, weightLb: 187 });
    expect(container.querySelector('.ms-result')).not.toBeNull(); // really reached the result
    expect(calls).toEqual([]);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    unmount();
  });

  it('also holds for a high-risk profile', async () => {
    const { container, unmount } = await renderSinaiResult({ age: 72, optionIndex: 1 });
    expect(container.querySelector('.ms-result')).not.toBeNull();
    expect(calls).toEqual([]);
    unmount();
  });
});
