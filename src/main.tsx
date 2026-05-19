import { StrictMode, ErrorInfo, ReactNode } from 'react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorStr = this.state.error?.message || String(this.state.error);
      let errorMsg = "Something went wrong in your production environment.";
      
      try {
        if (errorStr.includes('quota') || errorStr.includes('RATE_LIMIT_EXCEEDED') || errorStr.includes('Rate Exceeded')) {
          errorMsg = "The production system has reached its daily database capacity (Spark Plan limit). Please wait for the daily reset (usually 24 hours) or contact support for an enterprise upgrade.";
        } else {
          const parsed = JSON.parse(errorStr);
          if (parsed.error?.includes('quota') || parsed.error?.includes('permission-denied')) {
            errorMsg = parsed.error.includes('quota') 
              ? "Daily capacity reached. The production engine is currently resting. Please try again later."
              : "Access restricted. You might be trying to view data that doesn't belong to your workspace.";
          }
        }
      } catch (e) {
        // Not JSON
      }

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 rounded-[3rem] max-w-xl w-full text-center border border-white/10 shadow-2xl relative overflow-hidden bg-slate-800/50 backdrop-blur-xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
            
            <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl">
              <AlertCircle size={48} strokeWidth={2.5} />
            </div>
            
            <h1 className="text-3xl font-black text-white mb-6 uppercase tracking-tight">System Interrupted</h1>
            
            <div className="bg-white/5 p-8 rounded-3xl mb-12 border border-white/10 text-left">
              <p className="text-red-400 font-black text-[10px] uppercase tracking-widest mb-3">Diagnostic Message</p>
              <p className="text-slate-300 font-medium leading-relaxed">
                {errorMsg}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <button 
                onClick={this.handleReset}
                className="flex items-center justify-center gap-3 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)]"
              >
                <RefreshCw size={18} /> Re-Initialize
              </button>
              <button 
                onClick={this.handleLogout}
                className="flex items-center justify-center gap-3 py-5 bg-white/5 text-slate-300 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all border border-white/10"
              >
                <LogOut size={18} /> Sign Out
              </button>
            </div>
            
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-12 opacity-50 italic">
               Imran Production &copy; 2026 Executive Infrastructure
            </p>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
