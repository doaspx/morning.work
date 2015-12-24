```
title: 在CentOS 7下安装配置shadowsocks
date: 2015-12-22
author: 老雷
```

CentOS 7 开始默认使用[Systemd](https://en.wikipedia.org/wiki/Systemd)作为开启启动脚本的管理工具，[Shadowsocks](https://github.com/shadowsocks/)则是当前比较受欢迎的科学上网工具，本文将介绍如何在CentOS下安装和配置Shadowsocks服务。

## 安装pip

[pip](https://pip.pypa.io/en/stable/installing/)是python的包管理工具。在本文中将使用python版本的shadowsocks，此版本的shadowsocks已发布到pip上，因此我们需要通过pip命令来安装。

在控制台执行以下命令安装pip：

```bash
$ yum update -y
$ yum install python-pip -y
```

## 安装配置shadowsocks

在控制台执行以下命令安装shadowsocks：

```bash
$ curl "https://bootstrap.pypa.io/get-pip.py" -o "get-pip.py"
$ python get-pip.py
```

安装完成后，需要创建配置文件`/etc/shadowsocks.json`，内容如下：

```json
{
  "server": "0.0.0.0",
  "server_port": 8338,
  "password": "uzon57jd0v869t7w",
  "method": "aes-256-cfb"
}
```

说明：

+ `method`为加密方法，可选`aes-128-cfb, aes-192-cfb, aes-256-cfb, bf-cfb, cast5-cfb, des-cfb, rc4-md5, chacha20, salsa20, rc4, table`
+ `server_port`为服务监听端口
+ `password`为密码，可使用[密码生成工具](http://ucdok.com/project/generate_password.html)生成一个随机密码

以上三项信息在配置shadowsocks客户端时需要配置一致，具体说明可查看shadowsocks的帮助文档。

## 配置自启动

新建启动脚本文件`/etc/systemd/system/shadowsocks.service`，内容如下：

```
[Unit]
Description=Shadowsocks

[Service]
TimeoutStartSec=0
ExecStart=/usr/bin/ssserver -c /etc/shadowsocks.json

[Install]
WantedBy=multi-user.target
```

执行以下命令启动shadowsocks服务：

```bash
$ systemctl enable shadowsocks
$ systemctl start shadowsocks
```

为了检查shadowsocks服务是否已成功启动，可以执行以下命令查看服务的状态：

```bash
$ systemctl status shadowsocks -l
```

如果服务启动成功，则控制台显示的信息可能类似这样：

```
● shadowsocks.service - Shadowsocks
   Loaded: loaded (/etc/systemd/system/shadowsocks.service; enabled; vendor preset: disabled)
   Active: active (running) since Mon 2015-12-21 23:51:48 CST; 11min ago
 Main PID: 19334 (ssserver)
   CGroup: /system.slice/shadowsocks.service
           └─19334 /usr/bin/python /usr/bin/ssserver -c /etc/shadowsocks.json

Dec 21 23:51:48 morning.work systemd[1]: Started Shadowsocks.
Dec 21 23:51:48 morning.work systemd[1]: Starting Shadowsocks...
Dec 21 23:51:48 morning.work ssserver[19334]: INFO: loading config from /etc/shadowsocks.json
Dec 21 23:51:48 morning.work ssserver[19334]: 2015-12-21 23:51:48 INFO     loading libcrypto from libcrypto.so.10
Dec 21 23:51:48 morning.work ssserver[19334]: 2015-12-21 23:51:48 INFO     starting server at 0.0.0.0:8338
```

## 一键安装脚本

新建文件`install-shadowsocks.sh`，内容如下：

```bash
#!/bin/bash
# Install Shadowsocks on CentOS 7

echo "Installing Shadowsocks..."

random-string()
{
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w ${1:-32} | head -n 1
}

CONFIG_FILE=/etc/shadowsocks.json
SERVICE_FILE=/etc/systemd/system/shadowsocks.service
SS_PASSWORD=$(random-string 32)
SS_PORT=8338
SS_METHOD=aes-256-cfb
SS_IP=`ip route get 1 | awk '{print $NF;exit}'`
GET_PIP_FILE=/tmp/get-pip.py

# install pip
curl "https://bootstrap.pypa.io/get-pip.py" -o "${GET_PIP_FILE}"
python ${GET_PIP_FILE}

# install shadowsocks
pip install --upgrade pip
pip install shadowsocks

# create shadowsocls config
cat <<EOF | sudo tee ${CONFIG_FILE}
{
  "server": "0.0.0.0",
  "server_port": ${SS_PORT},
  "password": "${SS_PASSWORD}",
  "method": "${SS_METHOD}"
}
EOF

# create service
cat <<EOF | sudo tee ${SERVICE_FILE}
[Unit]
Description=Shadowsocks

[Service]
TimeoutStartSec=0
ExecStart=/usr/bin/ssserver -c ${CONFIG_FILE}

[Install]
WantedBy=multi-user.target
EOF

# start service
systemctl enable shadowsocks
systemctl start shadowsocks

# view service status
sleep 5
systemctl status shadowsocks -l

echo "================================"
echo ""
echo "Congratulations! Shadowsocks has been installed on your system."
echo "You shadowsocks connection info:"
echo "--------------------------------"
echo "server:      ${SS_IP}"
echo "server_port: ${SS_PORT}"
echo "password:    ${SS_PASSWORD}"
echo "method:      ${SS_METHOD}"
echo "--------------------------------"
```

执行以下命令一键安装：

```bash
$ chmod +x install-shadowsocks.sh
$ ./install-shadowsocks.sh
```

也可以直接执行以下命令从GitHub下载安装脚本并执行：

```bash
$ bash <(curl -s https://raw.githubusercontent.com/leizongmin/morning.work/gh-pages/examples/2015-12/install-shadowsocks.sh)
```

安装完成后会自动打印出Shadowsocks的连接配置信息。比如：

```
Congratulations! Shadowsocks has been installed on your system.
You shadowsocks connection info:
--------------------------------
server = 10.0.2.15
server_port = 8338
password = RaskAAcW0IQrVcA7n0QLCEphhng7K4Yc
method = aes-256-cfb
--------------------------------
```

## 扩展阅读

+ [systemd详解](https://blog.linuxeye.com/400.html)
+ [Install pip](https://pip.pypa.io/en/stable/installing/)
+ [How to Install Pip on CentOS 7](http://www.liquidweb.com/kb/how-to-install-pip-on-centos-7/)
+ [How To Create a systemd Service in Linux (CentOS 7)](https://scottlinux.com/2014/12/08/how-to-create-a-systemd-service-in-linux-centos-7/)
+ [Getting Started with systemd](https://coreos.com/docs/launching-containers/launching/getting-started-with-systemd/)
+ [How to I get the primary IP address of the local machine on Linux and OS X?](http://stackoverflow.com/questions/13322485/how-to-i-get-the-primary-ip-address-of-the-local-machine-on-linux-and-os-x)
+ [Execute bash script from URL](http://stackoverflow.com/questions/5735666/execute-bash-script-from-url)
