mainApp.controller('MainCtrl', [
	'$scope',
	'$location',
	'$timeout',
	'$interval',
	'$http',
	'$sce',
	'VoteFactory',
	function MainCtrl($s, $loc, $timeout, $interval, $http, $sce, VF) {
		'use strict';

		//during development
		window.$s = $s;
		$s.user = $s.user || {};

		var getVoteParam = function() {
			var param = $loc.$$absUrl.split('/').pop();

			if(!param) {
				$s.navigate('home');
			}

			if(_.find($s.navItems, {link: param})) {
				$s.navigate(param);

				return '';
			}

			return param;
		};

		var updateTime = function(dateObj) {
			var mom = moment(dateObj);

			if(mom.isDST()) {
				mom.utcOffset(-5);
			} else {
				mom.utcOffset(-6);
			}

			return mom.format('YYYY-MM-DD HH:mm:ss');
		};

		var resetBallot = function() {
			$s.generateRandomKey();
			$s.entries = null;

			return {
				positions: 1,
				createdBy: $s.user.email ? $s.user.email : 'guest',
				maxVotes: 1,
				voteCutoff: roundResultsRelease()
			};
		};

		$s.$watch(function() {
			return window.location.pathname;
		}, getVoteParam);

		//	initialize scoped variables
		_.assign($s, {
			activeLink: 'home',
			navItems: [
				{
					link: 'home',
					text: 'Home'
				},{
					link: 'about',
					text: 'About'
				},{
					link: 'create',
					text: 'Create a new Ballot!'
				},{
					link: 'edit',
					text: 'Edit a Ballot',
					hide: true
				},{
					link: 'results',
					text: 'Results'
				},{
					link: 'register',
					text: 'Register'
				},{
					link: 'vote',
					text: 'Vote!'
				}
			],
			ballot: {},
			errors: {},
			success: {},
			dateFormat: 'MMM d, y h:mm a',
			pickerFormat: 'fullDate',
			pickerOptions: {
				showWeeks: false
			},
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

		$s.navigate = function(link) {
			var title = _.find($s.navItems, {link: link}).text;

			if($('.navbar-collapse').hasClass('in')) {
				$('.navbar-collapse').collapse('hide');
			}

			switch(link) {
				case 'create':
					$s.ballot = resetBallot();
					$s.editBallot = false;
					$s.congrats = false;
					break;
				case 'edit':
					$s.entries = null;
					$s.congrats = false;
					$s.editBallot = true;
			}

			$s.shortcode = '';
			$s.activeLink = link;
		};

		$s.signOut = function() {
			var auth2 = gapi.auth2.getAuthInstance();
			auth2.signOut().then(function () {
				console.log('User signed out.');
			});
		};

		$s.sameTime = function() {
			$s.ballot.resultsRelease = new Date($s.ballot.voteCutoff.getTime());
		};

		$s.updateUser = function() {
			$http({
				method: 'POST',
				url: '/api/add-user.php',
				data: $s.user,
				headers : {'Content-Type': 'application/x-www-form-urlencoded'}
			});
		};

		$s.getCandidates = function(key) {
			$http.get('/api/get-candidates.php?key=' + $s.shortcode)
				.then(function(resp) {
					if(typeof resp.data == 'object') {
						$s.originalCandidates = resp.data.map(function(entry) {
							$s.ballot = entry;
							$s.ballot.positions = parseInt($s.ballot.positions);

							return entry.candidate;
						});
						$s.activeLink = 'vote';
						$s.resetCandidates();
					} else {
						console.log('something went wrong');
					}
				})
			;
		};

		$s.getResults = function() {
			var key = $s.shortcode || $s.ballot.key;
			$http.get('/api/get-votes.php?key=' + key)
				.then(function(resp) {
					$s.votes = resp.data.map(function(result) {
						$s.seats = parseInt(result.positions);

						return JSON.parse(result.vote);
					});
					$s.names = _.uniq(_.flatten($s.votes));
					$s.runTheCode();
					$s.bodyText = $sce.trustAsHtml($s.outputstring);
					$s.final = true;
				})
			;
		};

		$s.getBallots = function() {
			// we need to get ballots based on user signin
			$http({
				method: 'POST',
				url: '/api/get-ballots.php',
				data: $s.user,
				headers : {'Content-Type': 'application/x-www-form-urlencoded'}
			}).then(function(resp) {
				$s.allBallots = resp.data;
			});
		};

		$s.generateRandomKey = function(len) {
			len = len || 4;
			var key = Math.random().toString(36).substr(2, len);
			$http.get('/api/get-key-ballot.php?key=' + key)
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

		$s.changeEditBallot = function() {
			$s.createBallot = true;
			$s.ballot.positions = parseInt($s.ballot.positions);
			$s.ballot.resultsRelease = new Date($s.ballot.resultsRelease);
			$s.ballot.voteCutoff = new Date($s.ballot.voteCutoff);

			$http.get('/api/get-candidates.php?key=' + $s.ballot.key)
				.then(function(resp) {
					if(resp.data) {
						$s.entries = resp.data.map(function(entry) {
							return entry.candidate;
						});
					}
				})
			;
		};

		$s.checkAvailability = _.debounce(function() {
			$http.get('/api/get-key-ballot.php?key=' + $s.ballot.key)
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
		}, 250);

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
			if(!$s.showRelease) {
				$s.sameTime();
			}
			$s.ballot.resultsRelease = updateTime($s.ballot.resultsRelease);
			$s.ballot.voteCutoff = updateTime($s.ballot.voteCutoff);
			$s.ballot.createdBy = $s.user.email ? $s.user.email : 'guest';
			$http({
				method: 'POST',
				url: '/api/' + ($s.editBallot ? 'update' : 'new') + '-ballot.php',
				data: $s.ballot,
				headers : {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp){
				if(resp.errors) {
					$s.errors = resp.errors;
				} else {
					if(!$s.editBallot) {
						$s.ballot.id = resp;
					}
					$s.entries = [];
				}
			});
		};

		$s.submitEntries = function() {
			if($s.entries.length < 2) {
				$s.errorEntry = 'Must have at least 2 entries';

				return;
			}
			if($s.editBallot) {
				$http.get('/api/delete-entries.php?ballotId=' + $s.ballot.id)
					.then(function(resp) {
						$s.editBallot = false;
						$s.submitEntries();
					})
				;
				return;
			}
			$http({
				method: 'POST',
				url: '/api/add-entries.php',
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
				url: '/api/vote.php',
				data: {
					vote: JSON.stringify($s.candidates),
					key: $s.ballot.key
				},
				headers : {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp) {
				$s.thanks = true;
				console.log(resp);
			});
		};

		$s.deleteVotes = function() {
			$http({
				method: 'POST',
				url: '/api/delete-votes.php',
				data: $s.ballot,
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp) {
				$s.deleted = true;
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

		$s.submitShortcode = function() {
			if($s.activeLink == 'results') {
				$s.getResults();
			} else {
				$s.getCandidates();
			}
		};

		$s.addEntry = function() {
			if(!$s.entryInput.length) {
				$s.errorEntry = 'Entries must not be blank';
			} else if($s.entries.indexOf($s.entryInput) !== -1) {
				$s.errorEntry = 'No duplicate entries allowed';
			} else {
				$s.errorEntry = '';
				$s.entries.push($s.entryInput);
				$s.entryInput = '';
			}
		};

		$s.shortcode= getVoteParam();

		if($s.shortcode) {
			$s.activeLink = 'vote';
			$s.getCandidates();
		}
	}
]);
