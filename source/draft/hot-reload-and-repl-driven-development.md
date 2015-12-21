```
title: 谈谈Node.js中的代码热更新与REPL驱动开发
date: 2015-12-08
author: 老雷
draft
```

## 前言

在使用Node.js开发Web程序时，源于对JSP和PHP的印象，我们总希望Node.js也能像后者一样**「更新代码后一刷新页面就能看到效果」**，因此便有了诸如[supervisor](https://www.npmjs.com/package/supervisor)这样的工具，它能监听指定目录或者文件的变化，如果文件有更新就自动重启Node.js进程，以此来代替反复手动重启Node.js进程从而**「提高开发效率」**。


前不久写了一篇文章[「Node.js定制REPL的妙用」](http://morning.work/page/2015-10/node_repl_module.html)，文章简单介绍了如何利用Node.js的REPL来辅助开发，最近又受[「REPL Drive Development」](http://tao.logdown.com/posts/166154-repl-drive-development)一文的启发，感觉除了不断重启Node.js进程这种**简单粗暴**的方法之外，还可以更优雅地使用REPL来提高开发效率。

关于代码热更新问题，我们可以简单通过`fs.watch()`监听文件的变化，通过`require.cache`来清除已载入的Node.js模块，但目前并没有一个成熟的通用方案。因此，本文仅以Express.js框架为例，并且编写程序时必须遵循一定的规则，下文将详细介绍。


## 开发环境

+ `node v4.2.3`
+ `express@4.13.3`


## 关于REPL驱动开发

「REPL驱动开发（REPL Drive Development）」是迈阿密举行的RubyConf大会上由[ConradIrwin](http://cirw.in/)提出的，并发布了一个名为[Pry](https://github.com/pry/pry)的工具。但对于**「REPL驱动开发」**这一概念并没有一个


## 一个简单的Express项目

首先执行以下命令初始化项目：

```bash
$ mkdir demo && cd demo && git init && npm init
```

新建文件`app.js`：

```javascript
'use strict';

const express = require('express');

let app = express();
app.get('/', (req, res, next) => {
  res.send(`现在是北京时间${new Date}`);
});

app.listen(3000, err => {
  console.log('已启动');
});
```

安装`express`模块并启动程序：

```bash
$ npm i express --save
$ node app
```



## 扩展阅读

+ [Node.js定制REPL的妙用](http://morning.work/page/2015-10/node_repl_module.html)
+ [Node.js Web应用代码热更新的另类思路](http://fex.baidu.com/blog/2015/05/nodejs-hot-swapping/)
+ [NodeJS”热部署“代码，实现动态调试](http://www.cnblogs.com/CodeGuy/archive/2013/04/27/3043040.html)
+ [REPL Drive Development](http://tao.logdown.com/posts/166154-repl-drive-development)
+ 
