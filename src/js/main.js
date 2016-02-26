mainApp.controller('MainCtrl', [
	'$scope',
	'$timeout',
	'$interval',
	'MethodFactory',
	function MainCtrl($s, $timeout, $interval, MF) {
		'use strict';

		function init() {
			//	init stuff

			// remove scrolling also removes click and drag
			window.addEventListener('touchmove', function disallowScrolling(event) {
				if ($(document).width() >= 768) {
					event.preventDefault();
				}
			}, false);
		}

		var timeFormat = 'YYYY-MM-DD HH:mm:ss';

		//	initialize scoped variables
		_.assign($s, {
			time: moment().format(timeFormat),
			items: ['Cake', 'Cookies', 'Pie', 'Cheeses', 'Coffee', 'Brownies', 'Ice-cream']
		});
	}
]);
