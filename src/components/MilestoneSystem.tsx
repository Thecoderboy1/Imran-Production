import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Share2, User, Shield, CheckCircle2, X, 
  Zap, Flame, Rocket, Diamond, Crown, Sparkles, 
  Clapperboard, Music, TrendingUp, Medal, Factory, 
  Target, Handshake, Network, Building, Star, 
  Sprout, CalendarDays, Mountain, BadgeCheck
} from 'lucide-react';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';

export type MilestoneCategory = 'FINANCIAL' | 'PROJECTS' | 'QUALITY' | 'CLIENTS' | 'GRIND';

export interface Milestone {
  id: string;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  category: MilestoneCategory;
  check: (data: MilestoneData) => boolean;
  calculateProgress: (data: MilestoneData) => { current: number | string; target: number | string; percentage: number };
}

interface MilestoneData {
  projects: any[];
  clients: any[];
  invoices: any[];
  userProfile: any;
}

export const MILESTONES: Milestone[] = [
  // FINANCIAL
  {
    id: 'first_payment',
    name: "First Payment Received",
    tagline: "Someone paid you. The journey starts.",
    icon: Zap,
    category: 'FINANCIAL',
    check: (d) => d.invoices.some(i => i.status === 'Paid'),
    calculateProgress: (d) => ({
      current: d.invoices.some(i => i.status === 'Paid') ? 1 : 0,
      target: 1,
      percentage: d.invoices.some(i => i.status === 'Paid') ? 100 : 5
    })
  },
  {
    id: 'earn_10k',
    name: "₹10,000 Earned",
    tagline: "Five figures hit. You are in business.",
    icon: Flame,
    category: 'FINANCIAL',
    check: (d) => d.projects.reduce((acc, p) => acc + (p.received || 0), 0) >= 10000,
    calculateProgress: (d) => {
      const earned = d.projects.reduce((acc, p) => acc + (p.received || 0), 0);
      return { 
        current: `₹${earned.toLocaleString()}`, 
        target: "₹10,000", 
        percentage: Math.min(100, Math.max(5, (earned / 10000) * 100)) 
      };
    }
  },
  {
    id: 'earn_25k',
    name: "₹25,000 Earned",
    tagline: "Quarter lakh done. Momentum is building.",
    icon: Rocket,
    category: 'FINANCIAL',
    check: (d) => d.projects.reduce((acc, p) => acc + (p.received || 0), 0) >= 25000,
    calculateProgress: (d) => {
      const earned = d.projects.reduce((acc, p) => acc + (p.received || 0), 0);
      return { 
        current: `₹${earned.toLocaleString()}`, 
        target: "₹25,000", 
        percentage: Math.min(100, Math.max(5, (earned / 25000) * 100)) 
      };
    }
  },
  {
    id: 'earn_50k',
    name: "₹50,000 Earned",
    tagline: "Fifty thousand. Half lakh studio.",
    icon: Diamond,
    category: 'FINANCIAL',
    check: (d) => d.projects.reduce((acc, p) => acc + (p.received || 0), 0) >= 50000,
    calculateProgress: (d) => {
      const earned = d.projects.reduce((acc, p) => acc + (p.received || 0), 0);
      return { 
        current: `₹${earned.toLocaleString()}`, 
        target: "₹50,000", 
        percentage: Math.min(100, Math.max(5, (earned / 50000) * 100)) 
      };
    }
  },
  {
    id: 'earn_1l',
    name: "₹1,00,000 Earned",
    tagline: "One lakh crossed. You built this yourself.",
    icon: Crown,
    category: 'FINANCIAL',
    check: (d) => d.projects.reduce((acc, p) => acc + (p.received || 0), 0) >= 100000,
    calculateProgress: (d) => {
      const earned = d.projects.reduce((acc, p) => acc + (p.received || 0), 0);
      return { 
        current: `₹${earned.toLocaleString()}`, 
        target: "₹1,00,000", 
        percentage: Math.min(100, Math.max(5, (earned / 100000) * 100)) 
      };
    }
  },
  {
    id: 'earn_5l',
    name: "₹5,00,000 Earned",
    tagline: "Five lakh club. Top tier producer.",
    icon: Trophy,
    category: 'FINANCIAL',
    check: (d) => d.projects.reduce((acc, p) => acc + (p.received || 0), 0) >= 500000,
    calculateProgress: (d) => {
      const earned = d.projects.reduce((acc, p) => acc + (p.received || 0), 0);
      return { 
        current: `₹${earned.toLocaleString()}`, 
        target: "₹5,00,000", 
        percentage: Math.min(100, Math.max(5, (earned / 500000) * 100)) 
      };
    }
  },
  {
    id: 'earn_10l',
    name: "₹10,00,000 Earned",
    tagline: "Ten lakh. Most never get here.",
    icon: Sparkles,
    category: 'FINANCIAL',
    check: (d) => d.projects.reduce((acc, p) => acc + (p.received || 0), 0) >= 1000000,
    calculateProgress: (d) => {
      const earned = d.projects.reduce((acc, p) => acc + (p.received || 0), 0);
      return { 
        current: `₹${earned.toLocaleString()}`, 
        target: "₹10,00,000", 
        percentage: Math.min(100, Math.max(5, (earned / 1000000) * 100)) 
      };
    }
  },

  // PROJECTS
  {
    id: 'first_project',
    name: "First Project Added",
    tagline: "Day one. Origin of your studio.",
    icon: Clapperboard,
    category: 'PROJECTS',
    check: (d) => d.projects.length >= 1,
    calculateProgress: (d) => ({
      current: d.projects.length,
      target: 1,
      percentage: d.projects.length >= 1 ? 100 : 5
    })
  },
  {
    id: 'first_delivery',
    name: "First Project Delivered",
    tagline: "First delivery done. Client is happy.",
    icon: CheckCircle2,
    category: 'PROJECTS',
    check: (d) => d.projects.some(p => p.progress === 'Final' || p.progress === 'Done'),
    calculateProgress: (d) => ({
      current: d.projects.some(p => p.progress === 'Final' || p.progress === 'Done') ? 1 : 0,
      target: 1,
      percentage: d.projects.some(p => p.progress === 'Final' || p.progress === 'Done') ? 100 : 5
    })
  },
  {
    id: '5_projects',
    name: "5 Projects Delivered",
    tagline: "Five down. Getting consistent.",
    icon: Music,
    category: 'PROJECTS',
    check: (d) => d.projects.filter(p => p.progress === 'Final' || p.progress === 'Done').length >= 5,
    calculateProgress: (d) => {
      const delivered = d.projects.filter(p => p.progress === 'Final' || p.progress === 'Done').length;
      return { current: delivered, target: 5, percentage: Math.min(100, Math.max(5, (delivered / 5) * 100)) };
    }
  },
  {
    id: '10_projects',
    name: "10 Projects Delivered",
    tagline: "Ten projects delivered. Double digits.",
    icon: TrendingUp,
    category: 'PROJECTS',
    check: (d) => d.projects.filter(p => p.progress === 'Final' || p.progress === 'Done').length >= 10,
    calculateProgress: (d) => {
      const delivered = d.projects.filter(p => p.progress === 'Final' || p.progress === 'Done').length;
      return { current: delivered, target: 10, percentage: Math.min(100, Math.max(5, (delivered / 10) * 100)) };
    }
  },
  {
    id: '25_projects',
    name: "25 Projects Delivered",
    tagline: "Twenty five projects. You show up every time.",
    icon: Medal,
    category: 'PROJECTS',
    check: (d) => d.projects.filter(p => p.progress === 'Final' || p.progress === 'Done').length >= 25,
    calculateProgress: (d) => {
      const delivered = d.projects.filter(p => p.progress === 'Final' || p.progress === 'Done').length;
      return { current: delivered, target: 25, percentage: Math.min(100, Math.max(5, (delivered / 25) * 100)) };
    }
  },
  {
    id: '50_projects',
    name: "50 Projects Delivered",
    tagline: "Fifty deliveries. Unstoppable work ethic.",
    icon: Factory,
    category: 'PROJECTS',
    check: (d) => d.projects.filter(p => p.progress === 'Final' || p.progress === 'Done').length >= 50,
    calculateProgress: (d) => {
      const delivered = d.projects.filter(p => p.progress === 'Final' || p.progress === 'Done').length;
      return { current: delivered, target: 50, percentage: Math.min(100, Math.max(5, (delivered / 50) * 100)) };
    }
  },
  {
    id: '100_projects',
    name: "100 Projects Delivered",
    tagline: "Hundred projects. Legendary output.",
    icon: Trophy,
    category: 'PROJECTS',
    check: (d) => d.projects.filter(p => p.progress === 'Final' || p.progress === 'Done').length >= 100,
    calculateProgress: (d) => {
      const delivered = d.projects.filter(p => p.progress === 'Final' || p.progress === 'Done').length;
      return { current: delivered, target: 100, percentage: Math.min(100, Math.max(5, (delivered / 100) * 100)) };
    }
  },

  // QUALITY
  {
    id: 'no_revision_1',
    name: "First Project With No Revision",
    tagline: "Client loved it first try. No changes needed.",
    icon: Target,
    category: 'QUALITY',
    check: (d) => d.projects.some(p => (p.progress === 'Final' || p.progress === 'Done') && (p.revisions === 0 || !p.revisions)),
    calculateProgress: (d) => ({
      current: d.projects.some(p => (p.progress === 'Final' || p.progress === 'Done') && (p.revisions === 0 || !p.revisions)) ? 1 : 0,
      target: 1,
      percentage: d.projects.some(p => (p.progress === 'Final' || p.progress === 'Done') && (p.revisions === 0 || !p.revisions)) ? 100 : 5
    })
  },
  {
    id: 'no_revision_3',
    name: "3 Projects In A Row With No Revision",
    tagline: "Three straight. Clients are not complaining.",
    icon: Flame,
    category: 'QUALITY',
    check: (d) => {
      const delivered = d.projects
        .filter(p => p.progress === 'Final' || p.progress === 'Done')
        .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
      if (delivered.length < 3) return false;
      return delivered.slice(0, 3).every(p => !p.revisions || p.revisions === 0);
    },
    calculateProgress: (d) => {
      const delivered = d.projects
        .filter(p => p.progress === 'Final' || p.progress === 'Done')
        .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
      let streak = 0;
      for (const p of delivered) {
        if (!p.revisions || p.revisions === 0) streak++;
        else break;
      }
      return { current: streak, target: 3, percentage: Math.min(100, Math.max(5, (streak / 3) * 100)) };
    }
  },
  {
    id: 'no_revision_5',
    name: "5 Projects In A Row With No Revision",
    tagline: "Five in a row with zero revisions. Elite level work.",
    icon: Crown,
    category: 'QUALITY',
    check: (d) => {
      const delivered = d.projects
        .filter(p => p.progress === 'Final' || p.progress === 'Done')
        .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
      if (delivered.length < 5) return false;
      return delivered.slice(0, 5).every(p => !p.revisions || p.revisions === 0);
    },
    calculateProgress: (d) => {
      const delivered = d.projects
        .filter(p => p.progress === 'Final' || p.progress === 'Done')
        .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
      let streak = 0;
      for (const p of delivered) {
        if (!p.revisions || p.revisions === 0) streak++;
        else break;
      }
      return { current: streak, target: 5, percentage: Math.min(100, Math.max(5, (streak / 5) * 100)) };
    }
  },

  // CLIENTS
  {
    id: 'first_client',
    name: "First Client Added",
    tagline: "First partner in your network.",
    icon: Handshake,
    category: 'CLIENTS',
    check: (d) => d.clients.length >= 1,
    calculateProgress: (d) => ({ current: d.clients.length, target: 1, percentage: d.clients.length >= 1 ? 100 : 5 })
  },
  {
    id: '5_clients',
    name: "5 Clients Added",
    tagline: "Five clients. Word is spreading.",
    icon: Network,
    category: 'CLIENTS',
    check: (d) => d.clients.length >= 5,
    calculateProgress: (d) => ({ current: d.clients.length, target: 5, percentage: Math.min(100, Math.max(5, (d.clients.length / 5) * 100)) })
  },
  {
    id: '10_clients',
    name: "10 Clients Added",
    tagline: "Ten clients. You are running a real studio.",
    icon: Building,
    category: 'CLIENTS',
    check: (d) => d.clients.length >= 10,
    calculateProgress: (d) => ({ current: d.clients.length, target: 10, percentage: Math.min(100, Math.max(5, (d.clients.length / 10) * 100)) })
  },
  {
    id: 'same_day_pay',
    name: "First Client Pays Same Day",
    tagline: "They paid instantly. That is rare trust.",
    icon: Zap,
    category: 'CLIENTS',
    check: (d) => d.invoices.some(inv => {
      if (inv.status !== 'Paid') return false;
      const created = inv.createdAt?.toDate?.() || inv.createdAt;
      const updated = inv.updatedAt?.toDate?.() || inv.updatedAt;
      if (!created || !updated) return false;
      const cTime = created.getTime ? created.getTime() : created;
      const uTime = updated.getTime ? updated.getTime() : updated;
      return (uTime - cTime) < 24 * 60 * 60 * 1000;
    }),
    calculateProgress: (d) => ({
      current: d.invoices.some(inv => inv.status === 'Paid') ? 1 : 0, 
      target: 1, 
      percentage: d.invoices.some(inv => inv.status === 'Paid') ? 100 : 5 
    })
  },
  {
    id: 'client_1l',
    name: "One Client Pays ₹1,00,000 Total",
    tagline: "One lakh from a single client. Nurture this relationship.",
    icon: Star,
    category: 'CLIENTS',
    check: (d) => {
      const clientEarns: Record<string, number> = {};
      d.projects.forEach(p => {
        if (p.clientId) clientEarns[p.clientId] = (clientEarns[p.clientId] || 0) + (p.received || 0);
      });
      return Object.values(clientEarns).some(v => v >= 100000);
    },
    calculateProgress: (d) => {
      const clientEarns: Record<string, number> = {};
      d.projects.forEach(p => {
        if (p.clientId) clientEarns[p.clientId] = (clientEarns[p.clientId] || 0) + (p.received || 0);
      });
      const maxEarn = Math.max(0, ...Object.values(clientEarns));
      return { 
        current: `₹${maxEarn.toLocaleString()}`, 
        target: "₹1,00,000", 
        percentage: Math.min(100, Math.max(5, (maxEarn / 100000) * 100)) 
      };
    }
  },

  // GRIND
  {
    id: '7_days',
    name: "7 Days Active",
    tagline: "One week in. Habits are forming.",
    icon: Sprout,
    category: 'GRIND',
    check: (d) => {
      const created = d.userProfile?.createdAt?.toDate?.() || d.userProfile?.createdAt || new Date();
      const cTime = created.getTime ? created.getTime() : created;
      return (new Date().getTime() - cTime) >= 7 * 24 * 60 * 60 * 1000;
    },
    calculateProgress: (d) => {
      const created = d.userProfile?.createdAt?.toDate?.() || d.userProfile?.createdAt || new Date();
      const cTime = created.getTime ? created.getTime() : created;
      const days = Math.floor((new Date().getTime() - cTime) / (24 * 60 * 60 * 1000));
      return { current: days, target: 7, percentage: Math.min(100, Math.max(5, (days / 7) * 100)) };
    }
  },
  {
    id: '30_days',
    name: "30 Days Active",
    tagline: "Thirty days straight. This is discipline.",
    icon: CalendarDays,
    category: 'GRIND',
    check: (d) => {
      const created = d.userProfile?.createdAt?.toDate?.() || d.userProfile?.createdAt || new Date();
      const cTime = created.getTime ? created.getTime() : created;
      return (new Date().getTime() - cTime) >= 30 * 24 * 60 * 60 * 1000;
    },
    calculateProgress: (d) => {
      const created = d.userProfile?.createdAt?.toDate?.() || d.userProfile?.createdAt || new Date();
      const cTime = created.getTime ? created.getTime() : created;
      const days = Math.floor((new Date().getTime() - cTime) / (24 * 60 * 60 * 1000));
      return { current: days, target: 30, percentage: Math.min(100, Math.max(5, (days / 30) * 100)) };
    }
  },
  {
    id: '90_days',
    name: "90 Days Active",
    tagline: "Three months. You are not stopping.",
    icon: Mountain,
    category: 'GRIND',
    check: (d) => {
      const created = d.userProfile?.createdAt?.toDate?.() || d.userProfile?.createdAt || new Date();
      const cTime = created.getTime ? created.getTime() : created;
      return (new Date().getTime() - cTime) >= 90 * 24 * 60 * 60 * 1000;
    },
    calculateProgress: (d) => {
      const created = d.userProfile?.createdAt?.toDate?.() || d.userProfile?.createdAt || new Date();
      const cTime = created.getTime ? created.getTime() : created;
      const days = Math.floor((new Date().getTime() - cTime) / (24 * 60 * 60 * 1000));
      return { current: days, target: 90, percentage: Math.min(100, Math.max(5, (days / 90) * 100)) };
    }
  },
  {
    id: 'profile_completed',
    name: "Profile Fully Completed",
    tagline: "Studio is set up. Ready for business.",
    icon: BadgeCheck,
    category: 'GRIND',
    check: (d) => {
      const p = d.userProfile;
      return !!(p.workspaceName && p.userName && p.paymentDetails?.upiId && p.studioLogo);
    },
    calculateProgress: (d) => {
      const p = d.userProfile;
      let count = 0;
      if (p.workspaceName) count++;
      if (p.userName) count++;
      if (p.paymentDetails?.upiId) count++;
      if (p.studioLogo) count++;
      return { current: count, target: 4, percentage: Math.min(100, Math.max(5, (count / 4) * 100)) };
    }
  },
  {
    id: 'first_backup',
    name: "First Backup Taken",
    tagline: "Smart move. Your data is protected.",
    icon: Shield,
    category: 'GRIND',
    check: (d) => !!d.userProfile?.lastBackupAt,
    calculateProgress: (d) => ({
      current: d.userProfile?.lastBackupAt ? 1 : 0, 
      target: 1, 
      percentage: d.userProfile?.lastBackupAt ? 100 : 5
    })
  },
  {
    id: 'first_invoice',
    name: "First Invoice Sent",
    tagline: "First official invoice out. Professional.",
    icon: User,
    category: 'GRIND',
    check: (d) => d.invoices.length >= 1,
    calculateProgress: (d) => ({
      current: d.invoices.length, 
      target: 1, 
      percentage: d.invoices.length >= 1 ? 100 : 5
    })
  }
];

