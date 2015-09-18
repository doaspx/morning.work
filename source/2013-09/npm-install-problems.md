date:  2013-09-26
title: 《Node.js 入门系列》—— NPM 安装第三方模块常见问题

@[toc](目录)

## 断网的机器，没法直接 npm install xxx 怎么办？

在部署 Node.js 写的应用时，我们都会在应用的根目录下执行 `npm install` 来安装所有
的依赖模块，安装第三方模块也一样，你只要找到这个模块的源码，执行 `npm install`
即可。

假如我们要安装一个叫 `xss` 的模块，因为不能直接用 `npm install xss` 来安装，
首先我们得想办法获取到这个这个模块的源码。

先在浏览器中打开模块的主页： https://npmjs.org/package/xss
（如果不明白这个网址是怎么来的，
请阅读 [《寻找第三方模块》](http://f2e.html-js.com/article/1378)）

这时候我们可以知道 xss 这个模块的源码托管在 github 上，我们可以通过 git 命令
把源码拉下来： `git clone git://github.com/leizongmin/js-xss.git`

为了能让应用访问到这个模块，我们需要把源码放在应用的 `node_modules` 目录里面，
比如这个模块叫 `xss` ，那么它的源码就应该在 `node_modules/xss` 目录里面。

然后进入 `node_modules/xss` 目录，打开这个模块的 `package.json` 文件，看看
`dependencies` 这一项中是否有指定依赖模块，如果有的话，按照相同的方法把其依赖
模块也安装到这个模块的 `node_modules` 目录里。

（如果不明白为什么要放到 `node_modules` 目录，
请阅读 [《Node.js API - Modules》](http://nodejs.org/api/modules.html#modules_loading_from_node_modules_folders)）

### 模块源码没有托管到 github

假如某个模块没有将源码托管到 github 这样的开源平台上，我们照样有办法获取到它的
源码：把 `https://registry.npmjs.org/模块名/-/模块名-版本号.tgz` 这个压缩包下载
下来即可。

比如要下载 `xss` 模块 `0.0.6` 版本的源码，其对应的网址就是
`https://registry.npmjs.org/xss/-/xss-0.0.6.tgz` 。把压缩包下载下来后，先解压，
其里面的 `package` 目录即是这个模块的源码，这时候就可以按照上面说的那样安装了。

### 不需要 C++ 编译的模块还有更简便的安装方法

大多数的第三方模块都是纯 JavaScript 写的，不需要进行 C++ 编译，我们只要在一台
能使用 `npm install xxx` 安装模块的机器上把模块安装好，直接复制到应用的
`node_modules` 目录即可。


## 如何使用私有的模块

### 1、搭建私有 NPM 库

一般一些大的公司，有自己内部的 Node.js 模块库时，会尝试这种搭建私有的 NPM 库，
搭建好之后，直接使用 `npm install xxxx` 来安装模块，但是操作难度较大，有兴趣的
可以参考
[The couchdb setup for registry.npmjs.org and search.npmjs.org](https://github.com/isaacs/npmjs.org)。

### 2、通过一个 js 文件来链接

假如有一个私有模块 `abc` ，其源码放在 `/npm/abc` 目录，我们可以直接在当前应用的
`node_modules` 目录下创建一个文件 `abc.js`，其内容如下：

    module.exports = require('/npm/abc');

然后就可以直接通过 `require('abc')` 来载入这个私有模块了。

当同时在开发几个模块，而这几个模块存在依赖关系时，使用这种方法也能方便调试。


## npm install 时出错

### 域名解析出错

有时候网络不稳定会导致安装不成功，比如显示如下出错信息：

    npm http GET http://registry.npmjs.org/supervisor
    npm ERR! Error: getaddrinfo EADDRINFO
    npm ERR! at errnoException (dns.js:37:11)
    npm ERR! at Object.onanswer [as oncomplete] (dns.js:124:16)
    npm ERR! If you need help, you may report this log at:
    npm ERR! http://github.com/isaacs/npm/issues
    npm ERR! or email it to:
    npm ERR! npm-@googlegroups.com

    npm ERR! System Linux 3.2.0-23-generic-pae
    npm ERR! command "/usr/bin/node" "/usr/bin/npm" "install" "-g" "supervisor"
    npm ERR! cwd /home/lwj
    npm ERR! node -v v0.10.18
    npm ERR! npm -v 1.3.8
    npm ERR! syscall getaddrinfo
    npm ERR! code EADDRINFO
    npm ERR! errno EADDRINFO
    npm ERR!
    npm ERR! Additional logging details can be found in:
    npm ERR! /home/lwj/npm-debug.log
    npm ERR! not ok code 0

从中可以找到 `syscall getaddrinfo` 和 `code EADDRINFO` 这两行，`EADDRINFO` 表示
在尝试解析域名的时候出错了，没法从 `registry.npmjs.org` 上下载模块的源码，
这时候我们只需要重新执行一遍命令即可。如果问题还没有解决，应该检查一下本地机器
域名解析服务是否正常，某些地区 `registry.npmjs.org` 这个域名会被屏蔽。如果实在
无法通过命令直接安装模块，可参考本文开头提到的方法来手动安装。

### 其他问题

还有很多……