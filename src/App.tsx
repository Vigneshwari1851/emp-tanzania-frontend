import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes/routes.tsx";
import { ThemeProvider } from "@/shared/context/ThemeContext";
import { AuthProvider } from "@/shared/context/AuthContext";
import { NotificationProvider } from "@/shared/context/NotificationContext";
import { PayrollProvider } from "@/features/payroll/context/PayrollContext";
import { TolgeeProvider } from "@tolgee/react";
import { tolgee } from "@/shared/i18n/tolgee";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import './App.css'

const router = createBrowserRouter(routes, { basename: "/rafiki/" });
const queryClient = new QueryClient();

function App() {
  return (
    <TolgeeProvider tolgee={tolgee} fallback={null}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <PayrollProvider>
                <Toaster position="top-right" richColors duration={1000} />
                <RouterProvider router={router} />
              </PayrollProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </TolgeeProvider>
  )
}

export default App
