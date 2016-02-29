/* First 3 values should come from API */
var votes = [["Pie","Cake","Candy","Soda","Pizza"],["Pizza","Soda","Candy","Cake","Pie"],["Candy","Cake","Soda","Pie","Pizza"],["Cake","Candy","Soda","Pizza","Pie"],["Soda","Pie","Cake","Pizza","Candy"],["Pie","Pizza","Cake","Soda","none"],["Pizza", "Candy", "Pie", "Soda", "Cake"]];
var names = ["Pie", "Cake", "Candy", "Soda", "Pizza"];
var seats = 3;
/* end API */

var totcands;
var totvotes;
var candcount;
var votecount;
var votenum = new Array();
var outputstring = ' ';
var totlivevotes = 0;
var wincount = 0;
var winner;
var least;
var mincount;
var eliminated;
var elimcount;
var roundnum = 0;
var quota;
var voteweight;
var livecount;
var elected = new Array();
var quotacount;
var greatest;
var maxcount;
var roundelected;

function preVoteStuff() {
    totcands = names.length;
    totvotes = votes.length;
    candcount = names.length;
    votecount = votes.length;
    // renew quota
    quota = (Math.ceil(totvotes * 100 / (parseInt(seats) + 1))) / 100;
    voteweight = new Array(totvotes);
    for(var i = 0; i < totvotes; i++) {
        voteweight[i] = 1;
    } 
}

$(function() {
    $(".voteset").click(voteset);
    $(".votesform").click(votesform);
    $(".runCode").click(runTheCode);
    preVoteStuff();
});
//This function takes the input number of candidates and number of votes, allocates them to variables and moves on to the name input section.
function voteset() {
    seats = $(".inputboxseats").val();
    totcands = $(".inputboxcandidates").val();
    totvotes = $(".inputboxvotes").val();
    if (seats == 0 || totcands == 0 || totvotes == 0) {
        alert("form not completed");
    } else {
        for (i = 0; i < totvotes; i++) {
            votes[i] = new Array(); // new array for each vote
            voteweight[i] = 1; // array with a bunch of 1s ???
            namesform(i + 1);
        }
        quota = (Math.ceil(totvotes * 100 / (seats + 1))) / 100;
    }
}

//This function controls the input of the candidate names.
function namesform(index) {
    outputstring = '<tr><td>name of candidate ' + index + '</td><td><input type="text" id="inputboxcandidate' + index + '"></td></tr>';
    $(".tbody").append(outputstring);
}

//This function puts the candidate names into an array.
function namesinput(form) {
    names[candcount] = form.inputboxcandidate.value;
    candcount += 1;
    namesform();
}

function runTheCode() {
        preVoteStuff();
        outputstring = '<b>Candidates=' + totcands + ' Seats=' + seats + ' Votes=' + totvotes + ' Quota=' + quota + '<\/b><br \/>Raw votes<br \/>';
        for (k = 0; k < totvotes; k++) {
            outputstring += 'vote ' + (k + 1) + ': ';
            for (j = 0; j < totcands; j++) {
                outputstring += "(" + votes[k][j] + ") ";
            }
            outputstring += '<br \/>';
        }
        document.getElementById("bodytext").innerHTML = outputstring;
        countvotes();
}

//This function controls the input of the votes and outputs the raw votes.
function votesform() {
    for (i = 1; i <= totvotes; i++) {
        outputstring = '<tr><th>Vote ' + i + '<\/th><\/tr>';
        for (k = 0; k < totcands; k++) {
            outputstring += '<tr><td>choice ' + (k + 1) + ':<\/td> ';
            for (j = 0; j < totcands; j++) {
                outputstring += '<b>' + names[j] + ':<\/b><input type="radio" name="f' + k + '" value="' + names[j] + '" \/> ';
            }
            outputstring += '<b>none:<\/b><input type="radio" name="f' + k + '" value="none" checked="checked" \/> ';
        }
        outputstring += '<br \/><input type="button" name="button2" value="add vote" onclick="votesinput(this.form)" \/><\/form>';
        document.getElementById("bodytext").innerHTML = outputstring;
    }
}

