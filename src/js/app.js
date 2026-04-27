var mainApp = angular.module('mainApp', [
	'ui.sortable',
	'ui.bootstrap'
]);

mainApp.config(['$locationProvider', function($locationProvider) {
	$locationProvider.html5Mode(true);
}]);

mainApp.run(['$rootScope', function($rootScope) {
	$rootScope._ = _;
	$rootScope.moment = moment;
	// Note: $rootScope.mc is set in main.js after mc is defined
}]);