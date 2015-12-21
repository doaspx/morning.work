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
$ pip install --upgrade pip
$ pip install shadowsocks
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
● shadowsocks.service - Shadowsocks23
   Loaded: loaded (/etc/systemd/system/shadowsocks.service; enabled; vendor preset: disabled)
   Active: active (running) since Mon 2015-12-21 23:51:48 CST; 11min ago
 Main PID: 19334 (ssserver)
   CGroup: /system.slice/shadowsocks.service
           └─19334 /usr/bin/python /usr/bin/ssserver -c /etc/shadowsocks.json

Dec 21 23:51:48 morning.work systemd[1]: Started Shadowsocks23.
Dec 21 23:51:48 morning.work systemd[1]: Starting Shadowsocks23...
Dec 21 23:51:48 morning.work ssserver[19334]: INFO: loading config from /etc/shadowsocks.json
Dec 21 23:51:48 morning.work ssserver[19334]: 2015-12-21 23:51:48 INFO     loading libcrypto from libcrypto.so.10
Dec 21 23:51:48 morning.work ssserver[19334]: 2015-12-21 23:51:48 INFO     starting server at 0.0.0.0:23
```

## 扩展阅读

+ [systemd详解](https://blog.linuxeye.com/400.html)
+ [Install pip](https://pip.pypa.io/en/stable/installing/)
+ [How To Create a systemd Service in Linux (CentOS 7)](https://scottlinux.com/2014/12/08/how-to-create-a-systemd-service-in-linux-centos-7/)
+ [Getting Started with systemd](https://coreos.com/docs/launching-containers/launching/getting-started-with-systemd/)