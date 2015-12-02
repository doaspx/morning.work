```
date:  2015-07-15 to 2015-07-16
title: 在Node.js中读写大文件
link:  https://github.com/leizongmin/node-lei-stream
author: 老雷
```


前段时间偶然需要整理一个几百MB的文本文件，内容大概370W行，我要将每一行的数据简单格式化一下，并转存到一个新的文件中。

在Node.js中，我们可以通过两种方式来读取文件：

+ 使用`fs.readFile()`一次性将文件内容全部读取出来，考虑到可能将来会操作几G大的文件，所以放弃了这种方式；
+ 使用`fs.createReadStream()`创建一个读文件流，这种方式可不受限于文件的大小；

因此，我很顺理成章地选用了`fs.createReadStream()`来读取文件，自然在写文件时也使用对应的`fs.createWriteStream()`来做。

@[toc](目录)


## 按行读写流

由于要操作的是文本文件，并且文件中的内容每一行记录均使用换行符`\n`来分隔，我编写了一个模块用来按行从一个`stream`中读取内容，以及按行往一个`stream`中写入内容，下面将介绍这个模块的简单使用方法。

### 安装模块

执行以下命令安装

```bash
$ npm install lei-stream --save
```

### 按行读取流

```javascript
var readLine = require('lei-stream').readLine;

readLine('./myfile.txt').go(function (data, next) {
  console.log(data);
  next();
}, function () {
  console.log('end');
});
```

说明：

+ `readLine()`的第一个参数应该传入一个`ReadStream`实例，当传入的是一个字符串时，会把它当作一个文件，自动调用`fs.createReadStream()`来创建一个`ReadStream`
+ `readLine()`的第二个参数为读取到一行内容时的回调函数，为了便于控制读取速度，需要在回调函数中执行`next()`来继续读取下一行
+ `readLine()`的第三个参数为整个流读取完毕后的回调函数

另外，我们也可以指定各个选项来达到更个性化的控制：

```javascript
var fs = require('fs');
var readLine = require('lei-stream').readLine;

// readLineStream第一个参数为ReadStream实例，也可以为文件名
var s = readLine(fs.createReadStream('./myfile.txt'), {
  // 换行符，默认\n
  newline: '\n',
  // 是否自动读取下一行，默认false
  autoNext: false,
  // 编码器，可以为函数或字符串（内置编码器：json，base64），默认null
  encoding: function (data) {
    return JSON.parse(data);
  }
});

// 读取到一行数据时触发data事件
s.on('data', function (data) {
  console.log(data);
  s.next();
});

// 流结束时触发end事件
s.on('end', function () {
  console.log('end');
});
```

以下是关于`readLine()`的第二个参数的说明：

+ `newLine`表示换行符，默认为`\n`，当然也可以设置为任意字符，当读取到该字符时程序会认为该行数据已结束，并触发`data`事件
+ `autoNext`表示是否自动读取下一行的内容，默认为`false`，如果设置为`true`，则不需要手动执行`next()`函数来继续读取
+ `encoding`为编码器函数，默认为`null`，表示不对内容编码，我们可以自己指定一个编码器（要求该函数返回的是一个字符串），这样在每次`write()`一行数据时会自动调用该函数进行预处理

以下是读取数据过程中的一些说明：

+ 当读取到一行数据时，会触发`data`事件
+ 调用`s.next()`来读取下一行数据，如果在初始化`readLine()`时指定了`autoNext=true`，则可省略
+ 当到达流末尾时，所有数据已读取完毕，会触发`end`事件

### 按行写流

```javascript
var fs = require('fs');
var writeLineStream = require('lei-stream').writeLine;

// writeLineStream第一个参数为ReadStream实例，也可以为文件名
var s = writeLineStream(fs.createWriteStream('./myfile.txt'), {
  // 换行符，默认\n
  newline: '\n',
  // 编码器，可以为函数或字符串（内置编码器：json，base64），默认null
  encoding: function (data) {
    return JSON.stringify(data);
  },
  // 缓存的行数，默认为0（表示不缓存），此选项主要用于优化写文件性能，当数量缓存的内容超过该数量时再一次性写入到流中，可以提高写速度
  cacheLines: 0
});

// 写一行
s.write(data, function () {
  // 回调函数可选
  console.log('wrote');
});

// 结束
s.end(function () {
  // 回调函数可选
  console.log('end');
});
```

