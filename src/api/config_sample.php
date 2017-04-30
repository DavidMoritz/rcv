<?php
####	Rename this file to "config.php" after putting in your credentials	#####

define('SERVER', 'localhost:3306');
define('USERNAME', 'root');
define('PASSWORD', 'myRootPassword');
define('DB', 'rcv_db');

####	CONNECT TO THE DATABASE		######
try {
	$dbh = new PDO('mysql:host=' . SERVER . ';dbname=' . DB, USERNAME, PASSWORD, array(PDO::ATTR_PERSISTENT => true));
} catch (PDOException $e) {
	die($e->getMessage());
}

?>
