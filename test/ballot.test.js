import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dateToTime, roundResultsRelease, updateTime, initBallot, sanitizeTitle, displayTitle, assignFieldSlugs, convertQuillHtml } from '@src/js/ballot.js';

// moment-timezone is CDN-loaded in production; stub .tz() for tests
if (!moment.tz) {
  moment.tz = { guess: () => 'UTC' };
  var origMoment = moment;
  var wrappedMoment = function () {
    var m = origMoment.apply(null, arguments);
    if (!m.tz) {
      m.tz = function () { return m; };
    }
    return m;
  };
  Object.assign(wrappedMoment, origMoment);
  globalThis.moment = wrappedMoment;
}

describe('dateToTime', () => {
  it('converts a Date to {hour, minute, meridian}', () => {
    var d = new Date(2024, 0, 1, 14, 30); // 2:30 PM
    expect(dateToTime(d)).toEqual({ hour: 2, minute: 30, meridian: 'PM' });
  });

  it('handles midnight (12 AM)', () => {
    var d = new Date(2024, 0, 1, 0, 0);
    expect(dateToTime(d)).toEqual({ hour: 12, minute: 0, meridian: 'AM' });
  });

  it('handles noon (12 PM)', () => {
    var d = new Date(2024, 0, 1, 12, 0);
    expect(dateToTime(d)).toEqual({ hour: 12, minute: 0, meridian: 'PM' });
  });

  it('rounds minutes to nearest 5', () => {
    var d = new Date(2024, 0, 1, 9, 13); // 13 → rounds to 15
    expect(dateToTime(d).minute).toBe(15);
  });

  it('caps minutes at 55 when rounding up from 58+', () => {
    var d = new Date(2024, 0, 1, 9, 58); // 58 → rounds to 60, capped at 55
    expect(dateToTime(d).minute).toBe(55);
  });

  it('handles 1 AM', () => {
    var d = new Date(2024, 0, 1, 1, 0);
    expect(dateToTime(d)).toEqual({ hour: 1, minute: 0, meridian: 'AM' });
  });
});

