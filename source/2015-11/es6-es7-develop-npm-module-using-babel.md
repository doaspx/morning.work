title: ES2015实战：开发NPM模块
date: 2015-11-20

## 前言

近一年来，JavaScript界关于ES6（ECMAScript 6，本文简称ES6）的讨论越来激烈，作为未来要统一全宇宙的语言（**PHP是世界上最好的语言，但JavaScript终将统一全宇宙**），JavaScript的运行环境众多，对ECMAScript标准的支持程度不一，所以对于ES6我一直处于观望状态。

前不久ES6标准正式发布，而Node.js也在最近刚刚发布了5.1.0版本，对ES6标准的支持也越来越完善，babel（一个将ES6/ES7写的代码转换为ES5代码的编译器）也发布了6.0版本，近期也涌现出了不少好文章（比如小问写的[「给 JavaScript 初心者的 ES2015 实战」](http://gank.io/post/564151c1f1df1210001c9161)），种种迹象表明ES6真的要火了，而我也终于按耐不住了……

这几天正在写一个[方便下载文件的模块](https://github.com/leizongmin/node-lei-download)（可以得到下载进度信息），正好可以使用ES6新语法特性来改写，作为我写下的第一个使用ES6语法的NPM模块。本文内容将分为以下几部分：

+ 配置babel编译环境
+ 编写模块
+ 单元测试
+ 发布模块

本文会简略介绍文中出现的ES2015新语法，具体介绍可阅读阮一峰所著的[「ECMAScript 6 入门」](http://es6.ruanyifeng.com/)或babel官方文档中的[「Learn ES2015」](http://babeljs.io/docs/learn-es2015/)。

babel官方提供了一个在线REPL，可以实时输出转换后的JavaScript代码，并且看到其运行结果，对于初学者尤其有用。访问网址http://babeljs.io/repl ，其界面如下：

![babel online repl](../../images/2015-11/babel_online_repl.jpg)

说明：使用时勾选左边的`Experimental`可使用最新的语法特性


## 软件环境

由于相关软件和模块正处于高速发展期，无法保证你阅读这篇文章的时候还能照着一步一步**准确无误**地运行下去，以下列出所用到的软件和模块的版本：

+ **Node.js** `v5.1.0`
+ **npm** `3.3.12`
+ **babel** `6.2.0 (babel-core 6.2.1)`

## 配置babel编译环境

### 1、安装babel

> Babel is a JavaScript compiler. Use next generation JavaScript, today

目前最新版的Node.js（v5.1.0）还未完全支持ES2015的新语法特性，而且我们编写的模块可能要在Node v0.12.x或更低版本下运行，因此需要借助babel将ES2015标准的JavaScript程序转换成ES5标准的。

执行以下命令安装babel：

```bash
$ npm i -g babel-cli@6.2.0
```

由于babel依赖的模块比较多，可能会花费比较长的时间甚至安装不成功，可以尝试使用cnpmjs的NPM镜像，比如（简单在安装命令末尾添加`--registry=http://registry.npm.taobao.org`）：

```bash
$ npm i -g babel-cli@6.2.0 --registry=http://registry.npm.taobao.org
```

cnpmjs镜像的详细介绍可访问其官网：http://cnpmjs.org/

安装完成后，系统将获得以下两个命令：

+ `babel` 编译器
+ `babel-node` 可以直接运行ES2015程序的Node命令

`babel-cli`的详细用法可以参考其文档：https://babeljs.io/docs/usage/cli/

### 2、初始化项目

执行以下命令初始化项目（执行`npm init`时需要按提示输入相应信息，可直接按回车跳过）：

```bash
$ mkdir es2015_demo && cd es2015_demo && git init && npm init
```

现在我们新建一个文件`test.js`试试是否能正常运行：

```javascript
function sleep(ms = 0) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, ms);
  });
}

async function test() {
  for (let i = 0; i < 10; i++) {
    await sleep(500);
    console.log(`i=${i}`);
  }
}

test().then(() => console.log('done'));
```

执行以下命令运行`test.js`：

```bash
$ babel-node test.js
```

在我本机的环境下显示以下错误信息：

```
/usr/local/lib/node_modules/babel-cli/node_modules/babel-core/lib/transformation/file/index.js:540
      throw err;
      ^

SyntaxError: /Users/glen/work/tmp/es2015_demo/test.js: Unexpected token (7:6)
   5 | }
   6 |
>  7 | async function test() {
     |       ^
   8 |   for (let i = 0; i < 10; i++) {
   9 |     await sleep(500);
  10 |     console.log(`i=${i}`);

...
```

由提示信息可判断出，应该是不支持`async function`导致的，因为这是ES7标准中定义的新语法，需要配置相应的babel插件才能支持它。本文为了方面使用最新的JavaScript语法，暂时不考虑babel的编译性能，直接开启所有可能用到的插件，具体可以自行研究babel的官方文档。

新建文件`.babelrc`：

```json
{
  "presets": ["es2015", "stage-0"]
}
```

`.babelrc`为babel的配置文件，保存在项目的根目录下，其中`presets`用于设置开启的语法特性集合，详细介绍可参考官方文档：https://babeljs.io/docs/usage/babelrc/ 和 http://babeljs.io/docs/plugins/#presets

由于当前版本的babel没有预置`stage-0`，所以我们还需要执行以下命令安装并保存到`package.json`的`devDependencies`中：

```bash
$ npm i babel-preset-stage-0 --save-dev
```

现在再重新执行`test.js`，可看到控制台每隔500ms打印出一行，直到输出`done`时结束：

```bash
$ babel-node test.js

i=0
i=1
i=2
i=3
i=4
i=5
i=6
i=7
i=8
i=9
done
```

### 3、编译程序

在发布项目时，要求可以在不依赖babel编译器的环境下运行，因此我们需要将ES2015的程序编译成ES5的：

```bash
$ babel test.js --out-file test.compiled.js
```

执行上面的命令后，生成了编译后的文件`test.compiled.js`，我们尝试执行它看看：

```bash
$ node test.compiled.js
```

在我的系统环境下提示以下出错信息：

```
/Users/glen/work/tmp/es2015_demo/test.compiled.js:4
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
                              ^

ReferenceError: regeneratorRuntime is not defined
    at /Users/glen/work/tmp/es2015_demo/test.compiled.js:4:31

...
```

经阅读官方文档可知，编译后的JavaScript程序有时候需要依赖一些运行时`polyfill`，通过安装`babel-polyfill`模块来获得：

```bash
$ npm i babel-polyfill --save-dev
```

然后，我们需要修改编译后的文件`test.compiled.js`，在其首行加上以下代码来载入`babel-polyfill`：

```javascript
require('babel-polyfill');
```

再次执行`test.compiled.js`便可看到与`$ babel-node test.js`一样的结果。

`polyfill`的详细介绍可参考官方文档：http://babeljs.io/docs/usage/polyfill/

至此，我们已经配置了一个能使用ES2015语法的Node.js运行环境了。


## 编写模块

### 1、功能描述

本文以[lei-download](https://github.com/leizongmin/node-lei-download)模块为例，该模块是一个主要功能是根据一个URL来下载文件到本地，或者本地直接文件的复制，同时提供下载/复制进度信息。其使用方法如下：

```javascript
let download = require('lei-download');

download('http://avatars.githubusercontent.com/u/841625', 'avatar.jpg', (size, total) => {
  console.log(`已下载${size}，总共${total}`);
}, (err, filename) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`已保存到${filename}`);
  }
});
```

`download()`函数支持以下参数组合：

+ `download(source, callback);`
+ `download(source, progress, callback);`
+ `download(source, target, callback);`
+ `download(source, target, progress, callback);`

参数说明如下：

+ `source` 源文件，可以为本地文件或URL（http://或https://开头）
+ `target` 目标文件，可省略，默认生成一个在本地临时目录的随机文件名
+ `progress` 下载进度，可省略
+ `callback` 回调函数

在编写模块时，我们首先要实现以下两个函数的功能：

+ `downloadFile(source, target, progress, callback)` 从一个URL下载文件并保存到本地
+ `copyFile(source, target, progress, callback)` 复制一个本地文件

然后在编写一个`download()`函数来判断`source`参数，并选择使用`downloadFile()`或者`copyFile()`来完成请求。

### 2、编写程序

在本项目中，所有的ES2015源程序均保存在`src`目录下，发布项目时会执行相应的命令将其编译并输出到`lib`目录，具体方法在**「发布模块」**小节中介绍。

实现`copyFile()`函数，新建文件`src/copy.js`：

```javascript
import fs from 'fs';

export default function copyFile(source, target, progress, callback) {
  fs.stat(source, (err, stats) => {
    if (err) return callback(err);

    let ss = fs.createReadStream(source);
    let ts = fs.createWriteStream(target);
    ss.on('error', callback);
    ts.on('error', callback);

    let copySize = 0;
    ss.on('data', data => {
      copySize += data.length;
      progress && progress(copySize, stats.size);
    });

    ss.on('end', () => callback(null, target));

    ss.pipe(ts);
  });
}
```

说明：

+ `import fs from 'fs'`为ES2015模块系统加载模块的方式，可理解为`var fs = require('fs')`，具体在下文「模块系统」一节中介绍。
+ 通过`fs.createReadStream(source)`和`fs.createWriteStream(target)`来创建读取文件流和写入文件流，并监听读取文件流的`data`事件获得当前进度信息。
+ `export default function copyFile() {}`将函数`copyFile()`作为模块输出，相当于`module.exports = function copyFile() {}`，具体在下文「模块系统」一节中介绍。

为了测试该代码能否正常工作，可在文件末尾增加以下测试程序（在编写单元测试时将删除）：

```javascript
copyFile(__filename, '/tmp/copy.js', (size, total) => {
  console.log(`进度${size}/${total}`);
}, (err, filename) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`已保存到${filename}`);
  }
});
```

以上程序的作用是将当前JavaScript文件复制到`/tmp/copy.js`，使用`babel-node`执行该文件将得到以下结果：

```bash
$ babel-node src/copy.js

进度749/749
已保存到/tmp/copy.js
```

实现`downloadFile()`函数，新建文件`src/download.js`：

```javascript
import fs from 'fs';
import request from 'request';

export default function downloadFile(url, target, progress, callback) {
  let s = fs.createWriteStream(target);
  s.on('error', callback);

  let totalSize = 0;
  let downloadSize = 0;
  let req = request
    .get({
      url: url,
      encoding: null
    })
    .on('response', res => {
      if (res.statusCode !== 200) {
        return callback(new Error('status #' + res.statusCode));
      }
      totalSize = res.headers['content-length'] || null;

      res.on('data', data => {
        downloadSize += data.length;
        progress && progress(downloadSize, totalSize);
      });
      res.on('end', () => callback(null, target));
    })
    .pipe(s);
}
```

说明：

+ 程序使用`request`模块来下载URL的内容，使用时执行命令`$ npm i request --save`安装该模块。
+ 通过`request`模块的`pipe()`方法将收到的数据写入到`fs.createWriteStream(target)`创建的写入文件流中，`request`模块的详细使用方法可参考其文档：https://www.npmjs.com/package/request

为了测试该代码能否正常工作，可在文件末尾增加以下测试程序（在编写单元测试时将删除）：

```javascript
downloadFile('http://avatars.githubusercontent.com/u/841625', '/tmp/avatar.jpg', (size, total) => {
  console.log(`进度${size}/${total}`);
}, (err, filename) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`已保存到${filename}`);
  }
});
```

以上程序的作用是将URL为`http://avatars.githubusercontent.com/u/841625`的文件复制到`/tmp/avatar.jpg`，使用`babel-node`执行该文件将得到以下结果：

```bash
$ babel-node src/download.js

进度15622/34956
进度32006/34956
进度34956/34956
已保存到/tmp/avatar.jpg
```

实现`download()`函数，新建文件`src/download.js`：

```javascript
import os from 'os';
import path from 'path';
import mkdirp from 'mkdirp';
import copyFile from './copy';
import downloadFile from './download';

export default function download(...args) {
  var source, target, progress, callback;
  if (args.length < 2) {
    throw new TypeError('invalid argument number');
  }
  source = args[0];
  callback = args[args.length - 1];
  if (args.length === 2) {
    callback = args[1];
  } else if (args.length === 3) {
    if (typeof args[1] === 'function') {
      progress = args[1];
    } else {
      target = args[1];
    }
  } else {
    target = args[1];
    progress = args[2];
  }
  progress = progress || null;
  target = target || randomFilename(download.tmpDir);

  mkdirp(path.dirname(target), err => {
    if (err) return callback(err);

    if (isURL(source)) {
      downloadFile(source, target, progress, callback);
    } else {
      copyFile(source, target, progress, callback);
    }
  });
}

let getTmpDir = os.tmpdir || os.tmpDir;

function randomString(size = 6, chars = 'abcdefghijklmnopqrstuvwxyz0123456789') {
  let max = chars.length + 1;
  let str = '';
  while (size > 0) {
    str += chars.charAt(Math.floor(Math.random() * max));
    size--;
  }
  return str;
}

function randomFilename(tmpDir = getTmpDir()) {
  return path.resolve(tmpDir, randomString(20));
}

function isURL (url) {
  if (url.substr(0, 7) === 'http://') return true;
  if (url.substr(0, 8) === 'https://') return true;
  return false;
}
```

说明：

+ `import copyFile from './copy'`用于载入模块，相当于`var copyFile = require('./copy')`。
+ `download(...args)`函数中的`...args`相当于`var args = Array.prototype.call(arguments);`。
+ 程序使用`mkdirp`模块来创建目标文件的上级目录，使用时执行命令`$ npm i mkdirp --save`安装该模块。
+ `getTmpDir()`函数用于取得当前系统的临时目录，通过`os.tmpDir()`获得。
+ `randomString(size)`函数用于生成指定长度的随机字符串。
+ `randomFilename(tmpDir)`用于生成临时文件名，默认存储在系统临时目录下，可通过`tmpDir`参数指定。
+ `isURL(url)`函数用于判断参数是否为一个URL。

为了验证程序是否正确，我们可以将上文的`src/copy.js`和`src/download.js`中的测试程序放到`src/index.js`文件的末尾并执行（需要将旧的程序程序删除），比如：

```javascript
download(__filename, '/tmp/copy.js', (size, total) => {
  console.log(`进度${size}/${total}`);
}, (err, filename) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`已保存到${filename}`);
  }
});
```

正常情况下，其执行结果应该跟上文中的结果是一致的。

### 3、模块系统

Node.js使用的是CommonJS模块系统，模块的输出我们一般通过给`exports`对象设置属性来做：

```javascript
// 输出变量或函数
exports.x = 123;
exports.y = function () { console.log('hello'); };
```

可以通过以下方式来操作：

```javascript
var mod = require('./my_module');

console.log(mod.x);
mod.y();
```

也可以通过覆盖`module.exports`来输出一个函数或者其他数据类型：

```javascript
module.exports = function () {
  console.log('这是一个函数');
};
```

通过以下方式来操作：

```javascript
var fn = require('./my_module');

fn();
```

而在ES2015中，模块通过`export`语句来输出：

```javascript
// 普通输出，相当于 exports.x = y;
export const a = 123;
export var b = 456;
export function c() { }
export class d { }

// 默认输出，相当于 module.exports = z;
export default function y() { }
```

通过`import`语句来引入模块，不同的引入方式其含义是不一样的，比如：

```javascript
// 操作 export var x = y 方式的输出
import {a, b, c, d} from './my_module';
// 通过相应的变量名称 a, b, c, d 来操作

// 或者将所有输出指向一个对象
import * as mod from './my_module';
// 通过 mod.a, mod.b, mod.c, mod.d 来操作

// 操作 export default x 方式的输出
import y from './my_module';
```

对于非ES2015程序输出的模块，`import * as mod`和`import mod`其结果是一样的，比如：

```
import * as fs1 from 'fs';
import fs2 from 'fs';

// fs1.readFile() 和 fs2.readFile() 是一样的
```

为了更容易理解ES2015的模块系统原理，我们可以通过阅读编译后的JavaScript程序来了解。可通过访问[babel的在线REPL](http://babeljs.io/repl/)或将程序保存到本地，并执行`babel file.js`来查看编译后的程序。

以下ES2015程序：

```javascript
export const a = 123;
export var b = 456;
export function c() { }
export class d { }

export default function y() { }
```

编译后结果如下：

```javascript
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.c = c;
exports["default"] = y;

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var a = 123;
exports.a = a;
var b = 456;
exports.b = b;

function c() {}

var d = function d() {
  _classCallCheck(this, d);
};

exports.d = d;

function y() {}
```


模块系统详细说明可参考：阮一峰所著的[「ECMAScript 6 入门」](http://es6.ruanyifeng.com/)中[Module](http://es6.ruanyifeng.com/#docs/module)一章。


## 单元测试


## 发布模块


## 扩展阅读

+ [给 JavaScript 初心者的 ES2015 实战](http://gank.io/post/564151c1f1df1210001c9161)
+ [ECMAScript 6 入门](http://es6.ruanyifeng.com/)
+ [「大概可能也许是」目前最好的 JavaScript 异步方案 async/await](https://blog.leancloud.cn/3910/)
+ [Learn ES2015 - A detailed overview of ECMAScript 6 features](http://babeljs.io/docs/learn-es2015/)
+ [Using ES6 with npm today](http://mammal.io/articles/using-es6-today/)
+ [Using ES6 and ES7 in the Browser, with Babel 6 and Webpack](http://jamesknelson.com/using-es6-in-the-browser-with-babel-6-and-webpack/)
+ [Writing NPM packages with ES6 using the Babel 6 CLI](http://jamesknelson.com/writing-npm-packages-with-es6-using-the-babel-6-cli/)
+ [Set up Sublime Text for Meteor ES6 (ES2015) and JSX Syntax and Linting](http://info.meteor.com/blog/set-up-sublime-text-for-meteor-es6-es2015-and-jsx-syntax-and-linting)
+ [Exploring ES6 - Modules](http://exploringjs.com/es6/ch_modules.html)

