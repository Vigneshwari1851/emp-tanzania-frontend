const fs = require('fs');
const path = require('path');
const dir = 'src/features/dashboard/components';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function writeComp(name, title, color) {
  const content = `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ${name === 'AdminDashboard' ? 'Users, Briefcase, TrendingUp' : name === 'FinanceDashboard' ? 'DollarSign, FileText, PieChart' : name === 'ManagerDashboard' ? 'Users, Target, Calendar' : 'Clock, Target, Zap'} } from 'lucide-react';

export function ${name}() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md shadow-${color}-100/50 bg-gradient-to-br from-${color}-50 to-white">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <${name === 'AdminDashboard' ? 'Users' : name === 'FinanceDashboard' ? 'DollarSign' : name === 'ManagerDashboard' ? 'Users' : 'Clock'} className="w-5 h-5 text-${color}-600" />
              ${title} Metric 1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-${color}-600">--</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md shadow-${color}-100/50 bg-gradient-to-br from-${color}-50 to-white">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <${name === 'AdminDashboard' ? 'Briefcase' : name === 'FinanceDashboard' ? 'FileText' : name === 'ManagerDashboard' ? 'Target' : 'Target'} className="w-5 h-5 text-${color}-600" />
              ${title} Metric 2
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-${color}-600">--</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md shadow-${color}-100/50 bg-gradient-to-br from-${color}-50 to-white">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <${name === 'AdminDashboard' ? 'TrendingUp' : name === 'FinanceDashboard' ? 'PieChart' : name === 'ManagerDashboard' ? 'Calendar' : 'Zap'} className="w-5 h-5 text-${color}-600" />
              ${title} Metric 3
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-${color}-600">--</p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>${title} Action Center</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
            <p className="text-slate-400 font-medium">Detailed widgets for ${title} will go here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(dir, name + '.tsx'), content);
}

writeComp('AdminDashboard', 'Admin & HR', 'primary');
writeComp('ManagerDashboard', 'Manager', 'blue');
writeComp('FinanceDashboard', 'Finance', 'emerald');
writeComp('EmployeeDashboard', 'Employee', 'purple');
console.log('Created dashboard components');
