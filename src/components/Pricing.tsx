import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  Zap, 
  Shield, 
  Users, 
  Video, 
  BarChart, 
  FileText, 
  Cloud,
  ChevronRight,
  Sparkles,
  Trophy,
  ArrowRight,
  QrCode
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Pricing({ userProfile, onUpgradeRequest, onRedeemCode }: { userProfile?: any, onUpgradeRequest: () => void, onRedeemCode: (code: string) => Promise<void> }) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const isPremium = userProfile?.planType === 'premium';

  const features = [
    { icon: <Cloud size={14} />, label: 'Google Drive Automation', free: false, pro: true },
    { icon: <Users size={14} />, label: 'Team Collaboration (3 seats)', free: false, pro: true },
    { icon: <BarChart size={14} />, label: 'Elite Analytics Dashboard', free: false, pro: true },
    { icon: <Shield size={14} />, label: 'VIP Priority Support', free: false, pro: true },
    { icon: <FileText size={14} />, label: 'Advanced Invoice Generator', free: true, pro: true },
    { icon: <Sparkles size={14} />, label: 'Milestone Achievement System', free: true, pro: true },
  ];

  return (
    <div className="space-y-20 pb-32">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-3 bg-brand-500/5 px-6 py-2.5 rounded-full border border-brand-500/10 mb-6 shadow-2xl shadow-brand-500/5">
          <Zap size={16} className="text-brand-500" />
          <span className="text-[10px] font-black text-brand-500 tracking-widest">Ascend to Hero Status</span>
        </div>
        <h2 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-[0.8] mb-8 uppercase">
          Tactical <br /><span className="text-transparent bg-clip-text bg-gradient-to-b from-brand-500 to-emerald-900 italic">Ownership</span>
        </h2>
        <p className="text-slate-600 font-bold tracking-tight italic text-lg md:text-xl max-w-2xl mx-auto opacity-80">
          Precision-engineered scaling for high-volume content studios.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl mx-auto">
        {/* Free Plan */}
        <div className="glass-card !p-12 relative overflow-hidden group border border-white/[0.03]">
          <div className="relative z-10 flex flex-col h-full">
            <header className="mb-12">
               <h3 className="text-3xl font-black text-white tracking-tighter leading-none mb-3">Operator</h3>
               <p className="text-slate-700 font-black text-[10px] tracking-widest mb-10 italic">Baseline Protocol</p>
               
               <div className="flex items-baseline gap-2">
                 <span className="text-6xl font-black text-white tracking-tighter">$0</span>
                 <span className="text-slate-700 font-black text-[10px] tracking-widest">/ Legacy</span>
               </div>
            </header>

            <div className="space-y-6 mb-16 flex-1">
              {features.map((f, i) => (
                <div key={i} className={cn("flex items-center gap-5 transition-all", !f.free && "opacity-10 grayscale")}>
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border", f.free ? "bg-emerald-500 border-emerald-500/20 text-[#0D1117]" : "bg-white/5 border-white/10 text-slate-700")}>
                    {f.free ? <Check size={14} strokeWidth={4} /> : <Zap size={12} />}
                  </div>
                  <span className="text-[10px] font-black text-slate-500 tracking-widest leading-none">{f.label}</span>
                </div>
              ))}
            </div>

            {isPremium ? (
              <button 
                disabled={true} 
                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl font-black text-slate-800 tracking-widest text-[10px] cursor-not-allowed"
              >
                Protocol Locked
              </button>
            ) : (
              <button className="w-full h-16 bg-white/10 text-white rounded-2xl font-black text-[10px] tracking-widest cursor-default border border-white/5">
                Current State
              </button>
            )}
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-[100px] -mr-24 -mt-24 opacity-30" />
        </div>

        {/* Pro Plan */}
        <div className="relative group scale-105 z-20">
          <div className="absolute -inset-1 bg-gradient-to-b from-brand-500 to-emerald-900 rounded-[3.2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="glass-card !p-1 relative overflow-hidden bg-white/[0.02] border-brand-500/50 min-h-full">
            <div className="bg-[#0D1117]/80 backdrop-blur-3xl rounded-[2.8rem] p-12 h-full relative z-10 flex flex-col border border-white/[0.03]">
               <div className="absolute top-8 right-8">
                 <div className="bg-brand-500 text-[#0D1117] px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest shadow-2xl shadow-brand-500/30 ring-8 ring-[#0D1117]">
                   Elite
                 </div>
               </div>

               <header className="mb-12">
                  <h3 className="text-3xl font-black text-white tracking-tighter leading-none mb-3">Commander</h3>
                  <p className="text-brand-500 font-black text-[10px] tracking-widest mb-10 italic flex items-center gap-3">
                    <Trophy size={16} /> Unlimited Reach
                  </p>
                  
                  <div className="flex flex-col gap-2">
                     <div className="flex items-baseline gap-3">
                        <span className="text-slate-800 font-black text-3xl line-through tracking-tighter opacity-40">$89</span>
                        <span className="text-8xl font-black text-white tracking-tighter leading-none">$14</span>
                     </div>
                     <p className="text-[10px] font-black text-emerald-500 tracking-widest mt-4 shadow-emerald-500/20">Launch Synchronization Protcol Active</p>
                  </div>
               </header>

               <div className="space-y-6 mb-16 flex-1">
                 {features.map((f, i) => (
                   <div key={i} className="flex items-center gap-5">
                     <div className="w-6 h-6 rounded-lg bg-brand-500 text-[#0D1117] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,200,83,0.3)]">
                       <Check size={14} strokeWidth={4} />
                     </div>
                     <span className="text-[10px] font-black text-white tracking-widest leading-none">{f.label}</span>
                   </div>
                 ))}
               </div>

               {isPremium ? (
                 <div className="w-full h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-3xl font-black tracking-widest text-[11px] flex items-center justify-center gap-3 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                   <Shield size={18} />
                   Authenticated
                 </div>
               ) : (
                 <button 
                   onClick={onUpgradeRequest}
                   className="w-full h-20 bg-brand-500 hover:bg-brand-400 text-[#0D1117] rounded-3xl font-black tracking-widest text-[11px] shadow-[0_20px_50px_rgba(0,200,83,0.3)] hover:scale-[1.02] active:scale-[0.95] transition-all flex items-center justify-center gap-4 group/btn"
                 >
                   Authorize Upgrade
                   <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" strokeWidth={3} />
                 </button>
               )}
            </div>
          </div>
        </div>

        {/* Partner Block */}
        {!isPremium && (
          <div className="glass-card !p-12 relative overflow-hidden flex flex-col items-center justify-center text-center group border-dashed border-white/5 border-2">
            <div className="mb-10 w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center border border-white/10 group-hover:border-brand-500/30 transition-all">
               <QrCode className="text-brand-500 w-12 h-12 opacity-30 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
            </div>
            
            <h3 className="text-2xl font-black text-white tracking-tighter mb-4">Frequency Unlock</h3>
            <p className="text-slate-600 font-bold text-[10px] tracking-widest italic mb-12 max-w-[200px] leading-relaxed">
              Encode protocol signal below to force authentication.
            </p>

            <div className="w-full space-y-6">
              <div className="relative">
                <input 
                  type="text" 
                  value={redeemCode}
                  onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="Encode..."
                  className="w-full h-16 bg-white/[0.03] border border-white/10 rounded-2xl px-6 text-white font-black text-center tracking-[0.6em] focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/30 outline-none transition-all placeholder:text-slate-900"
                />
                <Sparkles className="absolute right-6 top-1/2 -translate-y-1/2 text-brand-500/10 pointer-events-none" size={16} />
              </div>

              <button 
                onClick={async () => {
                  if (!redeemCode) return;
                  setIsRedeeming(true);
                  try {
                    await onRedeemCode(redeemCode);
                    setRedeemCode('');
                  } finally {
                    setIsRedeeming(false);
                  }
                }}
                disabled={isRedeeming || !redeemCode}
                className="w-full h-16 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 disabled:opacity-20"
              >
                {isRedeeming ? 'Validating signal...' : 'Decode Signal'}
              </button>
            </div>

            <div className="mt-14 pt-10 border-t border-white/[0.03] w-full">
               <p className="text-[9px] font-black text-slate-800 tracking-widest mb-4">Awaiting Signal Synchronization</p>
               <button 
                onClick={onUpgradeRequest}
                className="text-[10px] font-black text-brand-500/40 hover:text-brand-500 tracking-widest transition-all flex items-center justify-center gap-3 mx-auto"
               >
                 Request Admin Override <ChevronRight size={12} />
               </button>
            </div>
            
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-500/5 rounded-full blur-[100px] opacity-20" />
          </div>
        ) }
      </div>

      {/* Security Badges */}
      <div className="max-w-5xl mx-auto pt-20 border-t border-white/[0.03] flex flex-wrap justify-center gap-12 opacity-20">
        {['Secure Vault Encryption', 'Instant Cancel Protocol', '30-Day Recovery Guarantee', 'Zero Hidden Overhead'].map((badge, i) => (
           <div key={i} className="flex items-center gap-4">
              <Shield size={16} className="text-white" />
              <span className="text-[10px] font-black text-white tracking-widest">{badge}</span>
           </div>
        ))}
      </div>
    </div>
  );
}
