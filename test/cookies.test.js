import { describe, it, expect, beforeEach } from 'vitest';
import { setCookie, getCookie, getDeviceToken } from '@src/js/utils/cookies.js';

// Helper to clear all cookies between tests
function clearCookies() {
  document.cookie.split(';').forEach(function (c) {
    var name = c.trim().split('=')[0];
    if (name) {
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }
  });
}

describe('setCookie', () => {
  beforeEach(clearCookies);

  it('sets a basic cookie', () => {
    setCookie({ name: 'foo', value: 'bar' });
    expect(document.cookie).toContain('foo=bar');
  });

  it('sets a cookie with days-based expiration', () => {
    setCookie({ name: 'persist', value: '1', days: 30 });
    expect(document.cookie).toContain('persist=1');
  });

  it('sets a cookie with an explicit date', () => {
    var future = new Date(Date.now() + 86400000);
    setCookie({ name: 'dated', value: 'yes', date: future });
    expect(document.cookie).toContain('dated=yes');
  });
});

describe('getCookie', () => {
  beforeEach(clearCookies);

  it('returns value for an existing cookie', () => {
    document.cookie = 'test=hello;path=/';
    expect(getCookie('test')).toBe('hello');
  });

  it('returns empty string for a missing cookie', () => {
    expect(getCookie('nonexistent')).toBe('');
  });

  it('handles multiple cookies and leading spaces', () => {
    document.cookie = 'a=1;path=/';
    document.cookie = 'b=2;path=/';
    expect(getCookie('a')).toBe('1');
    expect(getCookie('b')).toBe('2');
  });
});

describe('getDeviceToken', () => {
  beforeEach(clearCookies);

  it('returns a UUID-format string', () => {
    var token = getDeviceToken();
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns the same token on subsequent calls', () => {
    var first = getDeviceToken();
    var second = getDeviceToken();
    expect(second).toBe(first);
  });
});
