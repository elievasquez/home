<?php
/*
 * meta-proxy.php — Devuelve la canción que suena en tu stream Shoutcast.
 * Súbelo a tu hosting (necesita PHP) y pon su URL en META_PROPIO dentro del reproductor.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

$servidor = 'https://pstnet4.shoutcastnet.com:40174';

function leer($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 6,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (meta-proxy)',
    ]);
    $r = curl_exec($ch);
    $ok = curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200;
    curl_close($ch);
    return $ok ? $r : false;
}

$cancion = '';
$oyentes = null;

// 1) Estadísticas JSON de Shoutcast v2
$json = leer($servidor . '/stats?sid=1&json=1');
if ($json && ($d = json_decode($json, true))) {
    $cancion = $d['songtitle'] ?? '';
    $oyentes = $d['currentlisteners'] ?? null;
}

// 2) Texto plano de respaldo
if ($cancion === '') {
    $txt = leer($servidor . '/currentsong?sid=1');
    if ($txt) $cancion = trim($txt);
}

echo json_encode(['cancion' => $cancion, 'oyentes' => $oyentes], JSON_UNESCAPED_UNICODE);
