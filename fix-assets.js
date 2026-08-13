import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, 'src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles.filter(f => f.match(/\.(ts|tsx|js|jsx)$/));
}

const files = getAllFiles(SRC_DIR);

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;
  
  // Fix imports matching relative paths to assets
  c = c.replace(/['"](?:\.\.\/)+assets\/(.*?)['"]/g, "'@/assets/$1'");
  
  // Also optionally fix any remaining AuthLayout imports
  c = c.replace(/['"](?:\.\.\/)+AuthLayout['"]/g, "'@/features/auth/components/AuthLayout'");
  c = c.replace(/['"](?:\.\.\/)+components\/AuthLayout['"]/g, "'@/features/auth/components/AuthLayout'");
  c = c.replace(/['"](?:\.\.\/)*components\/Auth\/AuthLayout['"]/g, "'@/features/auth/components/AuthLayout'");
  
  if (c !== original) {
    fs.writeFileSync(f, c);
    console.log(`Fixed assets/AuthLayout paths in ${f}`);
  }
});
