import fs from 'fs';

const content = fs.readFileSync('src/features/payroll/services/payroll.ts', 'utf-8');
const lines = content.split('\n');

let start = -1;
lines.forEach((line, idx) => {
  if (line.includes('updateClaimStatus')) {
    start = idx;
  }
});

if (start !== -1) {
  for (let i = start; i < start + 15; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('updateClaimStatus not found');
}
