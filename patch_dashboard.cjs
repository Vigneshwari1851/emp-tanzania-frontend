const fs = require('fs');
const file = 'src/features/dashboard/pages/Dashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "{(activeMainTab !== 'overview' && activeMainTab !== 'journey') && (",
  "{activeMainTab === 'hr' && (\\n        <HRDashboard />\\n      )}\\n\\n      {(activeMainTab !== 'overview' && activeMainTab !== 'journey' && activeMainTab !== 'hr') && ("
);

fs.writeFileSync(file, c);