//This function puts the votes into a nested array.
function votesinput(form) {
    for (i = 0; i <= totcands; i++) {
        if (form.f0[i].checked) {
            votes[votecount][0] = form.f0[i].value;
        }
        if (totcands > 1) {
            if (form.f1[i].checked) {
                votes[votecount][1] = form.f1[i].value;
            }
        }
        if (totcands > 2) {
            if (form.f2[i].checked) {
                votes[votecount][2] = form.f2[i].value;
            }
        }
        if (totcands > 3) {
            if (form.f3[i].checked) {
                votes[votecount][3] = form.f3[i].value;
            }
        }
        if (totcands > 4) {
            if (form.f4[i].checked) {
                votes[votecount][4] = form.f4[i].value;
            }
        }
        if (totcands > 5) {
            if (form.f5[i].checked) {
                votes[votecount][5] = form.f5[i].value;
            }
        }
        if (totcands > 6) {
            if (form.f6[i].checked) {
                votes[votecount][6] = form.f6[i].value;
            }
        }
        if (totcands > 7) {
            if (form.f7[i].checked) {
                votes[votecount][7] = form.f7[i].value;
            }
        }
        if (totcands > 8) {
            if (form.f8[i].checked) {
                votes[votecount][8] = form.f8[i].value;
            }
        }
        if (totcands > 9) {
            if (form.f9[i].checked) {
                votes[votecount][9] = form.f9[i].value;
            }
        }
        if (totcands > 10) {
            if (form.f10[i].checked) {
                votes[votecount][10] = form.f10[i].value;
            }
        }
        if (totcands > 11) {
            if (form.f11[i].checked) {
                votes[votecount][11] = form.f11[i].value;
            }
        }
        if (totcands > 12) {
            if (form.f12[i].checked) {
                votes[votecount][12] = form.f12[i].value;
            }
        }
        if (totcands > 13) {
            if (form.f13[i].checked) {
                votes[votecount][13] = form.f13[i].value;
            }
        }
        if (totcands > 14) {
            if (form.f14[i].checked) {
                votes[votecount][14] = form.f14[i].value;
            }
        }
        if (totcands > 15) {
            if (form.f15[i].checked) {
                votes[votecount][15] = form.f15[i].value;
            }
        }
        if (totcands > 16) {
            if (form.f16[i].checked) {
                votes[votecount][16] = form.f16[i].value;
            }
        }
        if (totcands > 17) {
            if (form.f17[i].checked) {
                votes[votecount][17] = form.f17[i].value;
            }
        }
        if (totcands > 18) {
            if (form.f18[i].checked) {
                votes[votecount][18] = form.f18[i].value;
            }
        }
        if (totcands > 19) {
            if (form.f19[i].checked) {
                votes[votecount][19] = form.f19[i].value;
            }
        }
        if (totcands > 20) {
            if (form.f20[i].checked) {
                votes[votecount][20] = form.f20[i].value;
            }
        }
    }
    votecount += 1;
    votesform();
}

//This function adds "voteend" at each vote array.
function countvotes() {
    for (v = 0; v < totvotes; v++) {
        votes[v].push("voteend");
    }
    shiftnone();
}

//If the number of winners is equal to the number of seats, this function goes to the result. If not, if the current highest preference in a vote is "none", this function removes it and the process repeats until every vote starts with something other than "none" and it then outputs a list of the votes.
function shiftnone() {
    if (wincount == seats) {
        result();
    } else {
        roundnum += 1;
        for (v = 0; v < totvotes; v++) {
            if (votes[v][0] == "none") {
                votes[v].shift();
                v -= 1
            }
        }
        outputstring += '<p><b>Round ' + roundnum + ' votes<\/b><br \/>';
        for (v = 0; v < totvotes; v++) {
            outputstring += 'vote ' + (v + 1) + ': ';
            for (c = 0; c <= totcands; c++) {
                if (votes[v][c] !== undefined && votes[v][c] !== "none" && votes[v][c] !== "voteend") {
                    outputstring += "(" + votes[v][c] + ") ";
                }
            }
            outputstring += 'vote value = ' + voteweight[v] + '<br \/>';
        }
        outputstring += '<\/p>';
        document.getElementById("bodytext").innerHTML = outputstring;
        countfirst();
    }
}

