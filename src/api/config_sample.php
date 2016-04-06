<?php

define('SERVER', 'myServer');
define('USERNAME', 'myUser');
define('PASSWORD', 'myPassword');
define('DB', 'myDatabase');

####	CONNECT TO THE DATABASE		######
try {
	$dbh = new PDO('mysql:host=' . SERVER . ';dbname=' . DB, USERNAME, PASSWORD, array(PDO::ATTR_PERSISTENT => true));
} catch (PDOException $e) {
	die($e->getMessage());
}

?>