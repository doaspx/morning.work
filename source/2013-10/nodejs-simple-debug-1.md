date:  2013-10-09
title: 《Node.js 入门系列》—— 一些简单的排错方法（一）

@[toc](目录)

俗话说“常在河边走，哪能不湿鞋”，只要动手写程序，总会时不时的冒出点问题来，
很难一下子就写出完全正确运行的程序。哪怕只是拿别人的程序来运行，也不能保证其能
适应各种各样的系统环境，不作任何修改就能使用。因此，学会一些简单的排错方法是很
有必要的。

在 Node.js 程序运行过程中，当出现没有被捕捉到的异常时，程序会打印出相应的出错
信息，并终止运行。比如以下出错信息：


    f:\tmp\2013-10-7\t.js:3
    proceess.nextTick(function () {
    ^
    ReferenceError: proceess is not defined
        at Object.<anonymous> (f:\tmp\2013-10-7\t.js:3:1)
        at Module._compile (module.js:456:26)
        at Object.Module._extensions..js (module.js:474:10)
        at Module.load (module.js:356:32)
        at Function.Module._load (module.js:312:12)
        at Function.Module.runMain (module.js:497:10)
        at startup (node.js:119:16)
        at node.js:901:3


出错信息的第1行 `f:\tmp\2013-10-7\t.js:3` 指明了在文件 `f:\tmp\2013-10-7\t.js`
的第3行出错了；

出错信息的第2行是相应的源程序 `proceess.nextTick(function () {` ；

出错信息的第3行的 `^` 指明了在该行的具体位置 `proceess` ；

出错信息的第4行是具体的出错信息 `ReferenceError: proceess is not defined` ，后面
还有几行以 `    at` 开头的内容是详细的调用堆栈信息，可以以此来追踪到整个程序的
执行流程。

当遇到这样的出错信息时，我们首先应该看第4行的
`ReferenceError: proceess is not defined` ，前面的 `ReferenceError` 是错误对象，
表示这是一个“非法引用”错误，其后便相应的提示信息，大概意思是“ `proceess` 未定义”
（看不懂可以用软件翻译一下，比如 [有道词典](http://dict.youdao.com/)），
这时候我们再往上看原来的程序是怎么写的：`proceess.nextTick(function () {` 。
从这个程序可以看出来，要调用的应该是 `process.nextTick()` ，
此处不小心把 `process` 写成了 `proceess` ，程序自然就报错“ `proceess` 未定义”了。

常见的错误对象有以下这些：

+ **EvalError** : 错误发生在 `eval()` 函数中，一般是要使用 `eval()` 执行的代码有语法错误

+ **RangeError** : 数字的值超过javascript可表示的范围

+ **ReferenceError** : 使用了非法的引用，一般是引用了一个未定义的变量或者函数

+ **SyntaxError** : 在eval()函数调用中发生了语法错误

+ **TypeError** : 变量的类型不是预期所需的

+ **URIError** : 在encodeURI()或者decodeURI()函数中发生的错误

记住这些常见的错误对象有助于更快速地理解出错信息。


## TypeError: undefined is not a function

出现这种错误的原因是某个变量不是 `Function` 类型，却把它当函数来调用了。例如：

帖子： [《node连接mysql出错》](http://cnodejs.org/topic/516acc466d38277306395c93)

Node.js 代码：

    var Client = require('mysql').Client;
    var client = new Client();
    client.host = 'localhost';
    client.port = 3306;
    client.user = 'root';
    client.password = '123456';
    client.database='test1';

    query(client);

    function query (client) {
      client.query('select * from user', function (err, res, fields) {
        console.log(res);
        client.end();
      });
    }

出错信息：

    /home/king/node/mysql.js:2
    var client = new Client();
                 ^
    TypeError: undefined is not a function
        at Object.<anonymous> (/home/king/node/mysql.js:2:14)
        at Module._compile (module.js:456:26)
        at Object.Module._extensions..js (module.js:474:10)
        at Module.load (module.js:356:32)
        at Function.Module._load (module.js:312:12)
        at Function.Module.runMain (module.js:497:10)
        at startup (node.js:119:16)
        at node.js:901:3

由出错信息可以看出，在执行 `new Client()` 时出错了，
`TypeError: undefined is not a function` ，也就是说，此时 `Client` 的值是
`undefined` 。我们再往上看，可以看到 `var Client = require('mysql').Client`
那么，应该是 `mysql` 这个模块并没有输出 `Client` 这个函数，我们可以执行
`console.log(require('mysql'))` 来打印 `mysql` 模块的输出，也确定并没有 `Client`
这一项，这时候就应该详细看一下 mysql 模块帮助文档以及其正确的使用方法了。


## TypeError: Cannot read property 'xxx' of undefined 或者 TypeError: Cannot read property 'xxx' of null

出现这种错误的原因是尝试读取一个值为 `undefined` 或 `null` 的变量的属性。比如如下代码：

    var a = undefined;
    console.log(a.b);

执行该程序将会抛出异常：

    TypeError: Cannot read property 'b' of undefined
        at repl:1:15
        at REPLServer.self.eval (repl.js:110:21)
        at Interface.<anonymous> (repl.js:239:12)
        at Interface.EventEmitter.emit (events.js:95:17)
        at Interface._onLine (readline.js:202:10)
        at Interface._line (readline.js:531:8)
        at Interface._ttyWrite (readline.js:760:14)
        at ReadStream.onkeypress (readline.js:99:10)
        at ReadStream.EventEmitter.emit (events.js:98:17)
        at emitKey (readline.js:1095:12)

当出现这种情况时，我们可以通过以下方法来排查：

### 检查变量是未赋值

假如只通过 `var a` 来声明了变量，但未赋值，此时变量的值为 `undefined` ，示例：

    var a; // 没有赋值
    console.log(a.b);

### 检查函数是否有返回值

当函数没有用 `return` 来返回一个值时，那么这个函数的返回值就是 `undefined` ，
示例：

    function f () {
      // 没有返回值
    }
    var a = f();
    console.log(a.b);

### 检查变量是否引用了某个对象不存在的属性

当引用了某个对象一个不存在的属性时，其值就是 `undefined` ，示例：

    var obj = {};
    var a = obj.c; // 引用了一个不存在的属性
    console.log(a.b);

### 检查调用函数时是否未该传递参数

当调用某个函数时没有按要求传递足够的参数，则在函数体内该参数的值是 `undefined` ，
示例：

    function f (a) {
      console.log(a.b);
    }
    f(); // 本来该函数需要1个参数



----------

扩展阅读：

+ [javascript异常处理](http://www.cnblogs.com/aqbyygyyga/archive/2011/10/29/2228824.html)
