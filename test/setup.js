/**
 * Vitest setup — bootstraps AngularJS globals so app.js and main.js can load.
 *
 * ES `import` statements hoist, but app.js/main.js need globals on `window`
 * when they execute. We use top-level await + dynamic imports to control order.
 */

// 1. Load vendor libs and assign to globalThis/window
import jQuery from 'jquery';
import lodash from 'lodash';
import moment from 'moment';
import angular from 'angular';

globalThis.$ = jQuery;
globalThis.jQuery = jQuery;
globalThis._ = lodash;
globalThis.moment = moment;
globalThis.angular = angular;

// 2. Stub $.ajax and $.get so VoteFactory.finishElection() doesn't make requests
$.ajax = vi.fn();
$.get = vi.fn();

// 3. Stub globals referenced by app.js (Google/Facebook OAuth callbacks)
globalThis.setUser = vi.fn();
globalThis.statusChangeCallback = vi.fn();
globalThis.FB = { init: vi.fn(), getLoginStatus: vi.fn() };

// 4a. Stub DOMPurify (CDN-loaded in production)
globalThis.DOMPurify = {
  sanitize: function (html) {
    // Real sanitization: strip <script>, onerror, onclick, etc.
    var temp = document.createElement('div');
    temp.innerHTML = html;
    temp.querySelectorAll('script').forEach(function (el) { el.remove(); });
    temp.querySelectorAll('*').forEach(function (el) {
      Array.from(el.attributes).forEach(function (attr) {
        if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
      });
      if (el.tagName === 'IFRAME') el.remove();
    });
    return temp.innerHTML;
  }
};

// 4. Stub jQuery plugins that MainCtrl calls on init
$.fn.timezones = vi.fn().mockReturnThis();

// 5. Pre-initialize $s on window (MainCtrl sets window.$s = $s)
globalThis.$s = {};

// 6. Register stub Angular modules that the app depends on
angular.module('ui.sortable', []);
angular.module('ui.bootstrap', []);

// 7. Now import application code (order matters: app.js defines module, main.js uses it)
await import('@src/js/app.js');
await import('@src/js/main.js');
