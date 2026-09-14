import fs from 'fs';
import path from 'path';

function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.readUInt32BE(0) !== 0x89504E47) return null;
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20)
  };
}

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else {
      let dim = null;
      if (file.endsWith('.png')) {
        dim = getPngDimensions(fullPath);
      }
      results.push({
        file: path.relative(process.cwd(), fullPath).replace(/\\/g, '/'),
        dimensions: dim ? `${dim.width}x${dim.height}` : 'JSON / Text',
        sizeKb: (stat.size / 1024).toFixed(1) + ' KB',
        bytes: stat.size
      });
    }
  });
  return results;
}

const assets = walkDir(path.resolve('presentation-assets'));
console.log(JSON.stringify(assets, null, 2));
