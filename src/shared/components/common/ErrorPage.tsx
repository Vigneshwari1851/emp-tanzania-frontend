import React from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Home, RefreshCw, AlertCircle, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/button';

export const ErrorPage: React.FC = () => {
  const error = useRouteError();
  const navigate = useOrgNavigate();

  let errorMessage = "An unexpected error has occurred.";
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.statusText || error.data?.message || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (error == null) {
    errorStatus = 404;
    errorMessage = "The page you're looking for doesn't exist or has been moved to a new location.";
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-6 font-poppins">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-lg flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle size={48} strokeWidth={2.5} />
          </div>
          <div className="absolute -top-2 -right-2 bg-card px-3 py-1 rounded-full shadow-sm border border-border">
            <span className="text-sm font-black text-foreground">{errorStatus}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {errorStatus === 404 ? "Page Not Found" : "Something went wrong"}
          </h1>
          <p className="text-muted-foreground font-medium leading-relaxed">
            {errorStatus === 404 
              ? "The page you're looking for doesn't exist or has been moved to a new location."
              : errorMessage}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Button 
            variant="outline" 
            className="rounded-lg font-bold py-6 border-border hover:bg-muted flex items-center justify-center gap-2"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={18} /> Go Back
          </Button>
          <Button 
            variant="primary" 
            className="rounded-lg font-bold py-6 bg-primary hover:bg-primary/95 shadow-sm shadow-primary-100 flex items-center justify-center gap-2"
            onClick={() => navigate('/')}
          >
            <Home size={18} /> Home
          </Button>
        </div>

        <div className="pt-8">
          <button 
            onClick={() => window.location.reload()}
            className="text-muted-foreground hover:text-primary text-xs font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
          >
            <RefreshCw size={14} /> Try Refreshing the Page
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-20 grayscale">
         <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">L</div>
         <span className="font-bold text-foreground tracking-tight">Lattium Tech</span>
      </div>
    </div>
  );
};

export default ErrorPage;
