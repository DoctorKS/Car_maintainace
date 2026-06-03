import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@/lib/supabase/session';
import Spinner from './Spinner';

export default function AuthGuard() {
  const session = useSession();
  const location = useLocation();

  if (session === undefined) {
    // initial load
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-900">
        <Spinner />
      </div>
    );
  }
  if (session === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
