/* First 3 values should come from API */
var votes = [["Pie","Cake","Candy","Soda"],["Pizza","Soda","Candy","Cake","Pie"],["Candy","Cake","Soda","Pie"],["Cake","Candy","Soda","Pizza","Pie"],["Soda","Pie","Cake","Pizza","Candy"],["Pie","Pizza","Cake","Soda"],["Pizza", "Candy", "Pie", "Soda", "Cake"]];
var names = ["Pie", "Cake", "Candy", "Soda", "Pizza"];
var seats = 3;
/* end API */

var outputstring = '';
var totlivevotes = 0;
var wincount = 0;
var roundnum = 0;
var votenum = [];
var elected = [];
var winner, elimcount, quota, voteweight, greatest, maxcount, roundelected;

$(renewQuota);

function runTheCode() {
	renewQuota();
	showInitialVotes();
	nextRound();
	$("#bodytext").html(outputstring);
}

function renewQuota() {
	quota = (Math.ceil(votes.length * 100 / (parseInt(seats) + 1))) / 100;
	voteweight = _.range(1, votes.length + 1, 0);
}

function displayVotes(weight) {
	_.each(votes, function(vote, idx) {
		outputstring += 'vote ' + (idx + 1) + ': ';
		_.each(vote, function(name) {
			outputstring += '(' + name + ') ';
		});
		if(weight) {
			outputstring += 'vote-value = ' + voteweight[idx];
		}
		outputstring += '<br>';
	});
}

function showInitialVotes() {
	outputstring = '<b>Candidates=' + names.length + ' Seats=' + seats + ' Votes=' + votes.length + ' Quota=' + quota + '<\/b><br>Raw votes<br>';
	displayVotes();
}

//If the number of winners is equal to the number of seats, this function goes to the result. If not, if the current highest preference in a vote is "none", this function removes it and the process repeats until every vote starts with something other than "none" and it then outputs a list of the votes.
function nextRound() {
	if (wincount == seats) {
		result();
	} else {
		roundnum++;
		outputstring += '<p><b>Round ' + roundnum + ' votes<\/b><br>';
		displayVotes(true);
		outputstring += '<\/p>';

		countfirst();
	}
}

//This function creates an array which contains the number of highest preference votes that each candidate has and outputs a summary. If any candidate has enough votes to exceed the quota, it goes to the overquota function, otherwise it goes to the findmin function.
function countfirst() {
	var quotacount = 0;
	votenum = _.range(0, names.length, 0);

	_.each(votes, function(vote, idx) {
		var choice = names.indexOf(vote[0]);
		votenum[choice] += voteweight[idx];
	});

	_.each(names, function(name, idx) {
		outputstring += name + ' = ' + votenum[idx] + '<br>';

		if (votenum[idx] > quota) {
			quotacount++;
		}
	});
	quotacount == 0 ? findmin() : overquota();
}

//This function works out which candidates have the fewest votes. If there is only one with the fewest votes, it goes to the function monomin. If there is a tie at the bottom it goes to multimin.
function findmin() {
	//This section counts the number of candidates with first preference votes. If that number is equal to the number of vacant seats, it goes to the allliveelected function which declares them all elected. Otherwise it moves on to remove the candidate with the fewest votes.
	var mincount;
	var eliminated;
	var least;
	var livecount = votenum.filter(function(num) {
		return num > 0;
	});

	if (livecount.length + wincount == seats) {
		allliveelected();
	} else {
		least = votenum.reduce(function(prev, current) {
			if (prev > current && current > 0) {
				return current;
			}
			return prev;
		}, quota);

		outputstring += '<br>Fewest votes won by a candidate = ' + least + '.';

		mincount = votenum.filter(function(num) {
			return num == least;
		}).length;

		outputstring += '<br>Number of candidates with the fewest votes = ' + mincount + '.';

		if(mincount > 1) {
			// we need a better way to break ties than flipping a coin. What is this, the Democratic Party?
			eliminated = Math.ceil(Math.random() * mincount) - 1;
			outputstring += '<br>The tiebreaker loser is ' + names[eliminated] + '.';
		} else {
			eliminated = votenum.indexOf(least);
		}

		outputstring += '<br>' + names[eliminated] + ' is eliminated.';

		removemin(eliminated);
	}
}

//This function goes through the vote arrays and replaces each instance of the eliminated candidate with "none". It then goes back to the nextRound function at the start to begin another round of counting.
function removemin(eliminated) {
	_.each(votes, function(vote) {
		var idx = vote.indexOf(names[eliminated]);
		if(idx !== -1) {
			vote.splice(idx, 1);
		}
	});
	nextRound();
}

//This function determines if there is a tie in the number of candidates with the most votes above the quota.
function overquota() {
	greatest = 0;
	for (c = 0; c < names.length; c++) {
		if (votenum[c] > greatest) {
			greatest = votenum[c];
		}
	}
	outputstring += '<br>Most votes currently held by a candidate = ' + greatest + '.';
	maxcount = 0;
	for (c = 0; c < names.length; c++) {
		if (votenum[c] == greatest) {
			maxcount++;
		}
	}
	outputstring += '<br>Number of candidates with the greatest number of votes = ' + maxcount + '.';
	roundelected = 0;
	(maxcount == 1) ? monomax(): multimax();
}

//This function determines who is elected in the round if there is only one candidate with the highest number of votes.
function monomax() {
	for (c = 0; c < names.length; c++) {
		if (votenum[c] == greatest) {
			roundelected = c;
		}
	}
	outputstring += '<br>' + names[roundelected] + ' has exceeded the quota and is elected. If there are seats remaining to be filled, the surplus will now be reallocated.';
	electmax();
}

//this function determines which candidate to elect in the round when two or more candidates have the greatest number of votes. It reuses the variables from the multimin function so tiebreakerloser isn't an accurate description in this case.
function multimax() {
	tiebreakloser = Math.ceil(Math.random() * maxcount);
	elimcount = 0;
	for (c = 0; c < names.length; c++) {
		if (votenum[c] == greatest) {
			elimcount++;
			if (elimcount == tiebreakloser) {
				roundelected = c;
			}
		}
	}
	outputstring += '<br>The tiebreaker says the first surplus to be re-allocated is ' + names[roundelected] + '\'s.';
	outputstring += '<br>' + names[roundelected] + ' has exceeded the quota and is elected. If there are seats remaining to be filled, the surplus will now be reallocated.';
	electmax()
}

//This function adds the name of the elected candidate to the elected array and then reweights their votes and changes their name to "none" in the votes array.
function electmax() {
	elected[wincount] = names[roundelected];
	wincount++;
	for (v = 0; v < votes.length; v++) {
		if (votes[v][0] == names[roundelected]) {
			voteweight[v] *= (votenum[roundelected] - quota) / votenum[roundelected];
		}
	}
	for (v = 0; v < votes.length; v++) {
		for (c = 0; c < names.length; c++) {
			if (votes[v][c] == names[roundelected]) {
				votes[v].splice(c, 1);
			}
		}
	}
	nextRound();
}

//When there are as many active candidates as there are seats to fill, this function adds all the active candidates to the elected array.
function allliveelected() {
	for (c = 0; c < names.length; c++) {
		if (votenum[c] > 0) {
			elected[wincount] = names[c];
			wincount++;
		}
	}
	nextRound();
}

//This function announces the winner.
function result() {
	outputstring += '<p><b>The election is complete and the elected candidates are';
	for (i = 0; i < seats; i++) {
		outputstring += ' (' + elected[i] + ')';
	}
	outputstring += '.<\/b><\/p>';
}