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
      origin: window.location.origin
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
            $s.ballot.orderedEntries = !!parseInt($s.ballot.orderedEntries);
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