describe('roundResultsRelease', () => {
  it('returns a Date in the future', () => {
    var now = new Date();
    var result = roundResultsRelease();
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it('returns minutes on a 15-minute boundary', () => {
    var result = roundResultsRelease();
    expect(result.getMinutes() % 15).toBe(0);
  });

  it('has seconds set to 0', () => {
    var result = roundResultsRelease();
    expect(result.getSeconds()).toBe(0);
  });
});

describe('updateTime', () => {
  it('returns ISO-like string in YYYY-MM-DD HH:mm:ss format', () => {
    var d = new Date(2024, 5, 15, 14, 30, 0); // June 15, 2024 2:30 PM
    var result = updateTime(d, 'UTC');
    // Should match pattern YYYY-MM-DD HH:mm:ss
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe('initBallot scope setup', () => {
  var $s;

  beforeEach(() => {
    $s = {
      ballot: {},
      errors: {},
      success: {},
      user: {},
      $watch: vi.fn()
    };
    var $http = vi.fn();
    $http.get = vi.fn();
    initBallot($s, $http);
  });

  it('initializes hours array with 12 entries starting at 12', () => {
    expect($s.hours).toEqual([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('initializes minutes array with 12 five-minute increments', () => {
    expect($s.minutes).toHaveLength(12);
    expect($s.minutes[0]).toEqual({ value: 0, label: '00' });
    expect($s.minutes[1]).toEqual({ value: 5, label: '05' });
    expect($s.minutes[11]).toEqual({ value: 55, label: '55' });
  });

  it('registers $watch for ballot.voteCutoff and ballot.resultsRelease', () => {
    var watchCalls = $s.$watch.mock.calls.map(function (c) { return c[0]; });
    expect(watchCalls).toContain('ballot.voteCutoff');
    expect(watchCalls).toContain('ballot.resultsRelease');
  });
});

describe('syncTimeToDate', () => {
  var $s;

  beforeEach(() => {
    $s = {
      ballot: {
        voteCutoff: new Date(2024, 5, 15, 10, 0, 0)
      },
      errors: {},
      success: {},
      user: {},
      $watch: vi.fn()
    };
    var $http = vi.fn();
    $http.get = vi.fn();
    initBallot($s, $http);
  });

  it('updates ballot date from time picker values (PM)', () => {
    $s.syncTimeToDate('voteCutoff', { hour: 3, minute: 30, meridian: 'PM' });
    var d = new Date($s.ballot.voteCutoff);
    expect(d.getHours()).toBe(15);
    expect(d.getMinutes()).toBe(30);
  });

  it('updates ballot date from time picker values (AM)', () => {
    $s.syncTimeToDate('voteCutoff', { hour: 9, minute: 0, meridian: 'AM' });
    var d = new Date($s.ballot.voteCutoff);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });

  it('handles 12 PM (noon) correctly', () => {
    $s.syncTimeToDate('voteCutoff', { hour: 12, minute: 0, meridian: 'PM' });
    var d = new Date($s.ballot.voteCutoff);
    expect(d.getHours()).toBe(12);
  });

  it('handles 12 AM (midnight) correctly', () => {
    $s.syncTimeToDate('voteCutoff', { hour: 12, minute: 0, meridian: 'AM' });
    var d = new Date($s.ballot.voteCutoff);
    expect(d.getHours()).toBe(0);
  });
});

describe('sanitizeTitle', () => {
  it('converts to lowercase', () => {
    expect(sanitizeTitle('My Field')).toBe('my-field');
  });

  it('replaces spaces with dashes', () => {
    expect(sanitizeTitle('first name')).toBe('first-name');
  });

  it('collapses multiple non-alphanumeric characters into a single dash', () => {
    expect(sanitizeTitle('hello   world')).toBe('hello-world');
    expect(sanitizeTitle('foo---bar')).toBe('foo-bar');
    expect(sanitizeTitle('one & two @ three')).toBe('one-two-three');
  });

  it('removes leading and trailing dashes', () => {
    expect(sanitizeTitle('--hello--')).toBe('hello');
    expect(sanitizeTitle('  spaces  ')).toBe('spaces');
    expect(sanitizeTitle('!!!test!!!')).toBe('test');
  });

  it('preserves numbers', () => {
    expect(sanitizeTitle('field 42')).toBe('field-42');
  });

  it('handles mixed special characters', () => {
    expect(sanitizeTitle('Party Affiliation!')).toBe('party-affiliation');
    expect(sanitizeTitle('zip_code (5-digit)')).toBe('zip-code-5-digit');
  });
});

describe('displayTitle', () => {
  it('converts dashes to spaces and title cases', () => {
    expect(displayTitle('my-field')).toBe('My Field');
  });

  it('title cases each word', () => {
    expect(displayTitle('party-affiliation')).toBe('Party Affiliation');
  });

  it('handles single word', () => {
    expect(displayTitle('name')).toBe('Name');
  });

  it('preserves numbers', () => {
    expect(displayTitle('field-42')).toBe('Field 42');
  });

  it('round-trips with sanitizeTitle', () => {
    expect(displayTitle(sanitizeTitle('Zip Code'))).toBe('Zip Code');
  });
});

describe('assignFieldSlugs', () => {
  it('assigns unique slugs for unique titles', () => {
    var fields = [{ title: 'name' }, { title: 'email' }];
    assignFieldSlugs(fields);
    expect(fields.map(f => f.fieldSlug)).toEqual(['name', 'email']);
  });

  it('appends suffix for duplicate titles', () => {
    var fields = [{ title: 'name' }, { title: 'name' }];
    assignFieldSlugs(fields);
    expect(fields.map(f => f.fieldSlug)).toEqual(['name', 'name-2']);
  });

  it('appends incrementing suffixes for triple duplicates', () => {
    var fields = [{ title: 'name' }, { title: 'name' }, { title: 'name' }];
    assignFieldSlugs(fields);
    expect(fields.map(f => f.fieldSlug)).toEqual(['name', 'name-2', 'name-3']);
  });

  it('handles mixed unique and duplicate titles', () => {
    var fields = [{ title: 'zip' }, { title: 'name' }, { title: 'zip' }];
    assignFieldSlugs(fields);
    expect(fields.map(f => f.fieldSlug)).toEqual(['zip', 'name', 'zip-2']);
  });

  it('falls back to "field" when title is empty', () => {
    var fields = [{ title: '' }, { title: '' }];
    assignFieldSlugs(fields);
    expect(fields.map(f => f.fieldSlug)).toEqual(['field', 'field-2']);
  });
});

describe('convertQuillHtml', () => {
  it('strips <script> tags', () => {
    var result = convertQuillHtml('<p>Hello</p><script>alert("xss")</script>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>Hello</p>');
  });

  it('strips inline event handlers (onerror, onclick, etc.)', () => {
    var result = convertQuillHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('strips onclick handlers', () => {
    var result = convertQuillHtml('<p onclick="alert(1)">Click me</p>');
    expect(result).not.toContain('onclick');
  });

  it('strips iframe injection', () => {
    var result = convertQuillHtml('<iframe src="https://evil.com"></iframe><p>Safe</p>');
    expect(result).not.toContain('<iframe');
    expect(result).toContain('<p>Safe</p>');
  });

  it('preserves safe HTML tags', () => {
    var result = convertQuillHtml('<h1>Title</h1><p>Paragraph</p><strong>Bold</strong>');
    expect(result).toContain('<h1>Title</h1>');
    expect(result).toContain('<p>Paragraph</p>');
    expect(result).toContain('<strong>Bold</strong>');
  });

  it('converts Quill bullet lists to <ul>', () => {
    var result = convertQuillHtml('<ol><li data-list="bullet">A</li><li data-list="bullet">B</li></ol>');
    expect(result).toContain('<ul>');
    expect(result).not.toContain('<ol>');
    expect(result).not.toContain('data-list');
  });

  it('keeps ordered lists as <ol>', () => {
    var result = convertQuillHtml('<ol><li data-list="ordered">A</li><li data-list="ordered">B</li></ol>');
    expect(result).toContain('<ol>');
    expect(result).not.toContain('<ul>');
    expect(result).not.toContain('data-list');
  });

  it('converts ql-align-center to inline style', () => {
    var result = convertQuillHtml('<p class="ql-align-center">Centered</p>');
    expect(result).toContain('text-align: center');
    expect(result).not.toContain('ql-align-center');
  });

  it('converts ql-indent to inline padding', () => {
    var result = convertQuillHtml('<p class="ql-indent-2">Indented</p>');
    expect(result).toContain('padding-left: 6em');
    expect(result).not.toContain('ql-indent-2');
  });
});

describe('editCustomHtml', () => {
  var $s, $http, pastedHtml;

  beforeEach(() => {
    pastedHtml = null;

    // Stub Quill globally
    globalThis.Quill = function () {
      this.root = document.createElement('div');
      this.clipboard = {
        dangerouslyPasteHTML: function (html) { pastedHtml = html; }
      };
    };

    $s = {
      ballot: {},
      errors: {},
      success: {},
      user: { id: 'user1' },
      $watch: vi.fn()
    };

    // Mock $http.get to return a resolved promise
    $http = vi.fn();
    $http.get = vi.fn();

    // Mock $sce
    var $sce = { trustAsHtml: function (v) { return v; } };

    // Mock $timeout that executes synchronously
    var $timeout = function (fn) { fn(); };

    initBallot($s, $http, $sce, $timeout);

    // Create the editor DOM element
    var el = document.createElement('div');
    el.id = 'quill-editor';
    document.body.appendChild(el);
  });

  afterEach(() => {
    var el = document.getElementById('quill-editor');
    if (el) el.remove();
    delete globalThis.Quill;
  });

  it('loads existing HTML into the Quill editor', () => {
    var savedHtml = '<h1>Welcome</h1><p>Vote below</p>';
    $http.get.mockReturnValue(Promise.resolve({
      data: { data: { customHtml: savedHtml }, errors: [] }
    }));

    $s.editCustomHtml({ id: 42, name: 'Test', key: 'abc' });

    return $http.get.mock.results[0].value.then(function () {
      expect($http.get).toHaveBeenCalledWith(
        '/api/get-custom-html.php?ballotId=42&userId=user1'
      );
      expect(pastedHtml).toBe(savedHtml);
    });
  });

  it('initializes with empty editor when no saved HTML exists', () => {
    $http.get.mockReturnValue(Promise.resolve({
      data: { data: { customHtml: null }, errors: [] }
    }));

    $s.editCustomHtml({ id: 42, name: 'Test', key: 'abc' });

    return $http.get.mock.results[0].value.then(function () {
      expect(pastedHtml).toBeNull();
    });
  });
});
