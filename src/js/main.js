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

		//	initialize scoped variables
		_.assign($s, {
			time: moment().format(timeFormat),
			timePresets: ['10 minutes', '30 minutes', '1 hour', '24 hours', 'Custom'],
			items: [],
			votes: [],
			names: [],
			vote: [],
			seats: 3,
			ballot: {
				positions: 1
			},
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

		function roundResultsRelease() {
			var now = new Date();
			var m = now.getMinutes();
			var offset = parseInt((m+25)/15) * 15;
			now = new Date(now.setSeconds(0));

			// vote ends 15 minutes after it starts round to the nearest quarter
			return new Date(now.setMinutes(offset));
		}

		$s.ballot.resultsRelease = roundResultsRelease();

		$s.getCandidates = function(key) {
			var pass = $s.password ? '&password=' + $s.password : '';
			$http.get('/app/api/get-candidates.php?key=' + $s.voteBallot + pass)
				.then(function(resp) {
					if(resp.data) {
						$s.originalCandidates = resp.data.map(function(entry) {
							$s.ballot = entry;

							return entry.candidate;
						});
						$s.resetCandidates();
					} else {
						$s.passwordRequired = true;
					}
				})
			;
		};

		$s.getResults = function() {
			var key = $s.ballot.key || $s.resultsBallot;
			$http.get('/app/api/get-votes.php?key=' + key)
				.then(function(resp) {
					$s.votes = resp.data.map(function(result) {
						$s.ballot = result;

						return JSON.parse(result.vote);
					});
					$s.seats = $s.ballot.positions;
					$s.names = _.uniq(_.flatten($s.votes));
					$s.elected = $s.runTheCode();
					$s.final = true;
				})
			;
		};

		$s.generateRandomKey = function(len) {
			len = len || 4;
			var key = Math.random().toString(36).substr(2, len);
			// $http.get('/app/api/get-key-ballot.php?key=' + key)
			// 	.then(function(resp) {
			// 		if(resp.data.length) {
			// 			$s.generateRandomKey(++len);
			// 		} else {
						$s.errors.key = null;
						$s.success.key = null;
						$s.ballot.key = key;
			// 		}
			// 	})
			// ;
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

		$s.removeEntry = function(idx) {
			$s.entries.splice(idx, 1);
		};

		$s.removeCandidate = function(idx) {
			$s.candidates.splice(idx, 1);
		};

		$s.resetCandidates = function() {
			$s.candidates = _.shuffle($s.originalCandidates);
		};

		$s.newBallot = function() {
			// temporarily hide "created"
			$s.ballot.created = $s.ballot.key;
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
					$s.congrats = true;
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

		$s.voteNow = function() {
			$s.congrats = false;
			$s.originalCandidates = $s.entries;
			$s.resetCandidates();
		};

		$s.showResults = function() {
			$s.thanks = true;
			$s.final = true;
			$s.getResults();
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

		if($s.createBallot) {
			$s.generateRandomKey();
		}

		if($s.voteBallot) {
			$s.getCandidates();
		}

		if($s.resultsBallot) {
			$s.getResults();
		}
	}
]);
