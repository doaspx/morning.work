var repl = require('repl')
var context = repl.start('> ').context;

var request = require('request');
context.request = request;

var util = require('util');
function inspect (obj) {
  console.log(util.inspect(obj, {
    colors: true,
    depth: 10
  }));
}
function result (err, res, body) {
  if (err) return console.error(err);
  console.log('========================================')
  console.log('status %s', res.statusCode);
  console.log('headers:');
  for (var i in res.headers) {
    console.log('    %s: %s', i, res.headers[i]);
  }
  console.log('body:');
  console.log(body.toString());
}
context.util = util;
context.inspect = inspect;
console.result = result;

function get (url) {
  request.get(url, result);
}
function post (url, data) {
  request.post(url, {form: data}, result);
}
context.get = get;
context.post = post;
