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
				this.nextRound();
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

			//If the number of winners is equal to the number of this.seats, this function goes to the result. If not, it then outputs a list of the votes.
			nextRound: function() {
				if (this.wincount == this.seats) {
					this.result();
				} else {
					this.outputstring += '</p><table class="table"><thead>Round ' + (++this.roundnum) + ' votes</thead>';
					this.displayVotes();
					this.countfirst();
				}
			},

			//This function creates an array which contains the number of highest preference votes that each candidate has and outputs a summary. If any candidate has enough votes to exceed the this.quota, it goes to the overquota function, otherwise it goes to the findmin function.
			countfirst: function() {
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
						apply: 'electmax',
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
						apply: 'removemin',
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

			//This function determines if there is a tie in the number of candidates with the most votes above the this.quota.
			determineOutcome: function(data) {
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
					chosen = this.breakTie(apex);
					this.outputstring += '<br>The tiebreaker '+ data.text.tie +' is <span class="'+ data.class +'">' + this.names[chosen] + '</span>\'s.';
				}

				this.outputstring += '<br><span class="'+ data.class +'">' + this.names[chosen] + '</span> '+ data.text.result +'.';
				this[data.apply](chosen);
			},

			//This function analyses which candidates are marginally stronger for the purpose of breaking ties
			breakTie: function(value) {
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
						tie.value += (model.voteweight[idx] / (i * 10));
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

			//This function goes through the vote arrays and replaces each instance of the eliminated candidate with 'none'. It then goes back to the nextRound function at the start to begin another round of counting.
			removemin: function(eliminated) {
				var model = this;
				_.each(this.votes, function(vote) {
					var found = vote.indexOf(model.names[eliminated]);
					if(found !== -1) {
						vote[vote.length] = '<span class="eliminated">' + vote[found] + '</span>';
						vote.splice(found, 1);
					}
				});
				this.nextRound();
			},

			//This function adds the name of the this.elected candidate to the this.elected array and then reweights their votes and changes their name to "none" in the votes array.
			electmax: function(roundelected) {
				var model = this;
				this.elected[this.wincount++] = this.names[roundelected];
				_.each(this.votes, function(vote, idx) {
					if(vote[0] == model.names[roundelected]) {
						model.voteweight[idx] *= 1 - model.quota / model.votenum[roundelected];
						vote[vote.length] = '<span class="elected">' + vote[0] + '</span>';
					}
					var found = vote.indexOf(model.names[roundelected]);
					if(found !== -1) {
						vote.splice(found, 1);
					}
				});
				this.nextRound();
			},

			//This function announces the winner.
			result: function() {
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
