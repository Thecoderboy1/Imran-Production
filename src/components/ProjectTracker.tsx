import React, { useState, useEffect, useMemo } from 'react';
import QuickAddProject from './QuickAddProject';
import ProjectDetailsPanel from './ProjectDetailsPanel';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp, getDocs, writeBatch, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { Search, Trash2, CheckCircle2, AlertCircle, Calendar, DollarSign, User, Video, Edit3, X, Mail, Layers, RefreshCw, Shield, Clock, Link, Copy, Trophy, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { MILESTONES, HexagonBadge } from './MilestoneSystem';
import { format } from 'date-fns';
import { useNotifications } from './NotificationProvider';
import { TableSkeleton } from './Skeleton';

export default function ProjectTracker({ userProfile }: { userProfile?: any }) {
  const { addToast, showConfirm } = useNotifications();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  
  const deliveryMilestone = useMemo(() => {
    if (!userProfile) return null;
    const unlockedIds = userProfile.milestones || [];
    
    // Find closest LOCKED project delivery milestone
    const milestoneData = { projects, clients: [], invoices: [], userProfile };
    
    const deliveryMilestones = MILESTONES.filter(m => 
      !unlockedIds.includes(m.id) && 
      (m.id.includes('project') || m.id.includes('delivered'))
    ).map(m => ({
      ...m,
      stats: m.calculateProgress(milestoneData)
    })).sort((a, b) => b.stats.percentage - a.stats.percentage);
    
    const closest = deliveryMilestones[0];
    if (closest && closest.stats.percentage >= 80) return closest;
    return null;
  }, [userProfile, projects]);

  const bannerRemaining = useMemo(() => {
    if (!deliveryMilestone) return 0;
    const current = Number(deliveryMilestone.stats.current) || 0;
    const target = Number(deliveryMilestone.stats.target) || 0;
    return Math.max(0, target - current);
  }, [deliveryMilestone]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Paid' | 'Not Paid'>('Not Paid');
  const [statusFilter, setStatusFilter] = useState<'Working' | 'Revision' | 'Finalized'>('Working');
  const [videoTypeFilter, setVideoTypeFilter] = useState<'All' | 'Short Form' | 'Long Form'>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProjectForPanel, setSelectedProjectForPanel] = useState<any | null>(null);
  const [dateFilter, setDateFilter] = useState({
    start: '',
    end: '',
    due: ''
  });
  
  // Custom Modal States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [paymentUpdate, setPaymentUpdate] = useState<{id: string, budget: number, received: number} | null>(null);
  const [additionalPayment, setAdditionalPayment] = useState('');
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [showPortalId, setShowPortalId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const studioOwnerId = userProfile?.teamOwnerId || auth.currentUser?.uid;

    const qProjects = query(collection(db, 'projects'), where('teamOwnerId', '==', studioOwnerId));

    const unsubOwn = onSnapshot(qProjects, (snapshot) => {
      const allProjects: any[] = [];
      snapshot.forEach((doc: any) => allProjects.push({ id: doc.id, ...doc.data() }));
      
      const sortedProjects = allProjects.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis?.() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
        const timeB = b.createdAt?.toMillis?.() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
        return timeB - timeA;
      });

      console.debug(`[ProjectTracker] Store updated. Total Projects: ${sortedProjects.length}`);
      setProjects([...sortedProjects]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    const qClients = query(collection(db, 'clients'), where('teamOwnerId', '==', studioOwnerId));
      
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      const clientList: any[] = [];
      snapshot.forEach(doc => clientList.push({ id: doc.id, ...doc.data() }));
      setClients(clientList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    return () => {
      unsubOwn();
      unsubClients();
    };
  }, [userProfile?.uid]);

  const getClientColor = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.color || '#6366f1';
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Direct Entry';
  };

  const handleSetStatus = async (id: string, status: string) => {
    try {
      const project = projects.find(p => p.id === id);
      const updates: any = {
        progress: status,
        updatedAt: serverTimestamp()
      };

      if (status === 'Revision' && project.progress !== 'Revision') {
        updates.revisions = (project.revisions || 0) + 1;
      }

      // Sync publicStatus for client portal
      if (status === 'Final' || status === 'Done') {
        updates.publicStatus = 'Finalized';
      } else if (status === 'Revision') {
        updates.publicStatus = 'In Revision';
      } else if (status === 'Working') {
        updates.publicStatus = 'Editing';
      }

      await updateDoc(doc(db, 'projects', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${id}`);
    }
  };

  const executeUpdatePayment = async () => {
    if (!paymentUpdate || !additionalPayment) return;
    const amount = Number(additionalPayment);
    if (isNaN(amount)) return;
    
    const newReceived = paymentUpdate.received + amount;
    const newDue = paymentUpdate.budget - newReceived;
    const newStatus = newDue <= 0 ? 'Paid' : 'Not Paid';

    try {
      await updateDoc(doc(db, 'projects', paymentUpdate.id), {
        received: newReceived,
        dueMoney: newDue,
        paymentStatus: newStatus,
        updatedAt: serverTimestamp()
      });
      setPaymentUpdate(null);
      setAdditionalPayment('');
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `projects/${paymentUpdate.id}`);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, revisions?: number) => {
    try {
      const updates: any = {
        publicStatus: status,
        updatedAt: serverTimestamp()
      };
      if (revisions !== undefined) updates.revisions = revisions;
      
      await updateDoc(doc(db, 'projects', id), updates);
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `projects/${id}`);
    }
  };

  const handleSendReminder = async (id) => {
    setReminderId(id);
    // Simulate sending reminder
    setTimeout(() => {
      setReminderId(null);
      addToast('success', 'Payment reminder sent to client successfully!');
    }, 1500);
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'projects', deleteId));
      setDeleteId(null);
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `projects/${deleteId}`);
    }
  };

  const handleDuplicate = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      const { id, createdAt, updatedAt, ...rest } = project;
      const duplicatedData = {
        ...rest,
        name: `${project.name} - Copy`,
        progress: 'Working',
        paymentStatus: 'Not Paid',
        received: 0,
        dueMoney: project.budget || 0,
        startDate: null,
        endDate: null,
        dueDate: null,
        revisions: 0,
        notes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'projects'), duplicatedData);
      setDuplicateId(null);
      addToast('success', "Project duplicated successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'projects/duplicate');
    }
  };

  const isDelayed = (p: any) => {
    if (p.progress === 'Done' || p.progress === 'Final') return false;
    if (!p.updatedAt?.toMillis) return false;
    const fiveDays = 5 * 24 * 60 * 60 * 1000;
    return (Date.now() - p.updatedAt.toMillis()) > fiveDays;
  };

  const getClientUpdateDraft = (p: any) => {
    const client = clients.find(c => c.id === p.clientId);
    const firstName = client?.name?.split(' ')[0] || 'there';
    const dateStr = p.dueDate?.toDate ? format(p.dueDate.toDate(), 'MMM d') : '[date]';
    
    return `Hi ${firstName}, your project "${p.name}" is ready for review. Please share your feedback by ${dateStr}.`;
  };

  const filteredProjects = projects.filter(p => {
    const clientName = p.clientId ? getClientName(p.clientId) : '';
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          clientName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || p.paymentStatus === filter;
    const matchesVideoType = videoTypeFilter === 'All' || p.videoType === videoTypeFilter;
    
    // Status Logic 
    const isFinalized = p.progress === 'Final' || p.progress === 'Done';
    const isRevision = p.progress === 'Revision';
    const isWorking = p.progress === 'Working' || (!p.progress);
    
    let matchesStatus = false;
    if (statusFilter === 'Working') matchesStatus = isWorking;
    else if (statusFilter === 'Revision') matchesStatus = isRevision;
    else if (statusFilter === 'Finalized') matchesStatus = isFinalized;

    // Date Filtering
    let dateMatch = true;
    if (dateFilter.start) {
      const pStart = p.startDate?.toDate();
      if (!pStart || format(pStart, 'yyyy-MM-dd') !== dateFilter.start) dateMatch = false;
    }
    if (dateFilter.due && dateMatch) {
      const pDue = p.dueDate?.toDate();
      if (!pDue || format(pDue, 'yyyy-MM-dd') !== dateFilter.due) dateMatch = false;
    }

    return matchesSearch && matchesFilter && matchesStatus && dateMatch && matchesVideoType;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Finalized': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'Revision': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'Rendering': return 'bg-brand-500/10 text-brand-500 border border-brand-500/20';
      case 'Editing': return 'bg-brand-500/20 text-brand-500 border border-brand-500/30';
      default: return 'bg-slate-100 dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10';
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="page-container">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="page-title">Project Tracker</h1>
          <p className="page-subtitle">Track your production velocity and settlement</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsAddOpen(true)}
             className="h-10 px-6 bg-brand-500 text-[#0D1117] rounded-xl font-black text-[10px] tracking-widest transition-all shadow-xl shadow-brand-500/10 hover:scale-[1.02] active:scale-95 flex items-center gap-2"
           >
             <Plus size={16} strokeWidth={3} /> Register Project
           </button>
        </div>
      </header>

      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search projects by unit name..." 
                className="w-full h-11 pl-12 pr-6 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all font-bold text-xs"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="lg:col-span-8 flex flex-wrap items-center gap-2">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 h-11">
              {['Working', 'Revision', 'Finalized'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as any)}
                  className={cn(
                    "px-4 rounded-lg text-[9px] font-black transition-all tracking-widest",
                    statusFilter === s 
                      ? "bg-brand-500 text-[#0D1117] shadow-lg shadow-brand-500/10" 
                      : "text-slate-500 hover:text-white"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 h-11">
              {['All', 'Paid', 'Not Paid'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={cn(
                    "px-4 rounded-lg text-[9px] font-black transition-all tracking-widest",
                    filter === f 
                      ? "bg-brand-500 text-[#0D1117] shadow-lg shadow-brand-500/10" 
                      : "text-slate-500 hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 h-11">
              {['All', 'Short Form', 'Long Form'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setVideoTypeFilter(tf as any)}
                  className={cn(
                    "px-4 rounded-lg text-[9px] font-black transition-all tracking-widest",
                    videoTypeFilter === tf 
                      ? "bg-brand-500 text-[#0D1117] shadow-lg shadow-brand-500/10" 
                      : "text-slate-500 hover:text-white"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Filters (Dates) */}
        <div className="glass-card flex flex-wrap items-center gap-6 py-4">
           <div className="flex items-center gap-4">
             <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-500 tracking-widest ml-1">Start</span>
                <input 
                  type="date"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white outline-none focus:border-brand-500 transition-all h-9"
                  value={dateFilter.start}
                  onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                />
             </div>
             <div className="space-y-1">
                <span className="text-[9px] font-black text-brand-500 tracking-widest ml-1">Due</span>
                <input 
                  type="date"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white outline-none focus:border-brand-500 transition-all h-9"
                  value={dateFilter.due}
                  onChange={e => setDateFilter(prev => ({ ...prev, due: e.target.value }))}
                />
             </div>
           </div>
           <button 
             onClick={() => setDateFilter({ start: '', due: '' } as any)}
             className="h-9 px-4 text-[9px] font-black text-slate-500 hover:text-white transition-colors border border-white/10 rounded-lg mt-5"
           >
             Reset Dates
           </button>
        </div>
      </div>

      {/* Milestone Banner */}
      <AnimatePresence>
        {deliveryMilestone && !isBannerDismissed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-brand-500 text-[#0D1117] p-4 rounded-xl flex items-center justify-between gap-4 mb-4 border border-brand-400">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black tracking-widest opacity-80">Milestone Incoming</p>
                    <p className="text-sm font-black tracking-tight">
                      {bannerRemaining} more {bannerRemaining === 1 ? 'delivery' : 'deliveries'} to unlock {deliveryMilestone.name}.
                    </p>
                  </div>
               </div>
               <button 
                 onClick={() => setIsBannerDismissed(true)}
                 className="p-1 hover:bg-white/10 rounded-full transition-colors"
               >
                 <X size={16} />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project List View */}
      <div className="bg-white dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10 premium-shadow overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          {/* table content remains same */}
          <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
               <tr className="border-b border-slate-100 dark:border-white/10">
                 <th className="px-4 py-3 text-[8px] font-black text-slate-400 tracking-[0.2em]">Production / Client</th>
                 <th className="px-4 py-3 text-[8px] font-black text-slate-400 tracking-[0.2em]">Form Type / Due</th>
                 <th className="px-4 py-3 text-[8px] font-black text-slate-400 tracking-[0.2em]">Financial Standing</th>
                 <th className="px-4 py-3 text-[8px] font-black text-slate-400 tracking-[0.2em]">Status</th>
                 <th className="px-4 py-3 text-[8px] font-black text-slate-400 tracking-[0.2em] text-right">Actions</th>
               </tr>
             </thead>
             <tbody>
               <AnimatePresence mode="popLayout">
                 {filteredProjects.map((p) => {
                   const clientName = getClientName(p.clientId);
                   return (
                     <motion.tr 
                       key={p.id}
                       layout
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       onClick={() => setSelectedProjectForPanel(p)}
                       className={cn(
                         "group cursor-pointer hover:bg-brand-500/[0.02] dark:hover:bg-brand-500/[0.05] transition-all duration-300 relative border-b border-slate-100/50 dark:border-white/5"
                       )}
                     >
                       <td className="px-4 py-3 relative">
                         <div className="flex items-center gap-3">
                           <div 
                             className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg shrink-0 text-white"
                             style={{ 
                               backgroundColor: getClientColor(p.clientId),
                               boxShadow: `0 4px 10px -2px ${getClientColor(p.clientId)}66`
                             }}
                           >
                             <Video size={16} strokeWidth={2.5} />
                           </div>
                           <div className="min-w-0">
                             <div className="flex items-center gap-1.5 mb-0.5">
                               <p className="font-black text-slate-900 dark:text-white tracking-tight text-xs leading-tight truncate">{p.name}</p>
                               {isDelayed(p) && (
                                 <span className="bg-red-500/10 text-red-500 text-[6px] font-black px-1.5 py-0.5 rounded-full tracking-tighter">
                                    Delayed
                                 </span>
                               )}
                             </div>
                             <div className="flex items-center gap-1">
                               <User size={8} className="text-brand-500" />
                               <span className="text-[8px] font-black text-slate-400 tracking-widest truncate">{p.clientId ? getClientName(p.clientId) : 'Direct Entry'}</span>
                             </div>
                           </div>
                         </div>
                       </td>
                       
                       <td className="px-4 py-3">
                         <div className="space-y-1">
                           <div className={cn(
                             "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[7px] font-black tracking-widest border",
                             p.videoType === 'Short Form' ? "bg-brand-500/10 text-brand-500 border-brand-500/20" : 
                             "bg-amber-500/10 text-amber-500 border-amber-500/20"
                           )}>
                              {p.videoType || 'Short Form'}
                            </div>
                            {p.startDate && p.startDate.toDate && (
                              <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                                <Calendar size={10} className="text-slate-400 dark:text-slate-500 shrink-0" /> {format(p.startDate.toDate(), 'dd MMM')}
                              </div>
                            )}
                           
                           {p.dueDate && p.dueDate.toDate && (
                             <div className={cn(
                               "flex items-center gap-1 text-[8px] font-black tracking-widest",
                               (new Date() > p.dueDate.toDate() && p.progress !== 'Final' && p.progress !== 'Done') ? "text-red-500 animate-pulse" : "text-brand-500 opacity-60"
                             )}>
                               <Clock size={10} /> {format(p.dueDate.toDate(), 'dd MMM')}
                             </div>
                           )}
                         </div>
                       </td>
 
                       <td className="px-4 py-3">
                         <div className="flex items-center gap-4">
                           <div>
                             <p className="text-[7px] font-black text-slate-400 uppercase tracking-tight mb-0.5">
                               Budget
                             </p>
                             <p className="font-black text-slate-900 dark:text-white text-[10px]">
                               {formatCurrency(p.budget)}
                             </p>
                           </div>
                           <div className="w-px h-5 bg-slate-100 dark:bg-white/10" />
                           <div>
                             <p className="text-[7px] font-black text-slate-400 uppercase tracking-tight mb-0.5">
                               Due
                             </p>
                             <p className={cn(
                               "font-black text-[10px]", 
                               p.dueMoney > 0 ? (new Date() > (p.dueDate?.toDate?.() || new Date()) ? "text-red-500" : "text-gold") : "text-emerald-500"
                             )}>
                                {formatCurrency(p.dueMoney)}
                             </p>
                           </div>
                         </div>
                       </td>
 
                       <td className="px-4 py-3">
                         <div className="flex items-center gap-2">
                            <div className="relative">
                               <div 
                                 className={cn(
                                   "px-2.5 py-1 rounded-full font-black tracking-widest text-[7px] border transition-all",
                                   (p.progress === 'Final' || p.progress === 'Done') ? "bg-emerald-500 text-white border-emerald-400 glow-emerald" :
                                   p.progress === 'Revision' ? "bg-amber-500 text-white border-amber-400 shadow-lg" :
                                   "bg-brand-500 text-white border-brand-400 shadow-md"
                                 )}
                               >
                                 {p.progress === 'Final' || p.progress === 'Done' ? <span className="flex items-center gap-1">Completed <CheckCircle2 size={8} /></span> : (p.progress || 'Working')}
                               </div>
                               {p.revisions > 0 && (
                                 <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[6px] font-black px-1 rounded-full border border-white dark:border-slate-900 shadow-lg">
                                   +{p.revisions}
                                 </span>
                               )}
                            </div>
                         </div>
                       </td>
 
                       <td className="px-4 py-3 text-right">
                         <div className="flex items-center justify-end gap-1.5 flex-wrap max-w-[150px] ml-auto">
                           {p.driveLink && (
                              <button 
                                 onClick={(e) => { e.stopPropagation(); window.open(p.driveLink, '_blank'); }}
                                 className="px-2 py-1 bg-brand-500 text-white rounded-lg font-black text-[7px] tracking-widest shadow-lg glow-brand hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                              >
                                 <Link size={10} /> Files
                              </button>
                           )}
                           
                           <button 
                             onClick={(e) => { e.stopPropagation(); setDuplicateId(p.id); }}
                             className="p-1.5 bg-brand-500/10 text-brand-500 rounded hover:bg-brand-500 hover:text-white transition-all shadow-sm"
                             title="Duplicate"
                           >
                             <Copy size={10} />
                           </button>
                           
                           <button 
                             onClick={(e) => { e.stopPropagation(); setPaymentUpdate({id: p.id, budget: p.budget, received: p.received}); }}
                             className="p-1.5 bg-emerald-500 text-white rounded hover:scale-110 transition-all shadow-lg"
                             title="Update"
                           >
                             <DollarSign size={10} strokeWidth={3} />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
                             className="p-1.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-red-500 rounded transition-all"
                             title="Delete"
                           >
                             <Trash2 size={10} />
                           </button>
                         </div>
                       </td>
                     </motion.tr>
                   );
                 })}
               </AnimatePresence>
             </tbody>
           </table>
        </div>
        {filteredProjects.length === 0 && !loading && (
          <div className="text-center flex-1 flex flex-col items-center justify-center py-16 bg-slate-50/50 dark:bg-white/5">
            <Video size={32} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-black tracking-[0.2em] text-[10px] italic">No projects found.</p>
          </div>
        )}
      </div>

      {/* Pipeline Meta Section */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
         <div className="bg-white dark:bg-white/5 p-4 rounded-lg border border-slate-100 dark:border-white/10 premium-shadow">
            <h4 className="text-[7px] font-black text-slate-400 tracking-widest mb-2">Total Managed Budget</h4>
            <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">
              {formatCurrency(filteredProjects.reduce((acc, p) => acc + (p.budget || 0), 0))}
            </p>
         </div>
         <div className="bg-white dark:bg-white/5 p-4 rounded-lg border border-slate-100 dark:border-white/10 premium-shadow">
            <h4 className="text-[7px] font-black text-slate-400 tracking-widest mb-2">Active Revisions</h4>
            <p className="text-lg font-black text-amber-500 tracking-tighter">
              {filteredProjects.reduce((acc, p) => acc + (p.revisions || 0), 0)} Instances
            </p>
         </div>
         <div className="bg-brand-500 p-4 rounded-lg shadow-xl shadow-brand-500/20 flex items-center justify-between">
            <div>
              <h4 className="text-[7px] font-black text-white/80 tracking-widest mb-1">Queue Status</h4>
              <p className="text-sm font-black text-white tracking-tighter">
                {filteredProjects.length} Entries Filtered
              </p>
            </div>
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
         </div>
      </section>

      {/* Modals and Overlays */}
      <QuickAddProject 
        isOpen={isAddOpen} 
        userProfile={userProfile}
        onClose={() => setIsAddOpen(false)} 
        onSuccess={() => setIsAddOpen(false)} 
      />

      <ProjectDetailsPanel 
        project={selectedProjectForPanel}
        isOpen={!!selectedProjectForPanel}
        onClose={() => setSelectedProjectForPanel(null)}
      />

      {/* Payment Update Modal */}
      <AnimatePresence>
        {paymentUpdate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaymentUpdate(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass p-6 rounded-2xl max-w-sm w-full relative z-10"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Add Payment</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Enter amount received.</p>
              <div className="relative mb-4">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                <input 
                  autoFocus
                  type="number" 
                  placeholder="0.00"
                  className="w-full pl-10 pr-6 py-3 bg-slate-100 dark:bg-white/5 dark:text-white border-none rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm"
                  value={additionalPayment}
                  onChange={(e) => setAdditionalPayment(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPaymentUpdate(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeUpdatePayment}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold glow-blue shadow-lg active:scale-[0.98] transition-all text-xs"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass p-6 rounded-2xl max-w-xs w-full relative z-10 text-center"
            >
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Delete Project?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">This action cannot be undone.</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all text-xs"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Duplicate Confirmation Modal */}
      <AnimatePresence>
        {duplicateId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDuplicateId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass p-6 rounded-2xl max-w-xs w-full relative z-10 text-center"
            >
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Copy size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Duplicate Project?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium italic">A copy will be created with same client and budget. Status and dates will reset.</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setDuplicateId(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDuplicate(duplicateId)}
                  className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all text-xs"
                >
                  Duplicate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
