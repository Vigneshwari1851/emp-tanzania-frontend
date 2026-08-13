const fs = require('fs');
let content = fs.readFileSync('src/pages/AddEmployee.tsx', 'utf8');

const findPattern1 = /focus:outline-none\s+focus:ring-2\s+focus:ring-blue-500\s+\${(formErrors\.[a-zA-Z0-9_]+)\s*\?\s*'border-red-500'\s*:\s*'border-gray-300'}/g;
const findPattern2 = /focus:outline-none\s+focus:ring-2\s+focus:ring-blue-500\s+\${(formErrors\[.*?\])\s*\?\s*'border-red-500'\s*:\s*'border-gray-300'}/g;

const replacementString_Head = "focus:outline-none focus:ring-4 transition-all ${";
const replacementString_Tail = " ? 'border-red-400 focus:ring-red-400/20' : 'border-gray-300 focus:ring-blue-400/20 focus:border-blue-400'}";

content = content.replace(findPattern1, (match, err) => {
    return replacementString_Head + err + replacementString_Tail;
});

content = content.replace(findPattern2, (match, err) => {
    return replacementString_Head + err + replacementString_Tail;
});

fs.writeFileSync('src/pages/AddEmployee.tsx', content);
console.log('Mass update successful');