//This function creates an array which contains the number of highest preference votes that each candidate has and outputs a summary. If any candidate has enough votes to exceed the quota, it goes to the overquota function, otherwise it goes to the findmin function.
function countfirst() {
    for (c = 0; c < totcands; c++) {
        votenum[c] = 0;
    }
    for (v = 0; v < totvotes; v++) {
        for (c = 0; c < totcands; c++) {
            if (names[c] == votes[v][0]) {
                votenum[c] += voteweight[v];
            }
        }
    }
    for (c = 0; c < totcands; c++) {
        outputstring += names[c] + ' = ' + votenum[c] + '<br \/>';
    }
    document.getElementById("bodytext").innerHTML = outputstring;
    quotacount = 0;
    for (c = 0; c < totcands; c++) {
        if (votenum[c] > quota) {
            quotacount += 1;
        }
    }
    (quotacount == 0) ? findmin(): overquota();
}

//This function works out which candidates have the fewest votes. If there is only one with the fewest votes, it goes to the function monomin. If there is a tie at the bottom it goes to multimin.
function findmin() {
    //This loop changes to "none" any vote in any position where the candidate has no first preferences.
    for (v = 0; v < totvotes; v++) {
        for (c = 0; c < totcands; c++) {
            for (q = 0; q < totcands; q++) {
                if (names[q] == votes[v][c] && votenum[q] == 0) {
                    votes[v][c] = "none";
                }
            }
        }
    }
    //This section counts the number of candidates with first preference votes. If that number is equal to the number of vacant seats, it goes to the allliveelected function which declares them all elected. Otherwise it moves on to remove the candidate with the fewest votes.
    livecount = 0;
    for (c = 0; c < totcands; c++) {
        if (votenum[c] > 0) {
            livecount += 1;
        }
    }
    if (livecount + wincount == seats) {
        allliveelected();
    } else {
        least = totvotes;
        for (c = 0; c < totcands; c++) {
            if (votenum[c] < least && votenum[c] > 0) {
                least = votenum[c];
            }
        }
        outputstring += '<br \/>Fewest votes won by a candidate = ' + least + '.';
        document.getElementById("bodytext").innerHTML = outputstring;
        mincount = 0;
        for (c = 0; c < totcands; c++) {
            if (votenum[c] == least) {
                mincount += 1;
            }
        }
        outputstring += '<br \/>Number of candidates with the fewest votes = ' + mincount + '.';
        document.getElementById("bodytext").innerHTML = outputstring;
        (mincount == 1) ? monomin(): multimin();
    }
}

//When there is only one candidate with the fewest votes, this function outputs that candidate and then goes to the removemin function.
function monomin() {
    for (c = 0; c < totcands; c++) {
        if (votenum[c] == least) {
            eliminated = c;
        }
    }
    outputstring += '<br \/>' + names[eliminated] + ' is eliminated.';
    document.getElementById("bodytext").innerHTML = outputstring;
    removemin();
}
//When there is a tie in last place, this function selects one to eliminate at random, outputs that candidate and then goes to the removemin function.
function multimin() {
    tiebreakloser = Math.ceil(Math.random() * mincount);
    elimcount = 0;
    for (c = 0; c < totcands; c++) {
        if (votenum[c] == least) {
            elimcount += 1;
            if (elimcount == tiebreakloser) {
                eliminated = c;
            }
        }
    }
    outputstring += '<br \/>The tiebreaker loser is ' + names[eliminated] + '.';
    outputstring += '<br \/>' + names[eliminated] + ' is eliminated.';
    document.getElementById("bodytext").innerHTML = outputstring;
    removemin();
}