说明：

+ 与`readLine()`相类似，调用`writeLine()`时的第一个参数也可以是一个字符串，此时程序会自动调用`fs.createWriteStream()`来创建一个`WriteStream`
+ `writeLine()`的第二个参数为一些选项，其中`newLine`选项要保持与`readLine()`时 的`newLine`一致；`encoding`选项则刚好跟`readLine()`的相反；`cacheLines`选项表示缓存的数据行数，设置一个较大的值时可以一定程度提高写入性能，但也会增加写入延时，在下文将详细介绍
+ 执行`s.write()`来写入一行数据
+ 执行`s.end()`来结束写入


## 控制读写速度

### 实验

我们在使用`fs.createReadStream()`创建一个读文件流后，文件内容便源源不断地被读取出来，不断地触发`data`事件。然后在`ReadStream`的`data`事件里面处理，并写入到`WriteStream`中。然而，大多数情况下读文件的速度总比写文件的速度快，这样便导致大量的数据被积压在内存中，当要读取的文件很大时，甚至会导致因占用内存太多而导致整个Node.js进程崩溃。

以下是我通过`lei-stream`编写的一个例子，按行读取数据并写入到另一个文件中（在写入文件时不等待写入完成即刻执行`next()`来读取下一行，用于模拟不限制读取速度）：

```javascript
var readLine = require('lei-stream').readLine;
var writeLine = require('lei-stream').writeLine;

// 一个几百M的文本文件
var inputFile = '/Volumes/Works/data/xh.txt';
var outputFile = '/Volumes/Works/tmp/output.txt';

var output = writeLine(outputFile);
var counter = 0;
var startTime = Date.now();

function msToS (v) {
  return parseInt(v / 1000, 10);
}

function getSpentTime () {
  return Date.now() - startTime;
}

readLine(inputFile).go(function (data, next) {
  counter++;
  output.write(data);
  if (counter % 10000 === 0) {
    printSpeedInfo();
  }
  next();
}, function () {
  console.log('end');
  output.end(function () {
    console.log('done. total %s lines, spent %sS', counter, msToS(getSpentTime()));
    printMemoryUsage();
    process.exit();
  });
});

// 打印进度
function printSpeedInfo () {
  var t = msToS(getSpentTime());
  var s = counter / t;
  if (!isFinite(s)) s = counter;
  console.log('read %s lines, speed: %sL/S', counter, s.toFixed(0));
}

// 打印内存占用情况
function printMemoryUsage () {
  var info = process.memoryUsage();
  function mb (v) {
    return (v / 1024 / 1024).toFixed(2) + 'MB';
  }
  console.log('rss=%s, heapTotal=%s, heapUsed=%s', mb(info.rss), mb(info.heapTotal), mb(info.heapUsed));
}
setInterval(printMemoryUsage, 1000);
```

执行这个程序后，打印出来的结果如下：

```
read 210000 lines, speed: 210000L/S
rss=102.86MB, heapTotal=77.64MB, heapUsed=58.09MB

...

rss=739.00MB, heapTotal=726.18MB, heapUsed=695.31MB
rss=719.15MB, heapTotal=726.18MB, heapUsed=692.25MB
rss=713.75MB, heapTotal=726.18MB, heapUsed=704.64MB
done. total 3722040 lines, spent 80S
rss=709.11MB, heapTotal=726.18MB, heapUsed=695.46MB
```

从输出的结果中可以看出，程序启动一秒后内存占用即达到`77.64MB`，而在程序结束时内存占用已达到`726.18MB`，如果文件体积再增加一倍，估计整个程序是无法执行完成的。

为了验证限制读取速度是否有效，我将读取内容部分的程序改为这样：

```javascript
readLine(inputFile).go(function (data, next) {
  counter++;
  output.write(data, next);
  if (counter % 10000 === 0) {
    printSpeedInfo();
  }
}, function () {
  console.log('end');
  output.end(function () {
    console.log('done. total %s lines, spent %sS', counter, msToS(getSpentTime()));
    printMemoryUsage();
    process.exit();
  });
});
```

说明：在执行`output.write()`时，可以传入一个回调函数，当写入成功后执行此回调函数，再继续读取下一行数据。

重新运行程序，看到的结果如下：

