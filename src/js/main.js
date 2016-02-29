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

		$http.get('/app/api/get-ballots.php')
			.then(function (resp) {
				$s.allBallots = resp.data;
			})
		;

		$s.getCandidates = function() {
			if($s.ballot.id) {
				$http.get('/app/api/get-candidates.php?id=' + $s.ballot.id)
					.then(function(resp) {
						$s.originalCandidates = resp.data.map(function(entry) {
							return entry.name;
						});
						$s.resetCandidates();
					})
				;
			}
		};

		$s.removeCandidate = function(idx) {
			$s.candidates.splice(idx, 1);
		};

		$s.resetCandidates = function() {
			$s.candidates = _.shuffle($s.originalCandidates);
		};

		$s.newBallot = function() {
			$http({
				method: 'POST',
				url: '/app/api/new-ballot.php',
				data: $s.ballot,
				headers : {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp){
				$s.ballot.id = resp;
			});
		};

		$s.submitEntries = function() {
			$http({
				method: 'POST',
				url: '/app/api/add-entries.php',
				data: {
					entries: $s.entries,
					'ballotId': $s.ballot.id
				},
				headers : {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp) {
				$s.candidates = $s.entries;
			});
		};

		$s.submitVote = function() {
			$http({
				method: 'POST',
				url: '/app/api/vote.php',
				data: {
					vote: JSON.stringify($s.candidates),
					'ballotId': $s.ballot.id
				},
				headers : {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp) {
				$s.thanks = true;
				console.log(resp);
			});
		};

		$s.getResults = function() {
			$http.get('/app/api/get-votes.php?id=' + $s.ballot.id)
				.then(function(resp) {
					votes = resp.data.map(function(result) {
						return JSON.parse(result.vote);
					});
					seats = $s.ballot.positions;
					names = $s.originalCandidates;
					runTheCode();
					$s.final = true;
				})
			;
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
			vote: [],
			seats: 3,
			ballot: {},
			entries: [],
			dateFormat: 'MMM d, y h:mm a',
			pickerFormat: 'fullDate',
			pickerOptions: {
				showWeeks: false
			},
			elected: elected
		});
	}
]);
