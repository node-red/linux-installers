#!/bin/bash
#
# Copyright 2016,2019 JS Foundation and other contributors, https://js.foundation/
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

# clear out all old nodejs and node-red
sudo rm -rf /usr/lib/node_modules/
sudo rm -rf /usr/bin/node-red*
sudo rm -rf /usr/bin/update-nodejs-and-nodered
sudo rm -rf /usr/local/lib/node_modules/
sudo rm -rf /usr/local/bin/node-red*
sudo rm -rf /usr/local/bin/update-nodejs-and-nodered
sudo rm -rf /home/pi/.npm /home/pi/.node-gyp
sudo rm -rf /root/.npm /root/.node-gyp
sudo rm -rf /etc/apt/sources.list.d/nodesource.list
# can remove next line if already updated....
sudo apt update -y

# sudo apt install nodejs nodejs-legacy npm lintian

sudo apt install -y build-essential nodejs npm lintian
sudo npm install -g --unsafe-perm npm@latest
# Get node.js 4.8.2 to match stretch ... for now
#wget https://nodejs.org/download/release/v4.8.2/node-v4.8.2-linux-armv6l.tar.gz -O /tmp/node.tgz
#sudo tar -zxf /tmp/node.tgz --strip-components=1 -C /usr

hash -r
sudo npm cache clean --force
echo " "
echo "Installed"
echo "   Node" $(node -v)
echo "   Npm   "$(npm -v)
echo "Now installing Node-RED - please wait - can take 25 mins on a Pi 1"
echo "   Node-RED "$(npm show node-red version)
sudo npm i -g --unsafe-perm --no-progress --production node-red

# Remove existing serialport
sudo rm -rf /usr/local/lib/node_modules/node-red/nodes/node_modules/node-red-node-serialport

# Remove a load of unnecessary doc/test/example from pre-reqs
pushd /usr/local/lib/node_modules/node-red/node_modules
sudo find . -type d -name test -exec rm -r {} \;
sudo find . -type d -name doc -exec rm -r {} \;
sudo find . -type d -name example* -exec rm -r {} \;
sudo find . -type d -name sample -exec rm -r {} \;
sudo find . -type d -iname benchmark* -exec rm -r {} \;
sudo find . -type d -iname .nyc_output -exec rm -r {} \;
sudo find . -type d -iname unpacked -exec rm -r {} \;
sudo find . -type d -iname demo -exec rm -r {} \;

sudo find . -name bench.gnu -type f -exec rm {} \;
sudo find . -name .npmignore -type f -exec rm {} \;
sudo find . -name .travis.yml -type f -exec rm {} \;
sudo find . -name .jshintrc -type f -exec rm {} \;
sudo find . -iname README.md -type f -exec rm {} \;
sudo find . -iname HISTORY.md -type f -exec rm {} \;
sudo find . -iname CONTRIBUTING.md -type f -exec rm {} \;
sudo find . -iname CHANGE*.md -type f -exec rm {} \;
sudo find . -iname .gitmodules -type f -exec rm {} \;
sudo find . -iname .gitattributes -type f -exec rm {} \;
sudo find . -iname .gitignore -type f -exec rm {} \;
sudo find . -iname "*~" -type f -exec rm {} \;
# slightly more risky
sudo find . -iname test* -exec rm -r {} \;
popd

# Add some extra useful nodes
mkdir -p ~/.node-red
#sudo npm install -g --unsafe-perm --no-progress node-red-admin
echo "Node-RED installed. Adding a few extra nodes"
sudo npm install -g --unsafe-perm --no-progress node-red-node-pi-gpio node-red-node-random node-red-node-ping node-red-node-smooth node-red-contrib-play-audio node-red-node-serialport
# sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)

match='editorTheme: {'
file='/usr/local/lib/node_modules/node-red/settings.js'
insert='editorTheme: {\n        menu: { \"menu-item-help\": {\n            label: \"Node-RED Pi Website\",\n            url: \"http:\/\/nodered.org\/docs\/hardware\/raspberrypi.html\"\n        } },'
sudo sed -i "s|$match|$insert|" $file
echo "*********************"

echo "Move everything under /usr rather than /usr/local"
sudo mkdir -p /usr/lib/node_modules
sudo mv /usr/local/lib/node_modules/node-red* /usr/lib/node_modules/
sudo mv /usr/local/bin/node* /usr/bin/

# Get systemd script - start and stop scripts - svg icon - and .desktop file into correct places.
if [ -d "resources" ]; then
    cd resources
    sudo chown root:root *
    sudo chmod +x node-red-st*
    sudo chmod +x node-red-re*
    sudo chmod +x node-red-log
    sudo cp nodered.service /lib/systemd/system/
    sudo cp node-red-start /usr/bin/
    sudo cp node-red-stop /usr/bin/
    sudo cp node-red-restart /usr/bin/
    sudo cp node-red-reload /usr/bin/
    sudo cp node-red-log /usr/bin/
    sudo cp node-red-icon.svg /usr/share/icons/hicolor/scalable/apps/node-red-icon.svg
    sudo chmod 644 /usr/share/icons/hicolor/scalable/apps/node-red-icon.svg
    sudo cp Node-RED.desktop /usr/share/applications/Node-RED.desktop
    sudo chown pi:pi *
    cd ..
else
    echo " "
    echo "resources - subdirectory not in place... exiting."
    exit 1
fi
#sudo systemctl disable nodered

# Restart lxpanelctl so icon appears in menu - programming
#lxpanelctl restart
echo " "
echo "All done."
echo "  You can now start Node-RED with the command node-red-start"
echo "  or using the icon under Menu / Programming / Node-RED."
echo "  Then point your browser to http://127.0.0.1:1880 or http://{{your_pi_ip-address}:1880"
echo " "
