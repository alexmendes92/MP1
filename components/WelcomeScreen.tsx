
import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Logo from './Logo';

interface WelcomeScreenProps {
  onLogin: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Simulating authentication delay
    setTimeout(() => {
        if (email && password) {
            onLogin();
        } else {
            setError("Preencha todos os campos.");
            setLoading(false);
        }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-500">
        <div className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
          <div className="p-8 flex flex-col items-center text-center">
            <Logo className="h-16 mb-6" isDark={true} />
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Bem-vindo ao Sistema</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">Painel do Oficial de Promotoria</p>
            
            <form onSubmit={handleAuth} className="w-full space-y-4">
              {error && (
                <div className="bg-red-950/40 text-red-400 p-3 rounded-xl flex items-center gap-2 text-xs font-bold border border-red-900/50 animate-in slide-in-from-top-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <div className="text-left">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">E-mail Institucional</label>
                <input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@mpsp.mp.br" className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-slate-100 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all shadow-inner" required />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-slate-100 outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all shadow-inner" required />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]">
                {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                {loading ? 'Entrando...' : (isSignUp ? 'Criar Conta' : 'Acessar Intranet')}
              </button>
              <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="text-xs text-slate-500 hover:text-red-500 font-bold uppercase tracking-wider transition-colors pt-2">
                {isSignUp ? 'Já tem conta? Login' : 'Novo por aqui? Cadastro'}
              </button>
            </form>
          </div>
          <div className="bg-slate-950/50 py-4 px-8 border-t border-slate-800 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-slate-600" />
            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-widest">Acesso Restrito - MPSP</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
