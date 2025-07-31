import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function Navigation() {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="bg-card rounded-lg p-4 mb-6">
      <div className="flex gap-6">
        <Link 
          to="/dashboard" 
          className={`text-foreground hover:text-primary transition-colors ${
            isActive('/dashboard') ? 'underline font-semibold' : ''
          }`}
        >
          Dashboard
        </Link>
        <Link 
          to="/recycle-submit" 
          className={`text-foreground hover:text-primary transition-colors ${
            isActive('/recycle-submit') ? 'underline font-semibold' : ''
          }`}
        >
          Submit Recycling
        </Link>
        <Link 
          to="/recycle-history" 
          className={`text-foreground hover:text-primary transition-colors ${
            isActive('/recycle-history') ? 'underline font-semibold' : ''
          }`}
        >
          Recycle History
        </Link>
        <Link 
          to="/profile" 
          className={`text-foreground hover:text-primary transition-colors ${
            isActive('/profile') ? 'underline font-semibold' : ''
          }`}
        >
          Profile
        </Link>
        <button 
          onClick={handleLogout}
          className="text-foreground hover:text-primary transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}