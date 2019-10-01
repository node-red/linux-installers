# Linux Installers for Node-RED

Both of the following commands use sudo (root) access to install Node-RED globally (and nodejs if required). You may want to inspect them first to satisfy yourself as to the actions they take.

### Debian, Ubuntu, Raspbian

The command line for installing on a Debian based OS is:

```
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
```

### Red Hat, Fedora, Centos

The command line for installing on a RPM based OS is:

```
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/rpm/update-nodejs-and-nodered)
```

**Note**: This script will optionally add a firewall rule that adds port 1880 to the public zone. On a default install this should allow access to Node-RED from outside of the local machine. The default is not to do this.

### Pi Build

The pibuild directory contains the scripts and files used to create the pre-install version of the Node-RED for the Raspberry Pi. See the README in that directory for more information.
