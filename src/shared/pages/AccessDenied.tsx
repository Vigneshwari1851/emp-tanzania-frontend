import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from '@/shared/components/ui/button';

export function AccessDenied() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-red-50 rounded-lg flex items-center justify-center mb-6 border border-red-100 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-red-600" />
      </div>
      
      <h1 className="text-3xl font-bold text-foreground mb-3 ">Access Denied</h1>
      <p className="text-slate-600 max-w-md mb-8 leading-relaxed">
        You don't have the necessary permissions to access this page. 
        If you believe this is an error, please contact your system administrator.
      </p>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="gap-2 px-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
        <Link to="/">
          <Button className="gap-2 px-6 bg-slate-900 hover:bg-slate-800">
            <Home className="w-4 h-4" />
            Dashboard
          </Button>
        </Link>
      </div>
      
      <div className="mt-12 pt-8 border-t border-border w-full max-w-xs text-xs text-muted-foreground">
        Error Code: 403 Forbidden
      </div>
    </div>
  );
}
