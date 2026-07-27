#!/usr/bin/env bash

cd /tmp

nohup mitmdump -s /redirect.py --no-http2 --listen-port 1337 --set connection_strategy=lazy

python3 serve.py 1234
