const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Pattern to match common back buttons:
  // <button ... className="... hover:bg-gray-100 ..." >
  //   <ArrowLeft className="w-5 h-5 text-gray-600" />
  // </button>
  
  // We'll just regex replace hover:bg-gray-100 with hover:bg-primary-50
  // AND text-gray-600 with hover:text-primary-700 on ArrowLeft
  
  // Actually, easiest is to find <ArrowLeft ... /> inside a button that goes back
  // A simple Regex that targets ArrowLeft with text-gray-600 or text-slate-600:
  content = content.replace(/(<button[^>]*className="[^"]*)(hover:bg-gray-100)([^"]*"[^>]*>\s*)<ArrowLeft\s+className="([^"]*)text-(gray|slate)-600([^"]*)"/g, 
    (match, p1, p2, p3, p4, p5, p6) => {
      return `${p1}hover:bg-primary-50 group${p3}<ArrowLeft className="${p4}text-${p5}-600 group-hover:text-primary-700${p6}"`;
  });
  
  // What if hover:bg-gray-100 isn't there? Let's just make sure ArrowLeft has group-hover:text-primary-700 
  // if it's inside a button. 
  
  // Alternative generic approach: 
  // Let's just replace all `<ArrowLeft className="... text-gray-600"` with `<ArrowLeft className="... text-gray-600 hover:text-primary-700"`
  // BUT hover on ArrowLeft only works if you hover exactly the icon. The user wants it when you hover the button!
  
  // Better approach:
  content = content.replace(/(<button[^>]*onClick={\(\) => navigate\([^)]+\)}[^>]*className="[^"]*)"/g, (match, p1) => {
    if (!p1.includes('group')) {
      return p1 + ' group"';
    }
    return match;
  });

  content = content.replace(/(<button[^>]*onClick={handleBack}[^>]*className="[^"]*)"/g, (match, p1) => {
    if (!p1.includes('group')) {
      return p1 + ' group"';
    }
    return match;
  });

  // Replace hover:bg-gray-100 with hover:bg-primary-50 in buttons that contain ArrowLeft
  // Not 100% precise but we can just use a more targeted replacement.
  
  if(original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});

// Second pass: Update ArrowLeft
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // add group-hover:text-primary-700 to ArrowLeft if not there
  content = content.replace(/(<ArrowLeft\s+className="[^"]*text-(?:gray|slate)-[456]00[^"]*)"/g, (match, p1) => {
    if (!p1.includes('group-hover:text-primary-700')) {
      return p1 + ' group-hover:text-primary-700"';
    }
    return match;
  });
  
  // also update hover:bg-gray-100 to hover:bg-primary-50 on the button containing it
  content = content.replace(/(<button[^>]*class(?:Name)?="[^"]*)(hover:bg-(?:gray|slate)-100)([^"]*"\s*>\s*<ArrowLeft)/g, (match, p1, p2, p3) => {
    return p1 + 'hover:bg-primary-50' + p3;
  });

  if(original !== content) {
    fs.writeFileSync(file, content, 'utf8');
  }
});


console.log(`Done.`);
