mainApp.factory('VoteFactory', [
	function VoteFactory() {
		'use strict';

		return {
			outputstring: '',
			wincount: 0,
			roundnum: 0,
			votenum: [],
			elected: [],
			quota: 0,
			voteweight: [],

			runTheCode: function() {
				this.renewQuota();
				this.showInitialVotes();
				this.nextRound();
				$('#bodytext').html(this.outputstring);
				return this.elected;
			},

			renewQuota: function() {
				this.quota = (Math.ceil(this.votes.length * 100 / (parseInt(this.seats) + 1))) / 100;
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
						model.outputstring += '<td>vote-value = ' + parseFloat(model.voteweight[idx]).toFixed(4) + '</td></tr>';
					}
				});
				this.outputstring += '</tbody></table>';
			},

			showInitialVotes: function() {
				if(this.seats > 1) {
					this.outputstring = '<strong>Candidates: ' + this.names.length + ' Seats: ' + this.seats + ' Votes: ' + this.votes.length + ' Quota: ' + this.quota + '</strong><br>';
				} else {
					this.outputstring = '<strong>Candidates: ' + this.names.length + ' Votes: ' + this.votes.length + '</strong><br>';
				}
			},

			//If the number of winners is equal to the number of this.seats, this function goes to the result. If not, if the current highest preference in a vote is 'none', this function removes it and the process repeats until every vote starts with something other than 'none' and it then outputs a list of the votes.
			nextRound: function() {
				if (this.wincount == this.seats) {
					this.result();
				} else {
					this.roundnum++;
					this.outputstring += '</p><table class="table"><thead>Round ' + this.roundnum + ' votes</thead>';
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
					model.outputstring += name + ' = ' + model.votenum[idx] + '<br>';

					if (model.votenum[idx] > model.quota) {
						quotacount++;
					}
				});

				if(quotacount) {
					this.overquota();
				} else {
					this.findmin();
				}
			},

			//This function works out which candidates have the fewest votes. If there is only one with the fewest votes, it goes to the function monomin. If there is a tie at the bottom it goes to multimin.
			findmin: function() {
				//This section counts the number of candidates with first preference votes. If that number is equal to the number of vacant seats, it goes to the allliveelected function which declares them all this.elected. Otherwise it moves on to remove the candidate with the fewest votes.
				var mincount;
				var least;
				var livecount = this.votenum.filter(function(num) {
					return num > 0;
				});

				if (livecount.length + this.wincount == this.seats) {
					this.allliveelected();
				} else {
					least = this.votenum.reduce(function(prev, current) {
						if (prev > current && current > 0) {
							return current;
						}
						return prev;
					}, this.quota);

					this.outputstring += '<br>Fewest votes won by a candidate = ' + least + '.';

					mincount = this.votenum.filter(function(num) {
						return num == least;
					}).length;

					this.outputstring += '<br>Number of candidates with the fewest votes = ' + mincount + '.';

					var eliminated = this.votenum.indexOf(least);

					if(mincount > 1) {
						// we need a better way to break ties
						eliminated = this.votenum.lastIndexOf(least);
						this.outputstring += '<br>The tiebreaker loser is <span class="eliminated">' + this.names[eliminated] + '</span>.';
					}

					this.outputstring += '<br><span class="eliminated">' + this.names[eliminated] + '</span> is eliminated.';

					this.removemin(eliminated);
				}
			},

			//This function goes through the vote arrays and replaces each instance of the eliminated candidate with 'none'. It then goes back to the nextRound function at the start to begin another round of counting.
			removemin: function(eliminated) {
				var model = this;
				_.each(this.votes, function(vote) {
					var idx = vote.indexOf(model.names[eliminated]);
					if(idx !== -1) {
						vote[vote.length] = '<span class="eliminated">' + vote[idx] + '</span>';
						vote.splice(idx, 1);
					}
				});
				this.nextRound();
			},

			//This function determines if there is a tie in the number of candidates with the most votes above the this.quota.
			overquota: function() {
				var greatest = this.votenum.reduce(function(prev, current) {
					return Math.max(prev, current);
				});

				this.outputstring += '<br>Most votes currently held by a candidate = ' + greatest + '.';

				var maxcount = this.votenum.filter(function(num) {
					return num == greatest;
				}).length;

				this.outputstring += '<br>Number of candidates with the greatest number of votes = ' + maxcount + '.';

				var roundelected = this.votenum.indexOf(greatest);

				if(maxcount > 1) {
					// seriously, nothing better than this?
					roundelected = this.votenum.lastIndexOf(greatest);
					this.outputstring += '<br>The tiebreaker says the first surplus to be re-allocated is <span class="elected">' + this.names[roundelected] + '</span>\'s.';
				}

				this.outputstring += '<br><span class="elected">' + this.names[roundelected] + '</span> has exceeded the quota and is elected. If there are seats remaining to be filled, the surplus will now be reallocated.';
				this.electmax(roundelected);
			},

			//This function adds the name of the this.elected candidate to the this.elected array and then reweights their votes and changes their name to "none" in the votes array.
			electmax: function(roundelected) {
				var model = this;
				this.elected[this.wincount++] = this.names[roundelected];
				_.each(this.votes, function(vote, idx) {
					if(vote[0] == model.names[roundelected]) {
						model.voteweight[idx] *= (model.votenum[roundelected] - model.quota) / model.votenum[roundelected];
						vote[vote.length] = '<span class="elected">' + vote[0] + '</span>';
					}
					var found = vote.indexOf(model.names[roundelected]);
					if(found !== -1) {
						vote.splice(found, 1);
					}
				});
				this.nextRound();
			},

			//When there are as many active candidates as there are seats to fill, this function adds all the active candidates to the this.elected array.
			allliveelected: function() {
				var model = this;
				_.each(this.names, function(name, idx) {
					if(model.votenum[idx] > 0) {
						model.elected[model.wincount++] = name;
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
