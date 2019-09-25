# raspbian-deb-package

Scripts required to build the Node-RED deb package for Raspbian Buster.

The last version of Node-RED for Jessie was 0.15.3.

**WARNING**: If you already have Node-RED installed **do not** run this *just for fun*. It will probably break your existing install.

Only run it on a clean Raspbian Stretch SD card running in a Raspberry Pi Arm6 model -
that way it will include the correct instruction set for other Arm6 type Pi (Original
A and B models) and yet be forwards compatible with the Arm7 versions (Pi2, 3 etc).

Transfer all the files from this project to the Pi.

    git clone https://github.com/node-red/linux-installers.git
    cd linux-installers/pibuild

Then run the two scripts below

### node-red-pi-install.sh

You should only run this script once.

Firstly it does an apt-get update and installs node.js and npm.

It then npm installs the latest Node-RED from npm. This can take 20-30 mins on a Pi 1.

It also installs a few useful extra nodes.

Then it removes a load of crud files from all the installed dependancies -
such as test, doc, samples, examples and so on.

Finally we install the icon file, init scripts, and desktop file.

Once this finishes the Pi should be able to run Node-RED and have an icon under
menu - programming

### node-red-deb-pack.sh

The deb package version number is set at the top of this script. Edit as necessary.

Next run this script - it also cleans up the crud just to be sure... then packs
all the files and unpacks them into a directory in `/tmp/`

It then moves files from `/usr/local/...` to `/usr/...`  as required for pre-installed applications, and adds the necessary `DEBIAN/control` file.

Finally it builds the actual deb file - moves it back in to the `/home/pi` directory and then runs `lintian` to report all the violations.

Don't worry - there are loads ! so to trim then down to what I consider actually relevant try running

    cat lint.log | grep E: | grep -v '\.node'

for the Errors - and

    cat lint.log | grep W: | grep -v '!node' | grep -v 'extra' | grep -v "image" | grep -v "please" | grep -v "not-executable" | grep -v '\.node'

for the warnings.

Move or Copy the `nodered_x.y.z.deb` file as required.

### Notes

Both these scripts could be run as one. Though while messing around it made more sense to do the install once and then re-pack as many times as necessary.
