var mainApp = angular.module('mainApp', ['ui.sortable', 'ui.bootstrap']);

mainApp.run(function runWithDependencies($rootScope) {
	$rootScope._ = _;
	$rootScope.moment = moment;
	$rootScope.mc = mc;
});
