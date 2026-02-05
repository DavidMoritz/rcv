// Globals initialization - must run FIRST before any other imports
// This file sets up global variables that legacy code expects

import $ from 'jquery';
import _ from 'lodash';
import moment from 'moment';
import angular from 'angular';

// Expose to window immediately for legacy scripts
window.jQuery = $;
window.$ = $;
window._ = _;
window.moment = moment;
window.angular = angular;

// Export so other modules can import if needed
export { $, _, moment, angular };
