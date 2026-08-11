#!/bin/bash
cd ~/ProphetBot

# Check ffmpeg
echo "=== FFMPEG ==="
which ffmpeg && ffmpeg -version 2>&1 | head -1 || echo "FFMPEG NOT FOUND"

# Check youtubei module
echo "=== YOUTUBEI MODULE ==="
node -e 'try{require("discord-player-youtubei");console.log("YOUTUBEI_OK")}catch(e){console.log("YOUTUBEI_FAIL:",e.message)}'

# Start bot
echo "=== STARTING BOT ==="
pm2 start index.js --name prophet-bot
sleep 10

# Show logs
echo "=== LOGS ==="
pm2 logs --lines 35 --nostream
