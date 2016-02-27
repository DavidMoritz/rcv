mainApp.controller('MainCtrl', [
	'$scope',
	'$timeout',
	'$interval',
	'$http',
	'MethodFactory',
	function MainCtrl($s, $timeout, $interval, $http, MF) {
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

		$http.get('http://www.w3schools.com/angular/customers_mysql.php')
			.then(function (response) {
				$s.names = response.data.records;
			});

		//	initialize scoped variables
		_.assign($s, {
			time: moment().format(timeFormat),
			items: ['Cake', 'Cookies', 'Pie', 'Cheeses', 'Coffee', 'Brownies', 'Ice-cream'],
			votes: [['Pie','Cake','Candy','Soda','Pizza'],['Pizza','Soda','Candy','Cake','Pie'],['Candy','Cake','Soda','Pie','Pizza'],['Cake','Candy','Soda','Pizza','Pie'],['Soda','Pie','Cake','Pizza','Candy'],['Pie','Pizza','Cake','Soda','none'],['Pizza', 'Candy', 'Pie', 'Soda', 'Cake']],
			names: ['Pie', 'Cake', 'Candy', 'Soda', 'Pizza'],
			seats: 3
		});
	}
]);
