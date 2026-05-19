import React, { useState, useEffect, useMemo } from 'react';
import ProjectDetailsPanel from './ProjectDetailsPanel';
import { collection, query, where, onSnapshot, getDoc, doc, getDocs, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { formatCurrency, cn } from '../lib/utils';
import { DriveService } from '../lib/driveService';
import { MILESTONES, HexagonBadge } from './MilestoneSystem';
import { useNotifications } from './NotificationProvider';
import { DashboardSkeleton, Skeleton } from './Skeleton';
import { LockedFeature } from './LockedFeature';
import { PREMIUM_UPGRADE_URL, SYSTEM_LAUNCH_DATE } from '../lib/constants';
import { format, startOfMonth, endOfMonth, isAfter } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, CreditCard, Clock, CheckCircle, BarChart2, Video, DollarSign, HardDrive, RefreshCw, Layers, Users, User, AlertCircle, Shield, Plus, X, Trophy, Share2, Activity, Zap, Calendar } from 'lucide-react';

export default function Dashboard({ userProfile, setActiveTab }: { userProfile?: any, setActiveTab?: (tab: any) => void }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [lastUnlocked, setLastUnlocked] = useState<any>(null);
  const { addToast, showConfirm } = useNotifications();
  const [selectedProjectForPanel, setSelectedProjectForPanel] = useState<any | null>(null);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalEarnings: 0,
    pendingDues: 0,
    completedProjects: 0,
    clientsCount: 0,
    videoTypeData: [] as any[],
    recentProjects: [] as any[],
    allClients: [] as any[],
    allProjects: [] as any[],
    invoices: [] as any[]
  });

  const studioOwnerId = userProfile?.teamOwnerId || auth.currentUser?.uid;
  const isOwner = !userProfile?.teamOwnerId;

  // Toast Logic
  useEffect(() => {
    if (userProfile?.milestones?.length > 0) {
      const unlocked = userProfile.milestones;
      const lastId = unlocked[unlocked.length - 1];
      const milestone = MILESTONES.find(m => m.id === lastId);
      
      const dismissKey = `dismiss_toast_${lastId}`;
      const firstShownKey = `toast_first_shown_${lastId}`;
      
      const isDismissed = localStorage.getItem(dismissKey);
      const firstShownTime = localStorage.getItem(firstShownKey);
      
      if (milestone && !isDismissed) {
        const now = Date.now();
        if (!firstShownTime) {
          localStorage.setItem(firstShownKey, now.toString());
          setLastUnlocked(milestone);
          setShowToast(true);
        } else {
          const hoursPassed = (now - parseInt(firstShownTime)) / (1000 * 60 * 60);
          if (hoursPassed < 24) {
            setLastUnlocked(milestone);
            setShowToast(true);
          } else {
            setShowToast(false);
          }
        }
      }
    }
  }, [userProfile?.milestones]);

  const handleDismissToast = () => {
    if (lastUnlocked) {
      localStorage.setItem(`dismiss_toast_${lastUnlocked.id}`, 'true');
    }
    setShowToast(false);
  };

  const milestoneStats = useMemo(() => {
    if (!userProfile) return { next: null, recent: [] };
    const unlockedIds = userProfile.milestones || [];
    const milestoneData = { 
      projects: stats.allProjects, 
      clients: stats.allClients, 
      invoices: stats.invoices, 
      userProfile 
    };
    
    const locked = MILESTONES.filter(m => !unlockedIds.includes(m.id))
      .map(m => ({
        ...m,
        stats: m.calculateProgress(milestoneData)
      }))
      .sort((a, b) => b.stats.percentage - a.stats.percentage);

    const recent = unlockedIds.slice(-3).reverse().map(id => {
      return MILESTONES.find(m => m.id === id);
    }).filter(Boolean);
      
    return {
      next: locked[0] || null,
      recent: recent
    };
  }, [userProfile, stats]);

  const nextMilestoneData = milestoneStats.next;
  const recentAchievements = milestoneStats.recent;

  useEffect(() => {
    if (!auth.currentUser || !studioOwnerId || !isOwner) return;

    // Upgrade migration: Ensure all documents have teamOwnerId
    const runMigration = async () => {
      const migratedKey = `migrated_team_owner_v1_${studioOwnerId}`;
      if (localStorage.getItem(migratedKey)) return;

      try {
        const collections = ['projects', 'clients', 'invoices'];
        for (const col of collections) {
          const q = query(collection(db, col), where('ownerId', '==', studioOwnerId));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          let count = 0;

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.teamOwnerId) {
              batch.update(docSnap.ref, { teamOwnerId: studioOwnerId, updatedAt: serverTimestamp() });
              count++;
            }
          });

          if (count > 0) {
            await batch.commit();
            console.log(`[Migration] Updated ${count} ${col} with teamOwnerId.`);
          }
        }
        localStorage.setItem(migratedKey, 'true');
      } catch (e: any) {
        console.error("[Migration] failed. Permissions or Index error likely.", e);
        if (e.code === 'permission-denied') {
          console.error("[Migration] Permission Denied. Check firestore.rules for clients/projects/invoices update permissions.");
        }
      }
    };

    runMigration();
  }, [studioOwnerId]);

  useEffect(() => {
    if (!auth.currentUser || !studioOwnerId) return;

    const qClients = isOwner 
      ? query(collection(db, 'clients'), where('ownerId', '==', studioOwnerId))
      : query(collection(db, 'clients'), where('teamOwnerId', '==', studioOwnerId));

    const unsubClients = onSnapshot(qClients, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => list.push({id: doc.id, ...doc.data()}));
        setStats(prev => ({ ...prev, clientsCount: list.length, allClients: list }));
    }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    const qProjectsAll = isOwner
      ? query(collection(db, 'projects'), where('ownerId', '==', studioOwnerId))
      : query(collection(db, 'projects'), where('teamOwnerId', '==', studioOwnerId));
    
    const unsubProjects = onSnapshot(qProjectsAll, (snapshot) => {
      const allProjects: any[] = [];
      snapshot.forEach((doc) => allProjects.push({ id: doc.id, ...doc.data() }));
      
      let totalEarnings = 0;
      let pendingDues = 0;
      let lastMonthPendingDues = 0;
      let completedProjects = 0;
      let longFormCount = 0;
      let shortFormCount = 0;
      let urgentProjectsCount = 0;

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      allProjects.forEach((data) => {
        totalEarnings += data.received || 0;
        pendingDues += data.dueMoney || 0;

        const createdAt = data.createdAt?.toDate?.() || (data.createdAt instanceof Date ? data.createdAt : null);
        if (createdAt && createdAt < lastMonth) {
           lastMonthPendingDues += data.dueMoney || 0;
        }
        
        const isCompleted = data.paymentStatus === 'Paid' || data.progress === 'Done' || data.progress === 'Final';
        if (isCompleted) completedProjects++;
        
        // Count for portfolio split
        if (data.videoType === 'Long Form') longFormCount++;
        else if (data.videoType === 'Short Form') shortFormCount++;
        
        // Count for workload warning
        if (data.urgency === 'Urgent' && !isCompleted) urgentProjectsCount++;
      });

      const arGrowth = lastMonthPendingDues === 0 ? 0 : ((pendingDues - lastMonthPendingDues) / lastMonthPendingDues) * 100;
      const arTrend = arGrowth === 0 ? 'Stable' : `${arGrowth > 0 ? '+' : ''}${arGrowth.toFixed(1)}%`;

      const sortedProjects = [...allProjects]
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
          const timeB = b.createdAt?.toMillis?.() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
          return timeB - timeA;
        })
        .slice(0, 5);

    setStats(prev => ({
        ...prev,
        totalProjects: allProjects.length,
        totalEarnings,
        pendingDues,
        arTrend,
        completedProjects,
        videoTypeData: [
          { name: 'Long Form', value: longFormCount || 0 },
          { name: 'Short Form', value: shortFormCount || 0 }
        ],
        urgentProjectsCount,
        recentProjects: sortedProjects,
        allProjects: allProjects
      }));
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    const qInvoices = isOwner
      ? query(collection(db, 'invoices'), where('ownerId', '==', studioOwnerId))
      : query(collection(db, 'invoices'), where('teamOwnerId', '==', studioOwnerId));
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setStats(prev => ({ ...prev, invoices: list }));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
      setLoading(false);
    });

    return () => {
        unsubProjects();
        unsubClients();
        unsubInvoices();
    };
  }, [studioOwnerId, isOwner]);

  const handleManualSync = async () => {
    if (!userProfile?.driveBackupEnabled) {
        addToast('warning', "Please enable Cloud Backup in your settings or onboarding.");
        return;
    }
    
    setIsSyncing(true);
    try {
        const dataToBackup = {
            projects: (stats as any).allProjects || [],
            clients: stats.allClients || [],
            timestamp: new Date().toISOString(),
            workspace: userProfile.workspaceName
        };
        const success = await DriveService.backupData(dataToBackup);
        if (success) {
            addToast('success', "Backup successful!");
        } else {
            addToast('error', "Backup failed. Check if you granted Google Drive permissions.");
        }
    } catch (error) {
        addToast('error', "Manual sync failed.");
        console.error("Manual sync failed:", error);
    } finally {
        setIsSyncing(false);
    }
  };

  const getClientData = (clientId: string) => {
    const client = stats.allClients.find(c => c.id === clientId);
    return {
      name: client?.name || 'Direct Client',
      color: client?.color || '#6366f1'
    };
  };

  const handleSetStatus = async (id: string, status: string) => {
    try {
      const updates: any = {
        progress: status,
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, 'projects', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${id}`);
    }
  };

  const COLORS = ['#6366f1', '#10b981'];

  const isArCritical = stats.pendingDues > (stats.totalEarnings + stats.pendingDues) * 0.5;

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (value === 0) return null;

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[8px] font-black">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const currentMonthInvoices = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    return stats.invoices.filter(inv => {
      const date = inv.createdAt?.toDate ? inv.createdAt.toDate() : (inv.createdAt ? new Date(inv.createdAt) : new Date());
      return date >= monthStart && date <= monthEnd && date >= SYSTEM_LAUNCH_DATE;
    });
  }, [stats.invoices]);

  const invoiceLimit = 3;
  const usagePercentage = Math.min((currentMonthInvoices.length / invoiceLimit) * 100, 100);
  const isPremiumUsage = userProfile?.planType === 'premium';

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="page-container">
      {/* Achievement Toast */}
      <AnimatePresence>
        {showToast && lastUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-brand-500 text-[#0D1117] p-4 rounded-xl shadow-2xl flex items-center justify-between gap-4 border border-brand-400 relative z-50 overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <lastUnlocked.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest opacity-80">Milestone unlocked</p>
                <h4 className="text-base font-black tracking-tight italic">{lastUnlocked.name}: {lastUnlocked.tagline}</h4>
              </div>
            </div>
            <button 
              onClick={handleDismissToast}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="page-title">{userProfile?.workspaceName || 'Overview'}</h1>
          <p className="page-subtitle">Your studio's financial and production overview for today</p>
        </div>
        <div className="flex items-center gap-2">
          {userProfile?.driveBackupEnabled && (
            <button 
              onClick={handleManualSync}
              disabled={isSyncing}
              className="h-10 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-2 text-[10px] font-black tracking-widest transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={cn(isSyncing && "animate-spin text-brand-500")} />
              {isSyncing ? 'Syncing...' : 'Backup'}
            </button>
          )}
          <div className="h-10 px-5 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center gap-2">
             <Calendar size={14} className="text-brand-500" />
             <span className="text-[10px] font-black text-brand-500 tracking-widest leading-none">
               {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
             </span>
          </div>
        </div>
      </header>

      {/* Stats Grid - 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Video className="text-brand-500" size={16} />} 
          label="Total Productions" 
          value={stats.totalProjects} 
          trend="+4.2%"
        />
        <StatCard 
          icon={<DollarSign className="text-brand-500" size={16} />} 
          label="Net Earnings" 
          value={formatCurrency(stats.totalEarnings)} 
          trend="Live"
        />
        <StatCard 
          icon={<Clock className={cn("text-brand-500")} size={16} />} 
          label="Pending Receivables" 
          value={formatCurrency(stats.pendingDues)} 
          trend={(stats as any).arTrend || "Stable"}
          isCritical={isArCritical}
        />
        <StatCard 
          icon={<CheckCircle className="text-brand-500" size={16} />} 
          label="Final Deliveries" 
          value={stats.completedProjects} 
          trend="+8%"
        />
      </div>

      {/* Main Grid Section - 2 Columns (60/40 Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        {/* Spending Overview style chart area */}
        <div className="lg:col-span-6 space-y-4">
           <div className="glass-card h-full min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                 <div>
                   <h3 className="text-sm font-black text-white tracking-tight">Portfolio Analysis</h3>
                   <p className="text-[10px] text-slate-500 font-bold tracking-wider">Project type distribution</p>
                 </div>
                 <div className="bg-white/5 px-3 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-slate-400">
                    This Month
                 </div>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                 <div className="h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.videoTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="transparent"
                          labelLine={false}
                        >
                          {stats.videoTypeData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                          ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ 
                             backgroundColor: '#0D1117', 
                             borderRadius: '8px', 
                             border: '1px solid rgba(255,255,255,0.1)',
                             fontSize: '10px'
                           }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <span className="text-xl font-bold text-white leading-none">{stats.totalProjects}</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    {stats.videoTypeData.map((item, idx) => (
                       <div key={item.name} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/[0.05]">
                          <div className="flex items-center gap-3">
                             <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                             <span className="text-[11px] font-black text-white tracking-wider">{item.name}</span>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold text-white">{item.value}</p>
                             <p className="text-[9px] text-slate-500 font-medium">{stats.totalProjects > 0 ? Math.round((item.value / stats.totalProjects) * 100) : 0}%</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* Insight Column */}
        <div className="lg:col-span-4 space-y-4">
           {/* Smart Insight Card */}
           <div className="bg-brand-500 p-6 rounded-[12px] shadow-xl shadow-brand-500/10 flex flex-col justify-between h-fit min-h-[220px]">
              <div className="flex items-center gap-2 text-[#0D1117]/80 text-[10px] font-black tracking-widest mb-4">
                 <Zap size={14} className="fill-[#0D1117]/80" />
                 Studio Insight
              </div>
              <div className="space-y-2 mb-6">
                 <h4 className="text-xl font-black text-[#0D1117] leading-tight tracking-tighter">
                   {stats.pendingDues > 100000 ? "Action Required" : "Operations Optimal"}
                 </h4>
                 <p className="text-xs font-bold text-[#0D1117]/70 italic">
                   {stats.pendingDues > 100000 
                     ? `You have ${formatCurrency(stats.pendingDues)} in pending receivables. Consider following up with clients.` 
                     : "Your production pipeline is healthy and receivables are within normal range."}
                 </p>
              </div>
              <button 
                onClick={() => setActiveTab('invoices' as any)}
                className="w-full py-3 bg-[#0D1117] text-brand-500 rounded-lg font-black tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all"
              >
                View Financials
              </button>
           </div>

           {/* Quick Stats Grid */}
           <div className="grid grid-cols-2 gap-4">
              <div className="glass-card">
                 <span className="text-[10px] font-black text-slate-500 tracking-widest block mb-4 border-l-2 border-brand-500 pl-2">Reliability</span>
                 <p className="text-xl font-black text-white">{stats.totalProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}%</p>
                 <p className="text-[9px] text-slate-500 font-bold mt-1">Delivery Rate</p>
              </div>
              <div className="glass-card">
                 <span className="text-[10px] font-black text-slate-500 tracking-widest block mb-4 border-l-2 border-brand-500 pl-2">Infrastructure</span>
                 <p className="text-xl font-black text-white">Nominal</p>
                 <p className="text-[9px] text-slate-500 font-bold mt-1">System Health</p>
              </div>
           </div>
        </div>
      </div>

      {/* Row 3 - Recent Activity & Milestones (3 Column Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <div className="lg:col-span-2">
            <div className="glass-card h-full">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="section-header">Recent Productions</h3>
                  <button className="text-[10px] font-black text-brand-500 tracking-widest hover:underline" onClick={() => setActiveTab('projects' as any)}>View All</button>
               </div>
               <div className="space-y-3">
                  {stats.recentProjects.length > 0 ? stats.recentProjects.map((project) => {
                    const clientInfo = getClientData(project.clientId);
                    return (
                      <div 
                        key={project.id} 
                        onClick={() => setSelectedProjectForPanel(project)}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-all cursor-pointer group border border-white/[0.03]"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-lg"
                            style={{ backgroundColor: clientInfo.color }}
                          >
                            <VideoIcon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-white leading-tight truncate tracking-tight transition-colors group-hover:text-brand-500">{project.name}</p>
                            <p className="text-[9px] font-bold text-slate-500 tracking-widest mt-0.5 truncate italic">{clientInfo.name}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                           <p className="font-black text-sm text-white tracking-tighter">{formatCurrency(project.budget)}</p>
                           <div className={cn(
                             "inline-block px-2 py-0.5 rounded text-[8px] font-black tracking-widest border mt-1",
                             project.progress === 'Final' || project.progress === 'Done' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                             project.progress === 'Revision' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                             "bg-brand-500/10 text-brand-500 border-brand-500/20"
                           )}>
                             {project.progress || 'Working'}
                           </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No active projects in pipeline</p>
                    </div>
                  )}
               </div>
            </div>
         </div>

         <div className="lg:col-span-1 space-y-4">
            <div className="glass-card h-full">
               <h3 className="section-header">Next Milestone</h3>
               {nextMilestoneData ? (
                 <div className="space-y-6 pt-2">
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 shrink-0">
                         <HexagonBadge icon={nextMilestoneData.icon} category={nextMilestoneData.category} size={64} />
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-white tracking-tight">{nextMilestoneData.name}</h4>
                          <p className="text-[10px] text-slate-500 font-bold italic">"{nextMilestoneData.tagline}"</p>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between items-center text-[10px] font-black tracking-widest">
                          <span className="text-slate-400">{nextMilestoneData.stats.current} / {nextMilestoneData.stats.target}</span>
                          <span className="text-brand-500">{Math.round(nextMilestoneData.stats.percentage)}%</span>
                       </div>
                       <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(5, nextMilestoneData.stats.percentage)}%` }}
                            className="h-full bg-brand-500 shadow-[0_0_10px_rgba(0,200,83,0.3)] transition-all duration-1000"
                          />
                       </div>
                    </div>

                    <button 
                      onClick={() => setActiveTab('milestones' as any)}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-black tracking-widest text-[9px] rounded-lg border border-white/5 transition-all"
                    >
                      View Hall of Fame
                    </button>
                 </div>
               ) : (
                 <div className="text-center py-6">
                    <Trophy size={48} className="mx-auto text-amber-500 mb-4 opacity-20" />
                    <p className="text-[10px] font-black text-slate-500">You've unlocked all milestones!</p>
                 </div>
               )}
            </div>
         </div>
      </div>

      <ProjectDetailsPanel 
        project={selectedProjectForPanel}
        isOpen={!!selectedProjectForPanel}
        onClose={() => setSelectedProjectForPanel(null)}
      />
    </div>
  );
}

function StatCard({ icon, label, value, trend, isCritical = false }: { icon: React.ReactNode, label: string, value: string | number, trend?: string, isCritical?: boolean }) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={cn(
        "glass-card relative group flex flex-col",
        isCritical && "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-white/5 rounded-[10px] flex items-center justify-center border border-white/10 shrink-0">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest",
            trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-500" : "bg-white/5 text-slate-400"
          )}>
            {trend}
          </div>
        )}
      </div>
      
      <div className="min-w-0">
        <p className="text-[11px] font-black text-slate-500 tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-white tracking-tighter truncate" title={String(value)}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}

function VideoIcon({ size, ...props }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
    </svg>
  );
}
