angular.module('routes', [
	'ui.router'
]).config(function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/');

	$stateProvider
	.state('login', {
		url: '/login',
		controller: 'loginController',
		templateUrl: 'views/login'
	})
	.state('vote', {
		url: '/vote',
		controller: 'voteController',
		templateUrl: 'views/vote'
	})
})