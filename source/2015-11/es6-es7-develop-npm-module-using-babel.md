title: ES2015实战：开发NPM模块
date: 2015-11-20

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

### 安装babel

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

### 初始化项目

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
    at Parser.pp.raise (/usr/local/lib/node_modules/babel-cli/node_modules/babylon/lib/parser/location.js:22:13)
    at Parser.pp.unexpected (/usr/local/lib/node_modules/babel-cli/node_modules/babylon/lib/parser/util.js:91:8)
    at Parser.pp.semicolon (/usr/local/lib/node_modules/babel-cli/node_modules/babylon/lib/parser/util.js:78:38)
    at Parser.pp.parseExpressionStatement (/usr/local/lib/node_modules/babel-cli/node_modules/babylon/lib/parser/statement.js:471:8)
    at Parser.pp.parseStatement (/usr/local/lib/node_modules/babel-cli/node_modules/babylon/lib/parser/statement.js:162:17)
    at Parser.pp.parseBlockBody (/usr/local/lib/node_modules/babel-cli/node_modules/babylon/lib/parser/statement.js:527:25)
    at Parser.pp.parseTopLevel (/usr/local/lib/node_modules/babel-cli/node_modules/babylon/lib/parser/statement.js:29:8)
    at Parser.parse (/usr/local/lib/node_modules/babel-cli/node_modules/babylon/lib/parser/index.js:96:17)
    at Object.parse (/usr/local/lib/node_modules/babel-cli/node_modules/babylon/lib/index.js:44:50)
    at File.parse (/usr/local/lib/node_modules/babel-cli/node_modules/babel-core/lib/transformation/file/index.js:472:24)
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

### 编译程序

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
    at Object.<anonymous> (/Users/glen/work/tmp/es2015_demo/test.compiled.js:40:3)
    at Module._compile (module.js:425:26)
    at Object.Module._extensions..js (module.js:432:10)
    at Module.load (module.js:356:32)
    at Function.Module._load (module.js:313:12)
    at Function.Module.runMain (module.js:457:10)
    at startup (node.js:138:18)
    at node.js:974:3
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




## 扩展阅读

+ [给 JavaScript 初心者的 ES2015 实战](http://gank.io/post/564151c1f1df1210001c9161)
+ [ECMAScript 6 入门](http://es6.ruanyifeng.com/)
+ [「大概可能也许是」目前最好的 JavaScript 异步方案 async/await](https://blog.leancloud.cn/3910/)
+ [Learn ES2015 - A detailed overview of ECMAScript 6 features](http://babeljs.io/docs/learn-es2015/)
+ [Using ES6 with npm today](http://mammal.io/articles/using-es6-today/)
+ [Using ES6 and ES7 in the Browser, with Babel 6 and Webpack](http://jamesknelson.com/using-es6-in-the-browser-with-babel-6-and-webpack/)
+ [Writing NPM packages with ES6 using the Babel 6 CLI](http://jamesknelson.com/writing-npm-packages-with-es6-using-the-babel-6-cli/)
+ [Set up Sublime Text for Meteor ES6 (ES2015) and JSX Syntax and Linting](http://info.meteor.com/blog/set-up-sublime-text-for-meteor-es6-es2015-and-jsx-syntax-and-linting)

