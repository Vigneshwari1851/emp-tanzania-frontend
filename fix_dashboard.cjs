const fs = require('fs');
const file = 'src/features/dashboard/pages/Dashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  `}
            </button>
          ))}
              teamStats={teamStats}
            />
          )}
        </>
      )}`,
  `}
            </button>
          ))}
        </div>
      </div>

      {activeMainTab === 'overview' && (
        <>
          {(user?.role?.toUpperCase() === 'SUPER_ADMIN' || user?.role?.toUpperCase() === 'ADMIN') && <AdminDashboard />}
          {user?.role?.toUpperCase() === 'MANAGER' && <ManagerDashboard />}
          {user?.role?.toUpperCase() === 'FINANCE' && <FinanceDashboard />}
          {(!user?.role || user?.role?.toUpperCase() === 'EMPLOYEE' || user?.role === 'Employee') && (
            <DashboardOverview 
              upcomingEvents={upcomingEvents}
              attendanceLogs={attendanceLogs}
              celebrations={celebrations}
              companyNews={companyNews}
              teamStats={teamStats}
            />
          )}
        </>
      )}`
);

fs.writeFileSync(file, c);
