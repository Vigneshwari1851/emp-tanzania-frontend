import fs from 'fs';

const content = fs.readFileSync('src/features/payroll/services/payroll.ts', 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('updateClaimStatus =')) {
    console.log(`${idx + 1}: ${line}`);
    for (let i = idx; i < idx + 15; i++) {
      console.log(`  ${i + 2}: ${lines[i + 1]}`);
    }
  }
});
