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

function apiGet($key) {return isset($_GET[$key]) ? $_GET[$key] : false;}
function apiPost($key) {return isset($_POST[$key]) ? $_POST[$key] : false;}

?>