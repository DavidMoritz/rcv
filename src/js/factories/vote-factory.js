import { bbiBallots } from '../constants/bbi-ballots.js';
import { jsUcfirst, dataFromObj } from '../utils/helpers.js';

var $s = null;
export function initScope(scope) {
  $s = scope;
}

export default function VoteFactory() {
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
