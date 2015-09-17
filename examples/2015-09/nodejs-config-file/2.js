var fs = require('fs');
var stripJsonComments = require('strip-json-comments');

function loadJSONFile (file) {
  var json = fs.readFileSync(file).toString();
  return JSON.parse(stripJsonComments(json));
}

var config = loadJSONFile('./config.json');
console.log(config);
