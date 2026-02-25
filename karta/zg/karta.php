<?php
date_default_timezone_set('Europe/Zagreb');
define('DB_USER', 'tehnika');
define('DB_PASS', '9*p4x^ZWT@VH@jbptR&UxMgu9Gq&bT6scqe@Jfvrme22GMPx^cBmL44aqZbgAXhBfp@eMus6E2BMyZXC8#^Jy6Nkru#fWJ6*gG^RRHTNE4bdUD&TxZK4p^QW6GmuE55A');
define('DB_HOST', 'localhost');
define('DB_NAME', 'tehnika');
define('DB_CHAR', 'utf8mb4');
/*ini_set('display_errors','Off');
ini_set('error_reporting', E_ERROR & ~E_NOTICE & ~E_WARNING);
ini_set('error_reporting', E_ALL);*/

define('DB_ATTR', [
    PDO::ATTR_PERSISTENT         => TRUE,
    PDO::ATTR_EMULATE_PREPARES   => FALSE,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
]);

function db()
{
    $db_data = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHAR;

    $db = new PDO($db_data, DB_USER, DB_PASS, DB_ATTR);

    return $db;
}

$db = db();
$kategorije = [8, 30, 45, 1085];

foreach ($kategorije as $kat_id)
{
    $sql = "SELECT name FROM z31wa_terms WHERE term_id=$kat_id LIMIT 1";
    $query = $db->prepare($sql);
    $query->execute();
    foreach ($query->fetchAll() as $row)
    {
        $kategorija[$kat_id] = ucfirst($row['name']);
    }
}

$csv_filename = $_GET['csv'];

if (isset($_GET['svi']) && $_GET['svi'] == 'da')
{
    $filter_po_objavljenosti = '';
}
else
{
    $filter_po_objavljenosti = " WHERE objavljeni_clanak='da' ";
}

$csv[] = ['name','description','color','lat','lon','img','link','bastina'];

$sql = "SELECT * FROM z31wa_karta $filter_po_objavljenosti";
$query = $db->prepare($sql);
$query->execute();

foreach ($query->fetchAll() as $row)
{
    $csv[] = [$row['naslov_hr'], $row['definicija_hr'], $row['boja'], $row['lat'], $row['lon'], $row['istaknuta_slika'], $row['url'], $kategorija[$row['kategorija']]];
}
//echo '<pre>';var_dump ($csv);echo '</pre>';die();
header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="' . $csv_filename . '"');

$fp = fopen('php://output', 'wb');
foreach ($csv as $line)
{
    fputcsv($fp, $line, ',');
}
fclose($fp);
exit();