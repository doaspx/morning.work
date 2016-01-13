```
title: 利用阿里云OSS搭建私有Docker仓库
date: 2016-01-14
author: 老雷
```

## 前言

最近开始研究Docker的应用，于是打算 **搭建一个私有的Docker仓库，并使用阿里云的OSS作为存储引擎** 。从网上搜索到的资料大都是比较旧的，新版本的Registry服务与旧版本的差别比较大，瞎折腾了一天，踩坑无数。突然有感， **网上的过时资料（或者说得不清不楚的）真是坑死人不偿命** ，还是得把这两天摸索出来的门道记录下来，一是好让自己过一段时间后再部署Docker仓库时不用重踩一次坑，二来也顺便给后来者提个醒。


## 系统环境

### 客户端`docker`版本：

```
docker version
Client:
 Version:      1.9.1
 API version:  1.21
 Go version:   go1.4.3
 Git commit:   a34a1d5
 Built:        Fri Nov 20 17:56:04 UTC 2015
 OS/Arch:      darwin/amd64

Server:
 Version:      1.9.1
 API version:  1.21
 Go version:   go1.4.3
 Git commit:   a34a1d5
 Built:        Fri Nov 20 17:56:04 UTC 2015
 OS/Arch:      linux/amd64
```

### 服务器端`docker`版本：

```
Boot2Docker version 1.9.1, build master : cef800b - Fri Nov 20 19:33:59 UTC 2015
Docker version 1.9.1, build a34a1d5
```

### 客户端`docker-compose`版本：

```
docker-compose version 1.5.2, build 7240ff3
docker-py version: 1.5.0
CPython version: 2.7.9
OpenSSL version: OpenSSL 1.0.1j 15 Oct 2014
```

如果系统没有`docker-compose`命令，可以执行以下命令安装：

```bash
$ curl -L https://github.com/docker/compose/releases/download/1.5.2/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose
$ chmod +x /usr/local/bin/docker-compose
```


## 启动Registry服务

### 安装

为了发挥Docker容器技术的优势，我们直接使用Docker镜像来部署服务。

首先在 **服务器端** 新建工作目录并进入该目录：

```bash
$ mkdir my_registry && cd my_registry
```

在当前目录下新建文件`docker-compose.yml`：

```
registry:
  restart: always
  image: "registry:2"
  ports:
    - 127.0.0.1:5000:5000
  volumes:
    - ./auth:/auth
    - ./data:/var/lib/registry
  environment:
    - REGISTRY_AUTH=htpasswd
    - REGISTRY_AUTH_HTPASSWD_REALM=Registry Realm
    - REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd
```

在启动Registry服务时，需要用到以下两个目录：

+ `auth`目录用于存放`docker login`时的账号和密码
+ `data`目录用于存放`docker push`时上传上来的文件

执行以下命令新建这两个目录：

```bash
$ mkdir auth && mkdir data
```

接着，创建一个测试账号（用户名：`test`，密码：`123456`）并保存到`auth/htpasswd`中：

```bash
$ htpasswd -Bbn test 123456 > auth/htpasswd
```

现在我们来启动Registry服务：

```bash
$ docker-compose up -d
```

由于本地没有名为`registry:2`的镜像，控制台可能会打印出如下信息然后暂停一阵：

```
Pulling registry (registry:2)...
```

稍等一两分钟，可以看到控制台打印出如下信息则说明已经启动成功了：

```
Creating dockertest_registry_1
Attaching to dockertest_registry_1
registry_1 | time="2016-01-13T21:57:14Z" level=warning msg="No HTTP secret provided - generated random secret. This may cause problems with uploads if multiple registries are behind a load-balancer. To provide a shared secret, fill in http.secret in the configuration file or set the REGISTRY_HTTP_SECRET environment variable." go.version=go1.5.2 instance.id=25aa4d1d-0510-4cb6-9006-1083bff5fc15 version=v2.2.1
registry_1 | time="2016-01-13T21:57:14Z" level=info msg="redis not configured" go.version=go1.5.2 instance.id=25aa4d1d-0510-4cb6-9006-1083bff5fc15 version=v2.2.1
registry_1 | time="2016-01-13T21:57:14Z" level=info msg="using inmemory blob descriptor cache" go.version=go1.5.2 instance.id=25aa4d1d-0510-4cb6-9006-1083bff5fc15 version=v2.2.1
registry_1 | time="2016-01-13T21:57:14Z" level=info msg="Starting upload purge in 11m0s" go.version=go1.5.2 instance.id=25aa4d1d-0510-4cb6-9006-1083bff5fc15 version=v2.2.1
registry_1 | time="2016-01-13T21:57:14Z" level=info msg="listening on [::]:5000" go.version=go1.5.2 instance.id=25aa4d1d-0510-4cb6-9006-1083bff5fc15 version=v2.2.1
```

