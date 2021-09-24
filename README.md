# Linux Installers for Node-RED

Both of the following commands use sudo (root) access to install Node-RED globally (and nodejs if required). You may want to inspect them first to satisfy yourself as to the actions they take.

### Debian, Ubuntu, Raspberry Pi OS

The command line for installing on a Debian based OS is:

```
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
```

### Red Hat, Fedora, CentOS, Oracle Linux

The command line for installing on a RPM based OS is:

```
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/rpm/update-nodejs-and-nodered)
```

**Note**: This script will optionally add a firewall rule that adds port 1880 to the public zone. On a default install this should allow access to Node-RED from outside of the local machine. The default is not to do this.

### Pi Build

The pibuild directory contains the scripts and files we use to build the pre-install .deb version of Node-RED for the Raspberry Pi. Most users should never need this as the script above is the recommended way to install and upgrade. See the [README](pibuild) in that directory for more information.
