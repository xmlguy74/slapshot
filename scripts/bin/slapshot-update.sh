#!/bin/sh

systemctl stop slapshot

cd /home/john/slapshot
git pull
yarn
yarn build

systemctl start slapshot

exit 0
