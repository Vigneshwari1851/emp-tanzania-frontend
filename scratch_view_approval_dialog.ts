import fs from 'fs';

const content = fs.readFileSync('src/features/reimbursements/pages/ReimbursementModule.tsx', 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('viewingClaim') && (line.includes('&&') || line.includes('if') || line.includes('const') || line.includes('?'))) {
    console.log(`${idx + 1}: ${line}`);
  }
});
