import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initAuth } from '@src/js/auth.js';

// Need hashCode polyfill for loginForm
import '@src/js/utils/helpers.js';

function createMockScope() {
  return {
    user: {},
    errors: {},
    ballot: {},
    login: {},
    secure: {},
    zipCode: '',
    uniqueCode: '',
    uniqueCodeValid: false,
    partyAffiliation: '',
    navigate: vi.fn(),
    // Stubs for functions that auth.js calls
    validateZip: null,
    validateCode: null
  };
}

function createMockHttp(responseData) {
  var mockThen = {
    then: vi.fn(function (successFn) {
      if (successFn) successFn({ data: responseData });
      return mockThen;
    }),
    catch: vi.fn()
  };
  var httpFn = vi.fn(function () { return mockThen; });
  httpFn.get = vi.fn(function () { return mockThen; });
  httpFn._mockThen = mockThen;
  httpFn._setResponse = function (data) {
    mockThen.then = vi.fn(function (successFn) {
      if (successFn) successFn({ data: data });
      return mockThen;
    });
  };
  return httpFn;
}

describe('signOut', () => {
  it('clears user, calls resetNav, navigates to home', () => {
    var $s = createMockScope();
    $s.user = { id: '1', name: 'alice' };
    var resetNav = vi.fn();
    initAuth($s, createMockHttp(), {}, resetNav);

    $s.signOut();

    expect($s.user).toEqual({});
    expect(resetNav).toHaveBeenCalled();
    expect($s.navigate).toHaveBeenCalledWith('home');
  });
});

describe('validateZip', () => {
  var $s, $http, resetNav;

  beforeEach(() => {
    $s = createMockScope();
    $http = createMockHttp();
    resetNav = vi.fn();
    initAuth($s, $http, { $$search: { key: 'abc' } }, resetNav);
  });

  it('rejects non-5-digit input with error message', () => {
    $s.zipCode = '123';
    $s.validateZip();
    expect($s.errors.zipCode).toContain('5-digit');
  });

  it('sets ballot.voterName when valid zip + code + party', () => {
    $s.zipCode = '90210';
    $s.uniqueCodeValid = true;
    $s.uniqueCode = 'ABCDEF';
    $s.partyAffiliation = 'DEM';

    $s.validateZip();

    expect($s.errors.zipCode).toBeNull();
    expect($s.ballot.voterName).toBe('abcdef-90210-DEM');
  });
});

describe('validateCode', () => {
  var $s, $http, resetNav;

  beforeEach(() => {
    $s = createMockScope();
    $http = createMockHttp([]);
    resetNav = vi.fn();
    initAuth($s, $http, { $$search: {} }, resetNav);
  });

  it('rejects codes not 6 chars long', () => {
    $s.uniqueCode = 'abc';
    $s.validateCode();
    expect($s.errors.uniqueCode).toContain('valid unique code');
  });

  it('accepts trick code without HTTP call', () => {
    $s.uniqueCode = '123456';
    $s.validateCode();
    expect($s.uniqueCodeValid).toBe(true);
    expect($http.get).not.toHaveBeenCalled();
  });

  it('makes HTTP call for valid-length non-trick codes', () => {
    $s.uniqueCode = 'abcdef';
    $s.validateCode();
    expect($http.get).toHaveBeenCalled();
  });

  it('sets error when API returns empty response', () => {
    $http = createMockHttp([]);
    initAuth($s, $http, { $$search: {} }, resetNav);
    $s.uniqueCode = 'abcdef';
    $s.validateCode();
    expect($s.errors.uniqueCode).toContain('valid unique code');
  });
});

describe('validateSecureCode', () => {
  var $s, $http;

  beforeEach(() => {
    $s = createMockScope();
    $s.ballot = { id: '42' };
    $http = createMockHttp({ valid: true });
    initAuth($s, $http, { $$search: {} }, vi.fn());
  });

  it('normalizes 0→o, 1→i and lowercases', () => {
    $s.secure = { voterCode: 'A0B1CD' };
    $s.validateSecureCode();
    // Should have called API with normalized code
    var callUrl = $http.get.mock.calls[0][0];
    expect(callUrl).toContain('code=aobicd');
  });

  it('rejects codes under 6 chars', () => {
    $s.secure = { voterCode: 'abc' };
    $s.validateSecureCode();
    expect($s.errors.secureCode).toContain('6-character');
    expect($http.get).not.toHaveBeenCalled();
  });
});

describe('loginForm', () => {
  it('hashes password with salt and POSTs to /api/login.php', () => {
    var $s = createMockScope();
    $s.login = { username: 'alice', password: 'secret', remember: false };
    var $http = createMockHttp([{ id: '1', username: 'alice', email: 'a@b.com', image: '' }]);
    initAuth($s, $http, { $$search: {} }, vi.fn());

    $s.loginForm();

    expect($http).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/api/login.php'
      })
    );
    // Password should be hashed (a number), not the raw string
    var payload = $http.mock.calls[0][0].data;
    expect(typeof payload.password).toBe('number');
  });

  it('sets loginError on string response (failure)', () => {
    var $s = createMockScope();
    $s.login = { username: 'alice', password: 'wrong' };
    var $http = createMockHttp('error string');
    initAuth($s, $http, { $$search: {} }, vi.fn());

    $s.loginForm();

    expect($s.loginError).toBe(true);
  });
});

describe('updateUser', () => {
  it('sets user and calls resetNav', () => {
    var $s = createMockScope();
    var resetNav = vi.fn();
    initAuth($s, createMockHttp(), { $$search: {} }, resetNav);

    $s.updateUser({ id: '5', name: 'bob' }, 'profile');

    expect($s.user.id).toBe('5');
    expect($s.user.username).toBe('bob');
    expect(resetNav).toHaveBeenCalledWith(true);
    expect($s.navigate).toHaveBeenCalledWith('profile');
  });

  it('POSTs to add-user when no nav param given', () => {
    var $s = createMockScope();
    var $http = createMockHttp();
    initAuth($s, $http, { $$search: {} }, vi.fn());

    $s.updateUser({ id: '5', name: 'bob' });

    expect($s.navigate).not.toHaveBeenCalled();
    expect($http).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/add-user.php'
      })
    );
  });
});
