var readLine = require('lei-stream').readLine;
var writeLine = require('lei-stream').writeLine;

var inputFile = '/Volumes/Works/data/xh.txt';
var outputFile = 'output.txt';

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
