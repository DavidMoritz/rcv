// Main entry point for Vite bundling
// Vendor libraries (jQuery, Angular, lodash, etc.) are loaded via CDN in index.html
// This file only imports our application code and remaining dependencies

// Import remaining jQuery/Angular plugins that aren't on CDN
import 'jquery-ui-touch-punch';
import 'angular-ui-bootstrap';
import 'angular-ui-sortable';
import 'ng-pattern-restrict';

// Import timezone picker
import './inc/timezone-picker.js';

// Import application code (creates mainApp module and controllers)
import './js/app.js';
import './js/main.js';

console.log('RCV App initialized with Vite');
