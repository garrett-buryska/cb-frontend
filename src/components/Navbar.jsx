// src/components/Navbar.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  // TODO: Ensure useAuth provides 'user' (username) and a 'logout' function
  const { user, logout } = useAuth(); 

  const handleLogout = async () => {
    try {
      // TODO: Call your backend logout endpoint if required
      if (logout) await logout();
      navigate('/auth', { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <nav className="w-full bg-list/80 backdrop-blur-md border-b border-ink/10 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {/* A simple logo representation - looks like a little shipping box */}
        <div className="w-8 h-8 bg-stamp rounded flex items-center justify-center text-white font-black shadow-sm">
          CB
        </div>
        <h1 className="text-xl font-extrabold text-ink tracking-tight">
          Cardboard
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-bold text-ink-muted hidden sm:inline-block">
          {user ? user : 'Guest Worker'}
        </span>
        <button 
          onClick={handleLogout}
          className="text-sm font-bold text-tag-red hover:text-white hover:bg-tag-red px-3 py-1.5 rounded transition-colors duration-200 border border-transparent hover:border-tag-red/20 focus:outline-none focus:ring-2 focus:ring-tag-red/20"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}