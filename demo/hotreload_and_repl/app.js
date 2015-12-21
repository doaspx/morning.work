'use strict';

const express = require('express');

let app = express();
app.get('/', (req, res, next) => {
  res.send(`现在是北京时间${new Date}`);
});

app.listen(3000, err => {
  console.log('已启动');
});
