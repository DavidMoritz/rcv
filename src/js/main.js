/*!
 * Initualize a new Angular app - v0.0.1
 * Build Date: 2017.09.08
 * Docs: http://moritzcompany.com
 * Coded @ Moritz Company
 * revised by David Moritz
 */

import { setCookie, getCookie, getDeviceToken } from './utils/cookies.js';
import { jsUcfirst, dataFromObj, trickVote } from './utils/helpers.js';
import { bbiBallots } from './constants/bbi-ballots.js';
import mc from './utils/mc.js';

/* Iframe auto-resize: hosted pages can postMessage their height */
window.addEventListener('message', function (e) {
  if (e.data && e.data.iframeHeight) {
    var iframes = document.querySelectorAll('.ballot-iframe');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === e.source) {
        iframes[i].style.height = e.data.iframeHeight + 'px';
      }
    }
  }
});

// Note: mainApp module is defined in app.js
// Retrieve the existing module instead of redefining it
var mainApp = angular.module('mainApp');

// Note: mainApp.config and initial .run() are defined in app.js
// This runs after mc is defined to add it to $rootScope
mainApp.run([
  '$rootScope',
  function ($rootScope) {
    $rootScope.mc = mc;
    if (getCookie('loginId')) {
      setUser(
        {
          id: getCookie('loginId'),
          name: getCookie('loginName')
        },
        'profile'
      );
    }
  }
]);

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

window.fbAsyncInit = function () {
  FB.init({
    appId: '916767641776363',
    xfbml: true,
    version: 'v2.5'
  });
  FB.getLoginStatus(function (response) {
    statusChangeCallback(response);
  });
};

