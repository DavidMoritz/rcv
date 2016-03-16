mainApp.controller('MainCtrl', [
	'$scope',
	'$location',
	'$timeout',
	'$interval',
	'$http',
	'VoteFactory',
	function MainCtrl($s, $loc, $timeout, $interval, $http, VF) {
		'use strict';

		//during development
		window.$s = $s;

		var timeFormat = 'YYYY-MM-DD HH:mm:ss';

		var getParam = function(param) {
			var queryArray = $loc.$$url.split('/');
			var index = queryArray.indexOf(param);

			if(index) {
				return queryArray[index + 1];
			}

			return false;
		};

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

		$s.generateRandomKey = function(len) {
			len = len || 4;
			var key = Math.random().toString(36).substr(2, len);
			$http.get('/app/api/get-key-ballot.php?key=' + key)
				.then(function(resp) {
					if(resp.data.length) {
						$s.generateRandomKey(++len);
					} else {
						$s.errors.key = null;
						$s.success.key = null;
						$s.ballot.key = key;
					}
				})
			;
		};

		$s.checkAvailability = function() {
			$http.get('/app/api/get-key-ballot.php?key=' + $s.ballot.key)
				.then(function(resp) {
					if(resp.data.length) {
						$s.success.key = null;
						if($s.ballot.key) {
							$s.errors.key = $s.ballot.key + ' is already in use';
						} else {
							$s.errors.key = 'Shortcode is required';
						}
					} else {
						$s.errors.key = null;
						$s.success.key = $s.ballot.key + ' is available';
					}
				})
			;
		};

		if(getParam('entry')) {
			$s.ballot.id = getParam('entry');
			$s.getCandidates();
		} else {
			$http.get('/app/api/get-ballots.php')
				.then(function (resp) {
					$s.allBallots = resp.data;
				})
			;
		}

		if(getParam('ballot')) {
			$s.generateRandomKey();
		}

		if(getParam('vote')) {
			$http.get('/app/api/get-candidates.php?key=' + getParam('vote'))
				.then(function(resp) {
					$s.originalCandidates = resp.data.candidates.map(function(entry) {
						$s.ballot.id = entry.ballotId;

						return entry.name;
					});
					$s.resetCandidates();
				})
			;
		}

		$s.removeCandidate = function(idx) {
			$s.candidates.splice(idx, 1);
		};

		$s.resetCandidates = function() {
			$s.candidates = _.shuffle($s.originalCandidates);
		};

		$s.newBallot = function() {
			// temporarily hide "created"
			$s.created = $s.key;
			$http({
				method: 'POST',
				url: '/app/api/new-ballot.php',
				data: $s.ballot,
				headers : {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp){
				if(resp.errors) {
					$s.errors = resp.errors;
				} else {
					$s.ballot.id = resp;
				}
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
				if(resp.errors) {
					$s.errors = resp.errors;
				} else {
					$s.originalCandidates = $s.entries;
					$s.resetCandidates();
				}
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

		$s.showResults = function() {
			$s.thanks = true;
			$s.final = true;
			$s.getResults();
		};

		$s.getResults = function() {
			$http.get('/app/api/get-votes.php?id=' + $s.ballot.id)
				.then(function(resp) {
					$s.votes = resp.data.map(function(result) {
						return JSON.parse(result.vote);
					});
					$s.seats = $s.ballot.positions;
					$s.names = _.uniq(_.flatten($s.votes));
					$s.elected = $s.runTheCode();
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
			votes: [['Pie','Cake','Candy','Brownie','Soda'],['Pizza','Brownie','Soda','Candy','Cake','Pie'],['Candy','Brownie','Soda','Pie'],['Cake','Soda','Pizza','Brownie','Pie'],['Soda','Pie','Cake','Pizza','Candy'],['Pie','Brownie','Pizza','Cake','Soda'],['Pizza','Brownie', 'Candy', 'Pie', 'Soda']],
			names: ['Pie', 'Cake', 'Candy', 'Brownie', 'Soda', 'Pizza'],
			vote: [],
			seats: 3,
			ballot: {},
			errors: {},
			success: {},
			entries: [],
			dateFormat: 'MMM d, y h:mm a',
			pickerFormat: 'fullDate',
			pickerOptions: {
				showWeeks: false
			},
			elected: [],
			createBallot: getParam('ballot'),
			voteBallot: getParam('vote'),
			resultsBallot: getParam('results'),
		});

		_.extend($s, VF);
	}
]);
