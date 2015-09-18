date:  2014-08-28
title: 一种简单的生产环境部署Node.js程序方法

@[toc](目录)

![我的梦想是成为一名画家](../../images/2014-08/girl.jpg)

最近在部署Node.js程序时，写了段简单的脚本，发觉还挺简单的，忍不住想与大家分享。

## 配置文件

首先，本地测试环境和生产环境的数据库连接这些配置信息是不一样的，需要将其分开为两个文件存储
到`config`目录下，比如：

开发环境配置文件`config/development.js`：

```javascript
module.exports = {
  port:  3001,
  mysql: {
    user: 'root'
  }
};
```

生产环境配置文件`config/production.js`:

```javascript
module.exports = {
  port: 80,
  mysql: {
    user: 'myapp',
    password: '2zbonsjzl305vkh3'
  }
};
```

另外还要建立一个程序自动载入相应环境的配置，文件`config/index.js`：

```javascript
var path = require('path');

// 通过NODE_ENV来设置环境变量，如果没有指定则默认为生产环境
var env = process.env.NODE_ENV || 'production';
env = env.toLowerCase();

// 载入配置文件
var file = path.resolve(__dirname, env);
try {
  var config = module.exports = require(file);
  console.log('Load config: [%s] %s', env, file);
} catch (err) {
  console.error('Cannot load config: [%s] %s', env, file);
  throw err;
}
```

假设应用的入口文件是`app.js`，可通过以下方法载入配置：

```javascript
var config = require('./config');

console.log('listen on port %s', config.port);
// 如果是开发环境，将输出 listen on port 3001
// 如果是生产环境，将输出 listen on port 80
```

## 本地开发测试

为了方便，我新建一个脚本文件`run`，代码如下：

```bash
export NODE_ENV=development
node app
```

要启动程序，直接在命令行下执行`./run`即可。

## 部署应用

新建部署脚本文件`deploy`，代码如下：

```bash
git reset --hard
git pull origin HEAD
npm install
pm2 stop myapp -f
pm2 start app.js -n myapp
```

此段代码会自动拉去git仓库中最新的一次提交的代码，并使用npm来安装package.json中列出的模块，
然后先停止之前已启动的应用实例，再启动。

为了方便传输代码到服务器端，需要将程序代码提交到一个私有的git仓库，首次在服务器端部署时，
需要先将代码clone到服务器端，比如：

```bash
git clone git@github.com:leizongmin/node-uc-server.git ~/myapp
```

应用在服务器端运行时使用`pm2`工具来管理进程，所以还需要先在服务器上安装此工具：

```bash
npm install pm2 -g
```

完成以上准备工作后，我们就可以通过`deploy`脚本来实现自动更新代码：

+ 将本地修改提交到远程git仓库
+ 登录服务器，进入`~/myapp`目录
+ 执行`./deploy`

-------------

以上程序执行的环境为Linux，如果开发环境是Windows，需要将`run`文件改为以下代码：

```bash
set NODE_ENV=development
node app
```

## 扩展阅读

+ 《告别node-forever,拥抱PM2》 http://www.oschina.net/translate/goodbye-node-forever-hello-pm2
+ 《Git入门指引》 http://blog.segmentfault.com/pengedy/1190000000514886
