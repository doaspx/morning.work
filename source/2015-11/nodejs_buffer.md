date: 2015-11-7
title: Node.js的Buffer那些你可能不知道的用法

## 前言

在大多数介绍Buffer的文章中，主要是围绕数据拼接和内存分配这两方面的。比如我们使用`fs`模块来读取文件内容的时候，返回的就是一个Buffer：

```javascript
fs.readFile('filename', function (err, buf) {
  // <Buffer 2f 2a 2a 0a 20 2a 20 53 75 ... >
});
```

在使用`net`或`http`模块来接收网络数据时，`data`事件的参数也是一个Buffer，这时我们还需要使用`Buffer.concat()`来做数据拼接：

```javascript
var bufs = [];
conn.on('data', function (buf) {
  bufs.push(buf);
});
conn.on('end', function () {
  // 接收数据结束后，拼接所有收到的Buffer对象
  var buf = Buffer.concat(bufs);
});
```

还可以利用`Buffer.toString()`来做转换`base64`或十六进制字符的转换，比如：

```javascript
console.log(new Buffer('hello, world!').toString('base64'));
// 转换成base64字符串：aGVsbG8sIHdvcmxkIQ==

console.log(new Buffer('aGVsbG8sIHdvcmxkIQ==', 'base64').toString());
// 还原base64字符串：hello, world!

console.log(new Buffer('hello, world!').toString('hex'));
// 转换成十六进制字符串：68656c6c6f2c20776f726c6421

console.log(new Buffer('68656c6c6f2c20776f726c6421', 'hex').toString());
// 还原十六进制字符串：hello, world!
```

一般情况下，单个Node.js进程是有最大内存限制的，以下是来自官方文档中的说明：