```
read 30000 lines, speed: 30000L/S
rss=45.11MB, heapTotal=28.18MB, heapUsed=11.11MB
read 40000 lines, speed: 40000L/S

...

read 3720000 lines, speed: 41333L/S
end
done. total 3722040 lines, spent 90S
rss=62.54MB, heapTotal=45.16MB, heapUsed=16.80MB
```

虽然程序的执行时间由原来的80秒增加到90秒，但整个进程的内存占用稳定保持在`45MB`，因此即使要读取一个超大文件功能也不会受到影响。

### 原理

`ReadAStream`提供了两个函数用于控制流：

+ `ReadStream.pause()`暂停读取 [参考文档](https://nodejs.org/api/stream.html#stream_readable_pause)
+ `ReadStream.resume()`重新开始读取 [参考文档](https://nodejs.org/api/stream.html#stream_readable_resume)

当读取速度超出我们期望的值时，可以执行`pause()`先暂停，待时机符合时再执行`resume()`重新开始。以下是用来限制读取速度的实例：

```javascript
var util = require('util');
var events = require('events');
var fs = require('fs');

// 一个几百M的文本文件
var inputFile = '/Volumes/Works/data/xh.txt';


function ReadStreamThrottle (stream, speed) {
  this._stream = stream;
  this._readBytes = 0;
  this._speed = speed;
  this._ended = false;
  this._readBytesSecond = 0;
  this._lastTimestamp = Date.now();
  this._paused = false;
  var self = this;

  // 检查速度是否太快
  function isTooFast () {
    var t = (Date.now() - self._lastTimestamp) / 1000;
    var bps = self._readBytesSecond / t;
    return bps > speed;
  }

  // 每隔一段时间检查速度
  function checkSpeed () {
    if (isTooFast()) {
      self.pause();
      // 直到平均速度放缓到预设的值时继续读流
      var tid = setInterval(function () {
        if (!isTooFast()) {
          clearInterval(tid);
          self.resume();
        }
      }, 100);
    } else {
      self.resume();
    }
  }

  stream.on('data', function (chunk) {
    self._readBytes += chunk.length;
    self._readBytesSecond += chunk.length;
    self.emit('data', chunk);
    checkSpeed();
  });

  stream.on('end', function () {
    self._ended = true;
    self.emit('end');
  });
}

util.inherits(ReadStreamThrottle, events.EventEmitter);

ReadStreamThrottle.prototype.pause = function () {
  this._paused = true;
  this._stream.pause();
};

ReadStreamThrottle.prototype.resume = function () {
  this._paused = false;
  this._stream.resume();
};


// 读取文件，限制速度不大于10MB/S
var MB = 1024 * 1024;
var s = new ReadStreamThrottle(fs.createReadStream(inputFile), MB * 10);
var bytes = 0;
var t = Date.now();
s.on('data', function (c) {
  bytes += c.length;
  var spent = (Date.now() - t) / 1000;
  console.log('read %s bytes, speed: %sMB/S', bytes, (bytes / MB / spent).toFixed(2));
});
s.on('end', function () {
  console.log('end. total %s bytes', bytes);
});
```

运行程序可以看到打印出以下结果：

```
read 133627904 bytes, speed: 10.00MB/S
read 133693440 bytes, speed: 10.00MB/S
read 133758976 bytes, speed: 9.92MB/S
read 133824512 bytes, speed: 9.93MB/S
read 133890048 bytes, speed: 9.93MB/S
read 133955584 bytes, speed: 9.94MB/S
read 134021120 bytes, speed: 9.94MB/S
read 134086656 bytes, speed: 9.95MB/S
read 134152192 bytes, speed: 9.95MB/S
read 134217728 bytes, speed: 9.96MB/S
read 134283264 bytes, speed: 9.96MB/S
read 134348800 bytes, speed: 9.97MB/S
read 134414336 bytes, speed: 9.97MB/S
read 134479872 bytes, speed: 9.98MB/S
read 134545408 bytes, speed: 9.98MB/S
read 134610944 bytes, speed: 9.98MB/S
read 134676480 bytes, speed: 9.99MB/S
read 134742016 bytes, speed: 9.99MB/S
end. total 134742016 bytes
```

从结果中可以看出，读取速度并不是固定的10MB/S，而是在这个范围内不断变化。其原因是程序在读取文件时，每次都会读取一定长度的内容（比如64KB，
这个与系统设置的缓冲区大小有关），因此我们采用一种简单的方法来控制读取速度：每次触发`data`事件时，计算每秒的读取速度，如果超过预设的值则暂停读取，并每隔100ms检查一次，直到平均速度在预设的范围内再重新读取。


## 优化写文件性能

### 实验

前文中提到，『大多数情况下读文件的速度总比写文件的速度快，这样便导致大量的数据被积压在内存中，当要读取的文件很大时，甚至会导致因占用内存太多而导致整个Node.js进程崩溃』，那为什么我们在复制超大文件时程序又没问题呢？

于是我编写了以下程序：

```javascript
var fs = require('fs');

var inputFile = '/Volumes/Works/data/xh.txt';
var outputFile = '/Volumes/Works/tmp/output.txt';

var input = fs.createReadStream(inputFile);
var output = fs.createWriteStream(outputFile);

input.on('data', function (chunk) {
  output.write(chunk);
});

input.on('end', function () {
  console.log('end');
  output.end(function () {
    printMemoryUsage();
    process.exit();
  });
});

// 打印内存占用情况
function printMemoryUsage () {
  var info = process.memoryUsage();
  function mb (v) {
    return (v / 1024 / 1024).toFixed(2) + 'MB';
  }
  console.log('rss=%s, heapTotal=%s, heapUsed=%s', mb(info.rss), mb(info.heapTotal), mb(info.heapUsed));
}
setInterval(printMemoryUsage, 1000);
```

说明：在读取文件的`data`事件中，直接将数据原样写入到另一个文件中，用于模拟简单的复制文件操作。

程序执行结果如下：

```
rss=64.89MB, heapTotal=10.28MB, heapUsed=3.78MB
rss=82.43MB, heapTotal=11.26MB, heapUsed=3.97MB
end
rss=83.86MB, heapTotal=11.26MB, heapUsed=5.21MB
```

从结果中可以看出，在读取文件结束后，写文件操作也很快完成，而内存占用并没有太大起伏。

于是我将`data`事件部分改为以下代码：

```javascript
input.on('data', function (chunk) {
  chunk = chunk.toString();
  var lines = chunk.split('\n');
  lines.forEach(function (line) {
    output.write(line + '\n');
  });
});
```

说明：将读取出来的数据拆分成多行，并按行调用`write()`写入到文件中，用于模拟前文转换数据的例子。

程序运行结果如下：

```
rss=117.18MB, heapTotal=91.43MB, heapUsed=62.23MB
rss=194.33MB, heapTotal=157.35MB, heapUsed=130.03MB
rss=262.67MB, heapTotal=213.45MB, heapUsed=193.70MB
rss=330.55MB, heapTotal=267.58MB, heapUsed=238.85MB
rss=408.13MB, heapTotal=329.58MB, heapUsed=300.90MB
rss=482.32MB, heapTotal=391.58MB, heapUsed=367.01MB
rss=529.28MB, heapTotal=455.54MB, heapUsed=424.50MB
rss=484.03MB, heapTotal=509.67MB, heapUsed=480.32MB
rss=460.43MB, heapTotal=565.77MB, heapUsed=539.37MB
rss=490.33MB, heapTotal=620.88MB, heapUsed=590.47MB
rss=502.39MB, heapTotal=675.99MB, heapUsed=649.05MB
rss=479.86MB, heapTotal=726.18MB, heapUsed=699.68MB
rss=829.57MB, heapTotal=734.05MB, heapUsed=698.78MB
end
rss=850.25MB, heapTotal=749.80MB, heapUsed=720.01MB
rss=851.16MB, heapTotal=749.80MB, heapUsed=720.41MB
rss=851.98MB, heapTotal=749.80MB, heapUsed=720.07MB
rss=852.92MB, heapTotal=749.80MB, heapUsed=720.56MB

...

rss=754.59MB, heapTotal=749.80MB, heapUsed=716.82MB
rss=764.16MB, heapTotal=749.80MB, heapUsed=714.73MB
rss=763.31MB, heapTotal=749.80MB, heapUsed=721.34MB
rss=762.20MB, heapTotal=749.80MB, heapUsed=725.75MB
```

由结果可以看出，在读取文件结束后，程序还运行了很长时间才完成了写文件操作，在此过程中内存占用不断地增加，并且很明显感觉到打印内存占用的速度越来越慢（本来应该是1秒作用的时间打印一次）。

是不是因为频繁的`write()`操作导致的呢？于是我又将`data`事件部分的代码改为这样：

```javascript
input.on('data', function (chunk) {
  chunk = chunk.toString();
  var lines = chunk.split('\n');
  output.write(lines.join('\n') + '\n');
});
```

说明：考虑到有可能是因为`data`事件中对数据的处理导致写入缓慢，于是同样将读取出来的数据拆分成多行，但是写入时又将这些数据合并起来，只执行一次`write()`。

程序运行结果如下：

```
rss=37.27MB, heapTotal=22.28MB, heapUsed=5.30MB
rss=78.17MB, heapTotal=39.26MB, heapUsed=14.64MB
rss=98.62MB, heapTotal=39.26MB, heapUsed=14.61MB
end
rss=100.35MB, heapTotal=39.26MB, heapUsed=15.00MB
```

由结果可以看出，在`data`事件中对数据的处理确实影响到了读文件的性能（全部读取完毕的时间由原来的2秒增加到3秒），另外内存占用也增加了，到结果与第一个例子中的简单复制文件相差不大。

由此可以确定，减少`write()`的次数确实能提高写文件的速度。

于是，在`lei-stream`模块中，增加了一个新的选项`cacheLines`用于指定缓存的行数，当执行`write()`时并不会马上将结果写入到流中，仅当达到这个数量时再一次性写入。

我们将『控制读写速度』章节实验例子中的`writeLine()`改为以下代码（增加`cacheLines`选项）：

```
var output = writeLine(outputFile, {
  cacheLines: 10000
});
```

重新运行程序，其结果如下：

```
read 3720000 lines, speed: 286154L/S
read 3720000 lines, speed: 286154L/S
read 3720000 lines, speed: 286154L/S
read 3720000 lines, speed: 286154L/S
read 3720000 lines, speed: 286154L/S
read 3720000 lines, speed: 286154L/S
end
done. total 3722040 lines, spent 13S
rss=64.83MB, heapTotal=45.16MB, heapUsed=15.29MB
```

由结果可以看出，程序执行时间从原来的90S下降到13S，并且内存占用仍然保持在45.16MB。

### 原理

首先看看Node.js源码中`fs.ReadStream`的`write()`里面是怎样的（[源码](https://github.com/joyent/node/blob/master/lib/fs.js#L1789)）：

```javascript
WriteStream.prototype._write = function(data, encoding, cb) {
  if (!util.isBuffer(data))
    return this.emit('error', new Error('Invalid data'));

  if (!util.isNumber(this.fd))
    return this.once('open', function() {
      this._write(data, encoding, cb);
    });

  var self = this;
  fs.write(this.fd, data, 0, data.length, this.pos, function(er, bytes) {
    if (er) {
      self.destroy();
      return cb(er);
    }
    self.bytesWritten += bytes;
    cb();
  });

  if (!util.isUndefined(this.pos))
    this.pos += data.length;
};
```

由源码可以看出，每一次的`write()`实际上是直接调用`fs.write()`来写入文件的（`WriteStream`记录了当前文件的偏移量），当频繁调用`write()`来写入数据时，每一次都会创建用于`fs.write()`的回调函数，因此内存占用急剧升高和性能下降也就很合情合理了。

**注意：`lei-stream`本身的设计是用于读写流，并不仅限于文件流，因此`cacheLines`选项并不总是能起到提升性能的作用，所以把`cacheLines`设计为需要手动开启**


## 总结

前几天在CNode论坛看到有人提问[『nodejs 如何加载大数据json文件比如2g ，3g，10g』](https://cnodejs.org/topic/55a4b5213ecc81b621bba8d0)，其实这里的问题除了文件很大之外，重点还是在『读取JSON字符串里面的某部分内容』。

一般情况下，在Node.js中读写大文件并没有什么高深的技术，主要注意以下几点：

+ 数据可被拆分成小块处理（比如一些日志文件，按行读写）
+ 控制读取速度，保持读写速度同步

本文中提到的`lei-stream`模块源码可从这里获得：https://github.com/leizongmin/node-lei-stream

