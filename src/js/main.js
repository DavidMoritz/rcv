/*!
 * Initualize a new Angular app - v0.0.1
 * Build Date: 2017.09.08
 * Docs: http://moritzcompany.com
 * Coded @ Moritz Company
 * revised by David Moritz
 */

/* JS Cookies - https://www.w3schools.com/js/js_cookies.asp */
function setCookie(data) {
  if (data.days) {
    data.date = new Date();
    data.date.setTime(data.date.getTime() + (data.days * 24 * 60 * 60 * 1000));
  }
  if (data.date) {
    data.expires = 'expires=' + data.date.toUTCString();
  }
  document.cookie = data.name + '=' + data.value + ';' + data.expires + ';path=/';
}

const trickVote = '123456';

function getCookie(cname) {
  var name = cname + '=';
  var ca = document.cookie.split(';');
  for(var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}

function jsUcfirst(string) 
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function dataFromObj(jsonObjOrString) {
  let jsonObj;

  if (typeof jsonObjOrString === 'string') {
    // processing visuals
    jsonObj = {
      config: {
        contest: jsonObjOrString,
      },
      results: [{
        round: 1, 
        tally: { processing: '1' },
        tallyResults: [{ elected: 'processing'}]
      }]
    }
  } else {
    jsonObj = jsonObjOrString;
  }
  
  const outputstring = JSON.stringify(jsonObj);
  const file = new File(["\ufeff" + outputstring], 'results.json', {type: "application/json"});
  const data = new FormData();
  
  data.append('jsonFile', file);

  return data;
}

String.prototype.hashCode = function() {
    var hash = 0;
    if (this.length === 0) {
        return hash;
    }
    for (var i = 0; i < this.length; i++) {
        var char = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

var mainApp = angular.module('mainApp', [
	'ui.sortable',
	'ui.bootstrap'
]);

/**
 * bbiBallots from 2023 straw poll
 * const bbiBallots = {
 *   a: {
 *     contest: "Pulse of Iowa – Presidential Straw Poll",
 *     id: 5827,
 *     slug: "bbi-presidential-election-rcv-straw-poll-1"
 *   },
 *   r: {
 *     contest: "Pulse of Iowa – Presidential Straw Poll - Republican",
 *     id: 5824,
 *     slug: "bbi-presidential-election-rcv-straw-poll-republican"
 *   },
 *   d: {
 *     contest: "Pulse of Iowa – Presidential Straw Poll - Democrat",
 *     id: 5825,
 *     slug: "bbi-presidential-election-rcv-straw-poll-democrat"
 *   },
 *   o: {
 *     contest: "Pulse of Iowa – Presidential Straw Poll - Other",
 *     id: 5826,
 *     slug: "bbi-presidential-election-rcv-straw-poll-other"
 *   }
 * }
 */

const bbiBallots = {
  a: {
    contest: "Pulse of Iowa – Presidential Straw Poll",
    id: 11410,
    slug: "bbi-presidential-election-rcv-straw-poll-24"
  },
  r: {
    contest: "Pulse of Iowa – Presidential Straw Poll - Republican",
    id: 11411,
    slug: "bbi-presidential-election-rcv-straw-poll-24-republican"
  },
  d: {
    contest: "Pulse of Iowa – Presidential Straw Poll - Democrat",
    id: 11412,
    slug: "bbi-presidential-election-rcv-straw-poll-24-democrat"
  },
  o: {
    contest: "Pulse of Iowa – Presidential Straw Poll - Other",
    id: 11413,
    slug: "bbi-presidential-election-rcv-straw-poll-24-other"
  }
}

mainApp.config(function($locationProvider) {
	$locationProvider.html5Mode(true);
});

mainApp.run(function runWithDependencies($rootScope) {
	$rootScope._ = _;
	$rootScope.moment = moment;
	$rootScope.mc = mc;
  if (getCookie('loginId')) {    
    setUser({
      id: getCookie('loginId'),
      name: getCookie('loginName'),
      email: getCookie('loginEmail'),
      image: getCookie('loginImage')
    }, 'profile');
  }
});

function onSignIn(googleUser) {
	var profile = googleUser.getBasicProfile();
	console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
	console.log('Name: ' + profile.getName());
	console.log('Image URL: ' + profile.getImageUrl());
	console.log('Email: ' + profile.getEmail());
	setUser({
		id: profile.getId(),
		name: profile.getName(),
		email: profile.getEmail(),
		image: profile.getImageUrl()
	});
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

$(document).on('click', '[data-delete-vote]', function() {
  if (confirm('Delete this vote?\nThis action cannot be undone.\nRefresh page to see new results.')) {
    $s.deleteVote(this.dataset.deleteVote);
    $(this).closest('tr').addClass('hide');
  }
});

// (function(d, s, id){
// 	var js, fjs = d.getElementsByTagName(s)[0];
// 	if (d.getElementById(id)) {return;}
// 	js = d.createElement(s); js.id = id;
// 	js.src = '//connect.facebook.net/en_US/sdk.js';
// 	fjs.parentNode.insertBefore(js, fjs);
// }(document, 'script', 'facebook-jssdk'));
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
    
    $('.js-timezone-picker').timezones();
    setTimeout(function() {
      $('.js-timezone-picker').val(moment.tz.guess());
    }, 1000);
    
		var getVoteParam = function(navigate) {
			var param = $loc.$$path.substr(1);
      let key;

			if (!param) {
				$s.navigate('home');
      } else if (param === 'results_json.html') {
        if (navigate) {
          $s.navigate('json');
        }
        return $loc.$$search.key;
			} else {
				key = $loc.$$hash;
			}

			if (_.find($s.navItems, {link: param})) {
        if (navigate) {
  				$s.navigate(param, key);
        }

				return '';
			}

			return param;
		};

		var updateTime = function(dateObj, zoneString) {
      zoneString = zoneString || moment.tz.guess();
			var mom = moment(dateObj).tz(zoneString, true);

			return mom.toISOString().replace('T', ' ').replace(/\.\d+Z/, '');
		};

		var deleteThis = function(data, item) {
			$http({
				method: 'POST',
				url: '/api/delete-' + item + '.php',
				data: data,
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp) {
				$s.deleted = true;
			});
		};

		var resetBallot = function() {
			$s.generateRandomKey();
			$s.entries = null;
			$s.images = [];
			$s.hyperlinks = [];
			$s.entryColors = null;

			return {
				positions: 1,
				createdBy: $s.user.id || 'guest',
				maxVotes: 1,
        register: 0,
        allowCustom: 0,
				tieBreak: 'weighted',
				voteCutoff: roundResultsRelease(),
        voteTimezone: moment.tz.guess(),
        resultTimezone: moment.tz.guess()
			};
		};
    
    var getContributions = function() {
      $http({
        method: 'GET',
        url: '/api/get-contributions.php',
      }).then(function(resp) {
        $s.contributions = resp.data;
      });
    }

		var getBallots = function() {
			// we need to get ballots based on user signin
			if ($s.user.id) {
				$http({
					method: 'POST',
					url: '/api/get-ballots.php',
					data: $s.user,
					headers: {'Content-Type': 'application/x-www-form-urlencoded'}
				}).then(function(resp) {
					$s.now = new Date();
					$s.allBallots = resp.data.map(function(ballot) {
						ballot.voteCutoff = moment.tz(ballot.voteCutoff, 'Zulu');
						ballot.resultsRelease = moment.tz(ballot.resultsRelease, 'Zulu');

						return ballot;
					});
				});
			} else {
				setTimeout(getBallots, 750);
			}
		};

		var resetNav = function(hide) {
			$s.navItems.map(function(item) {
				if (item.link == 'profile') {
					item.hide = !hide;
				} else if (item.link == 'register') {
					item.hide = !!hide;
				}
			});
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
					link: 'profile',
					text: 'Profile',
					hide: true
				},{
					link: 'hall_of_fame',
					text: 'Hall of Fame',
					hide: true
				},{
					link: 'code',
					text: 'Code',
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
      login: {},
      newAccount: {},
			ballot: {},
			errors: {},
			success: {},
      json_display: {},
      rightNow: moment(),
      moment: moment,
      patchRcvis: false,
      bbiBallot: false,
      bbiGroup: false,
      uniqueCodeValid: false,
      hideDetails: false,
      rcvisSlug: '',
      uniqueCode: '',
      zipCode: '',
      partyAffiliation: false,
			dateFormat: 'MMM d, y h:mm a',
			pickerFormat: 'fullDate',
			pickerOptions: {
				showWeeks: false
			},
			origin: window.location.origin
		});

		_.extend($s, VF);

		function roundResultsRelease() {
			var now = new Date();
			var m = now.getMinutes();
			var offset = parseInt((m + 25) / 15) * 15;
			now = new Date(now.setSeconds(0));

			// vote ends 15 minutes after it starts round to the nearest quarter
			return new Date(now.setMinutes(offset));
		}

		$s.navigate = function(link, shortcode) {
			var found = _.find($s.navItems, {link: link});
			var title = found ? found.text : 'no_title';
			$s.activeLink = link;

			if ($('.navbar-collapse').hasClass('in')) {
				$('.navbar-collapse').collapse('hide');
			}

			switch (link) {
				case 'create':
					if (!$s.editBallot) { $s.ballot = resetBallot(); }
          setTimeout(function() {
            $('.js-timezone-picker').val(moment.tz.guess());
          }, 1000);
					$s.congrats = false;
					break;
				case 'profile':
					getBallots();
          break;
        case 'code':
          $s.codeKey = $loc.$$search.key;
          $s.ballot.voterName = $loc.$$search.hash;
          shortcode = $loc.$$search.hash ? $s.codeKey : '';
          break;
        case 'hall_of_fame':
          getContributions();
          break;
        case 'json':
          shortcode = $loc.$$search.key;
          $s.patchRcvis = true;
			}

			if (shortcode) {
				$s.shortcode = shortcode;
				$s.submitShortcode();
			} else {
				$s.shortcode = '';
			}
		};
    
    $s.loginForm = function() {
      $s.login.password = ($s.login.password + "My RCV salt").hashCode();
			$http({
				method: 'POST',
				url: '/api/login.php',
				data: $s.login,
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			}).then(function(resp) {
        if (typeof resp.data === 'string') {
          alert("Incorrect username and/or password");
        } else {
          setUser({
            id: resp.data[0].id,
            name: resp.data[0].username,
            email: resp.data[0].email,
            image: resp.data[0].image
          }, 'profile');
          if ($s.login.remember) {
            setCookie({ days: 30, name: 'loginId', value: resp.data[0].id});
            setCookie({ days: 30, name: 'loginName', value: resp.data[0].username});
            setCookie({ days: 30, name: 'loginEmail', value: resp.data[0].email});
            setCookie({ days: 30, name: 'loginImage', value: resp.data[0].image});
          }
        }
      });
    }

    $s.createNewAccount = function() {
      $http.get('/api/check-user.php?user=' + $s.newAccount.username)
				.then(function(resp) {
          if (resp.data.length) {
            alert($s.newAccount.username + ' is already taken');
          } else {
            $s.newAccount.id = mc.randomDigits(100000000000);
            $s.newAccount.password = ($s.newAccount.password + "My RCV salt").hashCode();
            $http({
              method: 'POST',
              url: '/api/add-user.php',
              data: $s.newAccount,
              headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            });
            setUser({
              id: $s.newAccount.id,
              name: $s.newAccount.username
            }, 'create');
          }
      });
    }

		$s.signOut = function() {
			var auth2 = gapi.auth2.getAuthInstance();
			auth2.signOut().then(function() {
				console.log('User signed out.');
				resetNav();
			});
		};
    
    $s.validateZip = function() {
      $s.shortcode = $loc.$$search.key;
      $s.errors.zipCode = null;
      $s.ballot.voterName = '';

      if ($s.zipCode.replaceAll(/\D/g, '').length !== 5) {
        $s.errors.zipCode = 'You must enter a valid 5-digit zip code';
        
        return;
      }

      if (!$s.uniqueCodeValid) {
        $s.validateCode();
        
        return;
      }
      
      if ($s.partyAffiliation) {
        $s.ballot.voterName = $s.uniqueCode.toLowerCase() + '-'  + $s.zipCode + '-'  + $s.partyAffiliation;
      }
    }
    
    $s.validateCode = function() {
      if ($s.uniqueCode.length !== 6) {
        $s.errors.uniqueCode = 'You must enter a valid unique code';
        
        return;
      }
      
      if ($s.uniqueCode == trickVote) {
        $s.uniqueCodeValid = true;
        
        return;
      }
      
      const t = Date.now();

			$http.get('/api/validate-voter-code.php?code=' + $s.uniqueCode.toLowerCase() + '&t=' + t)
				.then(function(resp) {
          if (resp.data.length) {
            $s.uniqueCodeValid = true;
      
            if ($s.partyAffiliation) {
              $s.validateZip();
            }
          } else {
            $s.errors.uniqueCode = 'You must enter a valid unique code';
          }
        })
      ;
    };

		$s.updateUser = function(user, nav) {
			$s.user = user;
      $s.user.username = $s.user.username || $s.user.name;
			resetNav(true);

      if (nav) {
        $s.navigate(nav);
      } else {
        $http({
          method: 'POST',
          url: '/api/add-user.php',
          data: $s.user,
          headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        });
      }
		};

		$s.getCandidates = function() {
      const voterName = $s.ballot.voterName;

			$http.get('/api/get-candidates.php?key=' + $s.shortcode + '&t=' + Date.now())
				.then(function(resp) {
					if (typeof resp.data == 'string') {
						$s.navigate('results', $s.shortcode);

						return;
					}

					$s.originalCandidates = resp.data.map(function(entry) {
						$s.ballot = entry;
            $s.ballot.voterName = voterName || $loc.$$search.hash;
						$s.ballot.register = parseInt($s.ballot.register);
						$s.ballot.allowCustom = !!parseInt($s.ballot.allowCustom);
						$s.ballot.hideNames = !!parseInt($s.ballot.hideNames);
						$s.ballot.hideDetails = !!parseInt($s.ballot.hideDetails);
						$s.ballot.showGraph = !!parseInt($s.ballot.showGraph);
						$s.ballot.positions = parseInt($s.ballot.positions);

						return {
							name: entry.candidate,
              image: entry.image,
              hyperlink: decodeURIComponent(entry.hyperlink),
              color: entry.color,
							id: entry.entry_id
						};
					});
					$s.activeLink = $loc.$$search.key ? 'code' : 'vote';
          var resultsDate = moment.tz(resp.data[0].resultsRelease, 'Zulu');
          $s.resultsReady = resultsDate < moment();
        
          if ($s.ballot.register == 3) {
            if (!voterName) {
              alert('oops, this ballot is private');

              return;
            } else {
              $s.bbiBallot = true;
              $s.bbiGroup = 'a';
            }
          }
					$s.resetCandidates();
				})
			;
		};
    
    $s.displayRcvisIframe = function() {
      setTimeout(function() {
        const iframe = document.createElement('iframe');
        const cacheBust = $s.graphUpdated ? $s.graphUpdated.replace(/\D/g,'') : Date.now();
        const listSize = $s.jsonObj.results.length ? Object.keys($s.jsonObj.results[0].tally).length : 0;
        const dynamicHeight = listSize || $s.roundnum || $s.names.length;
        const house = document.getElementById('iframe-house');

        iframe.id = 'iframe-' + cacheBust;
        iframe.width = '100%';
        iframe.height = (449 + ( 20 * dynamicHeight)) + 'px';
        iframe.frameborder = '0';
        iframe.style = "border: 0";
        iframe.allowfullscreen = 'allowfullscreen';
        iframe.src = $sce.trustAsResourceUrl(`https://rcvis.com/ve/${$s.rcvisSlug}?vistype=barchart-interactive&increment=` + cacheBust);

        house.appendChild(iframe);
//         document.getElementById('iframe-' + cacheBust).contentWindow.location.reload();
        const disclaimer = document.getElementById('iframe-disclaimer');
        
        if(disclaimer) disclaimer.remove();
      }, 100);
    };

		$s.getResults = function() {
			var key = $s.shortcode || $s.ballot.key;
			$http.get('/api/get-votes.php?key=' + key + '&t=' + Date.now())
				.then(function(resp) {
					if (typeof resp.data == 'string') {
						$s.errors.shortcode = resp.data;

						return;
					}
        
        var resultsDate = moment.tz(resp.data[0].resultsRelease, 'Zulu');
        var voteCutoffDate = moment.tz(resp.data[0].voteCutoff, 'Zulu');
        var now = moment();
        $s.voteClosed = voteCutoffDate < now;
        var createdBy = resp.data[0].createdBy;
        var loggedIn = $s.user.id == createdBy;
        if (resultsDate > now) {
						$s.errors.shortcode = "The ballot you selected will not have the results released until " + resultsDate.tz(moment.tz.guess()).format('MMM Do YYYY, h:mm a') + " " + moment.tz.guess() + " Time";

            if (!loggedIn) {
						  return;
            }
        }

          var hideNames = resp.data[0].hideNames == 1;
          var hideDetails = resp.data[0].hideDetails == 1;
          var allowCustom = resp.data[0].allowCustom == 1;
          $s.voterNames = [];
          $s.voterIds = [];
          let mostRecentVote = resp.data[0].date_created;
          $s.graphUpdated = resp.data[0].graphUpdated;
          window.rawVotes = resp.data;
					$s.votes = resp.data.map(function(result) {
						$s.seats = parseInt(result.positions);
						$s.register = result.register;
						$s.rcvisSlug = result.rcvisSlug;
						$s.rcvisId = result.rcvisId;
						$s.showGraph = result.showGraph == '1';
						$s.allowCustom = result.allowCustom;
						$s.tieBreak = result.tieBreak;
            if (mostRecentVote < result.date_created) {
              mostRecentVote = result.date_created;
            }
            if (!hideNames || loggedIn) {
						  $s.voterNames.push(result.name);
            }

						$s.hideDetails = hideDetails && !loggedIn;
						$s.voterIds.push(result.vote_id);

						if (result.vote) {
							return JSON.parse(result.vote.replace(/\s/g, ' '));
						}
						// THIS DOESN'T WORK YET
						//$s.names = result;
					});
					$s.names = _.uniq(_.flatten($s.votes));
          $s.mutableVotes = JSON.parse(JSON.stringify($s.votes));
          
        
          if ($s.showGraph) {
            if($s.voteClosed) {
              $s.patchRcvis = !$s.rcvisSlug || $s.graphUpdated < mostRecentVote;
              $s.ballotName = resp.data[0].ballotName;
              $s.ballotId = resp.data[0].ballotId;

              if (!$s.patchRcvis) {
                $s.displayRcvisIframe();
              }
            }
          } else  {
            $s.showGraphTease = $s.votes.length > 3 && (loggedIn || createdBy == 'guest');
          }

					$('.ballot-name').text(' for ' + resp.data[0].ballotName);
					$s.runTheCode(loggedIn);
					$s.bodyText = $sce.trustAsHtml($s.outputstring);
					$s.final = true;
				})
			;
		};
    
    $s.addCustomCandidate = function() {
      const customEntry = $s.ballot.customEntry;
      
      if (customEntry) {
			  $http.get('/api/add-custom-entry.php?key=' + $s.ballot.key + '&entry=' + customEntry)
          .then(function(resp) {
            if (resp.data) {
              $s.candidates.push({
                id: resp.data[0].entry_id,
                name: customEntry,
                image: '',
                hyperlink: '',
                color: null
              })
            }
          })
        ;
      }
      
      $s.ballot.customEntry = '';
    };

		$s.generateRandomKey = function(len, dup) {
			len = len || 4;
			var key = Math.random().toString(36).substr(2, len);
			$http.get('/api/get-key-ballot.php?key=' + key)
				.then(function(resp) {
					if (resp.data.length) {
						$s.generateRandomKey(++len);
					} else {
						$s.errors.key = null;
						$s.success.key = null;
						if(dup) {
							$s.dupBallot.key = key;
						} else {
							$s.ballot.key = key;
						}
					}
				})
			;
		};

		$s.changeBallot = function(ballot) {
			$s.ballot = ballot;
			$s.editBallot = true;
			$s.ballot.positions = parseInt($s.ballot.positions);
			$s.ballot.resultsRelease = new Date($s.ballot.resultsRelease);
			$s.ballot.voteCutoff = new Date($s.ballot.voteCutoff);
      $s.editTime = true;
      $s.editDate = true;
      $s.showRelease = true;
      $s.advancedOptions = true;
      $s.ballot.hideNames = ballot.hideNames == 1;
      $s.ballot.hideDetails = ballot.hideDetails == 1;
      $s.ballot.allowCustom = ballot.allowCustom == 1;
      $s.ballot.showGraph = ballot.showGraph == 1;

			$http.get('/api/get-candidates.php?edit=true&key=' + $s.ballot.key + '&t=' + Date.now())
				.then(function(resp) {
					if (resp.data) {
						$s.entries = resp.data.map(function(entry) {
							return entry.candidate;
						});
						$s.images = resp.data.map(function(entry) {
							return entry.image;
						});
						$s.hyperlinks = resp.data.map(function(entry) {
							return entry.hyperlink;
						});
						$s.entryColors = resp.data.map(function(entry) {
							return entry.color;
						});
						$s.navigate('create');
					}
				})
			;
		};

		$s.checkAvailability = _.debounce(function() {
			var key = $s.dupBallot ? $s.dupBallot.key : $s.ballot.key;
			$http.get('/api/get-key-ballot.php?key=' + key)
				.then(function(resp) {
					if (resp.data.length) {
						$s.success.key = null;

						if (key) {
							$s.errors.key = key + ' is already in use';
						} else {
							$s.errors.key = 'Shortcode is required';
						}
					} else {
						$s.errors.key = null;
						$s.success.key = key + ' is available';
					}
				})
			;
		}, 250);

    $s.addImageModal = function(idx) {
      $('#image-modal').find('input').data('idx', idx).val();
      $('#image-modal').modal('show');
    };

    $s.addImage = function() {
      var idx = $('#image-modal').find('input').data('idx');
      $s.images[idx] = $('#image-modal').find('input').val();
      $('#image-modal').find('input').val('');
      $('#image-modal').modal('hide');
    };

    $s.addHyperlinkModal = function(idx) {
      $('#hyperlink-modal').find('input').data('idx', idx).val();
      $('#hyperlink-modal').modal('show');
    };

    $s.addHyperlink = function() {
      var idx = $('#hyperlink-modal').find('input').data('idx');
      var href = $('#hyperlink-modal').find('input').val();
      if (href && !href.match(/^(http|https):\/\//i)) {
        href = 'http://' + href;
      }
      $s.hyperlinks[idx] = encodeURIComponent(href);
      $('#hyperlink-modal').find('input').val('');
      $('#hyperlink-modal').modal('hide');
    };

		$s.removeEntry = function(idx) {
			$s.entries.splice(idx, 1);
			$s.images.splice(idx, 1);
			$s.hyperlinks.splice(idx, 1);
			$s.entryColors.splice(idx, 1);
		};

		$s.removeCandidate = function(idx) {
			$s.candidates.splice(idx, 1);
		};

		$s.resetCandidates = function() {
			$s.candidates = _.shuffle($s.originalCandidates);
		};

		$s.newBallot = function() {
			const tempReserve = $s.ballot.resultsRelease;
  
			if (!$s.editTime && !$s.editDate) {
				$s.ballot.sqlResultsRelease = updateTime(new Date());
				$s.ballot.sqlVoteCutoff = updateTime(new Date('2199-12-31T23:59:59'));
			} else {
				$s.ballot.sqlVoteCutoff = updateTime($s.ballot.voteCutoff, $s.ballot.voteTimezone);
        $s.ballot.sqlResultsRelease = $s.ballot.sqlVoteCutoff;
			}

			if ($s.showRelease) {
				$s.ballot.sqlResultsRelease = updateTime(tempReserve, $s.ballot.resultTimezone);
			}
      
      const postRCV = function( data , textStatus , jqXHR ) {
//      if (!$s.editBallot) {
        if (false) {
          const lessOne = data.length -1;
          const finalChar = data.charAt(lessOne);
          const jsonStr = finalChar === '}' ? data : data.substr(0, lessOne);
          const respObj = JSON.parse(jsonStr);

          $s.ballot.rcvisId = respObj.id;
          $s.ballot.rcvisSlug = respObj.slug;
        }

        $s.ballot.createdBy = $s.user.id || 'guest';
        $http({
          method: 'POST',
          url: '/api/' + ($s.editBallot ? 'update' : 'new') + '-ballot.php',
          data: $s.ballot,
          headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).success(function(resp) {
          if (resp.errors) {
            $s.errors = resp.errors;
          } else if ($s.editBallot) {
            $s.editBallot = false;
            $s.navigate('profile');
          } else {
            $s.ballot.id = resp;
            $s.entries = [];
            $s.images = [];
            $s.hyperlinks = [];
            $s.entryColors = [];
          }
        });
      }
      
//    if ($s.patchRcvis && !$s.editBallot) {
      if (false) {
        $.ajax({
          url: '/api/rcvis_new.php',
          type: 'POST',
          data: dataFromObj($s.ballot.name),
          cache: false,
          processData: false,
          contentType: false, 
          success: postRCV
        });
      } else {
        postRCV();
      }
		};
    
    $s.generateQRCode = function(shortCode) {
      var url = "https://rankedchoices.com/" + shortCode;
      new QRCode(document.getElementById("qrcode"), url);
    };

		$s.submitEntries = function() {
			if ($s.entries.length < 2) {
				$s.errorEntry = 'Must have at least 2 entries';

				return;
			}

			if ($s.editBallot) {
				$http({
					method: 'POST',
					url: '/api/delete-entries.php',
					data: $s.ballot,
					headers: {'Content-Type': 'application/x-www-form-urlencoded'}
				}).success(function(resp) {
					$s.editBallot = false;
					$s.submitEntries();
				});

				return;
			}
			$http({
				method: 'POST',
				url: '/api/add-entries.php',
				data: {
					entries: $s.entries,
          images: $s.images,
          hyperlinks: $s.hyperlinks,
          colors: $s.entryColors,
					ballotId: $s.ballot.id
				},
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp) {
				if (resp.errors) {
					$s.errors = resp.errors;
				} else {
					$s.congrats = true;
          $s.generateQRCode($s.ballot.key);
				}
			});
		};

		$s.submitVote = function() {
      if ($s.uniqueCode === trickVote) {
				$s.thanks = true;
        return;

      }
			$http({
				method: 'POST',
				url: '/api/vote.php',
				data: {
					vote: JSON.stringify($s.candidates.map(function(cand) {
						return cand.name;
					})),
          voteIds: JSON.stringify($s.candidates.map(function(cand) {
						return cand.id;
					})).replace(/"/g, ''),
					key: $s.ballot.key,
          id: $s.ballot.id,
          name: $s.ballot.voterName
				},
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(function(resp) {
				$s.thanks = true;
        if ($s.bbiBallot) {
          $s.patchRcvis = true;
          $s.getResults();
        }
				console.log(resp);
			});
		};

		$s.duplicateBallot = function(ballot) {
			$s.dupBallotName = ballot.name;
			$s.dupBallot = _.clone(ballot);
			$s.success.key = null;
			$s.errors.key = $s.dupBallot.key + ' is already in use';
			$('#dup-ballot-modal').modal('show');
		};

		$s.duplicateBallotSubmit = function() {
			if ($s.dupBallot.key) {
				var tempId = $s.dupBallot.id;
				$http.get('/api/get-key-ballot.php?key=' + $s.dupBallot.key)
					.then(function(resp) {
						if (resp.data.length) {
							alert($s.dupBallot.key + ' is already in use');
						} else {
              $s.dupBallot.sqlVoteCutoff = $s.dupBallot.voteCutoff._i || $s.dupBallot.voteCutoff;
              $s.dupBallot.sqlResultsRelease = $s.dupBallot.resultsRelease._i || $s.dupBallot.resultsRelease;
							$http({
								method: 'POST',
								url: '/api/new-ballot.php',
								data: $s.dupBallot,
								headers: {'Content-Type': 'application/x-www-form-urlencoded'}
							}).success(function(resp) {
								if (resp.errors) {
									$s.errors = resp.errors;
								} else {
									$http({
										method: 'POST',
										url: '/api/duplicate-ballot.php',
										data: {
											ballotId: resp,
											duplicateBallotId: tempId
										},
										headers: {'Content-Type': 'application/x-www-form-urlencoded'}
									}).success(function(resp) {
										console.log(resp);
										window.location.reload();
									});
								}
							});
						}
					})
				;
			}
		};

		$s.deleteBallot = function(ballot) {
			if (confirm('Delete ' + ballot.name + ' ballot?\nThis action cannot be undone')) {
				deleteThis(ballot, 'ballot');
				_.remove($s.allBallots, ballot);
			}
		};

		$s.deleteVotes = function(ballot) {
			if (confirm('Delete all ' + ballot.name + ' votes?\nThis action cannot be undone')) {
				deleteThis(ballot, 'votes');
				ballot.totalVotes = 0;
			}
		};
    
    $s.deleteVote = function(voteId) {
      deleteThis({
        voteId: voteId,
        createdBy: $s.user.id,
        shortcode: $s.shortcode,
        username: $s.user.name
      }, 'vote');
    }

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
			if ($s.patchRcvis) {
				setTimeout($s.getResults, 1);
      } else
			if ($s.activeLink == 'results') {
				setTimeout($s.getResults, 500);
			} else {
				$s.getCandidates();
			}
		};
    
    $s.submitCreateGraph = function() {
      if (confirm('Cutoff Voting?\nDo not proceed unless all voting is complete.')) {
        var key = $s.shortcode || $s.ballot.key;
        $http.get('/api/create-graph.php?key=' + key)
          .then(function() {
            var cacheTime = Math.random().toString().slice(-4);
            window.location = '/results?t=' + cacheTime + '#' + key;
        });
      }
    };

		$s.addEntry = function() {
			if (!$s.entryInput.length) {
				$s.errorEntry = 'Entries must not be blank';
			} else if ($s.entries.indexOf($s.entryInput) !== -1) {
				$s.errorEntry = 'No duplicate entries allowed';
      } else if ($s.entryInput.indexOf('"') !== -1) {
        $s.errorEntry = 'Entry may not contain the double-quote (") symbol';
			} else {
				$s.errorEntry = '';
				$s.entries.push($s.entryInput);
				$s.images.push('');
				$s.hyperlinks.push('');
				$s.entryColors.push('');
				$s.entryInput = '';
			}
		};
    
    $s.copyToClipboard = function(str) {
      const el = document.createElement('textarea');
      el.value = str;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    };

		$s.shortcode = getVoteParam();

		if ($s.shortcode) {
			$s.activeLink = 'vote';
			$s.getCandidates();
		}
	}
]);

var mc = {
	pluralize: function pluralize(str) {
		return str.replace(/y$/, 'ie') + 's';
	},

	camelToTitle: function camelToTitle(str) {	//	convert camelCaseString to Title Case String
		return _.capitalize(str.replace(/([A-Z])/g, ' $1')).trim();
	},

	randomDigits: function randomDigits(min, max) {
		min = min === undefined ? 1 : min;
		max = max || 999;

		return Math.floor(Math.random() * (max - min + 1) + min);
	},

	alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),

	isAngularObjectEqual: function isAngularObjectEqual(object1, object2) {
		return _.isEqual(_.omit(object1, '$$hashKey'), _.omit(object2, '$$hashKey'));
	},

	expandArray: function expandArray(array, times) {	//	turns [1,2,3] into [1,2,3,1,2,3,1,2,3];
		times = times || 3;	//	default number of times to expand it by

		var expandedArray = [];

		for (var i = 0; i < times; i++) {
			expandedArray = expandedArray.concat(angular.copy(array));
		}

		return expandedArray;
	},

	calculateAge: function calculateAge(dateOfBirth) {
		var age;

		if (dateOfBirth) {
			var year = Number(dateOfBirth.substr(0, 4));
			var month = Number(dateOfBirth.substr(5, 2)) - 1;
			var day = Number(dateOfBirth.substr(8, 2));
			var today = new Date();
			age = today.getFullYear() - year;

			if (today.getMonth() < month || (today.getMonth() == month && today.getDate() < day)) {
				age--;
			}
		}

		return age || 0;
	}
};

mainApp.factory('VoteFactory', [
	function VoteFactory() {
		'use strict';

		return {
			wincount: 0,
			roundnum: 0,
			elected: [],

			runTheCode: function(loggedIn) {
        const contest = $s.bbiBallot ? bbiBallots[$s.bbiGroup].contest : $s.ballotName;
				this.firstQuota();
				this.outputstring = this.createHeader();
        this.wincount = 0;
        this.roundnum = 0;
        this.elected = [];
        this.renewTally = {};
        this.jsonObj = {
          config: {
            contest,
            date: $s.rightNow.format('YYYY-MM-DD'),
            jurisdiction : "https://RankedChoices.com",
            office : "Assorted",
            threshold : this.quota
          },
          results : []
        };
				this.anotherRound(loggedIn);
			},

			firstQuota: function() {
        const maxSeats = Math.min(this.seats, $s.names.length);
        this.seats = maxSeats;

        this.quota = _.round(this.votes.length / (this.seats + 1), 2);

        this.voteweight = _.range(1, this.votes.length + 1, 0);
			},
      
      renewQuota: function() {
        const voteValue = this.voteweight.reduce((v, t) => v + t, 0);
        const remainingSeats = this.seats - this.wincount;
        
        this.quota = _.round(voteValue / (remainingSeats + 1), 2);
      },

      getVoterName: function(idx) {
        return this.voterNames[idx] || 'Vote ' + (idx + 1);
      },

      getVoterId: function(idx) {
        return this.voterIds[idx] || 0;
      },

			displayVotes: function(loggedIn) {
				var model = this;
				this.outputstring += '<tbody>';
        console.log(JSON.stringify(model.user));
        console.log(model.user, model);
				_.each(this.votes, function(vote, idx) {
          var dName = model.getVoterName(idx);
					model.outputstring += '<tr><th>';
          if (loggedIn) {
            model.outputstring += '<i class="fa fa-times text-danger btn" data-delete-vote=' + $s.voterIds[idx] + '></i>';
          }
          model.outputstring += dName;
          model.outputstring += ':</th>';
					var colspan = model.names.length - vote.length;
					_.each(vote, function(name, idx2) {
						if (idx2 === 0) {
							model.outputstring += '<td><span class="next-vote">' + name + '</span></td>';
						} else {
							model.outputstring += '<td>' + name + '</td>';
						}
					});

					if (colspan) {
						model.outputstring += '<td colspan=' + colspan + '></td>';
					}

					if (model.seats > 1) {
						model.outputstring += '<td>vote-value = ' + _.round(model.voteweight[idx], 4) + '</td></tr>';
					}
				});
				this.outputstring += '</tbody></table>';
			},

			createHeader: function() {
				if (this.seats > 1) {
					return '<strong>Candidates: ' + this.names.length + ' | Seats: ' + this.seats + ' | Votes: ' + this.votes.length + ' | Quota: ' + this.quota + '</strong><br>';
				} else {
					return '<strong>Candidates: ' + this.names.length + ' | Votes: ' + this.votes.length + '</strong><br>';
				}
			},

			// Check for 'end' conditions otherwise count votes again
			anotherRound: function(loggedIn) {
				if (this.wincount == this.seats) {
					this.finishElection();
				} else {
          this.renewQuota();
          var newRoundNum = ++this.roundnum;
          this.jsonObj.results.push({ round: newRoundNum, tally: this.initTally(), tallyResults: [{}]});

          if (this.votes.length < 100 || loggedIn) {
            this.outputstring += '</p><table class="table"><thead>Round ' + (newRoundNum) + ' votes</thead>';
            this.displayVotes(loggedIn);
          } else {
            this.outputstring += '</p><hr>Round ' + (newRoundNum) + ' Summary<hr>';
          }
					this.countVotes();
				}
			},
      
      initTally: function() {        
        return JSON.parse(JSON.stringify(this.renewTally));
      },

			countVotes: function() {
				var quotacount = 0;
				var model = this;
				var displaySet = [];
				this.votenum = _.range(0, this.names.length, 0);

				_.each(this.votes, function(vote, idx) {
					var choice = model.names.indexOf(vote[0]);
          
          if (choice !== -1) {
  					model.votenum[choice] += model.voteweight[idx];
          }
				});

				_.each(this.names, function(name, idx) {
					displaySet.push({
						name: name,
						vote: _.round(model.votenum[idx], 4)
					});

					if (model.votenum[idx] > model.quota) {
						quotacount++;
					}
				});

				_.sortBy(displaySet,'vote').reverse().forEach(function(cand) {
          if(cand.vote > 0) {
            model.jsonObj.results[model.roundnum - 1].tally[cand.name] = cand.vote + '';
          }

					model.outputstring += cand.name + ' = ' + cand.vote + '<br>';
				});

				// only one candidate left, they automatically win
				var votesLeft = _.without(this.votenum, 0);
				if (votesLeft.length == 1) {
					this.quota = Math.min(this.quota, votesLeft[0]);
					quotacount++;
				}

				this.buildDataForOutcome(quotacount);
			},

			buildDataForOutcome: function(data) {
				if (data) {
					data = {
						math: 'max',
						class: 'elected',
						elect: true,
						text: {
							count: 'Most votes currently held',
							total: 'greatest number of',
							tie: 'says the first surplus to be re-allocated',
							result: 'has exceeded the quota and is elected. If there are seats remaining to be filled, the surplus will now be reallocated'
						}
					};
				} else {
					data = {
						math: 'min',
						class: 'eliminated',
						text: {
							count: 'Fewest votes won',
							total: 'fewest',
							tie: 'loser',
							result: 'is eliminated. If other candidates have no votes, they will also be eliminated'
						}
					};
				}

				this.determineOutcome(data);
			},

			// Show results for either winning candidate or losing candidate.
			determineOutcome: function(data) {
				// TODO: Eliminate every candidate with zero votes in the first round in which a candidate is eliminated.
				// apex = votes needed to either be elected or be eliminated
				var apex = this.votenum.reduce(function(prev, current) {
					return current ? Math[data.math](prev, current) : prev;
				}, this.quota);
				var count = this.votenum.filter(function(num) {
					return num == apex;
				}).length;
				var chosen = this.votenum.indexOf(apex);

				this.outputstring += '<br>' + data.text.count + ' by a candidate = ' + _.round(apex, 4) + '.';
				this.outputstring += '<br>Number of candidates with the ' + data.text.total + ' votes = ' + count + '.';

				if (count > 1) {
					chosen = this.tieBreak == 'random' ? this.breakTieRandom(apex) : this.breakTieWeighted(apex, data.text.tie);
					this.outputstring += '<br>' + jsUcfirst(this.tieBreak) + ' tiebreaker ' + data.text.tie + ' is <span class="' + data.class + '">' + this.names[chosen] + '</span>.';
				}
        
        if (data.class == 'eliminated') {
          this.jsonObj.results[this.roundnum - 1].tallyResults[0].eliminated = this.names[chosen];
          this.votenum.reverse().forEach((vote, index) => {
            if (vote == 0) {
              var trueIndex = this.votenum.length - 1 - index;
              this.removeChosen(trueIndex, data.class);
            }
          })
        } else {
          this.jsonObj.results[this.roundnum - 1].tallyResults[0].elected = this.names[chosen];
        }

				this.outputstring += '<br><span class="' + data.class + '">' + this.names[chosen] + '</span> ' + data.text.result + '.';
				this.removeChosen(chosen, data.class, data.elect, true);
			},

			// remove either the elected or eliminated candidates from votes
			removeChosen: function(chosen, className, elect, newRound) {
				if (elect) {
					this.elected[this.wincount++] = this.names[chosen];
          this.renewTally[this.names[chosen]] = this.quota;
				}
				var model = this;
				_.each(this.votes, function(vote, index) {
					var found = vote.indexOf(model.names[chosen]);

					if (found !== -1) {
						if (found === 0) {
							if (elect) {
								model.voteweight[index] *= 1 - model.quota / model.votenum[chosen];
							}
							vote.push('<span class="' + className + '">' + vote[found] + '</span>');
						}
						vote.splice(found, 1);
					}
				});
        _.each(this.mutableVotes, function(vote, index) {
					var found = vote.indexOf(model.names[chosen]);

					if (found !== -1) {
						vote.splice(found, 1);
					}

          if (!vote.length) {
            model.voteweight[index] = 0;
          }
				});
        if (newRound) {
				  this.anotherRound();
        }
			},

			// Analyses which candidates are marginally stronger for the purpose of breaking ties
			breakTieWeighted: function(value, tieText) {
        var isLoser = tieText == 'loser';
				var model = this;
				var tieArray = [];
				var i;
				// length of longest vote array
				var voteSize = this.votes.reduce(function(voteSize, vote) {
					return Math.max(voteSize, vote.length);
				}, 0);
				var calculateValue = function(voteArr, idx) {
					var tie = _.find(tieArray, {name: voteArr[i]});

					if (tie) {
						// 2nd place votes are exponentially greater than 3rd place votes etc.
						tie.value += model.voteweight[idx] / Math.pow(10, i);
					}
				};
				// populate tieArray only with tie breakers
				this.votenum.map(function(val, idx) {
					if (val == value) {
						tieArray.push({
							index: idx,
							name: model.names[idx],
							value: 0
						});
					}
				});

				for (i = 1; i < voteSize; i++) {
					this.votes.map(calculateValue);
				}
				// sort by ascending vote value
				tieArray.sort(function(a, b) {
          if(isLoser) {
					  return a.value - b.value;
          } else {
            return b.value - a.value;
          }
				});

				return tieArray[0].index;
			},

			// creative way to achieve repeatable randomizing
			breakTieRandom: function(value) {
				var model = this;
				var tieArray = [];
				var randomize = function(seed) {
					var string = model.votes.length + seed.replace(/\W/g, '') + model.roundnum;
          var numString = '' + parseInt(string, 36);
          var newNumber = Number(numString.substr(0, 10));
					// algorithm supplied by http://indiegamr.com/generate-repeatable-random-numbers-in-js/
					return (newNumber * 9301 + 49297) % 233280;
				};
				// populate tieArray only with tie breakers
				this.votenum.map(function(val, idx) {
					if (val == value) {
            var seed = model.names[idx].substr(0, 12);
						tieArray.push({
							index: idx,
							rand: randomize(seed + idx)
						});
					}
				});

				// sort by ascending random value
				tieArray.sort(function(a, b) {
					return b.rand - a.rand;
				});

				return tieArray[0].index;
			},

			// Finish election and announce the winner(s).
			finishElection: function() {
				var model = this;
				this.outputstring += '<p><b>The election is complete and the elected candidates are';
				_.each(this.elected, function(name) {
					model.outputstring += ' (' + name + ')';
				});
				this.outputstring += '.</b></p>';
        
        if ($s.patchRcvis) {
          const objectMap = (obj, fn) =>
            Object.fromEntries(
              Object.entries(obj).map(
                ([k, v], i) => [k, fn(v, k, i)]
              )
            )
          ;

          for (var i = 0; i < this.jsonObj.results.length; i++) {
            var nextResults = this.jsonObj.results[i + 1];

            if (nextResults) {
              this.jsonObj.results[i].tallyResults[0].transfers = objectMap(nextResults.tally, (value, key) => {
                const newVotes = Number(value);
                const oldVotes = Number(this.jsonObj.results[i].tally[key]);
                
                if (!oldVotes) {
                  for (var j = 0; j <= i; j++) {
                    this.jsonObj.results[j].tally[key] = "0";
                  }
                  
                  return newVotes + '';
                }
                
                const diff = newVotes - oldVotes;

                return diff + '';
              })
            }
          }
          this.jsonObj.config.threshold = this.quota;
          if ($s.bbiBallot) {
            $.ajax({
              url: '/api/rcvis_patch.php?t=45&bbi=true&id=' + bbiBallots[$s.bbiGroup].id,
              type: 'POST',
              data: dataFromObj(this.jsonObj),
              cache: false,
              processData: false,
              contentType: false, 
              success: function( data , textStatus , jqXHR )
              {               
                  if ($s.bbiGroup == 'a') {
                    const finalChar = $s.ballot.voterName.slice(-1).toLowerCase();
                    const isMajorParty = finalChar === 'r' || finalChar === 'd';

                    $s.bbiGroup = isMajorParty ? finalChar : 'o';
                    
                    $s.votes = window.rawVotes.filter(rawVote => {
                      if (!rawVote.name) return false;
                      if (!rawVote.vote) return false;
                  
                      const party = rawVote.name.slice(-1).toLowerCase();
                      
                      if (isMajorParty) {
                        return party === $s.bbiGroup;
                      }
                      
                      return party !== 'r' && party !== 'd';
                    }).map(
                      rawVote => JSON.parse(rawVote.vote.replace(/\s/g, ' '))
                    );
                    
                    $s.runTheCode();
                  }
                  if( typeof data.error === 'undefined' ) {
  //                     debugger;
                  } else {                   
                      alert( 'ERRORS: ' + data.error );
                  }
              },
              error: function(jqXHR, textStatus, errorThrown) { 
                debugger;
                alert( 'error on upload' ); 
              }
            });
          } else if ($s.rcvisId && $s.rcvisSlug) {
            $.ajax({
              url: '/api/rcvis_patch.php?t=451&id=' + $s.rcvisId,
              type: 'POST',
              data: dataFromObj(this.jsonObj),
              cache: false,
              processData: false,
              contentType: false, 
              success: function( data , textStatus , jqXHR )
              {               
                  if( typeof data.error === 'undefined' ) {
                    $s.displayRcvisIframe();
                  } else {                   
                    alert( 'ERRORS: ' + data.error );
                  }
              },
              error: function(jqXHR, textStatus, errorThrown) { 
                debugger;
                alert( 'error on upload' ); 
              }
            });
          } else {
            $.ajax({
              url: '/api/rcvis_new.php?id=' + $s.ballotId,
              type: 'POST',
              data: dataFromObj(this.jsonObj),
              cache: false,
              processData: false,
              contentType: false, 
              success: function( data , textStatus , jqXHR )
              {               
                  if( typeof data.error === 'undefined' ) {
                    const lessOne = data.length -1;
                    const finalChar = data.charAt(lessOne);
                    const jsonStr = finalChar === '}' ? data : data.substr(0, lessOne);
                    let respObj;
                    
                    try {
                      respObj = JSON.parse(jsonStr);
                    } catch(e) {
                      return;
                    }
                    
                    if (!respObj.id || !respObj.slug) return;

                    $s.rcvisId = respObj.id;
                    $s.rcvisSlug = respObj.slug;
                    $s.displayRcvisIframe();
                    
                    $.get('/api/rcvis_slug.php?key=' + $s.shortcode + '&slug=' + $s.rcvisSlug + '&id=' + $s.rcvisId);
                  } else {                   
                    alert( 'Error: Please refresh to see results.' );
                  }
              },
              error: function(jqXHR, textStatus, errorThrown) { 
                alert( 'Error: Please refresh to see results.' ); 
              }
            });
          }
        }
			}
		};
	}
]);
