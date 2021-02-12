#!/bin/bash

rm -r node_modules

npm install
npm run build

mkdir /usr/local/tomcat/webapps/test
cp dist/plugin.js /usr/local/tomcat/webapps/test/

PLUGIN_FILE=plugin.js
PLUGIN_MD5=($(md5sum dist/plugin.js))

/usr/local/tomcat/bin/startup.sh
sleep 15


test 200 = $(curl -X POST -d "login=admin&password=admin" --write-out %{http_code} --silent --output /dev/null -c cookie.txt http://localhost:8080/minerva/api/doLogin)
curl "http://localhost:8080/minerva/api/plugins/" --cookie cookie.txt --data "hash=$PLUGIN_MD5&url=http%3A%2F%2Flocalhost%3A8080%2Ftest%2F$PLUGIN_FILE&name=test&version=0.0.1&isPublic=false"

npm run test

#google-chrome --headless --no-sandbox --remote-debugging-port=9222 "http://localhost:8080/minerva/?id=single-map&plugins=$PLUGIN_MD5" &
#sleep 15
#test 200 = $(curl --write-out %{http_code} --silent --output /dev/null --cookie cookie.txt http://localhost:8080/minerva/api/plugins/$PLUGIN_MD5/data/global/test/)