### 测试

现在再打开一个命令行窗口，并进入`my_registry`目录。

执行以下命令创建一个新镜像：

```bash
$ docker tag registry:2 127.0.0.1:5000/test/registry
```

说明：镜像名为`127.0.0.1:5000/test/registry`，其中`127.0.0.1:5000`表示服务器地址，`test/registry`表示镜像名。

上传之前要先登录：

```bash
$ docker login 127.0.0.1:5000
```

说明：按提示输入上文创建的用户名和密码，邮箱可以不用填写。

登陆成功后，执行以下命令即可上传：

```bash
$ docker push 127.0.0.1:5000/test/registry
```


## 配置阿里云OSS

首先在刚才执行`docker-compose up`的命令行窗口中按`CTRL + C`退出服务。

将文件`docker-compose.yml`改为以下内容：

```
registry:
  restart: always
  image: "registry:2"
  ports:
    - 127.0.0.1:5000:5000
  volumes:
    - ./auth:/auth
  environment:
    - REGISTRY_AUTH=htpasswd
    - REGISTRY_AUTH_HTPASSWD_REALM=Registry Realm
    - REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd
    - REGISTRY_STORAGE=oss
    - REGISTRY_STORAGE_OSS_ACCESSKEYID=you_oss_accesskey_id
    - REGISTRY_STORAGE_OSS_ACCESSKEYSECRET=you_oss_accesskey_secret
    - REGISTRY_STORAGE_OSS_REGION=you_oss_region
    - REGISTRY_STORAGE_OSS_BUCKET=you_oss_bucket
    - REGISTRY_STORAGE_OSS_ENDPOINT=you_oss_bucket.you_oss_region.aliyuncs.com
```

说明：由于使用阿里云OSS作为存储引擎，所以不需要再将文件存储到本地，因此将`volumes`中的`data`目录配置去掉；`environment`新增了`REGISTRY_STORAGE`系列的环境变量配置，需要将该部分的值替换为对应的`accesskey_id`、`accesskey_secret`、`region`、`bucket`和`endpoint`等信息。

删除`data`目录并重新启动服务：

```bash
$ rm -Rf data && docker-compose up
```

再执行刚才的命令上传镜像：

```bash
$ docker push 127.0.0.1:5000/test/registry
```

可以感觉到这次的上传速度没有第一次的快，因为它还需要上传到阿里云OSS。待上传完毕，可以打开阿里云OSS的控制台界面检查文件是否被正确上传上去了。


## 配置SSL证书

如果我们要在客户端（不是在服务器端测试）`pull`或`push`镜像时，`docker`使用的是`https`协议，因此会报`unable to ping registry endpoint`错误：

```
The push refers to a repository [registry.example.com:5000/test] (len: 1)
unable to ping registry endpoint https://registry.example.com:5000/v0/
v2 ping attempt failed with error: Get https://registry.example.com:5000/v2/: dial tcp registry.example.com:5000: i/o timeout
 v1 ping attempt failed with error: Get https://registry.example.com:5000/v1/_ping: dial tcp 199.99.99.9:9000: i/o timeout
```

所以必须要配置SSL证书。

### 安装

首先需要准备证书文件，分别保存到`auth/domain.crt`和`auth/domain.key`中。

新建Nginx的配置文件`auth/nginx.conf`：

