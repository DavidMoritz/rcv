<?php
require_once("config.php");

// create a new cURL resource
$ch = curl_init();
$contents = '{ "config": { "contest": "Test BBI Presidential Election RCV Straw Poll FIND PHP", "date": "2023-08-10", "jurisdiction": "BBI Straw Pole", "office": "President", "threshold": 4 }, "results": [ { "round": 1, "tally": { "D - Kennedy": "3", "R - Hurd": "1", "D - Williamson": "1", "R - DeSantis": "1", "D - Biden": "1" }, "tallyResults": [ { "eliminated": "R - Hurd", "transfers": { "D - Kennedy": "0", "D - Williamson": "1", "R - DeSantis": "0", "D - Biden": "0" } } ] }, { "round": 2, "tally": { "D - Kennedy": "3", "D - Williamson": "2", "R - DeSantis": "1", "D - Biden": "1" }, "tallyResults": [ { "eliminated": "R - DeSantis", "transfers": { "D - Kennedy": "0", "D - Williamson": "0", "D - Biden": "1" } } ] }, { "round": 3, "tally": { "D - Kennedy": "3", "D - Williamson": "2", "D - Biden": "2" }, "tallyResults": [ { "eliminated": "D - Biden", "transfers": { "D - Williamson": "1", "D - Kennedy": "0" } } ] }, { "round": 4, "tally": { "D - Williamson": "3", "D - Kennedy": "3" }, "tallyResults": [ { "eliminated": "D - Kennedy", "transfers": { "D - Williamson": "1" } } ] }, { "round": 5, "tally": { "D - Williamson": "4" }, "tallyResults": [ { "elected": "D - Williamson" } ] } ] }';


// // Create a file
$cstringfile = 'results.txt';
// $cfile = curl_file_create($_FILES['jsonFile']['tmp_name'],$_FILES['jsonFile']['type'],'jsonFile');
file_put_contents($cstringfile, $contents);
// $fp = fopen($cstringfile, 'w');
// fwrite($fp, $contents);

// Assign POST data
// $data = array('jsonFile' => $_FILES["jsonFile"]);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
// set URL and other appropriate options
curl_setopt($ch, CURLOPT_URL, "https://www.rcvis.com/api/visualizations/5778/");
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
// curl_setopt($ch, CURLOPT_POSTFIELDS, array('jsonFile' => $_FILES['jsonFile']));
curl_setopt($ch, CURLOPT_POSTFIELDS, array('jsonFile' => $cstringfile));
// curl_setopt($ch, CURLOPT_POSTFIELDS, ['format' => 'json', 'data' => $contents]);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: Token ' . APIKEY, 'Content-Type: multipart/form-data'));
// var_dump(trim(preg_replace('/\s+/', ' ', file_get_contents($_FILES['jsonFile']['tmp_name']))));
// grab URL and pass it to the browser
echo curl_exec($ch);
// var_dump($_REQUEST);
// close cURL resource, and free up system resources
curl_close($ch);

?>