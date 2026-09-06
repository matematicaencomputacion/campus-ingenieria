#!/bin/bash
cd /workspace/campus-ingenieria
exec python3 -m http.server 3000 --bind 0.0.0.0
