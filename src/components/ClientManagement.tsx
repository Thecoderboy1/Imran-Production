import React, { useState, useEffect } from 'react';
import { LockedFeature, ProTooltip } from './LockedFeature';
import { PREMIUM_UPGRADE_URL } from '../lib/constants';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  Timestamp, 
  doc, 
  deleteDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { formatCurrency, cn, isGrandfathered } from '../lib/utils';
import { FREE_CLIENT_LIMIT } from '../lib/constants';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Mail, Phone, Building, Trash2, UserPlus, X, CheckCircle2, AlertCircle, Star, Clock, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { useNotifications } from './NotificationProvider';
import { ClientSkeleton } from './Skeleton';

export default function ClientManagement({ userProfile }: { userProfile?: any }) {
  const { addToast, showConfirm } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    color: '#6366f1' // Default brand color
  });

  const PRESET_COLORS = [
    '#6366f1', // Indigo (Brand)
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#22c55e', // Green
  ];

  useEffect(() => {
    if (!auth.currentUser) return;

    const studioOwnerId = userProfile?.teamOwnerId || auth.currentUser?.uid;

    // Fetch clients
    const qClients = query(collection(db, 'clients'), where('teamOwnerId', '==', studioOwnerId));

    const unsubscribeClients = onSnapshot(qClients, (snapshot) => {
      const clientList: any[] = [];
      snapshot.forEach(doc => clientList.push({ id: doc.id, ...doc.data() }));
      setClients(clientList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    // Fetch projects to calculate unpaid amount
    const qProjects = query(collection(db, 'projects'), where('teamOwnerId', '==', studioOwnerId));

    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      const projectList: any[] = [];
      snapshot.forEach(doc => projectList.push({ id: doc.id, ...doc.data() }));
      setProjects(projectList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => {
      unsubscribeClients();
      unsubscribeProjects();
    };
  }, [userProfile?.uid]);

  const calculateUnpaidForClient = (clientId: string) => {
    return projects
      .filter(p => p.clientId === clientId && p.paymentStatus !== 'Paid')
      .reduce((sum, p) => sum + (p.dueMoney || 0), 0);
  };

  const calculateTotalRevenueForClient = (clientId: string) => {
    return projects
      .filter(p => p.clientId === clientId)
      .reduce((sum, p) => sum + (p.budget || 0), 0);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newClient.name) return;

    // Premium Limit Check
    if (userProfile?.planType !== 'premium' && clients.length >= FREE_CLIENT_LIMIT) {
      addToast('error', `Free protocol limit reached (${FREE_CLIENT_LIMIT} clients). Upgrade to Pro for unlimited partners.`);
      setIsAddModalOpen(false);
      return;
    }

    try {
      const studioOwnerId = userProfile?.teamOwnerId || auth.currentUser?.uid;
      const clientData: any = {
        ...newClient,
        type: 'Regular',
        ownerId: auth.currentUser.uid,
        teamOwnerId: studioOwnerId,
        createdAt: serverTimestamp(),
        totalUnpaid: 0
      };

      await addDoc(collection(db, 'clients'), clientData);
      setNewClient({ name: '', email: '', phone: '', company: '', color: '#6366f1' });
      setIsAddModalOpen(false);
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const handleUpdateClientColor = async (color: string) => {
    if (!selectedClient) return;
    try {
      await updateDoc(doc(db, 'clients', selectedClient.id), { color });
      setSelectedClient({ ...selectedClient, color });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${selectedClient.id}`);
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const executeDeleteClient = async () => {
    if (!deleteId) return;
    
    try {
      await deleteDoc(doc(db, 'clients', deleteId));
      setDeleteId(null);
      if (selectedClient?.id === deleteId) setSelectedClient(null);
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `clients/${deleteId}`);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const starClientId = projects.length > 0 ? Object.keys(projects.reduce((acc: any, p) => {
    acc[p.clientId] = (acc[p.clientId] || 0) + (p.budget || 0);
    return acc;
  }, {})).sort((a, b) => {
    const revA = projects.filter(p => p.clientId === a).reduce((s, p) => s + (p.budget || 0), 0);
    const revB = projects.filter(p => p.clientId === b).reduce((s, p) => s + (p.budget || 0), 0);
    return revB - revA;
  })[0] : null;

  if (loading) return <ClientSkeleton />;

  return (
    <div className="page-container">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">Partner Ledger</h1>
            <span className="bg-brand-500 text-[#0D1117] px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest h-5 flex items-center">
              {clients.length} Total
            </span>
          </div>
          <p className="page-subtitle">Managing production relationships and partner equity</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="h-11 px-6 bg-brand-500 text-[#0D1117] rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-brand-500/10 active:scale-[0.98] text-[10px] tracking-[0.15em] shrink-0 active:scale-95"
        >
          <UserPlus size={16} strokeWidth={3} />
          Protocol Entry
        </button>
      </header>

      {/* Global Filter */}
      <div className="grid grid-cols-1 gap-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search partners by name or studio identity..." 
            className="w-full h-12 pl-12 pr-6 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all font-bold text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Client List View */}
      <div className="glass-card !p-0 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
               <tr className="border-b border-white/5 sticky top-0 bg-[#161B22] z-10">
                 <th className="px-6 py-4 text-[10px] font-black text-slate-500 tracking-[0.2em]">Partner / Identity</th>
                 <th className="px-6 py-4 text-[10px] font-black text-slate-500 tracking-[0.2em]">Total Portfolio</th>
                 <th className="px-6 py-4 text-[10px] font-black text-slate-500 tracking-[0.2em]">Outstanding</th>
                 <th className="px-6 py-4 text-[10px] font-black text-slate-500 tracking-[0.2em]">Protocols</th>
                 <th className="px-6 py-4 text-[10px] font-black text-slate-500 tracking-[0.2em] text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/[0.03]">
               <AnimatePresence mode="popLayout">
                 {filteredClients.map((client) => {
                   const unpaid = calculateUnpaidForClient(client.id);
                   const totalRevenue = calculateTotalRevenueForClient(client.id);
                   const clientProjects = projects.filter(p => p.clientId === client.id);
                   const lastProject = clientProjects.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))[0];
                   const isSilent = !lastProject || (Date.now() - (lastProject.createdAt?.toMillis() || 0)) > (30 * 24 * 60 * 60 * 1000);
                   const unpaidProjectsList = projects.filter(p => p.clientId === client.id && p.paymentStatus !== 'Paid').sort((a,b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
                   const oldestProject = unpaidProjectsList[0];
                   const daysPending = oldestProject ? Math.floor((Date.now() - (oldestProject.createdAt?.toMillis?.() || Date.now())) / (1000 * 60 * 60 * 24)) : 0;
                   const isRisky = daysPending > 30;

                   return (
                     <motion.tr 
                       key={client.id}
                       layout
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       onClick={() => setSelectedClient(client)}
                       className="group cursor-pointer hover:bg-white/[0.02] transition-colors"
                     >
                       <td className="px-6 py-5">
                         <div className="flex items-center gap-4">
                           <div className="relative shrink-0 flex items-center">
                             <div 
                               className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xs group-hover:scale-110 transition-transform duration-300 shadow-lg"
                               style={{ backgroundColor: client.color || '#6366f1', boxShadow: `0 4px 12px -2px ${client.color || '#6366f1'}44` }}
                             >
                               {client.name.charAt(0).toUpperCase()}
                             </div>
                             {client.id === starClientId && (
                               <motion.div 
                                 animate={{ scale: [1, 1.2, 1] }}
                                 transition={{ duration: 2, repeat: Infinity }}
                                 className="absolute -top-1.5 -right-1.5 bg-amber-500 text-[#0D1117] rounded-full p-1 border-2 border-[#161B22] shadow-xl"
                               >
                                 <Star size={8} fill="currentColor" />
                               </motion.div>
                             )}
                           </div>
                           <div className="min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                               <p className="font-black text-white text-sm uppercase tracking-tight group-hover:text-brand-500 transition-colors truncate">{client.name}</p>
                               {isRisky && (
                                 <span className="bg-red-500/10 text-red-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-red-500/20">Risky</span>
                               )}
                             </div>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">{client.company || 'Private Participant'}</p>
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-5 font-black text-emerald-500 text-sm tracking-tighter">{formatCurrency(totalRevenue)}</td>
                       <td className="px-6 py-5">
                         <div className="flex flex-col">
                           <p className={cn(
                             "font-black text-sm tracking-tighter",
                             unpaid > 0 ? (isRisky ? "text-red-500" : "text-amber-500") : "text-emerald-500/40"
                           )}>{formatCurrency(unpaid)}</p>
                           {unpaid > 0 && oldestProject && (
                             <span className={cn("text-[9px] font-black uppercase mt-1 tracking-widest opacity-60", isRisky ? "text-red-400" : "text-amber-500")}>
                               Pending {daysPending}d
                             </span>
                           )}
                         </div>
                       </td>
                       <td className="px-6 py-5">
                         <div className="flex items-center gap-2">
                           <div className={cn(
                             "w-8 h-8 rounded-lg flex items-center justify-center transition-colors border",
                             client.email ? "bg-brand-500/10 text-brand-500 border-brand-500/20" : "bg-white/5 text-slate-700 border-white/5"
                           )}>
                             <Mail size={14} />
                           </div>
                           <div className={cn(
                             "w-8 h-8 rounded-lg flex items-center justify-center transition-colors border",
                             client.phone ? "bg-white/10 text-white border-white/20" : "bg-white/5 text-slate-700 border-white/5"
                           )}>
                             <Phone size={14} />
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-5 text-right">
                         <button 
                           onClick={(e) => { e.stopPropagation(); setDeleteId(client.id); }}
                           className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all"
                         >
                           <Trash2 size={16} />
                         </button>
                       </td>
                     </motion.tr>
                   );
                 })}
               </AnimatePresence>
             </tbody>
          </table>
        </div>
        {filteredClients.length === 0 && (
          <div className="py-24 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 text-slate-600 mb-6">
              <Search size={32} />
            </div>
            <p className="text-slate-500 font-black tracking-[0.2em] text-[10px] italic">No partners match the queried identity</p>
          </div>
        )}
      </div>

      {/* Network Pulse Stats Bar */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="glass-card">
            <span className="section-header">Top Delegate</span>
            <p className="text-xl font-black text-white tracking-tighter truncate mt-1">
              {clients.find(c => c.id === starClientId)?.name || 'Determining...'}
            </p>
         </div>
         <div className="glass-card">
            <span className="section-header">Credit Integrity</span>
            <p className="text-xl font-black text-red-500 tracking-tighter mt-1">
              {clients.filter(c => calculateUnpaidForClient(c.id) > 1000).length} High-Risk
            </p>
         </div>
         <div className="md:col-span-2 bg-brand-500 p-6 rounded-xl shadow-xl shadow-brand-500/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-[#0D1117]/60 tracking-[0.2em] block mb-1">Network Density</span>
              <p className="text-3xl font-black text-[#0D1117] tracking-tighter leading-none">{clients.length} Nodes</p>
            </div>
            <div className="w-12 h-12 bg-[#0D1117]/10 rounded-xl flex items-center justify-center">
              <Shield size={24} className="text-[#0D1117]" />
            </div>
         </div>
      </section>

      {/* Client Detail Overlay */}
      <AnimatePresence>
        {selectedClient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-end p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClient(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass !p-0 w-full max-w-sm h-full rounded-l-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col border-l border-white/5"
            >
              <LockedFeature 
                isLocked={userProfile?.planType !== 'premium'} 
                onUpgrade={() => window.location.href = PREMIUM_UPGRADE_URL}
                className="h-full flex flex-col"
              >
                <div className="p-8 border-b border-white/5">
                  <div className="flex justify-between items-start mb-6">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-2xl shadow-black/20"
                      style={{ backgroundColor: selectedClient.color || '#6366f1' }}
                    >
                      {selectedClient.name.charAt(0).toUpperCase()}
                    </div>
                    <button 
                      onClick={() => setSelectedClient(null)}
                      className="w-10 h-10 bg-white/5 text-slate-500 rounded-xl hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight leading-none">{selectedClient.name}</h2>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-brand-500 font-black tracking-[0.2em] text-[10px]">{selectedClient.company || 'Direct Engagement'}</span>
                  </div>

                  <div className="mt-8">
                    <span className="section-header !text-slate-500 mb-3">Rebrand Identity</span>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => handleUpdateClientColor(color)}
                          className={cn(
                            "w-6 h-6 rounded-lg transition-all duration-300 relative",
                            selectedClient.color === color ? "scale-110 ring-2 ring-brand-500 ring-offset-2 ring-offset-[#161B22]" : "opacity-40 hover:opacity-100"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card">
                       <span className="section-header">Portfolio</span>
                       <p className="text-xl font-black text-white tracking-tighter mt-1">{formatCurrency(calculateTotalRevenueForClient(selectedClient.id))}</p>
                    </div>
                    <div className="glass-card">
                       <span className="section-header">Unpaid</span>
                       <p className={cn("text-xl font-black tracking-tighter mt-1", calculateUnpaidForClient(selectedClient.id) > 0 ? "text-amber-500" : "text-emerald-500")}>
                         {formatCurrency(calculateUnpaidForClient(selectedClient.id))}
                       </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="section-header">Contact Information</span>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-brand-500">
                          <Mail size={16} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                          <p className="section-header opacity-60">Email</p>
                          <p className="font-black text-white text-xs tracking-tight">{selectedClient.email || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-emerald-500">
                          <Phone size={16} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                          <p className="section-header opacity-60">Communication</p>
                          <p className="font-black text-white text-xs tracking-tight">{selectedClient.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="section-header">Production Feed</span>
                    <div className="space-y-3">
                      {projects.filter(p => p.clientId === selectedClient.id).length > 0 ? (
                        projects.filter(p => p.clientId === selectedClient.id).map(p => (
                          <div key={p.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-black text-white truncate text-xs uppercase tracking-tight leading-tight">{p.name}</p>
                              <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mt-1 opacity-60 italic">{p.videoType}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-xs text-white">{formatCurrency(p.budget)}</p>
                              <p className={cn(
                                "text-[9px] font-black uppercase tracking-widest mt-1",
                                p.paymentStatus === 'Paid' ? "text-emerald-500" : "text-amber-500"
                              )}>{p.paymentStatus}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No active histories</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-white/5">
                  <button 
                    onClick={() => setDeleteId(selectedClient.id)}
                    className="w-full h-12 bg-white/5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all"
                  >
                    Terminate Node
                  </button>
                </div>
              </LockedFeature>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Protocol Entry Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass dark:!bg-[#161B22] rounded-3xl p-10 max-w-md w-full shadow-2xl relative border border-white/5"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight">Node Entry</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-2 font-black italic">Expanding organizational network</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-10 h-10 bg-white/5 text-slate-500 rounded-xl hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddClient} className="space-y-6">
                <div>
                  <span className="section-header mb-2 ml-1">Entity Name *</span>
                  <input 
                    required
                    type="text" 
                    className="w-full h-12 bg-white/5 text-white border border-white/10 rounded-xl px-5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all text-sm font-bold"
                    placeholder="Partner name..."
                    value={newClient.name}
                    onChange={e => setNewClient({...newClient, name: e.target.value})}
                  />
                </div>
                <div>
                  <span className="section-header mb-2 ml-1">Corporate Studio</span>
                  <input 
                    type="text" 
                    className="w-full h-12 bg-white/5 text-white border border-white/10 rounded-xl px-5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all text-sm font-bold"
                    placeholder="Identity..."
                    value={newClient.company}
                    onChange={e => setNewClient({...newClient, company: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="section-header mb-2 ml-1">Email Terminal</span>
                    <input 
                      type="email" 
                      className="w-full h-12 bg-white/5 text-white border border-white/10 rounded-xl px-5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all text-xs font-bold"
                      placeholder="address..."
                      value={newClient.email}
                      onChange={e => setNewClient({...newClient, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <span className="section-header mb-2 ml-1">Comm Line</span>
                    <input 
                      type="tel" 
                      className="w-full h-12 bg-white/5 text-white border border-white/10 rounded-xl px-5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all text-xs font-bold"
                      placeholder="+91..."
                      value={newClient.phone}
                      onChange={e => setNewClient({...newClient, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <span className="section-header mb-4 text-center block">Visual Allocation</span>
                  <div className="flex flex-wrap justify-center gap-3">
                    {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewClient({...newClient, color})}
                          className={cn(
                            "w-8 h-8 rounded-xl transition-all duration-300 relative",
                            newClient.color === color ? "scale-110 ring-4 ring-white/10 shadow-2xl" : "opacity-40 hover:opacity-100"
                          )}
                          style={{ backgroundColor: color }}
                        >
                          {newClient.color === color && (
                            <div className="absolute inset-0 m-auto w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full h-14 bg-brand-500 text-[#0D1117] rounded-2xl font-black mt-8 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-brand-500/10 uppercase tracking-[0.2em] text-xs"
                >
                  Establish Node
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
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
              className="glass p-8 rounded-3xl max-w-xs w-full relative z-10 text-center border border-white/5"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Delete Node?</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-8">This action terminates the partner identity</p>
              <div className="flex gap-4">
                <button 
                   onClick={() => setDeleteId(null)}
                   className="flex-1 py-4 bg-white/5 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDeleteClient}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-2xl shadow-red-500/10 active:scale-95 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
