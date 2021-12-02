#!/bin/bash
#
# Copyright 2016,2021 OpenJS Foundation and other contributors, https://openjsf.org/
# Copyright 2015,2016 IBM Corp.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

echo ""
VER=$(node-red -? | grep RED | cut -d "v" -f 2)-2
echo "NODE_RED VERSION is "$VER

cd /usr/lib/node_modules
sudo find . -type f -name .DS_Store -exec rm {} \;
sudo find . -type f -name .npmignore -exec rm {} \;
sudo find . -type f -name .eslintrc* -exec rm {} \;
sudo find . -type f -name .editorconfig -exec rm {} \;
sudo find . -type f -name *.swp -exec rm {} \;
sudo find . -not -newermt 1971-01-01 -exec touch {} \;

cd /usr/lib/node_modules/node-red/node_modules
sudo find . -type d -name test -exec rm -r {} \;
sudo find . -type d -name doc -exec rm -r {} \;
# sudo find . -type d -name example -exec rm -r {} \;
sudo find . -type d -name sample -exec rm -r {} \;
sudo find . -type d -iname benchmark* -exec rm -r {} \;
sudo find . -type d -iname .nyc_output -exec rm -r {} \;
sudo find . -type d -iname unpacked -exec rm -r {} \;
sudo find . -type d -name man* -exec rm -r {} \;
sudo find . -type d -name tst -exec rm -r {} \;
sudo find . -type d -iname demo -exec rm -r {} \;

sudo find . -type f -name bench.gnu -exec rm {} \;
sudo find . -type f -name .npmignore -exec rm {} \;
sudo find . -type f -name .travis.yml -exec rm {} \;
sudo find . -type f -name .jshintrc -exec rm {} \;
sudo find . -type f -iname README.md -exec rm {} \;
sudo find . -type f -iname HISTORY.md -exec rm {} \;
sudo find . -type f -iname CONTRIBUTING.md -exec rm {} \;
sudo find . -type f -iname CHANGE*.md -exec rm {} \;
sudo find . -type f -iname .gitmodules -exec rm {} \;
sudo find . -type f -iname .gitattributes -exec rm {} \;
sudo find . -type f -iname .gitignore -exec rm {} \;
sudo find . -type f -iname "*~" -exec rm {} \;

# slightly more risky
sudo find . -iname test* -exec rm -r {} \;
sudo find . -type f -iname usage.txt -exec rm {} \;
# sudo find . -type f -iname example.js -exec rm {} \;
sudo find . -type d -name node-pre-gyp-github -exec rm -r {} \;
sudo find . -type f -iname build-all.json -exec rm -r {} \;
#sudo find . -iname LICENSE* -type f -exec rm {} \;

cd /usr/lib/node_modules/node-red-node-serialport/node_modules
sudo find . -type d -name test -exec rm -r {} \;
sudo find . -type d -name doc -exec rm -r {} \;
sudo find . -type d -name sample -exec rm -r {} \;
sudo find . -type d -iname coverage -exec rm -r {} \;
sudo find . -type d -iname benchmark -exec rm -r {} \;
sudo find . -type f -iname bench.gnu -exec rm -r {} \;
# sudo find .         -name example* -exec rm -r {} \;
sudo find . -type f -name .npmignore -exec rm {} \;
sudo find . -type f -name .travis.yml -exec rm {} \;
sudo find . -type f -name .jshintrc -exec rm {} \;
sudo find . -type f -iname README.md -exec rm {} \;
sudo find . -type f -iname HISTORY.md -exec rm {} \;
sudo find . -type f -iname CONTRIBUTING.md -exec rm {} \;
sudo find . -type f -iname CHANGE*.md -exec rm {} \;
sudo find . -type f -iname .gitmodules -exec rm {} \;
sudo find . -type f -iname .gitattributes -exec rm {} \;
sudo find . -type f -iname "*~" -exec rm {} \;

echo "Tar up the existing install"
sudo rm -rf /tmp/n*
cd /
sudo tar zcf /tmp/nred.tgz /usr/lib/node_modules/node-red* /usr/bin/node-red*  /usr/share/applications/Node-RED.desktop /lib/systemd/system/nodered.service /usr/share/icons/hicolor/scalable/apps/node-red-icon.svg
echo " "
ls -l /tmp/nred.tgz
echo " "

echo "Extract nred.tgz to /tmp directory"
sudo mkdir -p /tmp/nodered_$VER/DEBIAN
sudo tar zxf /tmp/nred.tgz -C /tmp/nodered_$VER
cd /tmp/nodered_$VER

# echo "Move from /usr/local/... to /usr/..."
# sudo mv usr/local/* usr/
# sudo rm -rf usr/local