$(document).on('click', '[data-delete-vote]', function () {
  if (
    confirm('Delete this vote?\nThis action cannot be undone.\nRefresh page to see new results.')
  ) {
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
    setTimeout(function () {
      $('.js-timezone-picker').val(moment.tz.guess());
    }, 1000);

    var getVoteParam = function (navigate) {
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

      if (_.find($s.navItems, { link: param })) {
        if (navigate) {
          $s.navigate(param, key);
        }

        return '';
      }

      return param;
    };

    var updateTime = function (dateObj, zoneString) {
      zoneString = zoneString || moment.tz.guess();
      var mom = moment(dateObj).tz(zoneString, true);

      return mom
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z/, '');
    };

    var deleteThis = function (data, item) {
      $http({
        method: 'POST',
        url: '/api/delete-' + item + '.php',
        data: data
      }).success(function (resp) {
        $s.deleted = true;
      });
    };

    var resetBallot = function () {
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
        oneDeviceOneVote: 0,
        tieBreak: 'weighted',
        voteCutoff: roundResultsRelease(),
        voteTimezone: moment.tz.guess(),
        resultTimezone: moment.tz.guess()
      };
    };

    var getContributions = function () {
      $http({
        method: 'GET',
        url: '/api/get-contributions.php'
      }).then(function (resp) {
        $s.contributions = resp.data;
      });
    };

    var getBallots = function () {
      // we need to get ballots based on user signin
      if ($s.user.id) {
        $http({
          method: 'POST',
          url: '/api/get-ballots.php',
          data: $s.user
        }).then(function (resp) {
          $s.now = new Date();
          $s.allBallots = resp.data.map(function (ballot) {
            ballot.voteCutoff = moment.tz(ballot.voteCutoff, 'Zulu');
            ballot.resultsRelease = moment.tz(ballot.resultsRelease, 'Zulu');

            return ballot;
          });
        });
      } else {
        setTimeout(getBallots, 750);
      }
    };

    var resetNav = function (hide) {
      $s.navItems.map(function (item) {
        if (item.link == 'profile') {
          item.hide = !hide;
        } else if (item.link == 'register') {
          item.hide = !!hide;
        }
      });
    };

    $s.$watch(function () {
      return window.location.pathname;
    }, getVoteParam);

    //	initialize scoped variables
    _.assign($s, {
      activeLink: 'home',
      navItems: [
        {
          link: 'home',
          text: 'Home'
        },
        {
          link: 'about',
          text: 'About'
        },
        {
          link: 'create',
          text: 'Create a new Ballot!'
        },
        {
          link: 'profile',
          text: 'Profile',
          hide: true
        },
        {
          link: 'hall_of_fame',
          text: 'Hall of Fame',
          hide: true
        },
        {
          link: 'code',
          text: 'Code',
          hide: true
        },
        {
          link: 'results',
          text: 'Results'
        },
        {
          link: 'register',
          text: 'Register'
        },
        {
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
      secureCodeValid: false,
      secure: { voterCode: '' },
      profileTab: 'standard',
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

    // Time-picker helpers
    $s.hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    $s.minutes = [];
    for (var i = 0; i < 60; i += 5) {
      $s.minutes.push({ value: i, label: (i < 10 ? '0' : '') + i });
    }

    function dateToTime(d) {
      var h = d.getHours();
      var meridian = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      // Round minute to nearest 5
      var m = Math.round(d.getMinutes() / 5) * 5;
      if (m === 60) m = 55;
      return { hour: h, minute: m, meridian: meridian };
    }

    $s.syncTimeToDate = function (field, t) {
      var d = new Date($s.ballot[field]);
      var h = t.hour % 12;
      if (t.meridian === 'PM') h += 12;
      d.setHours(h);
      d.setMinutes(t.minute);
      $s.ballot[field] = d;
    };

    function updateTimeObj(scopeKey, d) {
      var t = dateToTime(d);
      var cur = $s[scopeKey];
      if (!cur || cur.hour !== t.hour || cur.minute !== t.minute || cur.meridian !== t.meridian) {
        $s[scopeKey] = t;
      }
    }
    $s.$watch('ballot.voteCutoff', function (v) {
      if (v) updateTimeObj('cutoffTime', new Date(v));
    });
    $s.$watch('ballot.resultsRelease', function (v) {
      if (v) updateTimeObj('releaseTime', new Date(v));
    });

    $s.navigate = function (link, shortcode) {
      var found = _.find($s.navItems, { link: link });
      var title = found ? found.text : 'no_title';
      $s.activeLink = link;

      if ($('.navbar-collapse').hasClass('in')) {
        $('.navbar-collapse').collapse('hide');
      }

      switch (link) {
        case 'create':
          if (!$s.editBallot) {
            $s.ballot = resetBallot();
          }
          setTimeout(function () {
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
        case 'manage':
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
        $s.thanks = false;
        $s.deviceAlreadyVoted = false;
        $s.candidates = null;
        $s.secureCodeValid = false;
        $s.secure.voterCode = '';
        $s.final = false;
        $s.showText = false;
        $s.bodyText = '';
        $s.patchRcvis = false;
        $s.errors = {};
      }
    };

    $s.loginForm = function () {
      var payload = angular.copy($s.login);
      payload.password = (payload.password + 'My RCV salt').hashCode();
      $http({
        method: 'POST',
        url: '/api/login.php',
        data: payload
      }).then(
        function (resp) {
          if (typeof resp.data === 'string') {
            $s.loginError = true;
          } else {
            setUser(
              {
                id: resp.data[0].id,
                name: resp.data[0].username,
                email: resp.data[0].email,
                image: resp.data[0].image
              },
              'profile'
            );
            var cookieDays = $s.login.remember ? 30 : undefined;
            setCookie({ days: cookieDays, name: 'loginId', value: resp.data[0].id });
            setCookie({ days: cookieDays, name: 'loginName', value: resp.data[0].username });
          }
        },
        function () {
          $s.loginError = true;
        }
      );
    };

    $s.createNewAccount = function () {
      $http.get('/api/check-user.php?user=' + $s.newAccount.username).then(function (resp) {
        if (resp.data.length) {
          alert($s.newAccount.username + ' is already taken');
        } else {
          // Hash password on client (will be migrated to backend later)
          $s.newAccount.password = ($s.newAccount.password + 'My RCV salt').hashCode();
          // Don't send ID - server generates it
          $http({
            method: 'POST',
            url: '/api/add-user.php',
            data: $s.newAccount,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          })
            .then(function (response) {
              // Only log in user if registration succeeded
              if (response.data && response.data.id) {
                setUser(
                  {
                    id: response.data.id,
                    name: $s.newAccount.username
                  },
                  'create'
                );
              } else {
                alert('Registration failed: ' + (response.data.error || 'Unknown error'));
              }
            })
            .catch(function (error) {
              alert('Registration failed: ' + (error.statusText || 'Network error'));
            });
        }
      });
    };

    $s.signOut = function () {
      setCookie({ name: 'loginId', value: '', days: -1 });
      setCookie({ name: 'loginName', value: '', days: -1 });
      $s.user = {};
      resetNav();
      $s.navigate('home');
    };

    $s.validateZip = function () {
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
        $s.ballot.voterName =
          $s.uniqueCode.toLowerCase() + '-' + $s.zipCode + '-' + $s.partyAffiliation;
      }
    };

    $s.validateCode = function () {
      if ($s.uniqueCode.length !== 6) {
        $s.errors.uniqueCode = 'You must enter a valid unique code';

        return;
      }

      if ($s.uniqueCode == trickVote) {
        $s.uniqueCodeValid = true;

        return;
      }

      const t = Date.now();

      $http
        .get('/api/validate-voter-code.php?code=' + $s.uniqueCode.toLowerCase() + '&t=' + t)
        .then(function (resp) {
          if (resp.data.length) {
            $s.uniqueCodeValid = true;

            if ($s.partyAffiliation) {
              $s.validateZip();
            }
          } else {
            $s.errors.uniqueCode = 'You must enter a valid unique code';
          }
        });
    };

    $s.validateSecureCode = function () {
      $s.errors.secureCode = null;
      var code = ($s.secure.voterCode || '')
        .trim()
        .toLowerCase()
        .replace(/0/g, 'o')
        .replace(/1/g, 'i');

      if (code.length < 6) {
        $s.errors.secureCode = 'Please enter a 6-character code';
        return;
      }

      $http
        .get(
          '/api/validate-voter-code.php?code=' +
            code +
            '&ballotId=' +
            $s.ballot.id +
            '&t=' +
            Date.now()
        )
        .then(function (resp) {
          if (resp.data && resp.data.valid) {
            $s.secureCodeValid = true;
            $s.ballot.voterName = code;
          } else {
            $s.errors.secureCode = 'This code is not valid';
          }
        });
    };

    $s.updateUser = function (user, nav) {
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
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      }
    };

    $s.getCandidates = function () {
      $s.secureCodeValid = false;
      $s.secure.voterCode = '';
      const voterName = $s.ballot.voterName;

      $http
        .get('/api/get-candidates.php?key=' + $s.shortcode + '&t=' + Date.now())
        .then(function (resp) {
          if (resp.data && resp.data.status === 'closed') {
            var release = moment.tz(resp.data.resultsRelease, 'Zulu');
            if (release > moment()) {
              $s.errors.shortcode =
                'Voting has closed. Results will be released ' +
                release.tz(moment.tz.guess()).format('MMM Do YYYY, h:mm a');
            } else {
              $s.navigate('results', $s.shortcode);
            }
            return;
          }
          if (typeof resp.data == 'string') {
            $s.errors.shortcode = resp.data;
            return;
          }

          $s.originalCandidates = resp.data.map(function (entry) {
            $s.ballot = entry;
            $s.ballot.voterName = voterName || $loc.$$search.hash;
            $s.ballot.register = parseInt($s.ballot.register);
            $s.ballot.allowCustom = !!parseInt($s.ballot.allowCustom);
            $s.ballot.hideNames = !!parseInt($s.ballot.hideNames);
            $s.ballot.hideDetails = !!parseInt($s.ballot.hideDetails);
            $s.ballot.showGraph = !!parseInt($s.ballot.showGraph);
            $s.ballot.oneDeviceOneVote = !!parseInt($s.ballot.oneDeviceOneVote);
            $s.ballot.isSecure = !!parseInt($s.ballot.isSecure);
            $s.ballot.positions = parseInt($s.ballot.positions);
            if ($s.ballot.iframeUrl) {
              $s.ballot.iframeUrl = $sce.trustAsResourceUrl($s.ballot.iframeUrl);
            }

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
          $s.resultsReleaseFormatted = resultsDate.tz(moment.tz.guess()).format('MMM Do, h:mma');

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

          // Generate device fingerprint if oneDeviceOneVote is enabled
          if ($s.ballot.oneDeviceOneVote) {
            if (window.FingerprintJS) {
              FingerprintJS.load()
                .then(function (fp) {
                  return fp.get();
                })
                .then(function (result) {
                  $s.deviceFingerprint = result.visitorId;
                })
                .catch(function () {
                  $s.deviceFingerprint = getDeviceToken();
                });
            } else {
              $s.deviceFingerprint = getDeviceToken();
            }
          }
        });
    };

    $s.displayRcvisIframe = function () {
      setTimeout(function () {
        const iframe = document.createElement('iframe');
        const cacheBust = $s.graphUpdated ? $s.graphUpdated.replace(/\D/g, '') : Date.now();
        const listSize = $s.jsonObj.results.length
          ? Object.keys($s.jsonObj.results[0].tally).length
          : 0;
        const dynamicHeight = listSize || $s.roundnum || $s.ids.length;
        const house = document.getElementById('iframe-house');

        iframe.id = 'iframe-' + cacheBust;
        iframe.width = '100%';
        iframe.height = 449 + 20 * dynamicHeight + 'px';
        iframe.frameborder = '0';
        iframe.style = 'border: 0';
        iframe.allowfullscreen = 'allowfullscreen';
        iframe.src = $sce.trustAsResourceUrl(
          `https://rcvis.com/ve/${$s.rcvisSlug}?vistype=barchart-interactive&increment=` + cacheBust
        );

        house.appendChild(iframe);
        //         document.getElementById('iframe-' + cacheBust).contentWindow.location.reload();
        const disclaimer = document.getElementById('iframe-disclaimer');

        if (disclaimer) disclaimer.remove();
      }, 100);
    };

    $s.getResults = function () {
      var key = $s.shortcode || $s.ballot.key;
      $http.get('/api/get-votes.php?key=' + key + '&t=' + Date.now()).then(function (resp) {
        if (typeof resp.data == 'string') {
          $s.errors.shortcode = resp.data;

          return;
        }

        var voteRows = resp.data.votes;
        var entryList = resp.data.entries;

        // Build entry map: entry_id -> { name, image, color, hyperlink }
        $s.entryMap = {};
        _.each(entryList, function (e) {
          $s.entryMap[e.entry_id] = {
            name: e.name,
            image: e.image,
            color: e.color,
            hyperlink: e.hyperlink
          };
        });

        var resultsDate = moment.tz(voteRows[0].resultsRelease, 'Zulu');
        var voteCutoffDate = moment.tz(voteRows[0].voteCutoff, 'Zulu');
        var now = moment();
        $s.voteClosed = voteCutoffDate < now;
        var createdBy = voteRows[0].createdBy;
        $s.ballotCreatedBy = createdBy;
        $s.ballotId = voteRows[0].ballotId;
        var loggedIn = $s.user.id == createdBy;
        if (resultsDate > now) {
          $s.errors.shortcode =
            'The ballot you selected will not have the results released until ' +
            resultsDate.tz(moment.tz.guess()).format('MMM Do YYYY, h:mm a') +
            ' ' +
            moment.tz.guess() +
            ' Time';

          if (!loggedIn) {
            return;
          }
        }

        var hideNames = voteRows[0].hideNames == 1;
        var hideDetails = voteRows[0].hideDetails == 1;
        var allowCustom = voteRows[0].allowCustom == 1;
        $s.ballotIsSecure = voteRows[0].isSecure == 1;
        $s.voterNames = [];
        $s.voterIds = [];
        let mostRecentVote = voteRows[0].date_created;
        $s.graphUpdated = voteRows[0].graphUpdated;
        window.rawVotes = voteRows;
        $s.votes = voteRows.map(function (result) {
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

          if (result.voteIds) {
            var ids = JSON.parse(result.voteIds);
            // Backfill entryMap for IDs not in current entries (deleted/recreated entries)
            if (result.vote) {
              var names = JSON.parse(result.vote.replace(/\s/g, ' '));
              ids.forEach(function (id, i) {
                if (!$s.entryMap[id] && names[i]) {
                  var match = _.find(entryList, { name: names[i] });
                  $s.entryMap[id] = match
                    ? {
                        name: match.name,
                        image: match.image,
                        color: match.color,
                        hyperlink: match.hyperlink
                      }
                    : { name: names[i], image: '', color: null, hyperlink: '' };
                }
              });
            }
            return ids;
          }
          // Fallback to name-based parsing for votes without voteIds
          if (result.vote) {
            var names = JSON.parse(result.vote.replace(/\s/g, ' '));
            return names.map(function (name) {
              var found = _.find(entryList, { name: name });
              if (found) return parseInt(found.entry_id);
              // Generate a stable fake ID for orphaned names
              var fakeId = 'orphan_' + name;
              if (!$s.entryMap[fakeId]) {
                $s.entryMap[fakeId] = { name: name, image: '', color: null, hyperlink: '' };
              }
              return fakeId;
            });
          }
        });
        $s.ids = _.uniq(_.flatten($s.votes));
        $s.mutableVotes = JSON.parse(JSON.stringify($s.votes));

        if ($s.showGraph) {
          if ($s.voteClosed) {
            $s.patchRcvis = !$s.rcvisSlug || $s.graphUpdated < mostRecentVote;
            $s.ballotName = voteRows[0].ballotName;
            $s.ballotId = voteRows[0].ballotId;

            if (!$s.patchRcvis) {
              $s.displayRcvisIframe();
            }
          }
        } else {
          $s.showGraphTease = $s.votes.length > 3 && (loggedIn || createdBy == 'guest');
        }

        $('.ballot-name').text(' for ' + voteRows[0].ballotName);
        $s.runTheCode(loggedIn);
        $s.bodyText = $sce.trustAsHtml($s.outputstring);
        $s.final = true;
      });
    };

    $s.claimBallot = function () {
      $http
        .post('/api/claim-ballot.php', {
          ballotId: $s.ballotId,
          userId: $s.user.id
        })
        .then(function (resp) {
          if (resp.data.data && resp.data.data.success) {
            $s.claimSuccess = true;
            $s.ballotCreatedBy = $s.user.id;
          }
        });
    };

    $s.addCustomCandidate = function () {
      const customEntry = $s.ballot.customEntry;

      if (customEntry) {
        $http
          .get('/api/add-custom-entry.php?key=' + $s.ballot.key + '&entry=' + customEntry)
          .then(function (resp) {
            if (resp.data) {
              $s.candidates.push({
                id: resp.data[0].entry_id,
                name: customEntry,
                image: '',
                hyperlink: '',
                color: null
              });
            }
          });
      }

      $s.ballot.customEntry = '';
    };

    $s.generateRandomKey = function (len, dup) {
      len = len || 4;
      var key = Math.random().toString(36).substr(2, len);
      $http.get('/api/get-key-ballot.php?key=' + key).then(function (resp) {
        if (resp.data.length) {
          $s.generateRandomKey(++len);
        } else {
          $s.errors.key = null;
          $s.success.key = null;
          if (dup) {
            $s.dupBallot.key = key;
          } else {
            $s.ballot.key = key;
          }
        }
      });
    };

    $s.changeBallot = function (ballot) {
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
      $s.ballot.oneDeviceOneVote = ballot.oneDeviceOneVote == 1;
      $s.ballot.kickbackUrl = ballot.kickbackUrl || '';
      $s.ballot.iframeUrl = ballot.iframeUrl || '';
      $s.showIntegrationOptions = !!(ballot.kickbackUrl || ballot.iframeUrl);

      $http
        .get('/api/get-candidates.php?edit=true&key=' + $s.ballot.key + '&t=' + Date.now())
        .then(function (resp) {
          if (resp.data) {
            $s.entries = resp.data.map(function (entry) {
              return entry.candidate;
            });
            $s.images = resp.data.map(function (entry) {
              return entry.image;
            });
            $s.hyperlinks = resp.data.map(function (entry) {
              return entry.hyperlink;
            });
            $s.entryColors = resp.data.map(function (entry) {
              return entry.color;
            });
            $s.navigate('create');
          }
        });
    };

    $s.checkAvailability = _.debounce(function () {
      var key = $s.dupBallot ? $s.dupBallot.key : $s.ballot.key;
      $http.get('/api/get-key-ballot.php?key=' + key).then(function (resp) {
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
      });
    }, 250);

    $s.addImageModal = function (idx) {
      $('#image-modal').find('input').data('idx', idx).val();
      $('#image-modal').modal('show');
    };

    $s.addImage = function () {
      var idx = $('#image-modal').find('input').data('idx');
      $s.images[idx] = $('#image-modal').find('input').val();
      $('#image-modal').find('input').val('');
      $('#image-modal').modal('hide');
    };

    $s.addHyperlinkModal = function (idx) {
      $('#hyperlink-modal').find('input').data('idx', idx).val();
      $('#hyperlink-modal').modal('show');
    };

    $s.addHyperlink = function () {
      var idx = $('#hyperlink-modal').find('input').data('idx');
      var href = $('#hyperlink-modal').find('input').val();
      if (href && !href.match(/^(http|https):\/\//i)) {
        href = 'http://' + href;
      }
      $s.hyperlinks[idx] = encodeURIComponent(href);
      $('#hyperlink-modal').find('input').val('');
      $('#hyperlink-modal').modal('hide');
    };

    $s.sameTime = function () {
      if ($s.showRelease && $s.ballot.voteCutoff) {
        $s.ballot.resultsRelease = new Date($s.ballot.voteCutoff);
      }
    };

    $s.manageSecureBallot = function (ballot) {
      $s.manageBallot = ballot;
      $s.manageSort = 'code';
      $s.manageSortReverse = false;
      $s.activeLink = 'manage';
      $s.loadBallotCodes(ballot);
    };

    $s.loadBallotCodes = function (ballot) {
      $http({
        method: 'POST',
        url: '/api/get-ballot-codes.php',
        data: { ballotId: ballot.id, createdBy: $s.user.id }
      }).success(function (resp) {
        if (resp.codes) {
          $s.manageCodes = resp.codes.map(function (c) {
            if (c.votedAt) {
              c.votedAt = moment(c.votedAt).format('MMM D, h:mm a');
            }
            return c;
          });
          $s.manageCodesAvailable = resp.codes.filter(function (c) {
            return !c.votedAt;
          }).length;
        }
      });
    };

    $s.printCodeSheet = function () {
      var codes = ($s.manageCodes || [])
        .filter(function (c) {
          return !c.votedAt;
        })
        .sort(function (a, b) {
          return a.codeId - b.codeId;
        });
      if (!codes.length) {
        alert('No available codes to print.');
        return;
      }

      var ballot = $s.manageBallot;
      var html =
        '<!DOCTYPE html><html><head><title>Voter Codes - ' +
        ballot.name +
        '</title><style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: Arial, sans-serif; }' +
        '.instructions { text-align: center; padding: 20px; border-bottom: 2px solid #333; }' +
        '.instructions h2 { margin-bottom: 5px; }' +
        '.instructions p { color: #555; font-size: 14px; }' +
        '.grid { display: grid; grid-template-columns: repeat(3, 1fr); }' +
        '.code-cell { border: 1px solid #ccc; margin: -0.5px; padding: 24px 16px; text-align: center; break-inside: avoid; }' +
        '.code-cell .code { font-family: monospace; font-size: 32px; letter-spacing: 6px; font-weight: bold; text-transform: uppercase; }' +
        '.code-cell .label { font-size: 11px; color: #999; margin-top: 6px; }' +
        '.code-cell .ballot-name { font-size: 12px; color: #777; margin-bottom: 6px; }' +
        '@media print { .instructions { break-after: avoid; } }' +
        '</style></head><body>' +
        '<div class="instructions">' +
        '<h2>' +
        ballot.name +
        '</h2>' +
        '<h4>Cut along the lines.</h4>' +
        '<p>For &ldquo;Double-Blind&rdquo; elections, randomize the cut slips and distribute discreetly.<br/>This ensures no vote can be traced back to a voter without their direct consent.</p>' +
        '<p>Vote at: ' +
        $s.origin +
        '/' +
        ballot.key +
        '</p>' +
        '</div>' +
        '<div class="grid">';

      codes.forEach(function (c) {
        html +=
          '<div class="code-cell">' +
          '<div class="ballot-name">' +
          ballot.name +
          '</div>' +
          '<div class="code">' +
          c.code.toUpperCase() +
          '</div>' +
          '<div class="label">' +
          $s.origin +
          '/' +
          ballot.key +
          '</div>' +
          '</div>';
      });

      html += '</div></body></html>';

      var w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
    };

    $s.saveCodeLabel = function (code) {
      $http({
        method: 'POST',
        url: '/api/update-code-label.php',
        data: {
          ballotId: $s.manageBallot.id,
          code: code.code,
          label: code.label || '',
          createdBy: $s.user.id
        }
      });
    };

    $s.resetSecureVote = function (code) {
      if (
        !confirm(
          'Reset this vote for code ' + code.code.toUpperCase() + '?\nThis will delete the vote and free the code for reuse.'
        )
      )
        return;
      $http({
        method: 'POST',
        url: '/api/delete-vote.php',
        data: {
          voteId: code.voteId,
          shortcode: $s.manageBallot.key,
          createdBy: $s.user.id,
          username: $s.user.name
        }
      }).success(function () {
        $s.loadBallotCodes($s.manageBallot);
      });
    };

    $s.deleteCode = function (code) {
      $http({
        method: 'POST',
        url: '/api/delete-code.php',
        data: { ballotId: $s.manageBallot.id, code: code.code, createdBy: $s.user.id }
      }).success(function (resp) {
        if (resp.success) {
          $s.loadBallotCodes($s.manageBallot);
        }
      });
    };

    $s.endVotingNow = function () {
      if (!confirm('End voting now and release results immediately?\nNo more votes will be accepted.'))
        return;
      $http({
        method: 'POST',
        url: '/api/end-voting.php',
        data: { ballotId: $s.manageBallot.id, createdBy: $s.user.id }
      }).success(function (resp) {
        if (resp.success) {
          $s.manageBallot.voteCutoff = moment();
          $s.now = new Date();
        }
      });
    };

    $s.requestMoreCodes = function (count) {
      count = count || 10;
      $http({
        method: 'POST',
        url: '/api/assign-codes.php',
        data: { ballotId: $s.manageBallot.id, count: count, createdBy: $s.user.id }
      }).success(function (resp) {
        if (resp.codes) {
          $s.loadBallotCodes($s.manageBallot);
        }
      });
    };

    $s.removeEntry = function (idx) {
      $s.entries.splice(idx, 1);
      $s.images.splice(idx, 1);
      $s.hyperlinks.splice(idx, 1);
      $s.entryColors.splice(idx, 1);
    };

    $s.removeCandidate = function (idx) {
      $s.candidates.splice(idx, 1);
    };

    $s.resetCandidates = function () {
      $s.candidates = _.shuffle($s.originalCandidates);
    };

    $s.onSecureToggle = function () {
      if ($s.ballot.isSecure) {
        $s.ballot.tieBreak = 'random';
        $s.ballot.allowCustom = false;
        $s.ballot.register = '2'; // Anonymous — code replaces name
        $s.ballot.hideDetails = false;
        $s.ballot.hideNames = false;

        // Set vote cutoff to one week from now, rounded to next 15 minutes
        var d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        var m = d.getMinutes();
        d.setMinutes(Math.ceil(m / 15) * 15, 0, 0);
        $s.ballot.voteCutoff = d;
        $s.editTime = true;
        $s.editDate = true;
      }
    };

    $s.newBallot = function () {
      // Secure ballot requires a vote cutoff
      if ($s.ballot.isSecure && !$s.editTime && !$s.editDate) {
        $s.errors.secureCutoff = 'Secure ballots require a voting cutoff time.';
        return;
      }
      $s.errors.secureCutoff = null;

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

      const postRCV = function (data, textStatus, jqXHR) {
        //      if (!$s.editBallot) {
        if (false) {
          const lessOne = data.length - 1;
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
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).success(function (resp) {
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
      };

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

    $s.generateQRCode = function (shortCode) {
      var url = 'https://rankedchoices.com/' + shortCode;
      var el = document.getElementById('qrcode');
      el.innerHTML = '';
      new QRCode(el, url);
    };

    $s.submitEntries = function () {
      if ($s.entries.length < 2) {
        $s.errorEntry = 'Must have at least 2 entries';

        return;
      }

      if ($s.editBallot) {
        $http({
          method: 'POST',
          url: '/api/delete-entries.php',
          data: $s.ballot
        }).success(function (resp) {
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
        }
      }).success(function (resp) {
        if (resp.errors) {
          $s.errors = resp.errors;
        } else {
          $s.congrats = true;
          $s.generateQRCode($s.ballot.key);
        }
      });
    };

    $s.submitVote = function () {
      if ($s.uniqueCode === trickVote) {
        $s.thanks = true;
        return;
      }
      $http({
        method: 'POST',
        url: '/api/vote.php',
        data: {
          vote: JSON.stringify(
            $s.candidates.map(function (cand) {
              return cand.name;
            })
          ),
          voteIds: JSON.stringify(
            $s.candidates.map(function (cand) {
              return cand.id;
            })
          ).replace(/"/g, ''),
          key: $s.ballot.key,
          id: $s.ballot.id,
          name: $s.ballot.voterName,
          fingerprint: $s.deviceFingerprint || '',
          userId: $s.user.id || ''
        }
      }).success(function (resp) {
        if (resp && resp.errors && resp.errors.duplicate) {
          $s.deviceAlreadyVoted = true;
          return;
        }
        if (resp && resp.errors && resp.errors.code) {
          $s.errors.secureCode = resp.errors.code;
          $s.secureCodeValid = false;
          return;
        }
        if ($s.ballot.kickbackUrl) {
          window.location.href = $s.ballot.kickbackUrl;
          return;
        }
        $s.thanks = true;
        if ($s.bbiBallot) {
          $s.patchRcvis = true;
          $s.getResults();
        }
        console.log(resp);
      });
    };

    $s.duplicateBallot = function (ballot) {
      $s.dupBallotName = ballot.name;
      $s.dupBallot = _.clone(ballot);
      $s.success.key = null;
      $s.errors.key = $s.dupBallot.key + ' is already in use';
      // For secure ballots, generate the same number of new codes
      if (ballot.isSecure == 1 && $s.manageCodes) {
        $s.dupBallot.codeCount = $s.manageCodes.length;
      }
      $('#dup-ballot-modal').modal('show');
    };

    $s.duplicateBallotSubmit = function () {
      if ($s.dupBallot.key) {
        var tempId = $s.dupBallot.id;
        $http.get('/api/get-key-ballot.php?key=' + $s.dupBallot.key).then(function (resp) {
          if (resp.data.length) {
            alert($s.dupBallot.key + ' is already in use');
          } else {
            $s.dupBallot.sqlVoteCutoff = $s.dupBallot.voteCutoff._i || $s.dupBallot.voteCutoff;
            $s.dupBallot.sqlResultsRelease =
              $s.dupBallot.resultsRelease._i || $s.dupBallot.resultsRelease;
            $http({
              method: 'POST',
              url: '/api/new-ballot.php',
              data: $s.dupBallot
            }).success(function (resp) {
              if (resp.errors) {
                $s.errors = resp.errors;
              } else {
                $http({
                  method: 'POST',
                  url: '/api/duplicate-ballot.php',
                  data: {
                    ballotId: resp,
                    duplicateBallotId: tempId
                  }
                }).success(function (resp) {
                  console.log(resp);
                  window.location.reload();
                });
              }
            });
          }
        });
      }
    };

    $s.transferBallot = function (ballot) {
      $s.transferBallotName = ballot.name;
      $s.transferBallotId = ballot.id;
      $s.transferUsername = '';
      $('#transfer-ballot-modal').modal('show');
    };

    $s.transferBallotSubmit = function () {
      if ($s.transferUsername) {
        $http({
          method: 'POST',
          url: '/api/transfer-ballot.php',
          data: {
            ballotId: $s.transferBallotId,
            currentOwnerId: $s.user.id,
            newOwnerUsername: $s.transferUsername
          }
        }).then(function (resp) {
          if (resp.data.data && resp.data.data.success) {
            $('#transfer-ballot-modal').modal('hide');
            var ballot = _.find($s.allBallots, function (b) {
              return b.id === $s.transferBallotId;
            });
            if (ballot) {
              ballot.transferring = true;
              setTimeout(function () {
                $('#ballot-row-' + ballot.id).fadeOut(2000, function () {
                  $s.$apply(function () {
                    _.remove($s.allBallots, ballot);
                  });
                });
              }, 0);
            }
          } else if (resp.data.errors) {
            alert(resp.data.errors.ballot || 'Transfer failed.');
          }
        });
      }
    };

    $s.deleteSecureBallot = function () {
      if (!confirm('Delete ' + $s.manageBallot.name + '?\nThis action cannot be undone.')) return;
      deleteThis($s.manageBallot, 'ballot');
      _.remove($s.allBallots, $s.manageBallot);
      $s.navigate('profile');
    };

    $s.deleteBallot = function (ballot) {
      if (confirm('Delete ' + ballot.name + ' ballot?\nThis action cannot be undone')) {
        deleteThis(ballot, 'ballot');
        _.remove($s.allBallots, ballot);
      }
    };

    $s.deleteVotes = function (ballot) {
      if (confirm('Delete all ' + ballot.name + ' votes?\nThis action cannot be undone')) {
        deleteThis(ballot, 'votes');
        ballot.totalVotes = 0;
      }
    };

    $s.deleteVote = function (voteId) {
      deleteThis(
        {
          voteId: voteId,
          createdBy: $s.user.id,
          shortcode: $s.shortcode,
          username: $s.user.name
        },
        'vote'
      );
    };

    $s.voteNow = function () {
      $s.congrats = false;
      $s.originalCandidates = $s.entries;
      $s.resetCandidates();
    };

    $s.showResults = function () {
      $s.thanks = true;
      $s.final = true;
      $s.getResults();
    };

    $s.submitShortcode = function () {
      $s.errors.shortcode = null;
      if ($s.patchRcvis) {
        setTimeout($s.getResults, 1);
      } else if ($s.activeLink == 'results') {
        setTimeout($s.getResults, 500);
      } else {
        $s.getCandidates();
      }
    };

    $s.submitCreateGraph = function () {
      if (confirm('Cutoff Voting?\nDo not proceed unless all voting is complete.')) {
        var key = $s.shortcode || $s.ballot.key;
        $http.get('/api/create-graph.php?key=' + key).then(function () {
          var cacheTime = Math.random().toString().slice(-4);
          window.location = '/results?t=' + cacheTime + '#' + key;
        });
      }
    };

    $s.addEntry = function () {
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

    $s.copyToClipboard = function (str) {
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

mainApp.factory('VoteFactory', [
  function VoteFactory() {
    'use strict';

    return {
      wincount: 0,
      roundnum: 0,
      elected: [],

      runTheCode: function (loggedIn) {
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
            jurisdiction: 'https://RankedChoices.com',
            office: 'Assorted',
            threshold: this.quota
          },
          results: []
        };
        this.anotherRound(loggedIn);
      },

      firstQuota: function () {
        const maxSeats = Math.min(this.seats, $s.ids.length);
        this.seats = maxSeats;

        this.quota = _.round(this.votes.length / (this.seats + 1), 2);

        this.voteweight = _.range(1, this.votes.length + 1, 0);
      },

      renewQuota: function () {
        const voteValue = this.voteweight.reduce((v, t) => v + t, 0);
        const remainingSeats = this.seats - this.wincount;

        this.quota = _.round(voteValue / (remainingSeats + 1), 2);
      },

      getVoterName: function (idx) {
        return this.voterNames[idx] || 'Vote ' + (idx + 1);
      },

      getVoterId: function (idx) {
        return this.voterIds[idx] || 0;
      },

      displayVotes: function (loggedIn) {
        var model = this;
        var displayItem = function (item) {
          if (typeof item === 'object' && item.decoration) {
            return (
              '<span class="' +
              item.className +
              '">' +
              ($s.entryMap[item.id] ? $s.entryMap[item.id].name : item.id) +
              '</span>'
            );
          }
          return $s.entryMap[item] ? $s.entryMap[item].name : item;
        };
        this.outputstring += '<tbody>';
        _.each(this.votes, function (vote, idx) {
          var dName = model.getVoterName(idx);
          model.outputstring += '<tr>';

          // Fixed left: vote label + first choice
          model.outputstring += '<th class="vote-pin-left">';
          if (loggedIn && !$s.ballotIsSecure) {
            model.outputstring +=
              '<span class="delete-vote-btn" data-delete-vote=' +
              $s.voterIds[idx] +
              '>&times;</span>';
          }
          if ($s.ballotIsSecure) {
            model.outputstring += '<span class="voter-code">' + dName + '</span>:</th>';
          } else {
            model.outputstring += dName + ':</th>';
          }
          model.outputstring +=
            '<td class="vote-pin-first"><span class="next-vote">' +
            (vote[0] ? displayItem(vote[0]) : '') +
            '</span></td>';

          // Scrollable middle choices
          model.outputstring += '<td class="vote-mid-cell"><div class="vote-mid-scroll">';
          for (var i = 1; i < vote.length; i++) {
            if (i > 1) model.outputstring += '<span class="vote-mid-sep">|</span>';
            model.outputstring += '<span class="vote-mid-item">' + displayItem(vote[i]) + '</span>';
          }
          model.outputstring += '</div></td>';

          // Fixed right: vote-value (multi-seat only)
          if (model.seats > 1) {
            model.outputstring +=
              '<td class="vote-pin-right">vote-value = ' +
              _.round(model.voteweight[idx], 4) +
              '</td>';
          }
          model.outputstring += '</tr>';
        });
        this.outputstring += '</tbody></table>';
      },

      createHeader: function () {
        if (this.seats > 1) {
          return (
            '<strong>Candidates: ' +
            this.ids.length +
            ' | Seats: ' +
            this.seats +
            ' | Votes: ' +
            this.votes.length +
            ' | Quota: ' +
            this.quota +
            '</strong><br>'
          );
        } else {
          return (
            '<strong>Candidates: ' +
            this.ids.length +
            ' | Votes: ' +
            this.votes.length +
            '</strong><br>'
          );
        }
      },

      // Check for 'end' conditions otherwise count votes again
      anotherRound: function (loggedIn) {
        if (this.wincount == this.seats) {
          this.finishElection();
        } else {
          this.renewQuota();
          var newRoundNum = ++this.roundnum;
          this.jsonObj.results.push({
            round: newRoundNum,
            tally: this.initTally(),
            tallyResults: [{}]
          });

          if (this.votes.length < 100 || loggedIn) {
            this.outputstring +=
              '</p><table class="table"><thead>Round ' + newRoundNum + ' votes</thead>';
            this.displayVotes(loggedIn);
          } else {
            this.outputstring += '</p><hr>Round ' + newRoundNum + ' Summary<hr>';
          }
          this.countVotes();
        }
      },

      initTally: function () {
        return JSON.parse(JSON.stringify(this.renewTally));
      },

      countVotes: function () {
        var quotacount = 0;
        var model = this;
        var displaySet = [];
        this.votenum = _.range(0, this.ids.length, 0);

        _.each(this.votes, function (vote, idx) {
          var choice = model.ids.indexOf(vote[0]);

          if (choice !== -1) {
            model.votenum[choice] += model.voteweight[idx];
          }
        });

        _.each(this.ids, function (id, idx) {
          var name = $s.entryMap[id] ? $s.entryMap[id].name : id;
          displaySet.push({
            name: name,
            vote: _.round(model.votenum[idx], 4)
          });

          if (model.votenum[idx] > model.quota) {
            quotacount++;
          }
        });

        _.sortBy(displaySet, 'vote')
          .reverse()
          .forEach(function (cand) {
            if (cand.vote > 0) {
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

      buildDataForOutcome: function (data) {
        if (data) {
          data = {
            math: 'max',
            class: 'elected',
            elect: true,
            text: {
              count: 'Most votes currently held',
              total: 'greatest number of',
              tie: 'says the first surplus to be re-allocated',
              result:
                'has exceeded the quota and is elected. If there are seats remaining to be filled, the surplus will now be reallocated'
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
              result:
                'is eliminated. If other candidates have no votes, they will also be eliminated'
            }
          };
        }

        this.determineOutcome(data);
      },

      // Show results for either winning candidate or losing candidate.
      determineOutcome: function (data) {
        // TODO: Eliminate every candidate with zero votes in the first round in which a candidate is eliminated.
        // apex = votes needed to either be elected or be eliminated
        var apex = this.votenum.reduce(function (prev, current) {
          return current ? Math[data.math](prev, current) : prev;
        }, this.quota);
        var count = this.votenum.filter(function (num) {
          return num == apex;
        }).length;
        var chosen = this.votenum.indexOf(apex);
        var chosenEntry = $s.entryMap[this.ids[chosen]] || {};
        var chosenName = chosenEntry.name || this.ids[chosen];

        this.outputstring +=
          '<br>' + data.text.count + ' by a candidate = ' + _.round(apex, 4) + '.';
        this.outputstring +=
          '<br>Number of candidates with the ' + data.text.total + ' votes = ' + count + '.';

        if (count > 1) {
          chosen =
            this.tieBreak == 'random'
              ? this.breakTieRandom(apex)
              : this.breakTieWeighted(apex, data.text.tie);
          chosenEntry = $s.entryMap[this.ids[chosen]] || {};
          chosenName = chosenEntry.name || this.ids[chosen];
          this.outputstring +=
            '<br>' +
            jsUcfirst(this.tieBreak) +
            ' tiebreaker ' +
            data.text.tie +
            ' is <span class="' +
            data.class +
            '">' +
            chosenName +
            '</span>.';
        }

        if (data.class == 'eliminated') {
          this.jsonObj.results[this.roundnum - 1].tallyResults[0].eliminated = chosenName;
          this.votenum.reverse().forEach((vote, index) => {
            if (vote == 0) {
              var trueIndex = this.votenum.length - 1 - index;
              this.removeChosen(trueIndex, data.class);
            }
          });
        } else {
          this.jsonObj.results[this.roundnum - 1].tallyResults[0].elected = chosenName;
        }

        this.outputstring +=
          '<br><span class="' +
          data.class +
          '">' +
          chosenName +
          '</span> ' +
          data.text.result +
          '.';
        this.removeChosen(chosen, data.class, data.elect, true);
      },

      // remove either the elected or eliminated candidates from votes
      removeChosen: function (chosen, className, elect, newRound) {
        var chosenId = this.ids[chosen];
        var chosenEntry = $s.entryMap[chosenId] || {};
        var chosenName = chosenEntry.name || chosenId;
        if (elect) {
          this.elected[this.wincount++] = {
            id: chosenId,
            name: chosenName,
            image: chosenEntry.image || ''
          };
          this.renewTally[chosenName] = this.quota;
        }
        var model = this;
        _.each(this.votes, function (vote, index) {
          var found = vote.indexOf(chosenId);

          if (found !== -1) {
            if (found === 0) {
              if (elect) {
                model.voteweight[index] *= 1 - model.quota / model.votenum[chosen];
              }
              vote.push({ decoration: true, id: chosenId, className: className });
            }
            vote.splice(found, 1);
          }
        });
        _.each(this.mutableVotes, function (vote, index) {
          var found = vote.indexOf(chosenId);

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
      breakTieWeighted: function (value, tieText) {
        var isLoser = tieText == 'loser';
        var model = this;
        var tieArray = [];
        var i;
        // length of longest vote array
        var voteSize = this.votes.reduce(function (voteSize, vote) {
          return Math.max(voteSize, vote.length);
        }, 0);
        var calculateValue = function (voteArr, idx) {
          var item = voteArr[i];
          if (typeof item === 'object') return;
          var tie = _.find(tieArray, { id: item });

          if (tie) {
            // 2nd place votes are exponentially greater than 3rd place votes etc.
            tie.value += model.voteweight[idx] / Math.pow(10, i);
          }
        };
        // populate tieArray only with tie breakers
        this.votenum.map(function (val, idx) {
          if (val == value) {
            tieArray.push({
              index: idx,
              id: model.ids[idx],
              value: 0
            });
          }
        });

        for (i = 1; i < voteSize; i++) {
          this.votes.map(calculateValue);
        }
        // sort by ascending vote value
        tieArray.sort(function (a, b) {
          if (isLoser) {
            return a.value - b.value;
          } else {
            return b.value - a.value;
          }
        });

        return tieArray[0].index;
      },

      // creative way to achieve repeatable randomizing
      breakTieRandom: function (value) {
        var model = this;
        var tieArray = [];
        var randomize = function (seed) {
          var string = model.votes.length + seed.replace(/\W/g, '') + model.roundnum;
          var numString = '' + parseInt(string, 36);
          var newNumber = Number(numString.substr(0, 10));
          // algorithm supplied by http://indiegamr.com/generate-repeatable-random-numbers-in-js/
          return (newNumber * 9301 + 49297) % 233280;
        };
        // populate tieArray only with tie breakers
        this.votenum.map(function (val, idx) {
          if (val == value) {
            var entry = $s.entryMap[model.ids[idx]] || {};
            var seed = (entry.name || '' + model.ids[idx]).substr(0, 12);
            tieArray.push({
              index: idx,
              rand: randomize(seed + idx)
            });
          }
        });

        // sort by ascending random value
        tieArray.sort(function (a, b) {
          return b.rand - a.rand;
        });

        return tieArray[0].index;
      },

      // Finish election and announce the winner(s).
      finishElection: function () {
        var model = this;
        this.outputstring += '<p><b>The election is complete and the elected candidates are';
        _.each(this.elected, function (winner) {
          model.outputstring += ' (' + winner.name + ')';
        });
        this.outputstring += '.</b></p>';

        if ($s.patchRcvis) {
          const objectMap = (obj, fn) =>
            Object.fromEntries(Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)]));
          for (var i = 0; i < this.jsonObj.results.length; i++) {
            var nextResults = this.jsonObj.results[i + 1];

            if (nextResults) {
              this.jsonObj.results[i].tallyResults[0].transfers = objectMap(
                nextResults.tally,
                (value, key) => {
                  const newVotes = Number(value);
                  const oldVotes = Number(this.jsonObj.results[i].tally[key]);

                  if (!oldVotes) {
                    for (var j = 0; j <= i; j++) {
                      this.jsonObj.results[j].tally[key] = '0';
                    }

                    return newVotes + '';
                  }

                  const diff = newVotes - oldVotes;

                  return diff + '';
                }
              );
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
              success: function (data, textStatus, jqXHR) {
                if ($s.bbiGroup == 'a') {
                  const finalChar = $s.ballot.voterName.slice(-1).toLowerCase();
                  const isMajorParty = finalChar === 'r' || finalChar === 'd';

                  $s.bbiGroup = isMajorParty ? finalChar : 'o';

                  $s.votes = window.rawVotes
                    .filter((rawVote) => {
                      if (!rawVote.name) return false;
                      if (!rawVote.voteIds) return false;

                      const party = rawVote.name.slice(-1).toLowerCase();

                      if (isMajorParty) {
                        return party === $s.bbiGroup;
                      }

                      return party !== 'r' && party !== 'd';
                    })
                    .map((rawVote) => JSON.parse(rawVote.voteIds));

                  $s.runTheCode();
                }
                if (typeof data.error === 'undefined') {
                  //                     debugger;
                } else {
                  alert('ERRORS: ' + data.error);
                }
              },
              error: function (jqXHR, textStatus, errorThrown) {
                debugger;
                alert('error on upload');
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
              success: function (data, textStatus, jqXHR) {
                if (typeof data.error === 'undefined') {
                  $s.displayRcvisIframe();
                } else {
                  alert('ERRORS: ' + data.error);
                }
              },
              error: function (jqXHR, textStatus, errorThrown) {
                debugger;
                alert('error on upload');
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
              success: function (data, textStatus, jqXHR) {
                if (typeof data.error === 'undefined') {
                  const lessOne = data.length - 1;
                  const finalChar = data.charAt(lessOne);
                  const jsonStr = finalChar === '}' ? data : data.substr(0, lessOne);
                  let respObj;

                  try {
                    respObj = JSON.parse(jsonStr);
                  } catch (e) {
                    return;
                  }

                  if (!respObj.id || !respObj.slug) return;

                  $s.rcvisId = respObj.id;
                  $s.rcvisSlug = respObj.slug;
                  $s.displayRcvisIframe();

                  $.get(
                    '/api/rcvis_slug.php?key=' +
                      $s.shortcode +
                      '&slug=' +
                      $s.rcvisSlug +
                      '&id=' +
                      $s.rcvisId
                  );
                } else {
                  console.warn('RCVis: failed to create visualization');
                }
              },
              error: function (jqXHR, textStatus, errorThrown) {
                console.warn('RCVis: failed to create visualization');
              }
            });
          }
        }
      }
    };
  }
]);
