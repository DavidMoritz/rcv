// Main entry point for Vite bundling
// This replaces the multiple script tags in index.html

// Import vendor libraries (these replace inc/lib.js)
import $ from 'jquery';
import 'jquery-ui-dist/jquery-ui.min.js';
import 'jquery-ui-touch-punch';
import _ from 'lodash';
import moment from 'moment';
import 'bootstrap';
import angular from 'angular';
import 'angular-animate';
import 'angular-ui-bootstrap';
import 'angular-ui-sortable';
import 'ng-pattern-restrict';

// Explicitly assign libraries to window for legacy code
window.jQuery = window.$ = $;
window._ = _;
window.moment = moment;
window.angular = angular;

// Import timezone picker
import './inc/timezone-picker.js';

// Import application code
import './js/app.js';
import './js/main.js';

console.log('RCV App initialized with Vite');
