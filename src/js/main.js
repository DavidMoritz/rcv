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

		$s.newBallot = function() {
			$http({
				method: 'POST',
				url: '/app/api/new-ballot.php',
				data: $s.ballot,
				headers : {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp){
				$s.ballotId = resp;
			});
		};

		$s.submitEntries = function() {
			$http({
				method: 'POST',
				url: '/app/api/add-entries.php',
				data: {
					entries: $s.entries,
					ballot_id: $s.ballotId
				},
				headers : {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp) {
				console.log(resp);
			});
		};

		$s.addEntry = function() {
			if($s.entryInput.length) {
				$s.errorEntry = '';
				$s.entries.push($s.entryInput);
				$s.entryInput = '';
			} else {
				$s.errorEntry = 'Entries must not be blank';
			}
		};

		$s.removeEntry = function(idx) {
			$s.entries.splice(idx, 1);
		};

		//	initialize scoped variables
		_.assign($s, {
			time: moment().format(timeFormat),
			items: ['Cake', 'Cookies', 'Pie', 'Cheeses', 'Coffee', 'Brownies', 'Ice-cream'],
			votes: [['Pie','Cake','Candy','Soda','Pizza'],['Pizza','Soda','Candy','Cake','Pie'],['Candy','Cake','Soda','Pie','Pizza'],['Cake','Candy','Soda','Pizza','Pie'],['Soda','Pie','Cake','Pizza','Candy'],['Pie','Pizza','Cake','Soda','none'],['Pizza', 'Candy', 'Pie', 'Soda', 'Cake']],
			names: ['Pie', 'Cake', 'Candy', 'Soda', 'Pizza'],
			seats: 3,
			ballot: {},
			entries: []
		});
	}
]);
