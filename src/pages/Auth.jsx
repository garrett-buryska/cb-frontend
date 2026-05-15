// src/pages/Auth.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const body = { username, password };

    try {
      const data = await apiClient(endpoint, "POST", { body });
      setUser(data.username); 
      navigate('/list', { replace: true }); 
    } catch (err) {
      setError(err.message || `Failed to ${isLogin ? 'log in' : 'sign up'}.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans">
      
      {/* The Paper Card */}
      <div className="w-full max-w-md bg-paper rounded-xl shadow-[0_8px_30px_rgb(52,42,33,0.12)] border border-ink/10 overflow-hidden animate-[slideUp_0.4s_ease-out]">
        
        {/* Header */}
        <div className="p-8 sm:p-10 pb-6 text-center">
          <h2 className="text-3xl font-extrabold text-ink tracking-tight mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-ink-muted italic">
            {isLogin 
              ? '"Grab your box cutter, let\'s get back to work."' 
              : '"Set up your workspace in seconds."'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 sm:px-10 pb-10 space-y-5">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-ink/80" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              placeholder="gbuttisnotmyname"
              className="w-full px-4 py-3 bg-list border-2 border-transparent rounded-lg text-ink placeholder-ink/40 transition-all focus:bg-paper focus:border-tape focus:outline-none focus:ring-4 focus:ring-tape/15"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-ink/80" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 bg-list border-2 border-transparent rounded-lg text-ink placeholder-ink/40 transition-all focus:bg-paper focus:border-tape focus:outline-none focus:ring-4 focus:ring-tape/15"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-4 px-4 py-3.5 bg-stamp hover:bg-stamp-hover text-white font-bold rounded-lg shadow-sm transition-all active:translate-y-[1px] focus:outline-none focus:ring-4 focus:ring-stamp/20 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
          
        </form>

        {/* Footer */}
        <div className="bg-list/50 px-8 py-5 border-t border-ink/5 text-center text-sm text-ink-muted">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            type="button" 
            onClick={toggleMode} 
            className="ml-1.5 font-bold text-stamp hover:text-stamp-hover hover:underline transition-colors focus:outline-none"
          >
            {isLogin ? 'Sign up here' : 'Log in here'}
          </button>
        </div>

      </div>
    </div>
  );
}