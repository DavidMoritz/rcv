var mainApp = angular.module('mainApp', [
	'ui.sortable',
	'ui.bootstrap',
	'ngAnimate',
	'ui.router',
	'routes'
]);

mainApp.run(function runWithDependencies($rootScope, $state, $stateParams) {
	window.$scope = $rootScope;
	$rootScope._ = _;
	$rootScope.moment = moment;
	$rootScope.mc = mc;
	$rootScope.$state = $state;
	$rootScope.$stateParams = $stateParams;
});
