import fs from 'fs';

export default function copyFile(source, target, progress, callback) {
  fs.stat(source, (err, stats) => {
    if (err) return callback(err);

    let ss = fs.createReadStream(source);
    let ts = fs.createWriteStream(target);
    ss.on('error', callback);
    ts.on('error', callback);

    let copySize = 0;
    ss.on('data', data => {
      copySize += data.length;
      progress && progress(copySize, stats.size);
    });

    ss.on('end', () => callback(null, target));

    ss.pipe(ts);
  });
}
