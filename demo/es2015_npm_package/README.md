# [ES2015 & babel 实战：开发NPM模块](http://morning.work/page/2015-11/es6-es7-develop-npm-module-using-babel.html) 文章演示例子

## 安装

下载项目到本地后，在当前项目根目录下执行：

```bash
$ npm install
```

## 测试

```bash
$ npm test
```

## 使用方法

```javascript
import download from './';

let source = '一个URL或者本地文件名';
let target = '要存储到的本地位置，null|false|undefined表示自动生成一个临时文件';
// 用于获取进度通知的函数，可以省略
let progress = (size, total) => console.log(`进度：${size}/${total}`);
download(source, target, progress)
  .then(filename => console.log(`已保存到：${filename}`))
  .catch(err => console.log(`出错：${err}`));

// 也可以使用callback模式
download(source, target, progress, (err, filename) => {
  if (err) console.log(`出错：${err}`);
  else console.log(`已保存到：${filename}`);
});
```

## 授权

```
The MIT License (MIT)

Copyright (c) 2015 Zongmin Lei <leizongmin@gmail.com>
http://ucdok.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
