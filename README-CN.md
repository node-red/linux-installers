## For Debian/Raspberry Pi OS:

If you are Chinese user, we suggest you to change your node-js offical mirror to Chinese mirror,
如果您在中国请使用国内镜像源获取更好的下载体验，

run `curl -sL https://deb.nodesource.com/setup_18.x | sudo bash -` ,
示例：`curl -sL https://deb.nodesource.com/setup_18.x | sudo bash -` 从官方安装apt源，

then please edit apt source list`/etc/apt/sources.list.d/nodesource.list`  like this:
编辑镜像源`/etc/apt/sources.list.d/nodesource.list` 修改如下：
```
#deb https://deb.nodesource.com/node_12.x bullseye main
#deb-src https://deb.nodesource.com/node_12.x bullseye main
deb https://mirrors.tuna.tsinghua.edu.cn/nodesource/deb_12.x bullseye main
deb-src https://mirrors.tuna.tsinghua.edu.cn/nodesource/deb_12.x bullseye main
```
if you edit it. Please run`sudo apt-get update`.
更改镜像源后应该刷新缓存，请运行`sudo apt-get update``

also,you can change npm source`npm config set registry https://registry.npm.taobao.org`
同样，建议修改npm安装源为淘宝镜像源`npm config set registry https://registry.npm.taobao.org`

Then run the install script as per the main README.md.

## For CentOS:

If you are Chinese user, we suggest you to change your node-js offical mirror to Chinese mirror,
如果您在中国请使用国内镜像源获取更好的下载体验，

visit `https://mirrors.tuna.tsinghua.edu.cn/nodesource/` and see which version do you need,  you can add its yum source list like this `rpm -ivh https://mirrors.tuna.tsinghua.edu.cn/nodesource/rpm_18.x/el/7/x86_64/nodesource-release-el7-1.noarch.rpm`
请找到适合您的rpm源安装包

then edit yum source list `/etc/yum.repos.d/nodesource-el7.repo` like this:
然后编辑nodesource源如下（请根据实际情况修改）：
```
[nodesource]
name=Node.js Packages for Enterprise Linux 7 - $basearch
baseurl=https://mirrors.tuna.tsinghua.edu.cn/nodesource/rpm_18.x/el/7/$basearch
failovermethod=priority
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/NODESOURCE-GPG-SIGNING-KEY-EL

[nodesource-source]
name=Node.js for Enterprise Linux 7 - $basearch - Source
baseurl=https://mirrors.tuna.tsinghua.edu.cn/nodesource/rpm_18.x/el/7/SRPMS
failovermethod=priority
enabled=0
gpgkey=file:///etc/pki/rpm-gpg/NODESOURCE-GPG-SIGNING-KEY-EL
gpgcheck=1
```
please make cache again by runing `sudo yum makecache`
更改镜像源后请刷新缓存。

also,you can change npm source`npm config set registry https://registry.npm.taobao.org`
同样，建议修改npm安装源为淘宝镜像源`npm config set registry https://registry.npm.taobao.org`

Then run the instal script as per the main README.md.


refer:
1.[Nodesource 镜像使用帮助](https://mirror.tuna.tsinghua.edu.cn/help/nodesource/)
2.[淘宝 NPM 镜像](https://developer.aliyun.com/mirror/NPM?from=tnpm)
3.https://github.com/nodesource/distributions

