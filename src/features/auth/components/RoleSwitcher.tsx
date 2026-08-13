import { useState, useRef, useEffect } from "react";
import { ChevronDown, ShieldCheck, Shield, UserCog, User } from "lucide-react";
import { useAuth } from '@/shared/context/AuthContext';
import { UserRole as UserRoleVal } from '@/shared/types/rbac';

const roleConfig = [
  { value: UserRoleVal.SUPER_ADMIN, label: "Super Admin", icon: ShieldCheck, color: "text-purple-600", bg: "bg-purple-100" },
  { value: UserRoleVal.ADMIN, label: "Admin", icon: Shield, color: "text-primary", bg: "bg-primary-100" },
  { value: UserRoleVal.MANAGER, label: "Manager", icon: UserCog, color: "text-blue-600", bg: "bg-blue-100" },
  { value: UserRoleVal.EMPLOYEE, label: "Employee", icon: User, color: "text-gray-600", bg: "bg-muted" },
];

export function RoleSwitcher() {
  const { user, setUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentRoleConfig = roleConfig.find(r => r.value === user?.role) || roleConfig[3];
  const CurrentIcon = currentRoleConfig.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border hover:bg-muted transition-colors ${currentRoleConfig.bg}`}
      >
        <CurrentIcon className={`w-4 h-4 ${currentRoleConfig.color}`} />
        <span className="text-sm font-medium text-foreground hidden md:block">
          {currentRoleConfig.label}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card rounded-sm shadow-sm border border-border py-1 z-50">
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-xs font-semibold text-muted-foreground ">
              Switch Role View
            </p>
          </div>
          {roleConfig.map((role) => {
            const Icon = role.icon;
            const isActive = user?.role === role.value;
            return (
              <button
                key={role.value}
                onClick={() => {
                  if (user && setUser) {
                    setUser({ ...user, role: role.value as any });
                  }
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-muted transition-colors ${isActive ? "bg-muted font-medium text-primary" : "text-foreground"
                  }`}
              >
                <div className={`p-1 rounded-sm ${role.bg}`}>
                  <Icon className={`w-4 h-4 ${role.color}`} />
                </div>
                {role.label}
                {isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
