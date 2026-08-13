import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.tsx";
import { TopNav } from "./TopNav.tsx";
import { SessionTimeout } from "./SessionTimeout.tsx";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden items-start m-0 p-0">
      <SessionTimeout />
      {/* Mobile backdrop overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed position on mobile, relative on desktop */}
      <div
        className={`
          fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto h-full
          transform transition-transform duration-300 ease-in-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => {
            const nextCollapsed = !sidebarCollapsed;
            setSidebarCollapsed(nextCollapsed);
            localStorage.setItem("sidebar_collapsed", String(nextCollapsed));
            window.dispatchEvent(new Event("sidebar-toggle"));
          }}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden m-0 p-0">
        <TopNav onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="flex-1 overflow-auto bg-background px-3 sm:px-6 pt-4 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