export function HexagonBadge({ icon: Icon, category, size = 48, locked = false, className = "" }: { icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>, category: MilestoneCategory, size?: number, locked?: boolean, className?: string }) {
  const colors = {
    FINANCIAL: "text-amber-500",
    PROJECTS: "text-emerald-500",
    QUALITY: "text-blue-500",
    CLIENTS: "text-purple-500",
    GRIND: "text-brand-500"
  };

  return (
    <div className={cn("relative flex items-center justify-center group/hex transition-transform duration-500", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className={cn("absolute inset-0 w-full h-full drop-shadow-2xl transition-colors duration-500", locked ? "text-slate-800 opacity-40" : colors[category])}>
        <path 
          d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" 
          fill="currentColor" 
          fillOpacity={locked ? 0.3 : 0.08} 
          stroke="currentColor" 
          strokeWidth="3" 
          className="transition-all duration-500 group-hover/hex:fill-opacity-20"
        />
      </svg>
      <Icon size={size * 0.45} className={cn("relative z-10 transition-transform duration-500 group-hover/hex:scale-110", locked ? "text-slate-600 opacity-50" : colors[category])} />
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <Lock size={size * 0.25} className="text-slate-600" />
        </div>
      )}
    </div>
  );
}

function Lock({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
}

export default function MilestoneSystem({ userProfile, projects, clients, invoices }: MilestoneData) {
  const [unlockedNow, setUnlockedNow] = useState<Milestone | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const shareRef = React.useRef<HTMLDivElement>(null);

  const unlockedIds = useMemo(() => userProfile?.milestones || [], [userProfile]);

  useEffect(() => {
    if (!userProfile?.uid) return;

    const findNewMilestone = async () => {
      for (const m of MILESTONES) {
        if (!unlockedIds.includes(m.id)) {
          if (m.check({ projects, clients, invoices, userProfile })) {
            try {
              await updateDoc(doc(db, 'userProfiles', userProfile.uid), {
                milestones: arrayUnion(m.id),
                unseenMilestones: arrayUnion(m.id),
                updatedAt: serverTimestamp()
              });
              setUnlockedNow(m);
              break;
            } catch (err) {
              console.error("Unlock failed", err);
            }
          }
        }
      }
    };

    findNewMilestone();
  }, [projects, clients, invoices, userProfile, unlockedIds]);

  const handleShare = async () => {
    if (!shareRef.current || !unlockedNow) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: '#0D1117',
        scale: 2
      });
      const dataUrl = canvas.toDataURL('image/png');
      
      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'milestone.png', { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: `Unlocked: ${unlockedNow.name}`,
          text: `Check out my new milestone on Production Control! ${unlockedNow.name}: ${unlockedNow.tagline}`
        });
      } else {
        const link = document.createElement('a');
        link.download = `milestone-${unlockedNow.id}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Share failed", err);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {unlockedNow && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0D1117]/95 backdrop-blur-3xl"
              onClick={() => setUnlockedNow(null)}
            />
            
            {/* Cinematic Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
               {[...Array(30)].map((_, i) => (
                 <motion.div
                   key={i}
                   initial={{ 
                     x: Math.random() * window.innerWidth, 
                     y: window.innerHeight + 100,
                     scale: Math.random() * 0.5 + 0.5,
                     opacity: 0.8
                   }}
                   animate={{ 
                     y: -100, 
                     x: (Math.random() - 0.5) * 400 + (Math.random() * window.innerWidth),
                     opacity: 0 
                   }}
                   transition={{ 
                     duration: Math.random() * 3 + 2, 
                     repeat: Infinity,
                     delay: Math.random() * 2 
                   }}
                   className="absolute w-1 h-1 bg-brand-500 rounded-full"
                 />
               ))}
            </div>

            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0, y: -40 }}
              className="relative w-full max-w-xl text-center z-10"
            >
              <div className="absolute inset-0 bg-brand-500/20 blur-[120px] rounded-full animate-pulse" />
              
              <div className="relative flex flex-col items-center glass p-12 rounded-[40px] border border-white/10 shadow-2xl">
                 <motion.div
                   initial={{ scale: 0 }}
                   animate={{ scale: [1, 1.3, 1] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute top-1/4 w-64 h-64 bg-brand-500/20 blur-[100px] rounded-full -z-10"
                 />
                 
                 <div className="mb-12 relative">
                   <div className="absolute inset-0 bg-brand-500 blur-3xl opacity-20 scale-150 animate-pulse" />
                   <HexagonBadge 
                     icon={unlockedNow.icon} 
                     category={unlockedNow.category} 
                     size={180} 
                     className="drop-shadow-[0_0_50px_rgba(0,200,83,0.4)]"
                   />
                 </div>
                 
                 <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em] mb-4">Milestone Achieved</span>
                 <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 leading-none">
                    {unlockedNow.name}
                 </h2>
                 <p className="text-xl text-slate-400 font-bold italic mb-14 tracking-tight">
                    "{unlockedNow.tagline}"
                 </p>
                 
                 <div className="flex flex-col items-center gap-4 w-full">
                    <button 
                      onClick={() => setUnlockedNow(null)}
                      className="w-full h-14 bg-brand-500 text-[#0D1117] rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                       Keep Private
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Share Card Template */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
         <div 
          ref={shareRef}
          style={{ backgroundColor: '#020617' }} // slate-950 hex
          className="w-[1080px] h-[1920px] p-20 flex flex-col items-center justify-between text-center"
         >
            <div className="pt-20">
               <p style={{ color: '#0F9D58' }} className="text-4xl font-black uppercase tracking-[0.5em] mb-4">FrameTrack</p>
               <div style={{ backgroundColor: '#0F9D58' }} className="w-24 h-1 mx-auto rounded-full" />
            </div>

            <div className="flex flex-col items-center">
               <div style={{ backgroundColor: 'rgba(15, 157, 88, 0.1)', borderColor: 'rgba(15, 157, 88, 0.2)' }} className="w-64 h-64 rounded-full flex items-center justify-center mb-16 border-4">
                  {unlockedNow && (
                    <unlockedNow.icon 
                      size={120} 
                      strokeWidth={2.5} 
                      style={{ color: '#0F9D58' }} 
                    />
                  )}
               </div>
               <h1 style={{ color: '#ffffff' }} className="text-8xl font-black uppercase tracking-tighter mb-8 leading-none">
                  {unlockedNow?.name}
               </h1>
               <p style={{ color: '#94a3b8' }} className="text-4xl italic">
                  "{unlockedNow?.tagline}"
               </p>
            </div>

            <div className="pb-20">
               <p style={{ color: '#64748b' }} className="text-3xl font-black uppercase tracking-widest">Built On Production Control</p>
            </div>
         </div>
      </div>
    </>
  );
}