echo "Reset file ownerships and permissions"
sudo chown -R root:root *
sudo chmod -R -s *
sudo find . -type f -iname "*.js" -exec chmod 644 {} \;
sudo find . -iname "*.json" -exec chmod 644 {} \;
sudo find . -iname "*.yml" -exec chmod 644 {} \;
sudo find . -iname "*.md" -exec chmod 644 {} \;
sudo find . -iname "*.html" -exec chmod 644 {} \;
sudo find . -iname "*.ts" -exec chmod 644 {} \;
sudo find . -iname "*.map" -exec chmod 644 {} \;
sudo find . -iname "*.lock" -exec chmod 644 {} \;
sudo find . -iname LICENSE* -exec chmod 644 {} \;
sudo find . -iname Makefile -exec chmod 644 {} \;
sudo find . -iname *.png -exec chmod 644 {} \;
sudo find . -iname *.txt -exec chmod 644 {} \;
sudo find . -iname *.conf -exec chmod 644 {} \;
sudo find . -iname *.pem -exec chmod 644 {} \;
sudo find . -iname *.cpp -exec chmod 644 {} \;
sudo find . -iname *.h -exec chmod 644 {} \;
sudo find . -iname prepublish.sh -exec chmod 644 {} \;
sudo find . -iname update_authors.sh -exec chmod 644 {} \;
sudo find . -type d -exec chmod 755 {} \;
sudo chmod 644 usr/lib/node_modules/node-red/editor/vendor/font-awesome/css/*
sudo chmod 644 usr/lib/node_modules/node-red/editor/vendor/font-awesome/fonts/*
sudo chmod 755 usr/lib/node_modules/node-red/red.js
sudo chmod 755 usr/lib/node_modules/node-red-admin/node-red-admin.js

sudo rm -f usr/lib/node_modules/node-red/node_modules/bcrypt/build-tmp-napi-v3/Release/nothing.a

SIZE=`du -ks . | cut -f 1`
echo "Installed size is $SIZE"

echo "Create control file"
cd DEBIAN
echo "Package: nodered" | sudo tee control
echo "Version: $VER" | sudo tee -a control
echo "Section: editors" | sudo tee -a control
echo "Priority: optional" | sudo tee -a control
echo "Architecture: armhf" | sudo tee -a control
echo "Installed-Size: $SIZE" | sudo tee -a control
#echo "Depends: nodejs (>= 8), python (>= 2.7)" | sudo tee -a control
# echo "Depends: nodejs (>= 10), npm (>= 5.8), python (>= 2.7)" | sudo tee -a control
echo "Depends: nodejs (>= 12), npm (>= 7), python3 (>= 3)" | sudo tee -a control
echo "Homepage: http://nodered.org" | sudo tee -a control
echo "Maintainer: Dave Conway-Jones <dceejay@gmail.com>" | sudo tee -a control
echo "Description: Node-RED - low-code programming for event-driven applications" | sudo tee -a control
echo " A graphical flow editor for event driven applications." | sudo tee -a control
echo " Runs on Node.js - using a browser for the user interface." | sudo tee -a control
echo " See http://nodered.org for more information, documentation and examples." | sudo tee -a control
echo " ." | sudo tee -a control
echo " Copyright 2017,2021 OpenJS Foundation and other contributors, https://openjsf.org/" | sudo tee -a control
echo " Copyright 2015,2017 IBM Corp." | sudo tee -a control
echo " Licensed under the Apache License, Version 2.0" | sudo tee -a control
echo " http://www.apache.org/licenses/LICENSE-2.0" | sudo tee -a control

echo "service nodered stop >/dev/null 2>&1; exit 0" | sudo tee preinst
# echo "npm i -g npm@latest >/dev/null 2>&1; exit 0" | sudo tee postinst
echo "hash -r >/dev/null 2>&1; exit 0" | sudo tee postinst
echo "service nodered stop >/dev/null 2>&1; exit 0" | sudo tee prerm
echo "rm -rf /usr/lib/node_modules/node-red* /usr/bin/node-red* /usr/share/applications/Node-RED.desktop /usr/share/icons/hicolor/scalable/apps/node-red-icon.svg >/dev/null 2>&1; exit 0" | sudo tee postrm
# echo "rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm && hash -r >/dev/null 2>&1; exit 0" | sudo tee postrm
echo "export DISPLAY=:0 && lxpanelctl restart >/dev/null 2>&1; exit 0" | sudo tee postrm
sudo chmod 0755 preinst postinst prerm postrm

cd ../usr/share
sudo mkdir -p doc/nodered
cd doc/nodered
echo " Copyright 2017-2021 OpenJS Foundation and other contributors, https://openjsf.org/" | sudo tee copyright
echo "nodered ($VER) unstable; urgency=low" | sudo tee changelog
echo "  * Point release." | sudo tee -a changelog
echo " -- DCJ <ceejay@vnet.ibm.com>  $(date '+%a, %d %b %Y %H:%M:%S +0000')" | sudo tee -a changelog
echo "" | sudo tee -a changelog
sudo gzip -9 changelog

echo "Build the actual deb file"
cd /tmp/
sudo dpkg-deb --build nodered_$VER
echo " "
ls -lrt no*.deb

echo "Move .deb to /home/pi directory"
mkdir -p /home/pi/dist
sudo mv nodered_$VER.deb /home/pi/dist
cd /home/pi/dist
sudo chown pi:pi nodered_$VER.deb
dpkg-scanpackages -m . | gzip -9c > Packages.gz
echo " "
echo "Now running lintian report"
lintian nodered_$VER.deb > /home/pi/lint.log
cd ..
echo ' '
echo 'Errors   ' $(cat lint.log | grep E: | wc -l)
echo 'Warnings ' $(cat lint.log | grep W: | wc -l)
echo "All done - see ~/lint.log"
