/*!
 * Initualize a new Angular app - v0.0.1
 * Build Date: 2017.09.08
 * Docs: http://moritzcompany.com
 * Coded @ Moritz Company
 * revised by David Moritz
 */

import { getCookie, getDeviceToken } from './utils/cookies.js';
import { trickVote } from './utils/helpers.js';
import mc from './utils/mc.js';
import VoteFactory, { initScope } from './factories/vote-factory.js';
import { initAuth } from './auth.js';
import { initBallot } from './ballot.js';

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
    initScope($s);
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
    initBallot($s, $http);

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
      origin: window.location.origin,
      managedBallotFilter: function (ballot) {
        return ballot.isSecure == 1 || ballot.allowGrouping == 1;
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

          // Response is { ballot: {...}, candidates: [...], groupFields: [...] }
          var ballot = resp.data.ballot;
          var candidates = resp.data.candidates;

          // Set ballot metadata from dedicated ballot object
          $s.ballot = ballot;
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
          if (ballot.iframeUrl) {
            $s.ballot.iframeUrl = $sce.trustAsResourceUrl(ballot.iframeUrl);
          }

          // Store group fields for managed ballot pre-vote gating
          $s.groupFields = resp.data.groupFields || [];
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
          var resultsDate = moment.tz(ballot.resultsRelease, 'Zulu');
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
        var resultsDate = moment.tz(ballot.resultsRelease, 'Zulu');
        var voteCutoffDate = moment.tz(ballot.voteCutoff, 'Zulu');
        var now = moment();
        $s.voteClosed = voteCutoffDate < now;
        var createdBy = ballot.createdBy;
        $s.ballotCreatedBy = createdBy;
        $s.ballotId = ballot.id;
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

        var hideNames = ballot.hideNames == 1;
        var hideDetails = ballot.hideDetails == 1;
        $s.ballotIsSecure = ballot.isSecure == 1;
        $s.seats = parseInt(ballot.positions);
        $s.register = ballot.register;
        $s.rcvisSlug = ballot.rcvisSlug;
        $s.rcvisId = ballot.rcvisId;
        $s.showGraph = ballot.showGraph == '1';
        $s.allowCustom = ballot.allowCustom;
        $s.tieBreak = ballot.tieBreak;
        $s.graphUpdated = ballot.graphUpdated;
        $s.hideDetails = hideDetails && !loggedIn;
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
            fieldTypeMap[field.id] = field.type || 'select';
            groupBuckets[field.id] = {};
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
              Object.keys(answers).forEach(function (fieldId) {
                var type = fieldTypeMap[fieldId] || 'select';
                if (type === 'text') return; // skip text fields — no bucketing
                var answer = answers[fieldId];
                if (type === 'checkbox' && typeof answer === 'string') {
                  // Comma-separated option IDs
                  answer.split(',').forEach(function (optId) {
                    optId = optId.trim();
                    if (groupBuckets[fieldId] && groupBuckets[fieldId][optId]) {
                      groupBuckets[fieldId][optId].push(idx);
                    }
                  });
                } else {
                  // select: single option ID
                  if (groupBuckets[fieldId] && groupBuckets[fieldId][answer]) {
                    groupBuckets[fieldId][answer].push(idx);
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
          if ($s.voteClosed) {
            $s.patchRcvis = !$s.rcvisSlug || $s.graphUpdated < mostRecentVote;
            $s.ballotName = ballot.ballotName;
            $s.ballotId = ballot.id;

            if (!$s.patchRcvis) {
              $s.displayRcvisIframe();
            }
          }
        } else {
          $s.showGraphTease = $s.votes.length > 3 && (loggedIn || createdBy == 'guest');
        }

        $('.ballot-name').text(' for ' + ballot.ballotName);
        $s.runTheCode(loggedIn);
        $s.bodyText = $sce.trustAsHtml($s.outputstring);
        $s.final = true;
      });
    };

    $s.toggleCheckboxAnswer = function (fieldId, optId) {
      var current = $s.groupAnswers[fieldId] ? $s.groupAnswers[fieldId].split(',') : [];
      var idx = current.indexOf(String(optId));
      if (idx === -1) {
        current.push(String(optId));
      } else {
        current.splice(idx, 1);
      }
      $s.groupAnswers[fieldId] = current.filter(Boolean).join(',');
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
        } else if (type === 'checkbox' && (!val || !val.length)) {
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
          headers.push(field.title || field.question_text);
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
            } else if (type === 'checkbox' && val) {
              var labels = String(val).split(',').map(function (id) {
                return optionMap[id.trim()] || id;
              });
              cols.push(labels.join('; '));
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
        if ($s.bbiBallot) {
          $s.patchRcvis = true;
          $s.getResults();
        }
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