> [What is the memory limit on a node process?](https://github.com/nodejs/node-v0.x-archive/wiki/FAQ#what-is-the-memory-limit-on-a-node-process)
> 
> Currently, by default v8 has a memory limit of 512MB on 32-bit systems, and 1.4GB on 64-bit systems. The limit can be raised by setting --max_old_space_size to a maximum of ~1024 (~1 GB) (32-bit) and ~4096 (~4GB) (64-bit), but it is recommended that you split your single process into several workers if you are hitting memory limits.

由于Buffer对象占用的内存空间是不计算在Node.js进程内存空间限制上的，因此，我们也常常会使用Buffer来存储需要占用大量内存的数据：

```javascript
// 分配一个2G-1字节的数据
// 单次分配内存超过此值会抛出异常 RangeError: Invalid typed array length
var buf = new Buffer(1024 * 1024 * 1024 - 1);
```

以上便是Buffer的几种常见用法。然而，阅读Buffer的API文档时，我们会发现更多的是`readXXX()`和`writeXXX()`开头的API，具体如下：

+ buf.readUIntLE(offset, byteLength[, noAssert])
+ buf.readUIntBE(offset, byteLength[, noAssert])
+ buf.readIntLE(offset, byteLength[, noAssert])
+ buf.readIntBE(offset, byteLength[, noAssert])
+ buf.readUInt8(offset[, noAssert])
+ buf.readUInt16LE(offset[, noAssert])
+ buf.readUInt16BE(offset[, noAssert])
+ buf.readUInt32LE(offset[, noAssert])
+ buf.readUInt32BE(offset[, noAssert])
+ buf.readInt8(offset[, noAssert])
+ buf.readInt16LE(offset[, noAssert])
+ buf.readInt16BE(offset[, noAssert])
+ buf.readInt32LE(offset[, noAssert])
+ buf.readInt32BE(offset[, noAssert])
+ buf.readFloatLE(offset[, noAssert])
+ buf.readFloatBE(offset[, noAssert])
+ buf.readDoubleLE(offset[, noAssert])
+ buf.readDoubleBE(offset[, noAssert])
+ buf.write(string[, offset][, length][, encoding])
+ buf.writeUIntLE(value, offset, byteLength[, noAssert])
+ buf.writeUIntBE(value, offset, byteLength[, noAssert])
+ buf.writeIntLE(value, offset, byteLength[, noAssert])
+ buf.writeIntBE(value, offset, byteLength[, noAssert])
+ buf.writeUInt8(value, offset[, noAssert])
+ buf.writeUInt16LE(value, offset[, noAssert])
+ buf.writeUInt16BE(value, offset[, noAssert])
+ buf.writeUInt32LE(value, offset[, noAssert])
+ buf.writeUInt32BE(value, offset[, noAssert])
+ buf.writeInt8(value, offset[, noAssert])
+ buf.writeInt16LE(value, offset[, noAssert])
+ buf.writeInt16BE(value, offset[, noAssert])
+ buf.writeInt32LE(value, offset[, noAssert])
+ buf.writeInt32BE(value, offset[, noAssert])
+ buf.writeFloatLE(value, offset[, noAssert])
+ buf.writeFloatBE(value, offset[, noAssert])
+ buf.writeDoubleLE(value, offset[, noAssert])
+ buf.writeDoubleBE(value, offset[, noAssert])

这些API为在Node.js中操作数据提供了极大的便利。假设我们要将一个整形数值存储到文件中，比如当前时间戳为`1447656645380`，如果将其当作一个字符串存储时，需要占用11字节的空间，而将其转换为二进制存储时仅需6字节空间即可：

```javascript
var buf = new Buffer(6);

buf.writeUIntBE(1447656645380, 0, 6);
// <Buffer 01 51 0f 0f 63 04>

buf.readUIntBE(0, 6);
// 1447656645380
```

在使用Node.js编写一些底层功能时，比如一个网络通信模块、某个数据库的客户端模块，或者需要从文件中操作大量结构化数据时，以上Buffer对象提供的API都是必不可少的。

接下来将演示一个使用Buffer对象操作结构化数据的例子。

## 操作结构化数据

假设有一个学生考试成绩数据库，每条记录结构如下：

学号    | 课程代码 | 分数
-------|---------|---
XXXXXX | XXXX    | XX

其中学号是一个6位的数字，课程代码是一个4位数字，分数最高分为100分。

在使用文本来存储这些数据时，比如使用CSV格式存储可能是这样的：

```
100001,1001,99
100002,1001,67
100003,1001,88
```

其中每条记录占用15字节的空间，而使用二进制存储时其结构将会是这样：

学号    | 课程代码 | 分数
-------|---------|---
3字节   | 2字节   | 1字节

每一条记录仅需要6字节的空间即可，仅仅是使用文本存储的40%！下面是用来操作这些记录的程序：

```javascript
// 读取一条记录
// buf    Buffer对象
// offset 本条记录在Buffer对象的开始位置
// data   {number, lesson, score}
function writeRecord (buf, offset, data) {
  buf.writeUIntBE(data.number, offset, 3);
  buf.writeUInt16BE(data.lesson, offset + 3);
  buf.writeInt8(data.score, offset + 5);
}

// 写入一条记录
// buf    Buffer对象
// offset 本条记录在Buffer对象的开始位置
function readRecord (buf, offset) {
  return {
    number: buf.readUIntBE(offset, 3),
    lesson: buf.readUInt16BE(offset + 3),
    score: buf.readInt8(offset + 5)
  };
}

// 写入记录列表
// list  记录列表，每一条包含 {number, lesson, score}
function writeList (list) {
  var buf = new Buffer(list.length * 6);
  var offset = 0;
  for (var i = 0; i < list.length; i++) {
    writeRecord(buf, offset, list[i]);
    offset += 6;
  }
  return buf;
}

// 读取记录列表
// buf  Buffer对象
function readList (buf) {
  var offset = 0;
  var list = [];
  while (offset < buf.length) {
    list.push(readRecord(buf, offset));
    offset += 6;
  }
  return list;
}
```

我们可以再编写一段程序来看看效果：

```javascript
var list = [
  {number: 100001, lesson: 1001, score: 99},
  {number: 100002, lesson: 1001, score: 88},
  {number: 100003, lesson: 1001, score: 77},
  {number: 100004, lesson: 1001, score: 66},
  {number: 100005, lesson: 1001, score: 55},
];
console.log(list);

var buf = writeList(list);
console.log(buf);
// 输出 <Buffer 01 86 a1 03 e9 63 01 86 a2 03 e9 58 01 86 a3 03 e9 4d 01 86 a4 03 e9 42 01 86 a5 03 e9 37>

var ret = readList(buf);
console.log(ret);
/* 输出
[ { number: 100001, lesson: 1001, score: 99 },
  { number: 100002, lesson: 1001, score: 88 },
  { number: 100003, lesson: 1001, score: 77 },
  { number: 100004, lesson: 1001, score: 66 },
  { number: 100005, lesson: 1001, score: 55 } ]
*/
```


## 扩展阅读

+ [Buffer那些事儿](http://www.infoq.com/cn/articles/nodejs-about-buffer)
+ [浅析nodejs的buffer类](https://cnodejs.org/topic/5189ff4f63e9f8a54207f60c)
+ [小心buffer的拼接问题](https://cnodejs.org/topic/4faf65852e8fb5bc65113403)
+ [Node.js缓冲模块Buffer](http://blog.fens.me/nodejs-buffer/)
+ [Node.js - Buffers](http://www.tutorialspoint.com/nodejs/nodejs_buffers.htm)
+ [How to Use Buffers in Node.js](https://docs.nodejitsu.com/articles/advanced/buffers/how-to-use-buffers)
+ [Node.js API Documentation - Buffer](https://nodejs.org/api/buffer.html)
