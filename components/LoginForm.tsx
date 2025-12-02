import React, { useState } from 'react';
import { SystemUser, User, UserRole } from '../types';
import { Lock } from 'lucide-react';

interface LoginFormProps {
  systemUsers: SystemUser[];
  onLogin: (user: User) => void;
}

// Custom Moka Pot Icon
const MokaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 19h20" />
    <path d="M4 19v-9l2-3h12l2 3v9" />
    <path d="M6 10h12" />
    <path d="M10 2v5" />
    <path d="M14 2v5" />
    <path d="M8 2h8" />
    <path d="M18 13h3a2 2 0 0 1 2 2v2" />
  </svg>
);

export const LoginForm: React.FC<LoginFormProps> = ({ systemUsers, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = systemUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
      onLogin({ username: user.username, role: user.role });
    } else {
      setError('Credenciales inválidas. Por favor verifique.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-crema">
      <div className="w-full max-w-md p-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl border-2 border-espresso/10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-espresso text-crema mb-4 shadow-lg">
             <MokaIcon className="w-10 h-10" />
          </div>
          <h2 className="text-4xl font-serif font-bold text-espresso">IlNonno</h2>
          <p className="mt-2 text-sm text-sage font-medium tracking-wide uppercase">Caffè Artigianale | Billing System</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-espresso uppercase tracking-wider mb-1">Usuario</label>
              <input
                type="text"
                required
                className="block w-full px-4 py-3 bg-crema border border-espresso/20 text-espresso rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent placeholder-espresso/40 transition"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
               <label className="block text-xs font-bold text-espresso uppercase tracking-wider mb-1">Contraseña</label>
               <div className="relative">
                <input
                    type="password"
                    required
                    className="block w-full px-4 py-3 bg-crema border border-espresso/20 text-espresso rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent placeholder-espresso/40 transition"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute right-3 top-3.5 h-5 w-5 text-espresso/30" />
              </div>
            </div>
          </div>

          {error && <div className="p-3 rounded-lg bg-terracotta/10 text-terracotta text-sm text-center font-medium border border-terracotta/20">{error}</div>}

          <button
            type="submit"
            className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-terracotta hover:bg-terracotta-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-terracotta shadow-md hover:shadow-lg transition-all duration-200 uppercase tracking-widest"
          >
            Ingresar
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-espresso/10 text-center">
            <p className="text-xs text-sage italic">
                "La qualità non è mai casuale"
            </p>
            <p className="text-[10px] text-espresso/40 mt-1">
                Default: admin/password or tech/password
            </p>
        </div>
      </div>
    </div>
  );
};