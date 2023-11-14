#!/bin/sh

systemctl stop slapshot

cd /home/orangepi/slapshot
git pull
yarn
yarn build

systemctl start slapshot

exit 0
