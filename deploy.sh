#/bin/bash

ssh root@192.168.1.142 << EOF
  cd /root/workspace/race-gate-controller
  git pull
  npm install
  pm2 restart all
  exit