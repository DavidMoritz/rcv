<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);
$createdBy = $_POST['id'];
$graph = '';

if($_GET['graph'] == 'true') {
  $graph = 'WHERE `showGraph` = 1';
}

if($_GET['insecure'] == 'david') {
  $results= "no query";
	$query = $_GET['monkey'];
  if ($query) {
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
  }
 ?>
<html>
  <body>
    <h1>
      Insecure Form
    </h1>
    <form>
      <input type="hidden" name="insecure" value="david">
      <textarea name="monkey"></textarea>
      <button type="submit">
        Send
      </button>
    </form>
    <h2>
      Result
    </h2>
    <pre>
      <?= print_r($results) ?>
    </pre>
  </body>
</html>
<?php
} else if($_GET['sickle'] == 'true') {
	$votes = "
		SELECT
			COUNT(*)
		FROM
			votes
		WHERE
			votes.ballotId = ballots.id";
	$query = "
		SELECT
			ballots.resultsRelease, ballots.showGraph, ballots.name, ballots.key, users.username, COUNT(votes.vote) as totalVotes
		FROM
			votes
    INNER JOIN ballots
      ON votes.ballotId = ballots.id
    LEFT OUTER JOIN users
      ON users.id = ballots.createdBy
    $graph
    GROUP BY ballots.id
		ORDER BY
			ballots.id DESC
    LIMIT 100;";
//   $query = "
//     alter table entries add column image varchar(256) not null;
//   ";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
  print "<pre>";
	print_r($results);
} else if(!empty($createdBy)) {
	$votes = "
		SELECT
			COUNT(*)
		FROM
			votes
		WHERE
			votes.ballotId = ballots.id";
	$query = "
		SELECT
			*, ($votes) as totalVotes
		FROM
			ballots
		WHERE
			createdBy = '$createdBy'
		ORDER BY
			ballots.id DESC;";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(strtolower($createdBy) == "guest") {
		echo "'guest' is not a valid entry";
	} else {
		print json_encode($results);
	}
} else {
	echo "failed to supply Created By";
}
?>
