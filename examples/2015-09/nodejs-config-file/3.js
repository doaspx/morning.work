var fs = require('fs');
var YAML = require('yamljs');

function loadYAMLFile (file) {
  return YAML.parse(fs.readFileSync(file).toString());
}

var config = loadYAMLFile('./config.yaml');
console.log(config);
