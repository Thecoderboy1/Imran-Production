import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Calendar, Lock, Trophy, TrendingUp, Star, Zap, Flame, Rocket, Diamond, Crown, Sparkles, Clapperboard, Music, Medal, Factory, Target, Handshake, Network, Building, Sprout, CalendarDays, Mountain, BadgeCheck } from 'lucide-react';
import { MILESTONES, Milestone, MilestoneCategory, HexagonBadge } from './MilestoneSystem';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface MilestonesTabProps {
  userProfile: any;
  projects: any[];
  clients: any[];
  invoices: any[];
}

export default function MilestonesTab({ userProfile, projects, clients, invoices }: MilestonesTabProps) {
  const [activeView, setActiveView] = useState<'UNLOCKED' | 'LOCKED'>('UNLOCKED');
  const milestoneData = { projects, clients, invoices, userProfile };
  
  const unlockedIds = useMemo(() => userProfile?.milestones || [], [userProfile]);

  // Mark all as seen when entering this tab
  useEffect(() => {
    if (userProfile?.uid && userProfile?.unseenMilestones?.length > 0) {
      updateDoc(doc(db, 'userProfiles', userProfile.uid), {
        unseenMilestones: []
      }).catch(err => console.error("Failed to clear unseen milestones", err));
    }
  }, [userProfile?.uid, userProfile?.unseenMilestones]);

  const milestones = useMemo(() => {
    return MILESTONES.map(m => ({
      ...m,
      unlocked: unlockedIds.includes(m.id),
      stats: m.calculateProgress(milestoneData)
    }));
  }, [unlockedIds, projects, clients, invoices, userProfile]);

  const unlockedMilestones = milestones.filter(m => m.unlocked);
  const lockedMilestones = milestones.filter(m => !m.unlocked).sort((a, b) => b.stats.percentage - a.stats.percentage);
  
  const overallProgress = Math.round((unlockedMilestones.length / MILESTONES.length) * 100);

  const categories: MilestoneCategory[] = ['FINANCIAL', 'PROJECTS', 'QUALITY', 'CLIENTS', 'GRIND'];

  const rarestAchievement = useMemo(() => {
    if (unlockedMilestones.length === 0) return null;
    // For now, let's just say higher ID milestones or later in list are "rarer"
    // Or we could define a rarity property. Let's just pick the last one in the list that is unlocked.
    return [...unlockedMilestones].reverse()[0];
  }, [unlockedMilestones]);

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative premium-shadow">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex-1 w-full space-y-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-widest uppercase">Your Studio Journey</h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-sm mt-1">
                {unlockedMilestones.length} of {MILESTONES.length} UNLOCKED
              </p>
            </div>
            
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                <span>Core Progression</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                />
              </div>
            </div>
          </div>

          {rarestAchievement && (
            <div className="shrink-0 group">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-3 text-center md:text-right">Rarest Achievement</p>
              <div className="bg-white/5 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-4 glow-amber-sm">
                <HexagonBadge icon={rarestAchievement.icon} category={rarestAchievement.category} size={56} />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1">{rarestAchievement.name}</h3>
                  <p className="text-[10px] text-slate-400 font-medium italic">Unlocked</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 rounded-2xl w-fit mx-auto md:mx-0 border border-slate-800">
        <button 
          onClick={() => setActiveView('UNLOCKED')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeView === 'UNLOCKED' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-white"
          )}
        >
          <Trophy size={14} /> Unlocked <span className="opacity-50">{unlockedMilestones.length}</span>
        </button>
        <button 
          onClick={() => setActiveView('LOCKED')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeView === 'LOCKED' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-white"
          )}
        >
          <Lock size={14} /> Locked <span className="opacity-50">{lockedMilestones.length}</span>
        </button>
      </div>

      {/* Content List */}
      <div className="space-y-12">
        {activeView === 'UNLOCKED' ? (
          unlockedMilestones.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-800">
              <Trophy size={48} className="text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest">No achievements yet. Get to work.</p>
            </div>
          ) : (
            categories.map(cat => {
              const catMilestones = unlockedMilestones.filter(m => m.category === cat);
              if (catMilestones.length === 0) return null;
              const totalInCat = MILESTONES.filter(m => m.category === cat).length;
              
              return (
                <div key={cat} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h2 className="text-[10px] font-black text-white uppercase tracking-[0.4em] whitespace-nowrap">
                      {cat} MILESTONES — {catMilestones.length} of {totalInCat} UNLOCKED
                    </h2>
                    <div className={cn("h-px flex-1", 
                       cat === 'FINANCIAL' ? 'bg-amber-500/30' :
                       cat === 'PROJECTS' ? 'bg-emerald-500/30' :
                       cat === 'QUALITY' ? 'bg-blue-500/30' :
                       cat === 'CLIENTS' ? 'bg-purple-500/30' : 'bg-slate-500/30'
                    )} />
                  </div>

                  <div className="space-y-2">
                    {catMilestones.map(m => (
                      <motion.div 
                        key={m.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "group bg-slate-900/50 border-l-4 p-4 flex flex-col sm:flex-row items-center gap-6 transition-all hover:bg-slate-800/80 hover:translate-x-1",
                          cat === 'FINANCIAL' ? 'border-amber-500' :
                          cat === 'PROJECTS' ? 'border-emerald-500' :
                          cat === 'QUALITY' ? 'border-blue-500' :
                          cat === 'CLIENTS' ? 'border-purple-500' : 'border-slate-500'
                        )}
                      >
                        <HexagonBadge icon={m.icon} category={m.category} size={64} className="shrink-0" />
                        <div className="flex-1 w-full text-center sm:text-left space-y-1">
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">{m.name}</h3>
                          <p className="text-slate-400 text-xs italic">"{m.tagline}"</p>
                          <div className={cn(
                            "inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest mt-2",
                            cat === 'FINANCIAL' ? 'bg-amber-500/10 text-amber-500' :
                            cat === 'PROJECTS' ? 'bg-emerald-500/10 text-emerald-500' :
                            cat === 'QUALITY' ? 'bg-blue-500/10 text-blue-500' :
                            cat === 'CLIENTS' ? 'bg-purple-500/10 text-purple-500' : 'bg-slate-400/10 text-slate-400'
                          )}>
                            {m.category}
                          </div>
                        </div>
                        <div className="text-center sm:text-right shrink-0">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Unlocked Recently</p>
                           <button className="p-3 bg-white/5 text-slate-400 hover:text-emerald-500 rounded-xl transition-all hover:scale-110 active:scale-95">
                             <Share2 size={16} />
                           </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })
          )
        ) : (
          categories.map(cat => {
            const catMilestones = lockedMilestones.filter(m => m.category === cat);
            if (catMilestones.length === 0) return null;
            const totalInCat = MILESTONES.filter(m => m.category === cat).length;
            const unlockedInCat = MILESTONES.filter(m => m.category === cat && unlockedIds.includes(m.id)).length;

            return (
              <div key={cat} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">
                    {cat} MILESTONES — {unlockedInCat} of {totalInCat} UNLOCKED
                  </h2>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>

                <div className="space-y-4">
                  {catMilestones.map(m => {
                    const isAlmostThere = m.stats.percentage >= 90;
                    return (
                      <motion.div 
                        key={m.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          "bg-slate-900/30 border border-transparent p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6 rounded-2xl transition-all",
                          isAlmostThere && "border-amber-500/50 shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)] animate-pulse-subtle"
                        )}
                      >
                        <HexagonBadge icon={m.icon} category={m.category} size={64} locked className="shrink-0" />
                        <div className="flex-1 w-full text-center sm:text-left space-y-3 min-w-0">
                          <div>
                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                              {isAlmostThere && <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded leading-none">Almost There</span>}
                              <h3 className="text-lg font-black text-white uppercase tracking-tight truncate leading-none">{m.name}</h3>
                            </div>
                            <p className="text-slate-500 text-xs italic">"{m.tagline}"</p>
                          </div>
                          
                          <div className="space-y-1.5">
                             <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                               <span>{m.stats.current} / {m.stats.target}</span>
                               <span className={cn(isAlmostThere ? "text-amber-500" : "text-white")}>{Math.round(m.stats.percentage)}%</span>
                             </div>
                             <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${Math.max(5, m.stats.percentage)}%` }}
                                 className={cn("h-full transition-all duration-1000", isAlmostThere ? "bg-amber-500" : "bg-slate-600")}
                               />
                             </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-subtle {
          0%, 100% { border-color: rgba(245, 158, 11, 0.2); }
          50% { border-color: rgba(245, 158, 11, 0.5); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .glow-amber-sm {
           box-shadow: 0 0 20px -5px rgba(245, 158, 11, 0.2);
        }
      `}} />
    </div>
  );
}
