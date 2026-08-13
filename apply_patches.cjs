const fs = require('fs');
const file = 'src/features/dashboard/pages/Dashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Add import for HRDashboard
if (!c.includes('HRDashboard')) {
  c = c.replace(
    "import { EmployeeDashboard } from '../components/EmployeeDashboard';",
    "import { EmployeeDashboard } from '../components/EmployeeDashboard';\nimport { HRDashboard } from '../components/HRDashboard';"
  );
}

// 2. Make user.role case insensitive
c = c.replace(
  "{(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && <AdminDashboard />}",
  "{(user?.role?.toUpperCase() === 'SUPER_ADMIN' || user?.role?.toUpperCase() === 'ADMIN') && <AdminDashboard />}"
);
c = c.replace(
  "{user?.role === 'MANAGER' && <ManagerDashboard />}",
  "{user?.role?.toUpperCase() === 'MANAGER' && <ManagerDashboard />}"
);
c = c.replace(
  "{user?.role === 'FINANCE' && <FinanceDashboard />}",
  "{user?.role?.toUpperCase() === 'FINANCE' && <FinanceDashboard />}"
);
c = c.replace(
  "{(user?.role === 'EMPLOYEE' || !user?.role) && (",
  "{(!user?.role || user?.role?.toUpperCase() === 'EMPLOYEE' || user?.role === 'Employee') && ("
);

// 3. Inject HRDashboard conditional render
const targetRender = `      {(activeMainTab !== 'overview' && activeMainTab !== 'journey') && (
        <div className="space-y-6">`;
const replaceRender = `      {activeMainTab === 'hr' && (
        <HRDashboard />
      )}

      {(activeMainTab !== 'overview' && activeMainTab !== 'journey' && activeMainTab !== 'hr') && (
        <div className="space-y-6">`;

c = c.replace(targetRender, replaceRender);

fs.writeFileSync(file, c);
console.log('Patches applied successfully!');
