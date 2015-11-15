/**
 * build morning.work
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var path = require('path');
var fs = require('fs');
var async = require('async');
var rd = require('rd');
var mkdirp = require('mkdirp');
var tinyliquid = require('tinyliquid');
var MarkdownIt = require('markdown-it');
var md = new MarkdownIt({
  linkify: true,
  html: true,
  langPrefix: 'prettyprint ',
  typography: true
});
md.use(require('markdown-it-toc'));


var SOURCE_DIR = path.resolve(__dirname, '../source');
var TARGET_DIR = path.resolve(__dirname, '../page');
var TPL_LIST = tinyliquid.parse(fs.readFileSync(path.resolve(__dirname, 'tpl_list.html')).toString());
var TPL_ITEM = tinyliquid.parse(fs.readFileSync(path.resolve(__dirname, 'tpl_item.html')).toString());

function readFile (f) {
  var data = fs.readFileSync(f).toString().replace(/\r/g, '');
  var i = data.indexOf('\n\n');
  var head, body;
  if (i === -1) {
    head = data;
    body = '';
  } else {
    head = data.slice(0, i);
    body = data.slice(i);
  }
  var info = {};
  head.split('\n').forEach(function (line) {
    var i = line.indexOf(':');
    if (i === -1) {
      info[line.trim()] = true;
    } else {
      info[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  });
  info.content = md.render(body);
  if (typeof info.date === 'string') {
    info.date = info.date.split(/\s+/).filter(function (v) {
      return /\d{2,4}\-\d{1,2}\-\d{1,2}/.test(v);
    });
  }
  var url = f.slice(SOURCE_DIR.length);
  info.url = url.slice(0, -3) + '.html';
  return info;
}

function writeFile (f, d) {
  mkdirp.sync(path.dirname(f));
  fs.writeFileSync(f, d);
}

function firstItem (arr) {
  return arr[0];
}

function lastItem (arr) {
  return arr[arr.length - 1];
}

/******************************************************************************/

function getPostList () {
  return rd.readFileFilterSync(SOURCE_DIR, /\.md$/).map(function (f, s) {
    console.log('read file: %s', f);
    return readFile(f);
  }).sort(function (a, b) {
    var ad = new Date(lastItem(a.date)).getTime();
    var bd = new Date(lastItem(b.date)).getTime();
    return bd - ad;
  }).filter(function (a) {
    return !a.draft;
  });
}

function renderPostList (list, callback, TPL_LIST) {
  list = list || getPostList();
  var TPL_LIST = TPL_LIST || tinyliquid.parse(fs.readFileSync(path.resolve(__dirname, 'tpl_list.html')).toString());
  var context = tinyliquid.newContext({locals: {list: list}});
  tinyliquid.run(TPL_LIST, context, function (err) {
    if (err) return callback(err);

    var html = context.getBuffer();
    var f = path.resolve(TARGET_DIR, 'index.html');
    console.log('write to file: %s', f);
    writeFile(f, html);

    var f2 = path.resolve(__dirname, '../index.html');
    console.log('write to file: %s', f2);
    writeFile(f2, html);

    callback();
  });
}

function renderPost (item, callback, TPL_ITEM) {
  if (typeof item === 'string') {
    item = readFile(item);
  }
  var TPL_ITEM = TPL_ITEM || tinyliquid.parse(fs.readFileSync(path.resolve(__dirname, 'tpl_item.html')).toString());
  var context = tinyliquid.newContext({locals: item});
  tinyliquid.run(TPL_ITEM, context, function (err) {
    if (!err) {
      item.html = context.getBuffer();
      var f = path.resolve(TARGET_DIR, item.url.slice(1));
      console.log('write to file: %s', f);
      writeFile(f, item.html);
    }
    callback(err);
  });
}

exports.renderPostList = renderPostList;
exports.renderPost = renderPost;

/******************************************************************************/

function startBuild () {
  var list = getPostList();

  console.log('================================================================================');
  list.forEach(function (item) {
    console.log('%s to %s:\t%s', firstItem(item.date), lastItem(item.date), item.title);
  });
  console.log('================================================================================');
  console.log('total %s', list.length);

  async.eachSeries(list, function (item, next) {

    renderPost(item, next, TPL_ITEM);

  }, function (err) {
    if (err) throw err;

    renderPostList(list, function (err) {
      if (err) throw err;

      console.log('done');
    }, TPL_LIST);
  });
}

if (!module.parent) {
  startBuild();
}
