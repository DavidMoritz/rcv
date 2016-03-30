var mainApp = angular.module('mainApp', [
	'ui.sortable',
	'ui.bootstrap'
]);

mainApp.config(function($locationProvider) {
	$locationProvider.html5Mode(true);
});

mainApp.run(function runWithDependencies($rootScope) {
	$rootScope._ = _;
	$rootScope.moment = moment;
	$rootScope.mc = mc;
});

function onSignIn(googleUser) {
	var profile = googleUser.getBasicProfile();
	console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
	console.log('Name: ' + profile.getName());
	console.log('Image URL: ' + profile.getImageUrl());
	console.log('Email: ' + profile.getEmail());
	setUser(profile.getName(), profile.getEmail(), profile.getImageUrl());
}

window.fbAsyncInit = function() {
	FB.init({
		appId: '916767641776363',
		xfbml: true,
		version: 'v2.5'
	});
	FB.getLoginStatus(function(response) {
		statusChangeCallback(response);
	});
};

(function(d, s, id){
	var js, fjs = d.getElementsByTagName(s)[0];
	if (d.getElementById(id)) {return;}
	js = d.createElement(s); js.id = id;
	js.src = '//connect.facebook.net/en_US/sdk.js';
	fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));