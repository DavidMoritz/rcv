/* First 3 values should come from API */
var votes = [["Pie","Cake","Candy","Brownie","Soda"],["Pizza","Brownie","Soda","Candy","Cake","Pie"],["Candy","Brownie","Soda","Pie"],["Cake","Soda","Pizza","Brownie","Pie"],["Soda","Pie","Cake","Pizza","Candy"],["Pie","Brownie","Pizza","Cake","Soda"],["Pizza","Brownie", "Candy", "Pie", "Soda"]];
var names = ["Pie", "Cake", "Candy", "Brownie", "Soda", "Pizza"];
var seats = 3;
/* end API */

var outputstring = '';
var wincount = 0;
var roundnum = 0;
var votenum = [];
var elected = [];
var quota, voteweight;

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

function displayVotes() {
	outputstring += "<tbody>"
	_.each(votes, function(vote, idx) {
		outputstring += '<tr><th>Vote ' + (idx + 1) + ':</th>';
		var colspan = names.length - vote.length;
		_.each(vote, function(name, idx2) {
			if(idx2 == 0) {
				outputstring += "<td><span class='next-vote'>" + name + "</span></td>";
			} else {
				outputstring += '<td>' + name + '</td>';
			}
		});
		if(colspan) {
			outputstring += "<td colspan=" + colspan + "></td>";
		}
		outputstring += '<td>vote-value = ' + voteweight[idx] + "</td></tr>";
	});
	outputstring += "</tbody></table>";
}

function showInitialVotes() {
	outputstring = '<strong>Candidates=' + names.length + ' Seats=' + seats + ' Votes=' + votes.length + ' Quota=' + quota + '</strong><br>';
}

//If the number of winners is equal to the number of seats, this function goes to the result. If not, if the current highest preference in a vote is "none", this function removes it and the process repeats until every vote starts with something other than "none" and it then outputs a list of the votes.
function nextRound() {
	if (wincount == seats) {
		result();
	} else {
		roundnum++;
		outputstring += "</p><table class='table'><thead>Round " + roundnum + ' votes</thead>';
		displayVotes();
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

		var eliminated = votenum.indexOf(least);

		if(mincount > 1) {
			// we need a better way to break ties
			eliminated = votenum.lastIndexOf(least);
			outputstring += "<br>The tiebreaker loser is <span class='eliminated'>" + names[eliminated] + '</span>.';
		}

		outputstring += "<br><span class='eliminated'>" + names[eliminated] + '</span> is eliminated.';

		removemin(eliminated);
	}
}

//This function goes through the vote arrays and replaces each instance of the eliminated candidate with "none". It then goes back to the nextRound function at the start to begin another round of counting.
function removemin(eliminated) {
	_.each(votes, function(vote) {
		var idx = vote.indexOf(names[eliminated]);
		if(idx !== -1) {
			vote[vote.length] = "<span class='eliminated'>" + vote[idx] + "</span>";
			vote.splice(idx, 1);
		}
	});
	nextRound();
}

//This function determines if there is a tie in the number of candidates with the most votes above the quota.
function overquota() {
	var greatest = votenum.reduce(function(prev, current) {
		return Math.max(prev, current);
	});

	outputstring += '<br>Most votes currently held by a candidate = ' + greatest + '.';

	var maxcount = votenum.filter(function(num) {
		return num == greatest;
	}).length;

	outputstring += '<br>Number of candidates with the greatest number of votes = ' + maxcount + '.';

	var roundelected = votenum.indexOf(greatest);

	if(maxcount > 1) {
		// seriously, nothing better than this?
		roundelected = votenum.lastIndexOf(greatest);
		outputstring += '<br>The tiebreaker says the first surplus to be re-allocated is <span class="elected">' + names[roundelected] + '</span>\'s.';
	}

	outputstring += '<br><span class="elected">' + names[roundelected] + '</span> has exceeded the quota and is elected. If there are seats remaining to be filled, the surplus will now be reallocated.';
	electmax(roundelected);
}

//This function adds the name of the elected candidate to the elected array and then reweights their votes and changes their name to "none" in the votes array.
function electmax(roundelected) {
	elected[wincount++] = names[roundelected];
	_.each(votes, function(vote, idx) {
		if(vote[0] == names[roundelected]) {
			voteweight[idx] *= (votenum[roundelected] - quota) / votenum[roundelected];
			vote[vote.length] = "<span class='elected'>" + vote[0] + "</span>";
		}
		var found = vote.indexOf(names[roundelected]);
		if(found !== -1) {
			vote.splice(found, 1);
		}
	});
	nextRound();
}

//When there are as many active candidates as there are seats to fill, this function adds all the active candidates to the elected array.
function allliveelected() {
	_.each(names, function(name, idx) {
		if(votenum[idx] > 0) {
			elected[wincount++] = name;
		}
	});
	nextRound();
}

//This function announces the winner.
function result() {
	outputstring += '<p><b>The election is complete and the elected candidates are';
	_.each(elected, function(name) {
		outputstring += ' (' + name + ')';
	})
	outputstring += '.</b></p>';
}