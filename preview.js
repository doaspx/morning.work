/**
 * build morning.work
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var path = require('path');
var fs = require('fs');
var express = require('express');
var serveStatic = require('serve-static');
var open = require('open');
var build = require('./build');

var app = express();
app.get('/', function (req, res, next) {
  build.renderPostList(false, next);
});
app.get('/page/*.html', function (req, res, next) {
  var f = path.resolve(__dirname, 'source', req.params[0] + '.md');
  build.renderPost(f, next);
});

app.use('/', serveStatic(path.resolve(__dirname)));

app.listen(8000, function (err) {
  if (err) throw err;
  console.log('server started');
  open('http://127.0.0.1:8000');
});

