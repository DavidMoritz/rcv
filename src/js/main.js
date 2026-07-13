/*!
 * Initualize a new Angular app - v0.0.1
 * Build Date: 2017.09.08
 * Docs: http://moritzcompany.com
 * Coded @ Moritz Company
 * revised by David Moritz
 */

import { getCookie, getDeviceToken } from './utils/cookies.js';
import { trickVote, truncateName } from './utils/helpers.js';
import { computeBorda } from './utils/borda.js';
import mc from './utils/mc.js';
import VoteFactory, { initScope } from './factories/vote-factory.js';
import { initAuth } from './auth.js';
import { initBallot, assignFieldSlugs, displayTitle } from './ballot.js';
import {
  shouldPatchGraph,
  shouldAutoUpdate,
  canSeeGraph,
  shouldUsePostCutoffPath
} from './utils/rcvis-helpers.js';

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
          name: getCookie('loginName'),
          clearance: getCookie('loginClearance') || 0
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
    initScope($s);
    $s.displayTitle = displayTitle;
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

    var getContributions = function () {
      $http({
        method: 'GET',
        url: '/api/get-contributions.php'
      }).then(function (resp) {
        $s.contributions = resp.data;
      });
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

    initAuth($s, $http, $loc, resetNav);
    initBallot($s, $http, $sce, $timeout);

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
      origin: window.location.origin,
      managedBallotFilter: function (ballot) {
        return ballot.isSecure == 1 || ballot.allowGrouping == 1;
      },
      standardBallotFilter: function (ballot) {
        return ballot.isSecure != 1 && ballot.allowGrouping != 1;
      }
    });

    _.extend($s, VF);

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
            $s.ballot = $s.resetBallot();
          }
          setTimeout(function () {
            $('.js-timezone-picker').val(moment.tz.guess());
          }, 1000);
          setTimeout(function () {
            document.querySelector('[name="name"]').focus();
          });
          $s.congrats = false;
          break;
        case 'profile':
          $s.getBallots();
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
        $s.bordaActive = false;
        $s.bordaResults = null;
        $s.bordaTeaser = null;
        $s.errors = {};
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
            if (!resp.data.resultsRelease) {
              $s.navigate('results', $s.shortcode);
            } else {
              var release = moment.tz(resp.data.resultsRelease, 'Zulu');
              if (release > moment()) {
                $s.errors.shortcode =
                  'Voting has closed. Results will be released ' +
                  release.tz(moment.tz.guess()).format('MMM Do YYYY, h:mm a');
              } else {
                $s.navigate('results', $s.shortcode);
              }
            }
            return;
          }
          if (typeof resp.data == 'string') {
            $s.errors.shortcode = resp.data;
            return;
          }

          // Response is { ballot: {...}, candidates: [...], groupFields: [...] }
          var ballot = resp.data.ballot;
          var candidates = resp.data.candidates;

          // Set ballot metadata from dedicated ballot object
          $s.ballot = ballot;
          $s.ballotCreatedBy = ballot.createdBy;
          $s.ballotId = ballot.id;
          $s.ballot.voterName = voterName || $loc.$$search.hash;
          $s.ballot.register = parseInt(ballot.register);
          $s.ballot.allowCustom = !!parseInt(ballot.allowCustom);
          $s.ballot.hideNames = !!parseInt(ballot.hideNames);
          $s.ballot.hideDetails = !!parseInt(ballot.hideDetails);
          $s.ballot.showGraph = !!parseInt(ballot.showGraph);
          $s.ballot.oneDeviceOneVote = !!parseInt(ballot.oneDeviceOneVote);
          $s.ballot.isSecure = !!parseInt(ballot.isSecure);
          $s.ballot.orderedEntries = !!parseInt(ballot.orderedEntries);
          $s.ballot.allowGrouping = !!parseInt(ballot.allowGrouping);
          $s.ballot.positions = parseInt(ballot.positions);
          if (ballot.iframeUrl && ballot.iframeUrl !== 'custom') {
            $s.ballot.iframeUrl = $sce.trustAsResourceUrl(ballot.iframeUrl);
          } else if (ballot.iframeUrl === 'custom' && ballot.customHtml) {
            $s.ballot.iframeUrl = 'custom';
            $s.ballot.customHtml = $sce.trustAsHtml(ballot.customHtml);
          }

          // Store group fields for managed ballot pre-vote gating
          $s.groupFields = resp.data.groupFields || [];
          assignFieldSlugs($s.groupFields);
          $s.groupAnswers = {};
          $s.groupAnswersSubmitted = false;

          $s.originalCandidates = candidates.map(function (entry) {
            return {
              name: entry.candidate,
              image: entry.image,
              hyperlink: decodeURIComponent(entry.hyperlink),
              color: entry.color,
              id: entry.entry_id
            };
          });
          $s.activeLink = $loc.$$search.key ? 'code' : 'vote';
          var resultsDate = ballot.resultsRelease ? moment.tz(ballot.resultsRelease, 'Zulu') : null;
          $s.resultsReady = !resultsDate || resultsDate < moment();
          $s.resultsReleaseFormatted = resultsDate ? resultsDate.tz(moment.tz.guess()).format('MMM Do, h:mma') : null;

          $s.voteCutoffMoment = ballot.voteCutoff ? moment.tz(ballot.voteCutoff, 'Zulu') : null;
          if ($s.voteCutoffMoment) {
            var cutdownInterval = $interval(function () {
              if (!$s.voteCutoffMoment) { $interval.cancel(cutdownInterval); return; }
              var secs = $s.voteCutoffMoment.diff(moment(), 'seconds');
              $s.cutoffSecondsLeft = secs;
              $s.cutoffMinutes = Math.floor(Math.max(0, secs) / 60);
              $s.cutoffSeconds = Math.max(0, secs) % 60;
              $s.cutoffSecondsPadded = ($s.cutoffSeconds < 10 ? '0' : '') + $s.cutoffSeconds;
              if (secs <= 0) $interval.cancel(cutdownInterval);
            }, 1000);
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

        house.innerHTML = '';
        house.appendChild(iframe);
        const disclaimer = document.getElementById('iframe-disclaimer');

        if (disclaimer) disclaimer.remove();
      }, 100);
    };

    $s.checkGraphStatus = function () {
      var key = $s.shortcode || $s.ballot.key;
      $http.get('/api/check-graph-status.php?key=' + key + '&t=' + Date.now()).then(function (resp) {
        if (resp.data && resp.data.data) {
          var status = resp.data.data;
          $s.graphStatus = status;

          if (shouldAutoUpdate({
            rcvisSlug: $s.rcvisSlug,
            votesSinceUpdate: status.votesSinceUpdate,
            minutesSinceUpdate: status.minutesSinceUpdate,
            minVotes: $s.user.rcvisInfo && $s.user.rcvisInfo.minVotes,
            minMinutes: $s.user.rcvisInfo && $s.user.rcvisInfo.minMinutes
          })) {
            $s.graphUpdating = true;
            $s.patchRcvis = true;
            $s.getResults();
          } else if ($s.rcvisSlug) {
            $s.displayRcvisIframe();
          }
        }
      });
    };

    $s.updateGraphNow = function () {
      $s.graphUpdating = true;
      $s.patchRcvis = true;
      $s.getResults();
    };

    $s.getResults = function () {
      var key = $s.shortcode || $s.ballot.key;
      $http.get('/api/get-votes.php?key=' + key + '&t=' + Date.now()).then(function (resp) {
        if (typeof resp.data == 'string') {
          $s.errors.shortcode = resp.data;

          return;
        }

        var ballot = resp.data.ballot;
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

        // Read ballot metadata from dedicated ballot object
        var now = moment();
        var resultsDate = ballot.resultsRelease ? moment.tz(ballot.resultsRelease, 'Zulu') : null;
        var voteCutoffDate = ballot.voteCutoff ? moment.tz(ballot.voteCutoff, 'Zulu') : null;
        $s.voteClosed = !voteCutoffDate || voteCutoffDate < now;
        var createdBy = ballot.createdBy;
        $s.ballotCreatedBy = createdBy;
        $s.ballotId = ballot.id;
        var loggedIn = $s.user.id == createdBy;
        var canManageBorda = loggedIn || $s.user.clearance >= 1;
        if (resultsDate && resultsDate > now) {
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

        var hideNames = ballot.hideNames == 1;
        var hideDetails = ballot.hideDetails == 1;
        $s.ballotIsSecure = ballot.isSecure == 1;
        $s.seats = parseInt(ballot.positions);
        $s.register = ballot.register;
        $s.rcvisSlug = ballot.rcvisSlug;
        $s.rcvisId = ballot.rcvisId;
        $s.showGraph = ballot.showGraph == '1';
        $s.ballotName = ballot.ballotName;
        $s.bordaActive = ballot.bordaActive == 1 || ballot.bordaActive == '1';
        $s.allowCustom = ballot.allowCustom;
        $s.tieBreak = ballot.tieBreak;
        $s.graphUpdated = ballot.graphUpdated;
        $s.graphUpdatedLocal = ballot.graphUpdated
          ? moment.utc(ballot.graphUpdated).local().format('MMM D, YYYY h:mm a')
          : null;
        $s.hideDetails = hideDetails && !loggedIn && !$s.ballotIsSecure;
        $s.hidePromptResults = hideDetails && !loggedIn;
        $s.voterNames = [];
        $s.voterIds = [];
        let mostRecentVote = voteRows[0].date_created;
        window.rawVotes = voteRows;
        $s.votes = voteRows.map(function (result) {
          if (mostRecentVote < result.date_created) {
            mostRecentVote = result.date_created;
          }
          if (!hideNames || loggedIn) {
            $s.voterNames.push(result.name);
          }
          $s.voterIds.push(result.vote_id);

          return JSON.parse(result.voteIds);
        });
        $s.ids = _.uniq(_.flatten($s.votes));
        $s.mutableVotes = JSON.parse(JSON.stringify($s.votes));

        // Parse group data for grouped analysis
        $s.allowGrouping = ballot.allowGrouping == 1;
        $s.resultGroupFields = resp.data.groupFields || [];
        $s.groupResults = {};

        if ($s.allowGrouping && $s.resultGroupFields.length) {
          // Bucket votes by group answers
          var groupBuckets = {}; // { fieldId: { optionId: [voteIndex, ...] } }
          var fieldTypeMap = {};
          $s.resultGroupFields.forEach(function (field) {
            var type = field.type || 'select';
            fieldTypeMap[field.id] = type;
            groupBuckets[field.id] = {};
            if (type === 'checkbox') {
              field.options = [
                { id: 'true', label: 'True' },
                { id: 'false', label: 'False' }
              ];
            } else if (type === 'select' && field.options.some(function (o) { return o.required == 0 || field.required == 0; })) {
              if (!field.options.some(function (o) { return o.id === '__no_answer'; })) {
                field.options.push({ id: '__no_answer', label: 'No answer' });
              }
            }
            field.options.forEach(function (opt) {
              groupBuckets[field.id][opt.id] = [];
            });
          });

          voteRows.forEach(function (row, idx) {
            if (row.group_answers) {
              var answers;
              try {
                answers = typeof row.group_answers === 'string' ? JSON.parse(row.group_answers) : row.group_answers;
              } catch (e) {
                return;
              }
              Object.keys(fieldTypeMap).forEach(function (fieldId) {
                var type = fieldTypeMap[fieldId];
                if (type === 'text') return;
                var answer = answers[fieldId];
                if (type === 'checkbox') {
                  var key = (answer === true || answer === 'true' || answer === '1') ? 'true' : 'false';
                  if (groupBuckets[fieldId] && groupBuckets[fieldId][key]) {
                    groupBuckets[fieldId][key].push(idx);
                  }
                } else {
                  var optId = answer || '__no_answer';
                  if (groupBuckets[fieldId] && groupBuckets[fieldId][optId]) {
                    groupBuckets[fieldId][optId].push(idx);
                  }
                }
              });
            }
          });

          // For each field, for each option, run RCV on the filtered subset
          $s.resultGroupFields.forEach(function (field) {
            $s.groupResults[field.id] = {};
            field.options.forEach(function (opt) {
              var voteIndices = groupBuckets[field.id][opt.id];
              if (!voteIndices || !voteIndices.length) {
                $s.groupResults[field.id][opt.id] = { count: 0, elected: [], finalTally: [] };
                return;
              }
              // Build subset votes array
              var subVotes = voteIndices.map(function (i) {
                return JSON.parse(JSON.stringify($s.votes[i]));
              });
              var subIds = _.uniq(_.flatten(subVotes));
              // Simple final-round tally: count first choices iteratively eliminating lowest
              var tally = {};
              var eliminated = {};
              var activeVotes = subVotes.map(function (v) { return v.slice(); });
              var elected = [];
              var seats = $s.seats;

              for (var round = 0; round < 100; round++) {
                tally = {};
                subIds.forEach(function (id) {
                  if (!eliminated[id]) tally[id] = 0;
                });
                activeVotes.forEach(function (vote) {
                  // Remove eliminated candidates from front
                  while (vote.length && eliminated[vote[0]]) vote.shift();
                  if (vote.length && tally[vote[0]] !== undefined) {
                    tally[vote[0]]++;
                  }
                });
                var remaining = Object.keys(tally);
                if (remaining.length <= seats) {
                  elected = remaining;
                  break;
                }
                // Check if anyone exceeds quota
                var totalActive = remaining.reduce(function (s, id) { return s + tally[id]; }, 0);
                var quota = totalActive / (seats + 1);
                var winner = remaining.find(function (id) { return tally[id] > quota; });
                if (winner) {
                  elected.push(winner);
                  eliminated[winner] = true;
                  seats--;
                  if (seats <= 0) break;
                  continue;
                }
                // Eliminate candidate with fewest votes
                var minVotes = Infinity;
                remaining.forEach(function (id) {
                  if (tally[id] < minVotes) minVotes = tally[id];
                });
                var loser = remaining.find(function (id) { return tally[id] === minVotes; });
                eliminated[loser] = true;
              }

              // Build final tally sorted descending
              var finalTally = Object.keys(tally).map(function (id) {
                var entry = $s.entryMap[id] || { name: id };
                return { id: id, name: entry.name, color: entry.color, votes: tally[id] };
              }).sort(function (a, b) { return b.votes - a.votes; });

              var totalVotes = finalTally.reduce(function (s, t) { return s + t.votes; }, 0);
              finalTally.forEach(function (t) {
                t.percent = totalVotes > 0 ? Math.round(t.votes / totalVotes * 100) : 0;
              });

              $s.groupResults[field.id][opt.id] = {
                count: voteIndices.length,
                elected: elected.map(function (id) {
                  var e = $s.entryMap[id] || { name: id };
                  return e.name;
                }),
                finalTally: finalTally
              };
            });
          });
        }

        if ($s.showGraph) {
          var evaluateGraph = function () {
            var isCreator = $s.user.id == createdBy;
            var creatorWithKey = isCreator && $s.user.rcvisInfo && $s.user.rcvisInfo.apiKey;
            var canSee = canSeeGraph({
              resultsDate: resultsDate,
              now: now,
              isCreator: isCreator,
              rcvisInfo: $s.user.rcvisInfo
            });

            if (canSee) {
              $s.ballotName = ballot.ballotName;
              $s.ballotId = ballot.id;

              if (shouldUsePostCutoffPath({ voteCutoffDate: voteCutoffDate, now: now })) {
                // Vote cutoff has passed: one final update if stale
                $s.patchRcvis = shouldPatchGraph({
                  rcvisSlug: $s.rcvisSlug,
                  graphUpdated: $s.graphUpdated,
                  mostRecentVote: mostRecentVote
                });
                if (!$s.patchRcvis) {
                  $s.displayRcvisIframe();
                }
              } else if ($s.rcvisSlug) {
                // Show existing graph
                $s.displayRcvisIframe();
                // For creators with key, also fetch staleness info for the update button
                if (creatorWithKey) {
                  $s.checkGraphStatus();
                }
              } else if (creatorWithKey) {
                // No graph yet but creator has key — fetch status
                $s.checkGraphStatus();
              }
            }
          };

          evaluateGraph();

          // If rcvisInfo is not yet loaded (cookie-restored session), re-evaluate once it arrives
          if (!$s.user.rcvisInfo) {
            var unwatch = $s.$watch('user.rcvisInfo', function (newVal) {
              if (newVal) {
                unwatch();
                evaluateGraph();
              }
            });
          }
        } else {
          $s.showGraphTease = $s.votes.length > 3 && (loggedIn || createdBy == 'guest');
        }

        $('.ballot-name').text(' for ' + ballot.ballotName);
        $s.runTheCode(loggedIn);
        $s.bodyText = $sce.trustAsHtml($s.outputstring);

        // Borda count computation (uses original voteRows, not mutated $s.votes)
        var bordaVotes = voteRows.map(function (row) {
          return JSON.parse(row.voteIds);
        });
        $s.bordaResults = computeBorda(bordaVotes, $s.ids, $s.entryMap, $s.seats);
        $s.bordaSwitchDisabled = $s.user.clearance >= 1 ? false : !resultsDate || resultsDate <= now;

        // Shared Borda bar helpers
        var bordaN = $s.ids.length;
        var rankColors = ['#1a5276', '#2980b9', '#5dade2', '#85c1e9', '#aed6f1'];
        var rankColor = function (rank) { return rankColors[(rank - 1) % rankColors.length]; };
        var ordinal = function (k) {
          var s = ['th', 'st', 'nd', 'rd'];
          var v = k % 100;
          return k + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        var buildBordaLegend = function () {
          var h = '<div class="borda-legend">';
          for (var r = 0; r < bordaN; r++) {
            h += '<span><span class="borda-legend-swatch" style="background:' + rankColor(r + 1) + '"></span>' + ordinal(r + 1) + '</span>';
          }
          h += '</div>';
          return h;
        };
        var buildBordaBarSegments = function (entry) {
          var pts = entry.points || 1;
          var h = '';
          for (var rank = 1; rank <= bordaN; rank++) {
            var count = entry.rankCounts[rank] || 0;
            var contribution = count * (bordaN - rank);
            if (contribution === 0) continue;
            var widthPct = (contribution / pts * 100);
            var segColor = rankColor(rank);
            h += '<div class="borda-rank-seg" style="width:' + widthPct + '%;background:' + segColor + '" title="' + count + ' vote' + (count !== 1 ? 's' : '') + ' ranked ' + ordinal(rank) + ' (' + contribution + ' pts)"></div>';
          }
          return h;
        };

        // Build Borda top graph HTML (with void space background)
        (function buildBordaTopGraph() {
          var br = $s.bordaResults;
          var maxPts = br.tally.length ? br.tally[0].points : 1;
          var html = buildBordaLegend();
          br.tally.forEach(function (entry) {
            var barScale = maxPts > 0 ? (entry.points / maxPts * 100) : 0;
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
            html += '<span style="width:150px;flex-shrink:0;text-align:right;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _.escape(entry.name) + '">' + _.escape(entry.name) + '</span>';
            html += '<div style="flex:1;background:#eee;border-radius:3px;height:22px">';
            html += '<div class="borda-rank-bar" style="width:' + barScale + '%">';
            html += buildBordaBarSegments(entry);
            html += '</div></div>';
            html += '<span style="min-width:80px;font-size:12px;color:#666">' + entry.points + ' pts (' + entry.percent + '%)</span>';
            html += '</div>';
          });
          $s.bordaTopGraphHtml = $sce.trustAsHtml(html);
        })();

        // Build Borda detailed results HTML
        (function buildBordaBody() {
          var br = $s.bordaResults;
          var totalVotes = bordaVotes.length;
          var html = '<strong>Candidates: ' + $s.ids.length + ' | Votes: ' + totalVotes + '</strong><br>';

          // Vote table
          if (totalVotes < 100 || loggedIn) {
            html += '<table class="table"><thead>Full votes</thead><tbody>';
            bordaVotes.forEach(function (vote, idx) {
              var dName = $s.voterNames[idx] || 'Vote ' + (idx + 1);
              html += '<tr>';
              html += '<th class="vote-pin-left">';
              if (loggedIn && !$s.ballotIsSecure) {
                html += '<span class="delete-vote-btn" data-delete-vote=' + $s.voterIds[idx] + '>&times;</span>';
              }
              if ($s.ballotIsSecure) {
                html += '<span class="voter-code">' + _.escape(dName) + '</span>:</th>';
              } else {
                html += _.escape(dName) + ':</th>';
              }
              html += '<td class="vote-pin-first"><span class="next-vote">' +
                (vote[0] ? ($s.entryMap[vote[0]] ? $s.entryMap[vote[0]].name : vote[0]) : '') +
                '</span></td>';
              html += '<td class="vote-mid-cell"><div class="vote-mid-scroll">';
              for (var i = 1; i < vote.length; i++) {
                if (i > 1) html += '<span class="vote-mid-sep">|</span>';
                var name = $s.entryMap[vote[i]] ? $s.entryMap[vote[i]].name : vote[i];
                html += '<span class="vote-mid-item">' + name + '</span>';
              }
              html += '</div></td></tr>';
            });
            html += '</tbody></table>';
          }

          // Per-candidate breakdown tables
          var rankBgColors = ['#d4e6f1', '#d6eaf8', '#e0f0fa', '#ebf5fb', '#f2f9fd'];
          var rankBgColor = function (rank) { return rankBgColors[(rank - 1) % rankBgColors.length]; };
          br.tally.forEach(function (entry) {
            html += '<h4 style="margin-top:18px;margin-bottom:6px">' + _.escape(entry.name) + '</h4>';
            html += '<table class="table table-bordered table-condensed borda-breakdown">';
            html += '<thead><tr><th>Rank</th><th>Votes</th><th>Value</th><th>Total</th></tr></thead><tbody>';
            for (var rank = 1; rank <= bordaN; rank++) {
              var count = entry.rankCounts[rank] || 0;
              var value = bordaN - rank;
              var total = count * value;
              var bg = rankBgColor(rank);
              html += '<tr style="background:' + bg + '">';
              html += '<td>' + ordinal(rank) + '</td>';
              html += '<td>' + count + '</td>';
              html += '<td>' + value + '</td>';
              html += '<td>' + total + '</td>';
              html += '</tr>';
            }
            html += '</tbody>';
            html += '<tfoot><tr style="font-weight:bold"><td colspan="3" style="text-align:right">Total Score</td><td>' + entry.points + '</td></tr></tfoot>';
            html += '</table>';
          });

          // Legend + bars for detail view
          html += buildBordaLegend();
          var maxPts = br.tally.length ? br.tally[0].points : 1;
          br.tally.forEach(function (entry) {
            var barScale = maxPts > 0 ? (entry.points / maxPts * 100) : 0;
            html += '<div style="display:flex;align-items:center;margin-bottom:6px">';
            html += '<div style="width:130px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _.escape(entry.name) + '">' + _.escape(entry.name) + '</div>';
            html += '<div style="flex:1"><div class="borda-rank-bar" style="width:' + barScale + '%">';
            html += buildBordaBarSegments(entry);
            html += '</div></div>';
            html += '<div style="width:120px;flex-shrink:0;text-align:right;font-size:12px;padding-left:8px">' + entry.points + ' pts' + (entry.avgRank !== null ? ' (avg ' + entry.avgRank + ')' : '') + '</div>';
            html += '</div>';
          });

          $s.bordaBodyText = $sce.trustAsHtml(html);
        })();

        // Build Borda teaser text
        var buildBordaTeaser = function () {
          if ($s.bordaActive) {
            if (canManageBorda) {
              return 'Currently showing Borda count results.';
            } else {
              return 'These results use the Borda counting method.';
            }
          } else {
            if (canManageBorda && $s.bordaResults && $s.bordaResults.winner) {
              var winnerName = truncateName($s.bordaResults.winner.name);
              return 'Under Borda count, <strong>' + _.escape(winnerName) + '</strong> would win.';
            }
            return null;
          }
        };
        var teaserText = buildBordaTeaser();
        $s.bordaTeaser = teaserText ? $sce.trustAsHtml(teaserText) : null;

        $s.final = true;

        if ($s._autoShowDetails) {
          $s.showText = true;
          $s._autoShowDetails = false;
          $timeout(function () {
            var el = document.getElementById('detailed-results');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          });
        }
      });
    };

    $s.openBordaModal = function () {
      $('#borda-modal').modal('show');
    };

    $s.toggleBorda = function () {
      var newValue = $s.bordaActive ? 0 : 1;
      $s.bordaToggling = true;
      $http({
        method: 'POST',
        url: '/api/update-ballot.php',
        data: {
          id: $s.ballotId,
          name: $s.ballotName,
          positions: $s.seats,
          key: $s.shortcode,
          createdBy: $s.ballotCreatedBy,
          bordaActive: newValue
        }
      }).then(function () {
        $s.bordaActive = newValue === 1;
        // Rebuild teaser
        var teaserText;
        if ($s.bordaActive) {
          if ($s.user.id == $s.ballotCreatedBy || $s.user.clearance >= 1) {
            teaserText = 'Currently showing Borda count results.';
          } else {
            teaserText = 'These results use the Borda counting method.';
          }
        } else {
          if (($s.user.id == $s.ballotCreatedBy || $s.user.clearance >= 1) && $s.bordaResults && $s.bordaResults.winner) {
            var winnerName = truncateName($s.bordaResults.winner.name);
            teaserText = 'Under Borda count, <strong>' + _.escape(winnerName) + '</strong> would win.';
          } else {
            teaserText = null;
          }
        }
        $s.bordaTeaser = teaserText ? $sce.trustAsHtml(teaserText) : null;
        $s.bordaToggling = false;
        $('#borda-modal').modal('hide');
      }, function () {
        $s.bordaToggling = false;
      });
    };

    $s.submitGroupAnswers = function () {
      // Type-aware validation (skip optional fields)
      var allAnswered = true;
      $s.groupFields.forEach(function (field) {
        if (field.required == 0 || field.required === false) return;
        var val = $s.groupAnswers[field.id];
        var type = field.type || 'select';
        if (type === 'select' && !val) {
          allAnswered = false;
        } else if (type === 'text' && (!val || !val.trim().length)) {
          allAnswered = false;
        }
      });
      if (!allAnswered) {
        $s.errors.groupAnswers = 'Please answer all questions before proceeding.';
        return;
      }
      $s.errors.groupAnswers = null;
      $s.groupAnswersSubmitted = true;
    };

    $s.exportCsv = function (ballot) {
      var key = ballot.key;
      $http.get('/api/get-votes.php?key=' + key + '&t=' + Date.now()).then(function (resp) {
        if (typeof resp.data === 'string') return;

        var voteRows = resp.data.votes;
        var entryList = resp.data.entries;
        var groupFields = resp.data.groupFields || [];

        // Build entry map
        var entryMap = {};
        entryList.forEach(function (e) {
          entryMap[e.entry_id] = e.name;
        });

        // Build option map for select/checkbox fields
        var optionMap = {};
        groupFields.forEach(function (field) {
          (field.options || []).forEach(function (opt) {
            optionMap[opt.id] = opt.label;
          });
        });

        // Determine max rank count
        var maxRanks = 0;
        voteRows.forEach(function (row) {
          var ids = JSON.parse(row.voteIds || '[]');
          if (ids.length > maxRanks) maxRanks = ids.length;
        });

        // CSV header
        var headers = ['Voter Name', 'Date'];
        for (var r = 1; r <= maxRanks; r++) {
          headers.push('Rank ' + r);
        }
        groupFields.forEach(function (field) {
          headers.push(field.title ? displayTitle(field.title) : field.question_text);
        });

        // Escape CSV cell
        function esc(val) {
          val = String(val == null ? '' : val);
          if (val.indexOf(',') !== -1 || val.indexOf('"') !== -1 || val.indexOf('\n') !== -1) {
            return '"' + val.replace(/"/g, '""') + '"';
          }
          return val;
        }

        var lines = [headers.map(esc).join(',')];

        voteRows.forEach(function (row) {
          var cols = [row.name || '', row.date_created || ''];
          var ids = JSON.parse(row.voteIds || '[]');
          for (var i = 0; i < maxRanks; i++) {
            cols.push(ids[i] ? (entryMap[ids[i]] || ids[i]) : '');
          }
          // Group answers
          var answers = {};
          if (row.group_answers) {
            try {
              answers = typeof row.group_answers === 'string' ? JSON.parse(row.group_answers) : row.group_answers;
            } catch (e) {}
          }
          groupFields.forEach(function (field) {
            var val = answers[field.id];
            var type = field.type || 'select';
            if (type === 'text') {
              cols.push(val || '');
            } else if (type === 'checkbox') {
              cols.push(val ? 'true' : 'false');
            } else {
              cols.push(val ? (optionMap[val] || val) : '');
            }
          });
          lines.push(cols.map(esc).join(','));
        });

        var csv = lines.join('\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (ballot.name || 'ballot') + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

    $s.removeCandidate = function (idx) {
      $s.candidates.splice(idx, 1);
    };

    $s.resetCandidates = function () {
      $s.candidates = $s.ballot.orderedEntries
        ? $s.originalCandidates.slice()
        : _.shuffle($s.originalCandidates);
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
          userId: $s.user.id || '',
          group_answers: $s.ballot.allowGrouping && $s.groupAnswers ? JSON.stringify($s.groupAnswers) : null
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
        console.log(resp);
      });
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

mainApp.factory('VoteFactory', [VoteFactory]);

/* Wink animation for can mascot */
document.addEventListener('DOMContentLoaded', function () {
  var winkEls = document.querySelectorAll('.wink-can');
  if (!winkEls.length) return;

  var isAnimating = false;
  var intervalId = null;

  function playWinkAll() {
    if (isAnimating) return;
    isAnimating = true;
    winkEls.forEach(function (el) { el.classList.add('winking'); });
  }

  function resetInterval() {
    clearInterval(intervalId);
    intervalId = setInterval(playWinkAll, 15000);
  }

  winkEls.forEach(function (el) {
    el.addEventListener('animationend', function (e) {
      if (e.animationName.indexOf('wink-reverse') === 0) {
        winkEls.forEach(function (w) { w.classList.remove('winking'); });
        isAnimating = false;
      }
    });

    el.addEventListener('mouseenter', function () {
      resetInterval();
      playWinkAll();
    });
  });

  resetInterval();
});
