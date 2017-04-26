mainApp.factory('VoteFactory', [
	function VoteFactory() {
		'use strict';

		return {
			wincount: 0,
			roundnum: 0,
			elected: [],

			runTheCode: function() {
				this.renewQuota();
				this.outputstring = this.createHeader();
				this.anotherRound();
			},

			renewQuota: function() {
				this.quota = _.round(this.votes.length / (this.seats + 1), 2);
				this.voteweight = _.range(1, this.votes.length + 1, 0);
			},

			displayVotes: function() {
				var model = this;
				this.outputstring += '<tbody>';
				_.each(this.votes, function(vote, idx) {
					model.outputstring += '<tr><th>Vote ' + (idx + 1) + ':</th>';
					var colspan = model.names.length - vote.length;
					_.each(vote, function(name, idx2) {
						if(idx2 === 0) {
							model.outputstring += '<td><span class="next-vote">' + name + '</span></td>';
						} else {
							model.outputstring += '<td>' + name + '</td>';
						}
					});
					if(colspan) {
						model.outputstring += '<td colspan=' + colspan + '></td>';
					}
					if(model.seats > 1) {
						model.outputstring += '<td>vote-value = ' + _.round(model.voteweight[idx], 4) + '</td></tr>';
					}
				});
				this.outputstring += '</tbody></table>';
			},

			createHeader: function() {
				if(this.seats > 1) {
					return '<strong>Candidates: ' + this.names.length + ' Seats: ' + this.seats + ' Votes: ' + this.votes.length + ' Quota: ' + this.quota + '</strong><br>';
				} else {
					return '<strong>Candidates: ' + this.names.length + ' Votes: ' + this.votes.length + '</strong><br>';
				}
			},

			// Check for 'end' conditions otherwise count votes again
			anotherRound: function() {
				if (this.wincount == this.seats) {
					this.finishElection();
				} else {
					this.outputstring += '</p><table class="table"><thead>Round ' + (++this.roundnum) + ' votes</thead>';
					this.displayVotes();
					this.countVotes();
				}
			},

			countVotes: function() {
				var quotacount = 0;
				var model = this;
				this.votenum = _.range(0, this.names.length, 0);

				_.each(this.votes, function(vote, idx) {
					var choice = model.names.indexOf(vote[0]);
					model.votenum[choice] += model.voteweight[idx];
				});

				_.each(this.names, function(name, idx) {
					model.outputstring += name + ' = ' + _.round(model.votenum[idx], 4) + '<br>';

					if (model.votenum[idx] > model.quota) {
						quotacount++;
					}
				});

				this.buildDataForOutcome(quotacount);
			},

			buildDataForOutcome: function(data) {
				if(data) {
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
							result: 'is eliminated'
						}
					};
				}

				this.determineOutcome(data);
			},

			// Show results for either winning candidate or losing candidate.
			determineOutcome: function(data) {
				// TODO: Eliminate every candidate with zero votes in the first round.
				// apex = votes needed to either be elected or be eliminated
				var apex = this.votenum.reduce(function(prev, current) {
					return current ? Math[data.math](prev, current) : prev;
				}, this.quota);
				var count = this.votenum.filter(function(num) {
					return num == apex;
				}).length;
				var chosen = this.votenum.indexOf(apex);

				this.outputstring += '<br>'+ data.text.count +' by a candidate = ' + _.round(apex, 4) + '.';
				this.outputstring += '<br>Number of candidates with the '+ data.text.total +' votes = ' + count + '.';

				if(count > 1) {
					chosen = this.tieBreakMethod == "weighted" ? this.breakTieWeighted : this.breakTieRandom(apex);
					this.outputstring += '<br>The random tiebreaker '+ data.text.tie +' is <span class="'+ data.class +'">' + this.names[chosen] + '</span>\'s.';
				}

				this.outputstring += '<br><span class="'+ data.class +'">' + this.names[chosen] + '</span> '+ data.text.result +'.';
				this.removeChosen(chosen, data.class, data.elect);
			},

			// remove either the elected or eliminated candidates from votes
			removeChosen: function(chosen, className, elect) {
				if(elect) {
					this.elected[this.wincount++] = this.names[chosen];
				}
				var model = this;
				_.each(this.votes, function(vote, index) {
					var found = vote.indexOf(model.names[chosen]);
					if(found !== -1) {
						if(found === 0) {
							if(elect) {
								model.voteweight[index] *= 1 - model.quota / model.votenum[chosen];
							}
							vote.push('<span class="'+ className +'">'+ vote[found] +'</span>');
						}
						vote.splice(found, 1);
					}
				});
				this.anotherRound();
			},

			// Analyses which candidates are marginally stronger for the purpose of breaking ties
			breakTieWeighted: function(value) {
				var model = this;
				var tieArray = [];
				var i;
				// length of longest vote array
				var voteSize = this.votes.reduce(function(voteSize, vote) {
					return Math.max(voteSize, vote.length);
				}, 0);
				var calculateValue = function(voteArr, idx) {
					var tie = _.find(tieArray, {name: voteArr[i]});
					if(tie) {
						// 2nd place votes are exponentially greater than 3rd place votes etc.
						tie.value += model.voteweight[idx] / Math.pow(10, i);
					}
				};
				// populate tieArray only with tie breakers
				this.votenum.map(function(val, idx) {
					if(val == value) {
						tieArray.push({
							index: idx,
							name: model.names[idx],
							value: 0
						});
					}
				});
				for(i = 1; i < voteSize; i++) {
					this.votes.map(calculateValue);
				}
				// sort by ascending vote value
				tieArray.sort(function(a, b) {
					return a.value > b.value;
				});

				return tieArray[0].index;
			},

			// creative way to achieve repeatable randomizing
			breakTieRandom: function(value) {
				var model = this;
				var tieArray = [];
				var randomize = function(string) {
					string = model.votes.length + string.replace(/\W/g, '') + model.roundnum;
					// algorithm supplied by http://indiegamr.com/generate-repeatable-random-numbers-in-js/
					return (parseInt(string, 36) * 9301 + 49297) % 233280;
				};
				// populate tieArray only with tie breakers
				this.votenum.map(function(val, idx) {
					if(val == value) {
						tieArray.push({
							index: idx,
							rand: randomize(model.names[idx] + idx)
						});
					}
				});

				// sort by ascending random value
				tieArray.sort(function(a, b) {
					return a.rand > b.rand;
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
			}
		};
	}
]);
