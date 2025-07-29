# Linux Installers for Node-RED

Both of the following commands use sudo (root) access to install Node-RED globally (and nodejs if required). You may want to inspect them first to satisfy yourself as to the actions they take.

### Debian, Ubuntu, Raspberry Pi OS

The command line for installing on a Debian based OS is:

```
bash <(curl -sL https://github.com/node-red/linux-installers/releases/latest/download/update-nodejs-and-nodered-deb)
```

you should ensure you have the build tools installed if you are going to install extra nodes.

```
sudo apt install build-essential
```

There are lots of command line options available - add ` --help` to the end of the command above to see them all.


### Red Hat, Fedora, CentOS, Oracle Linux

The command line for installing on a RPM based OS is:

```
bash <(curl -sL https://github.com/node-red/linux-installers/releases/latest/download/update-nodejs-and-nodered-rpm)
```

Change e.g. set the system user and open the firewall :

```bash
curl -sL https://github.com/node-red/linux-installers/releases/latest/download/update-nodejs-and-nodered-rpm \
 | bash -s --nodered-user=nodered --open-firewall
```

Command Line options:
```
  --help                display this help and exits.
  --nodered-user=<user> specify the user to run as e.g. '--nodered-user=nodered'.
  --confirm-root        install as root without asking confirmation.
  --open_firewall       adding public firewall rule for node-red port 1880.
  --confirm-install     confirm the installation without asking a confirmation.

```

Or by use of the environment variables e.g. to set service user:
```bash
NODERED_USER=nodered bash <(curl -sL https://github.com/node-red/linux-installers/releases/latest/download/update-nodejs-and-nodered-rpm)
```

Environment variables, please note that the program command line options takes precedence:
```bash
NODERED_USER=nodered
OPEN_FIREWALL=y
CONFIRM_ROOT=y
CONFIRM_INSTALL=y
```

you should ensure you have the development tools installed if you are going to install extra nodes.

```
dnf groupinstall "Development Tools"
```

**Note**: This script will optionally add a firewall rule that adds port 1880 to the public zone. On a default install this should allow access to Node-RED from outside of the local machine. The default is not to do this.

### Pi Build

The pibuild directory contains the scripts and files we use to build the pre-install .deb version of Node-RED for the Raspberry Pi. Most users should never need this as the script above is the recommended way to install and upgrade. See the [README](pibuild) in that directory for more information.
