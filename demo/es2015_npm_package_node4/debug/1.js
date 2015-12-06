import path from 'path';
import download from '../';

let tmpFile = path.resolve('/tmp', Date.now() + '-test-download');
download(__filename, tmpFile, (size, total) => {
  console.log(`${size}/${total}`);
}).then(saveFile => {
  console.log(`saved to ${saveFile}`);
}).catch(err => console.log(err));
