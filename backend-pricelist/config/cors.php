<?php

return [
    'paths' => ['api/*', 'products/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'], // sementara allow semua biar gampang testing
    'allowed_headers' => ['*'],
    'supports_credentials' => true,
];