//This function goes through the vote arrays and replaces each instance of the eliminated candidate with "none". It then goes back to the shiftnone function at the start to begin another round of counting.
function removemin() {
    for (v = 0; v < totvotes; v++) {
        for (c = 0; c < totcands; c++) {
            if (votes[v][c] == names[eliminated]) {
                votes[v][c] = "none";
            }
        }
    }
    shiftnone();
}

//This function determines if there is a tie in the number of candidates with the most votes above the quota.
function overquota() {
    greatest = 0;
    for (c = 0; c < totcands; c++) {
        if (votenum[c] > greatest) {
            greatest = votenum[c];
        }
    }
    outputstring += '<br \/>Most votes currently held by a candidate = ' + greatest + '.';
    document.getElementById("bodytext").innerHTML = outputstring;
    maxcount = 0;
    for (c = 0; c < totcands; c++) {
        if (votenum[c] == greatest) {
            maxcount += 1;
        }
    }
    outputstring += '<br \/>Number of candidates with the greatest number of votes = ' + maxcount + '.';
    document.getElementById("bodytext").innerHTML = outputstring;
    roundelected = 0;
    (maxcount == 1) ? monomax(): multimax();
}

//This function determines who is elected in the round if there is only one candidate with the highest number of votes.
function monomax() {
    for (c = 0; c < totcands; c++) {
        if (votenum[c] == greatest) {
            roundelected = c;
        }
    }
    outputstring += '<br \/>' + names[roundelected] + ' has exceeded the quota and is elected. If there are seats remaining to be filled, the surplus will now be reallocated.';
    document.getElementById("bodytext").innerHTML = outputstring;
    electmax();
}

//this function determines which candidate to elect in the round when two or more candidates have the greatest number of votes. It reuses the variables from the multimin function so tiebreakerloser isn't an accurate description in this case.
function multimax() {
    tiebreakloser = Math.ceil(Math.random() * maxcount);
    elimcount = 0;
    for (c = 0; c < totcands; c++) {
        if (votenum[c] == greatest) {
            elimcount += 1;
            if (elimcount == tiebreakloser) {
                roundelected = c;
            }
        }
    }
    outputstring += '<br \/>The tiebreaker says the first surplus to be re-allocated is ' + names[roundelected] + '\'s.';
    outputstring += '<br \/>' + names[roundelected] + ' has exceeded the quota and is elected. If there are seats remaining to be filled, the surplus will now be reallocated.';
    document.getElementById("bodytext").innerHTML = outputstring;
    electmax()
}

//This function adds the name of the elected candidate to the elected array and then reweights their votes and changes their name to "none" in the votes array.
function electmax() {
    elected[wincount] = names[roundelected];
    wincount += 1;
    for (v = 0; v < totvotes; v++) {
        if (votes[v][0] == names[roundelected]) {
            voteweight[v] *= (votenum[roundelected] - quota) / votenum[roundelected];
        }
    }
    for (v = 0; v < totvotes; v++) {
        for (c = 0; c < totcands; c++) {
            if (votes[v][c] == names[roundelected]) {
                votes[v][c] = "none";
            }
        }
    }
    shiftnone();
}

//When there are as many active candidates as there are seats to fill, this function adds all the active candidates to the elected array.
function allliveelected() {
    for (c = 0; c < totcands; c++) {
        if (votenum[c] > 0) {
            elected[wincount] = names[c];
            wincount += 1;
        }
    }
    shiftnone();
}

//This function announces the winner.
function result() {
    outputstring += '<p><b>The election is complete and the elected candidates are';
    for (i = 0; i < seats; i++) {
        outputstring += ' (' + elected[i] + ')';
    }
    outputstring += '.<\/b><\/p>';
    document.getElementById("bodytext").innerHTML = outputstring;
}