import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Video, Clock, CheckCircle2, Calendar, Layout, User, Activity, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function ClientPortal({ portalToken }: { portalToken: string }) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        // In a real app, we might have a dedicated collection for tokens
        // For simplicity, we'll assume the portalToken is the project ID (or a specialized token field)
        const projectRef = doc(db, 'projects', portalToken);
        const snap = await getDoc(projectRef);
        
        if (snap.exists()) {
          setProject({ id: snap.id, ...snap.data() });
        } else {
          setError("This project portal is no longer active or the link is invalid.");
        }
      } catch (err) {
        setError("Unable to load project status.");
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [portalToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6">
            <Layout size={40} />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Portal Inactive</h2>
          <p className="text-slate-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const isDone = project.publicStatus === 'Done' || project.publicStatus === 'Ready for Review';

  return (
    <div className="min-h-screen bg-[#0D1117] text-slate-100 font-sans selection:bg-brand-500/30">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-32">
        <header className="mb-20 text-center md:text-left animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="flex items-center gap-6 justify-center md:justify-start mb-12">
            <div className="w-20 h-20 bg-brand-500 rounded-[32px] flex items-center justify-center shadow-[0_20px_50px_rgba(0,200,83,0.3)] relative group">
              <div className="absolute inset-0 bg-brand-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <Video className="text-[#0D1117] w-10 h-10 relative z-10" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter leading-none mb-2">Project Intelligence</h1>
              <p className="text-brand-500 font-black text-[10px] tracking-widest ml-1">Live Operative Portal</p>
            </div>
          </div>

          <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] mb-6 max-w-2xl">
            {project.name}
          </h2>
          <p className="text-slate-500 text-xl font-bold tracking-tight italic opacity-60">
            Real-time tactical progress tracking for your production assets.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
          <div className="glass-card !p-12 relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Activity size={80} className="text-brand-500" />
            </div>
            <p className="text-brand-500 font-black text-[10px] tracking-widest mb-8">Deployment Status</p>
            <div className="flex items-center gap-6">
               {isDone ? (
                 <CheckCircle2 size={56} className="text-emerald-500 shrink-0" />
               ) : (
                 <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}>
                    <Clock size={56} className="text-amber-500 shrink-0" />
                 </motion.div>
               )}
               <div>
                  <h3 className={cn(
                    "text-4xl font-black tracking-tighter leading-none mb-2",
                    isDone ? "text-emerald-500" : "text-amber-500"
                  )}>
                    {project.publicStatus || 'Awaiting'}
                  </h3>
                  <p className="text-slate-600 font-black text-[10px] tracking-widest leading-none">
                    Last Update: {project.updatedAt?.toDate ? format(project.updatedAt.toDate(), 'h:mm a') : 'Instant Sync'}
                  </p>
               </div>
            </div>
          </div>

          <div className="glass-card !p-12 relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Calendar size={80} className="text-white" />
            </div>
            <p className="text-slate-600 font-black text-[10px] tracking-widest mb-8">E.T.A Signal</p>
            <div className="flex items-center gap-6">
              <Calendar size={56} className="text-white shrink-0 opacity-20" />
              <div>
                <h3 className="text-4xl font-black text-white tracking-tighter leading-none mb-2">
                  {project.endDate?.toDate ? format(project.endDate.toDate(), 'MMM d, yyyy') : 'TBD'}
                </h3>
                <p className="text-slate-600 font-black text-[10px] tracking-widest leading-none">
                  Target Delivery Date
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card !p-12 space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
           <header className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                 <Layout size={24} className="text-slate-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-widest">Operational Timeline</h3>
                <p className="text-[10px] font-bold text-slate-700 tracking-widest italic mt-1">Audit of logistical milestones</p>
              </div>
           </header>
           
           <div className="space-y-16">
              <div className="flex gap-8 relative group">
                 <div className="absolute left-[15px] top-10 bottom-[-64px] w-0.5 bg-white/[0.03] group-last:hidden" />
                 <div className={cn(
                   "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all border-2",
                   project.publicStatus === 'Ready for Review' || project.publicStatus === 'Done' ? "bg-emerald-500 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-[#0D1117] border-white/10"
                 )}>
                    <CheckCircle2 size={16} className={cn(project.publicStatus === 'Ready for Review' || project.publicStatus === 'Done' ? "text-[#0D1117]" : "text-slate-800")} />
                 </div>
                 <div>
                    <h4 className="font-black text-xs tracking-widest mb-3 text-white">Final Synchronization & Sign-off</h4>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xl">
                      Production assets are compiled for final tactical review. Secure sign-off required to finalize project deployment.
                    </p>
                 </div>
              </div>

              <div className="flex gap-8 relative group">
                 <div className="absolute left-[15px] top-10 bottom-[-64px] w-0.5 bg-white/[0.03] group-last:hidden" />
                 <div className={cn(
                   "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all border-2",
                   project.publicStatus === 'In Editing' || project.publicStatus === 'In Progress' ? "bg-amber-500 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]" : (project.publicStatus === 'Ready for Review' || project.publicStatus === 'Done') ? "bg-emerald-500 border-emerald-500/50" : "bg-[#0D1117] border-white/10"
                 )}>
                    <Clock size={16} className={cn(project.publicStatus === 'In Editing' || project.publicStatus === 'In Progress' ? "text-[#0D1117]" : (project.publicStatus === 'Ready for Review' || project.publicStatus === 'Done') ? "text-[#0D1117]" : "text-slate-800")} />
                 </div>
                 <div>
                    <h4 className="font-black text-xs tracking-widest mb-3 text-white">Advanced Processing & Assembly</h4>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xl">
                      Logistical components are being synthesized. Advanced color grading, sound engineering, and creative assembly are in progress.
                    </p>
                 </div>
              </div>

              <div className="flex gap-8 relative group">
                 <div className={cn(
                   "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all border-2",
                   "bg-emerald-500 border-emerald-500/50"
                 )}>
                    <CheckCircle2 size={16} className="text-[#0D1117]" />
                 </div>
                 <div>
                    <h4 className="font-black text-xs tracking-widest mb-3 text-white">Base Initialization</h4>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xl">
                      Project baseline established. Master assets ingested and verified for production compatibility.
                    </p>
                    <p className="text-[10px] font-black text-slate-800 tracking-widest mt-6 bg-white/5 py-2 px-4 rounded-lg w-fit border border-white/[0.03]">
                      Archive Date: {project.createdAt?.toDate ? format(project.createdAt.toDate(), 'MMM d, yyyy') : 'Live Sync'}
                    </p>
                 </div>
              </div>
           </div>
        </div>

        <footer className="mt-32 text-center">
           <p className="text-[10px] font-black text-slate-800 tracking-widest mb-10">Secured Architecture by FrameStack</p>
           <div className="flex items-center justify-center gap-10 opacity-10 grayscale">
              <Video size={24} />
              <Shield size={24} />
              <Activity size={24} />
           </div>
        </footer>
      </div>
    </div>
  );
}
