// Main entry point for Vite bundling
// This replaces the multiple script tags in index.html

// Import vendor libraries (these replace inc/lib.js)
import 'jquery';
import 'jquery-ui-dist/jquery-ui.min.js';
import 'jquery-ui-touch-punch';
import 'lodash';
import 'moment';
import 'bootstrap';
import 'angular';
import 'angular-animate';
import 'angular-ui-bootstrap';
import 'angular-ui-sortable';
import 'ng-pattern-restrict';

// Import timezone picker
import './inc/timezone-picker.js';

// Import application code
import './js/app.js';
import './js/main.js';

console.log('RCV App initialized with Vite');

// Explicitly assign jQuery to window for AngularJS
window.jQuery = window.$ = jQuery;