```
upstream docker-registry {
  server registry:5000;
}

## Set a variable to help us decide if we need to add the
## 'Docker-Distribution-Api-Version' header.
## The registry always sets this header.
## In the case of nginx performing auth, the header will be unset
## since nginx is auth-ing before proxying.
map $upstream_http_docker_distribution_api_version $docker_distribution_api_version {
  'registry/2.0' '';
  default registry/2.0;
}

server {
  listen 443 ssl;
  server_name myregistrydomain.com;

  # SSL
  ssl_certificate /etc/nginx/conf.d/domain.crt;
  ssl_certificate_key /etc/nginx/conf.d/domain.key;

  # Recommendations from https://raymii.org/s/tutorials/Strong_SSL_Security_On_nginx.html
  ssl_protocols TLSv1.1 TLSv1.2;
  ssl_ciphers 'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';
  ssl_prefer_server_ciphers on;
  ssl_session_cache shared:SSL:10m;

  # disable any limits to avoid HTTP 413 for large image uploads
  client_max_body_size 0;

  # required to avoid HTTP 411: see Issue #1486 (https://github.com/docker/docker/issues/1486)
  chunked_transfer_encoding on;

  location /v2/ {
    # Do not allow connections from docker 1.5 and earlier
    # docker pre-1.6.0 did not properly set the user agent on ping, catch "Go *" user agents
    if ($http_user_agent ~ "^(docker\/1\.(3|4|5(?!\.[0-9]-dev))|Go ).*\$" ) {
      return 404;
    }

    # To add basic authentication to v2 use auth_basic setting.
    auth_basic "Registry realm";
    auth_basic_user_file /etc/nginx/conf.d/nginx.htpasswd;

    ## If $docker_distribution_api_version is empty, the header will not be added.
    ## See the map directive above where this variable is defined.
    add_header 'Docker-Distribution-Api-Version' $docker_distribution_api_version always;

    proxy_pass                          http://docker-registry;
    proxy_set_header  Host              \$http_host;   # required for docker client's sake
    proxy_set_header  X-Real-IP         \$remote_addr; # pass on real client's IP
    proxy_set_header  X-Forwarded-For   \$proxy_add_x_forwarded_for;
    proxy_set_header  X-Forwarded-Proto \$scheme;
    proxy_read_timeout                  900;
  }
}
```

将文件`docker-compose.yml`改为如下内容：

```
nginx:
  image: "nginx:1.9"
  ports:
    - 443:443
  links:
    - registry:registry
  volumes:
    - ./auth/:/etc/nginx/conf.d

registry:
  restart: always
  image: "registry:2"
  ports:
    - 127.0.0.1:5000:5000
  environment:
    - REGISTRY_STORAGE=oss
    - REGISTRY_STORAGE_OSS_ACCESSKEYID=you_oss_accesskey_id
    - REGISTRY_STORAGE_OSS_ACCESSKEYSECRET=you_oss_accesskey_secret
    - REGISTRY_STORAGE_OSS_REGION=you_oss_region
    - REGISTRY_STORAGE_OSS_BUCKET=you_oss_bucket
    - REGISTRY_STORAGE_OSS_ENDPOINT=you_oss_bucket.you_oss_region.aliyuncs.com
```

说明：删除`registry`项目的`environment`中`REGISTRY_AUTH`开头的变量以及`volumes`项，因为`auth`认证已经在Nginx中配置了。

执行以下命令启动服务：

```
$ docker-compose up
```

说明：如果本地不存在名为`nginx:1.9`的镜像，控制台可能会打印出`Pulling nginx (nginx:1.9)...`并先下载该镜像。

### 测试

假设刚才配置的证书域名为`docker.registry.ucdok.com`，现在我们 **在客户端执行以下命令** 登录：

```bash
$ docker login docker.registry.ucdok.com
```

生成新的镜像：

```bash
$ docker pull ubuntu
$ docker tag ubuntu docker.registry.ucdok.com/test/ubuntu
```

上传新的镜像：

```bash
$ docker push docker.registry.ucdok.com/test/ubuntu
```


## 其他问题

### 增加用户

可以执行`htpasswd`命令来创建，并将其保存到`auth/htpasswd`文件中：

```
$ htpasswd -Bbn username password >> auth/htpasswd
```

### 在后台启动服务

启动服务时增加`-d`参数：

```bash
$ docker-compose up -d
```

### 停止后台服务

在`docker-compose.yml`文件所在目录执行以下命令：

```
$ docker-compose stop
```


## 相关链接

+ [Containerized docker registry](https://hub.docker.com/_/registry/)
+ [docker-compose releases](https://github.com/docker/compose/releases)
+ [Deploying a registry server](https://docs.docker.com/registry/deploying/)
+ [Authenticating proxy with nginx](https://docs.docker.com/registry/nginx/#gotchas)
+ [Compose file reference](https://docs.docker.com/compose/compose-file/)
+ [Let's Encrypt，免费好用的 HTTPS 证书](https://imququ.com/post/letsencrypt-certificate.html)
+ [沃通免费SSL证书申请](https://buy.wosign.com/free/)

