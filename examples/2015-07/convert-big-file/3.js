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
