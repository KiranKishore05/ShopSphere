import React from 'react';
import { Navigate, useLocation, Outlet, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-sphere-ivory">
        <div className="w-10 h-10 border-2 border-sphere-ink/20 border-t-sphere-ink rounded-full animate-spin mb-4" />
        <span className="font-editorial text-lg text-sphere-ink tracking-wider">
          Verifying Atelier Administrative Authority...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center bg-sphere-ivory">
        <div className="w-16 h-16 rounded-full bg-sphere-status-error/10 text-sphere-status-error flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl text-sphere-ink font-normal mb-3">
          Restricted Atelier Area
        </h1>
        <p className="text-sphere-charcoal text-sm max-w-md mb-8 leading-relaxed">
          Access to the administrative control panel is restricted to verified ShopSphere administrators. Your account (<span className="font-mono text-xs font-semibold">{user?.email}</span>) does not possess executive management privileges.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-sphere-ink text-sphere-ivory text-xs uppercase tracking-widest hover:bg-sphere-charcoal transition-colors font-medium rounded-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Storefront</span>
        </Link>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
