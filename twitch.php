<?php

function curl_get($url, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    $res = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($res === false) throw new Exception("cURL error: $err");
    return $res;
}

function fetch_access_token($channel) {
    $url = "https://api.twitch.tv/api/channels/".rawurlencode($channel)."/access_token";
    $headers = [
        "Client-ID: kimne78kx3ncx6brgo4mv6wki5h1ko",
        "Accept: application/vnd.twitchtv.v5+json"
    ];
    $raw = curl_get($url, $headers);
    $json = json_decode($raw, true);
    if (!$json || !isset($json['token']) || !isset($json['sig'])) {
        throw new Exception("Failed to get access token. Response: " . substr($raw,0,600));
    }
    return $json;
}

function build_usher_url($channel, $token, $sig) {
    $p = rand(1000000,9999999);
    $token_enc = rawurlencode($token);
    $channel_enc = rawurlencode($channel);
    $usher = "https://usher.ttvnw.net/api/channel/hls/{$channel_enc}.m3u8"
           . "?player=twitchweb&token={$token_enc}&sig={$sig}&allow_source=true&allow_audio_only=true&p={$p}";
    return $usher;
}

try {
    if (PHP_SAPI === 'cli') {
        if ($argc < 2) {
            throw new Exception("Usage: php {$argv[0]} <channel>");
        }
        $channel = $argv[1];
    } else {
        if (!isset($_GET['channel'])) throw new Exception("Provide ?channel=channelname");
        $channel = $_GET['channel'];
    }

    $access = fetch_access_token($channel);
    $token = $access['token'];
    $sig = $access['sig'];

    $usher = build_usher_url($channel, $token, $sig);

    $playlist = curl_get($usher, [
        "Client-ID: kimne78kx3ncx6brgo4mv6wki5h1ko",
        "Referer: https://www.twitch.tv/".rawurlencode($channel)
    ]);

    if (PHP_SAPI === 'cli') {
        echo $playlist;
    } else {
        header('Content-Type: application/vnd.apple.mpegurl; charset=utf-8');
        echo $playlist;
    }
} catch (Exception $e) {
    if (PHP_SAPI === 'cli') {
        fwrite(STDERR, "Error: ".$e->getMessage().PHP_EOL);
    } else {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => $e->getMessage()]);
    }
}
