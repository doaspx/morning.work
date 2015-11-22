import fs from 'fs';
import request from 'request';

export default function downloadFile(url, target, progress, callback) {
  let s = fs.createWriteStream(target);
  s.on('error', callback);

  let totalSize = 0;
  let downloadSize = 0;
  let req = request
    .get({
      url: url,
      encoding: null
    })
    .on('response', res => {
      if (res.statusCode !== 200) {
        return callback(new Error('status #' + res.statusCode));
      }
      totalSize = res.headers['content-length'] || null;

      res.on('data', data => {
        downloadSize += data.length;
        progress && progress(downloadSize, totalSize);
      });
      res.on('end', () => callback(null, target));
    })
    .pipe(s);
}
