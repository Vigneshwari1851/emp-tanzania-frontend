import fs from 'fs';

const content = fs.readFileSync('src/features/reimbursements/pages/ReimbursementModule.tsx', 'utf-8');
const lines = content.split('\n');

for (let i = 3890; i < 3940; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
