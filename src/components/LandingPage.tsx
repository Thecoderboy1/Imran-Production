import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import MouseFollower from './MouseFollower';
import { 
  DollarSign, 
  CheckCircle2, 
  Zap, 
  Shield, 
  ShieldCheck,
  BarChart2, 
  CreditCard,
  ArrowRight,
  Monitor,
  Layout,
  Clock,
  Layers,
  Sparkles,
  Trophy,
  Users,
  Settings,
  History,
  Activity
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';

import ThreeDCanvas from './ThreeDCanvas';

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="h-screen w-screen bg-[#0D1117] text-slate-100 font-sans selection:bg-brand-500 selection:text-navy-900 overflow-hidden relative">
      <MouseFollower />
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-2xl shadow-brand-500/20 relative group">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-brand-500 blur-xl rounded-full" 
              />
              <span className="text-[#0D1117] font-black text-sm relative z-10 tracking-widest">FS</span>
           </div>
           <span className="font-black text-xl text-white tracking-tighter whitespace-nowrap">FrameStack</span>
        </div>
        <button 
          onClick={onGetStarted}
          className="px-6 py-2 bg-white/5 border border-white/10 text-white rounded-lg font-black text-[10px] tracking-widest hover:bg-brand-500 hover:text-[#0D1117] hover:border-brand-500 transition-all active:scale-95"
        >
          Initialize Access
        </button>
      </nav>

      {/* Main Container */}
      <main className="h-full w-full flex flex-col lg:flex-row items-center justify-center gap-20 px-8 pt-20">
        
        {/* Left Side: Copy */}
        <div className="flex-1 max-w-2xl z-10">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 mb-6">
               <span className="h-[1px] w-8 bg-brand-500" />
               <span className="text-[10px] font-black text-brand-500 tracking-wider">Next gen financial os</span>
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] mb-8">
              The Ledger <br />
              <span className="italic text-brand-500 opacity-90">Redefined.</span>
            </h1>
            
            <p className="text-slate-400 text-lg md:text-xl font-bold mb-12 leading-relaxed italic max-w-xl">
              Precision revenue tracking, automated invoicing, and client vaults. Built for the elite standard of modern media entrepreneurs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onGetStarted}
                className="px-10 py-5 bg-brand-500 text-[#0D1117] rounded-xl font-black text-xs tracking-widest shadow-2xl shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group"
              >
                Launch Workspace <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="flex -space-x-3 items-center ml-4 opacity-60 overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0D1117] bg-slate-800 flex items-center justify-center">
                    <Users size={14} className="text-slate-400" />
                  </div>
                ))}
                <span className="ml-4 text-[9px] font-black text-slate-500 tracking-wider">Verified by 200+ Units</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Animated Mockup */}
        <div className="flex-1 w-full max-w-4xl relative hidden lg:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative"
          >
            {/* The Main Window */}
            <div className="glass-card !p-0 rounded-[2rem] border-white/5 shadow-2xl overflow-hidden aspect-[16/10] relative bg-[#0D1117]">
              {/* Window Header */}
              <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-6 justify-between">
                <div className="flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-red-500/50" />
                   <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                   <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
                <div className="text-[8px] font-black text-slate-600 tracking-widest text-[8px]">Secure_Upgrade_Interface.v4</div>
                <div className="w-10" />
              </div>
              
              <div className="p-12 h-full flex items-center justify-center">
                <UpgradeSequence />
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 glass-card !p-4 rounded-xl shadow-xl border-brand-500/20 z-20 flex items-center gap-3"
            >
               <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-brand-500" />
               </div>
               <div className="text-[9px] font-black text-white tracking-widest">ENCRYPTED</div>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Footer Minimal */}
      <footer className="absolute bottom-8 left-8 right-8 flex items-center justify-between opacity-30">
        <p className="text-[8px] font-black tracking-wider text-slate-500">© 2026 FrameStack protocols</p>
        <div className="flex gap-8">
           <span className="text-[8px] font-black tracking-wider text-slate-500">Satellite_Active</span>
           <span className="text-[8px] font-black tracking-wider text-slate-500">V4.02.0</span>
        </div>
      </footer>
    </div>
  );
}

function UpgradeSequence() {
  const [phase, setPhase] = useState<'IDLE' | 'TYPING' | 'CLICKING' | 'SUCCESS'>('IDLE');
  const [promoText, setPromoText] = useState('');
  const fullText = '[WELCOME100]';

  useEffect(() => {
    const timer = setTimeout(() => {
      if (phase === 'IDLE') setPhase('TYPING');
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'TYPING') {
      if (promoText.length < fullText.length) {
        const timer = setTimeout(() => {
          setPromoText(fullText.slice(0, promoText.length + 1));
        }, 150);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setPhase('CLICKING'), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, promoText]);

  useEffect(() => {
    if (phase === 'CLICKING') {
      const timer = setTimeout(() => setPhase('SUCCESS'), 1000);
      return () => clearTimeout(timer);
    }
    if (phase === 'SUCCESS') {
      const timer = setTimeout(() => {
        setPhase('IDLE');
        setPromoText('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div className="w-full max-w-md relative">
      <AnimatePresence mode="wait">
        {phase !== 'SUCCESS' ? (
          <motion.div
            key="upgrade-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card !p-8 border-white/10"
          >
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                   <Zap size={24} className="text-brand-500" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-white tracking-tight">Upgrade to Elite</h3>
                   <p className="text-[10px] font-bold text-slate-500 italic">Unlock the full financial spectrum</p>
                </div>
             </div>

             <div className="space-y-6">
                <div className="space-y-3">
                   <label className="text-[9px] font-black text-slate-500 tracking-[0.2em]">PROMO CODE</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center text-slate-600">
                         <Sparkles size={14} />
                      </div>
                      <div className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-12 flex items-center text-white font-mono text-sm tracking-widest">
                        {promoText}
                        {phase === 'TYPING' && (
                          <motion.div 
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="w-2 h-4 bg-brand-500 ml-1"
                          />
                        )}
                      </div>
                   </div>
                </div>

                <motion.button
                  animate={phase === 'CLICKING' ? { scale: [1, 0.9, 1] } : {}}
                  className="w-full py-5 bg-brand-500 text-[#0D1117] rounded-xl font-black tracking-widest text-[10px] shadow-lg shadow-brand-500/20 flex items-center justify-center gap-3"
                >
                  {phase === 'CLICKING' ? 'PROCESSING...' : 'INITIALIZE UPGRADE'}
                </motion.button>
             </div>
          </motion.div>
        ) : (
          <motion.div
            key="success-panel"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-8"
          >
            <div className="relative mb-8">
               <motion.div 
                 animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
                 transition={{ duration: 1, ease: "easeOut" }}
                 className="w-24 h-24 bg-brand-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,200,83,0.4)]"
               >
                  <CheckCircle2 size={48} className="text-[#0D1117]" />
               </motion.div>
               <motion.div 
                 animate={{ scale: [0, 2], opacity: [1, 0] }}
                 className="absolute inset-0 bg-brand-500 rounded-full"
               />
            </div>
            
            <h3 className="text-4xl font-black text-white tracking-tighter mb-4 scale-110">PREMIUM UNLOCKED</h3>
            <p className="text-emerald-500 font-bold italic text-xs tracking-widest">ALL PRODUCTION PROTOCOLS ACTIVE</p>
            
            <div className="mt-12 flex gap-4">
               {[1, 2, 3].map(i => (
                 <motion.div
                   key={i}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.2 + (i * 0.1) }}
                   className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center"
                 >
                    <Shield size={20} className="text-brand-500" />
                 </motion.div>
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

