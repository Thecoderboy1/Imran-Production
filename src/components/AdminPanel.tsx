import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  orderBy, 
  deleteDoc,
  where,
  addDoc,
  limit,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Shield, 
  Ticket, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  Mail, 
  Plus, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  UserPlus,
  CreditCard,
  UserCheck,
  Lock,
  LayoutDashboard,
  Bell,
  RefreshCw,
  Trash2,
  Gift,
  Copy,
  Eye,
  LogOut,
  Zap,
  BarChart3,
  History,
  Activity,
  Award,
  Filter,
  X,
  Star,
  MessageSquare,
  Heart
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { Skeleton, TableSkeleton } from './Skeleton';
import { CustomModal, useNotifications } from './NotificationProvider';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const ADMIN_EMAIL = 'imranraja08520@gmail.com';
const ADMIN_PIN = '0852'; // Required PIN

function GenericModal({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-slate-900 border border-white/10 rounded-[2.5rem] max-w-md w-full relative z-10 shadow-2xl overflow-hidden"
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function AdminPanel({ onImpersonate, isImpersonating, onExitImpersonation }: { onImpersonate: (uid: string) => void, isImpersonating: boolean, onExitImpersonation: () => void }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'requests' | 'codes' | 'notifications' | 'feedback'>('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  
  const [rewardModal, setRewardModal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const { addToast } = useNotifications();

  // PIN Handlers
  useEffect(() => {
    const savedLockout = localStorage.getItem('admin_lockout');
    if (savedLockout) {
      const time = parseInt(savedLockout);
      if (time > Date.now()) setLockoutUntil(time);
    }
  }, []);

  const handlePinSubmit = (val: string) => {
    if (lockoutUntil && lockoutUntil > Date.now()) return;
    
    if (val === ADMIN_PIN) {
      setIsLocked(false);
      setAttempts(0);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        const until = Date.now() + 10 * 60 * 1000;
        setLockoutUntil(until);
        localStorage.setItem('admin_lockout', until.toString());
        addToast('error', 'Too many attempts. Locked for 10 minutes.');
      } else {
        addToast('error', 'Incorrect PIN.');
      }
      setPin('');
    }
  };

  // Real-time Data
  useEffect(() => {
    if (isLocked || auth.currentUser?.email !== ADMIN_EMAIL) return;

    const unsubs = [
      onSnapshot(collection(db, 'userProfiles'), (snap) => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }),
      onSnapshot(query(collection(db, 'proAccessRequests'), orderBy('requestDate', 'desc')), (snap) => {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(collection(db, 'inviteCodes'), (snap) => {
        setInviteCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(query(collection(db, 'adminLogs'), orderBy('timestamp', 'desc'), limit(50)), (snap) => {
        setAdminLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(query(collection(db, 'broadcasts'), orderBy('timestamp', 'desc')), (snap) => {
        setBroadcasts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc')), (snap) => {
        setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      })
    ];

    return () => unsubs.forEach(u => u());
  }, [isLocked]);

  // Tabs Sub-components
  const DashboardTab = () => {
    const stats = useMemo(() => {
      const total = users.length;
      const premium = users.filter(u => u.planType === 'premium').length;
      const free = total - premium;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const week = today - 7 * 24 * 60 * 60 * 1000;
      
      const activeToday = users.filter(u => u.lastActiveAt?.toDate?.()?.getTime() > today).length;
      const activeWeek = users.filter(u => u.lastActiveAt?.toDate?.()?.getTime() > week).length;
      const pending = requests.filter(r => r.status === 'Pending').length;

      const chartData = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const dayStr = d.toLocaleDateString();
        const dayUsers = users.filter(u => u.createdAt?.toDate?.()?.toLocaleDateString() === dayStr).length;
        const premiumUsers = users.filter(u => u.createdAt?.toDate?.()?.toLocaleDateString() === dayStr && u.planType === 'premium').length;
        return { name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), total: dayUsers, premium: premiumUsers };
      });

      return { total, premium, free, activeToday, activeWeek, pending, chartData };
    }, [users, requests]);

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[
            { label: 'Total Units', val: stats.total, icon: <Users size={20} /> },
            { label: 'Pro Operatives', val: stats.premium, icon: <Zap size={20} />, active: true },
            { label: 'Standard', val: stats.free, icon: <LayoutDashboard size={20} /> },
            { label: 'Active 24H', val: stats.activeToday, icon: <Activity size={20} /> },
            { label: 'Weekly Reach', val: stats.activeWeek, icon: <TrendingUp size={20} /> },
            { label: 'Pending Auth', val: stats.pending, icon: <Clock size={20} />, alert: stats.pending > 0 }
          ].map((s, i) => (
            <div key={i} className={cn(
              "glass-card !p-6 flex flex-col items-center text-center group hover:scale-[1.02] transition-all",
              s.alert && "border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]",
              s.active && "border-brand-500/30 shadow-[0_0_20px_rgba(0,200,83,0.1)]"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                s.alert ? "bg-amber-500/10 text-amber-500" : s.active ? "bg-brand-500/10 text-brand-500" : "bg-white/5 text-slate-600 group-hover:text-white"
              )}>
                {s.icon}
              </div>
              <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] mb-1">{s.label}</p>
              <p className="text-3xl font-black text-white tracking-tighter">{s.val}</p>
            </div>
          ))}
        </div>

        {/* Daily Signups Chart */}
        <div className="glass-card !p-8">
           <header className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-sm font-black text-white tracking-[0.2em] flex items-center gap-3">
                   <BarChart3 size={18} className="text-brand-500" /> Operational Enrollment
                </h3>
                <p className="text-[10px] font-bold text-slate-600 tracking-widest mt-1">Growth velocity over fiscal period</p>
              </div>
              <div className="flex items-center gap-2">
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-[#6366f1]" />
                    <span className="text-[8px] font-black text-slate-400">Total</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
                    <span className="text-[8px] font-black text-slate-400">Pro</span>
                 </div>
              </div>
           </header>
           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={stats.chartData}>
                    <defs>
                       <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#475569" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#475569', fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => Math.floor(val).toString()} 
                      tick={{ fill: '#475569', fontWeight: 700 }}
                    />
                    <Tooltip 
                       contentStyle={{ 
                         backgroundColor: '#0D1117', 
                         border: '1px solid rgba(255,255,255,0.1)', 
                         borderRadius: '16px',
                         boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                         padding: '12px 16px'
                       }}
                       labelStyle={{ color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}
                       itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" dataKey="premium" stroke="#fbbf24" strokeWidth={3} fill="transparent" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Audit Log Table */}
        <div className="glass-card overflow-hidden !p-0">
          <div className="p-8 border-b border-white/5">
            <h3 className="text-sm font-black text-white tracking-[0.2em] flex items-center gap-3">
              <History size={18} className="text-brand-500" /> Operational Protocol Audit
            </h3>
            <p className="text-[10px] font-bold text-slate-600 tracking-widest mt-1">Real-time system state modifications</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto scrollbar-hide">
            <table className="w-full text-left">
              <tbody className="divide-y divide-white/[0.02]">
                {adminLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-8 py-5">
                      <p className="text-[10px] font-black text-brand-500 tracking-[0.2em] mb-1">{log.type}</p>
                      <p className="text-[9px] font-bold text-slate-600 italic tracking-wider">{log.timestamp?.toDate().toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs text-white font-bold tracking-tight mb-1">{log.details}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] text-slate-600 font-black">Identity: {log.targetEmail}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                        <span className="text-[9px] text-slate-600 font-black">Admin: {log.adminEmail}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const UsersTab = () => {
    const [userSearch, setUserSearch] = useState('');
    const [userFilter, setUserFilter] = useState<'All' | 'Premium' | 'Free' | 'Active Today'>('All');
    const [selectedUserForDetails, setSelectedUserForDetails] = useState<any>(null);
    const [deepStats, setDeepStats] = useState<{ clients: number, income: number, due: number, invoices: number } | null>(null);
    const [deepLoading, setDeepLoading] = useState(false);
    const [grantModal, setGrantModal] = useState<any>(null);
    const [deleteModal, setDeleteModal] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [rewardModal, setRewardModal] = useState<any>(null);

    // Fetch deep data when user selected
    useEffect(() => {
      if (!selectedUserForDetails) {
        setDeepStats(null);
        return;
      }

      const fetchDeepData = async () => {
        setDeepLoading(true);
        try {
          const uid = selectedUserForDetails.id;
          const [clientsSnap, projectsSnap, invoicesSnap] = await Promise.all([
            getDocs(query(collection(db, 'clients'), where('teamOwnerId', '==', uid))),
            getDocs(query(collection(db, 'projects'), where('teamOwnerId', '==', uid))),
            getDocs(query(collection(db, 'invoices'), where('teamOwnerId', '==', uid)))
          ]);

          const income = projectsSnap.docs.reduce((sum, d) => sum + (d.data().received || 0), 0);
          const due = projectsSnap.docs.reduce((sum, d) => sum + (d.data().dueMoney || 0), 0);
          
          setDeepStats({
            clients: clientsSnap.size,
            income,
            due,
            invoices: invoicesSnap.size
          });
        } catch (e) {
          console.error("Deep fetch fail", e);
        } finally {
          setDeepLoading(false);
        }
      };

      fetchDeepData();
    }, [selectedUserForDetails]);

    const filteredUsers = useMemo(() => {
      return users.filter(u => {
        const matchesSearch = (u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()));
        if (!matchesSearch) return false;
        if (userFilter === 'Premium') return u.planType === 'premium';
        if (userFilter === 'Free') return u.planType !== 'premium';
        if (userFilter === 'Active Today') {
           const today = new Date().setHours(0,0,0,0);
           return u.lastActiveAt?.toDate?.()?.getTime() > today;
        }
        return true;
      });
    }, [users, userSearch, userFilter]);

    const handleGrant = async (uid: string, days: number, email: string) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      await updateDoc(doc(db, 'userProfiles', uid), {
        planType: 'premium',
        planExpiry: date.toISOString(),
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'adminLogs'), {
        type: 'GRANT_PREMIUM',
        adminEmail: auth.currentUser?.email,
        targetEmail: email,
        details: `Granted ${days} days of Pro access.`,
        timestamp: serverTimestamp()
      });
      setGrantModal(null);
      addToast('success', 'Access Granted.');
    };

    const handleRevoke = async (uid: string, email: string) => {
      await updateDoc(doc(db, 'userProfiles', uid), {
        planType: 'free',
        planExpiry: null,
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'adminLogs'), {
        type: 'REVOKE_PREMIUM',
        adminEmail: auth.currentUser?.email,
        targetEmail: email,
        details: `Revoked Pro access.`,
        timestamp: serverTimestamp()
      });
      addToast('success', 'Access Revoked.');
    };

    const handleDelete = async (uid: string, email: string) => {
      // Deletion of user profile and logging
      await deleteDoc(doc(db, 'userProfiles', uid));
      // NOTE: Real-world would also delete collections but let's stick to core profile for now
      
      await addDoc(collection(db, 'adminLogs'), {
        type: 'DELETE_ACCOUNT',
        adminEmail: auth.currentUser?.email,
        targetEmail: email,
        details: `Permanently deleted user profile.`,
        timestamp: serverTimestamp()
      });
      
      setDeleteModal(null);
      setSelectedUserForDetails(null);
      addToast('success', 'User obliterated.');
    };

    return (
      <div className="space-y-12">
        {/* Top Performers (Rankings) */}
        <section className="glass-card !bg-brand-500/[0.02] border-brand-500/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
             <Award size={160} className="text-brand-500" />
          </div>
          
          <div className="mb-10 relative z-10">
            <h3 className="section-header !text-brand-500 mb-2">Elite Performance Vanguard</h3>
            <p className="text-[10px] font-bold text-slate-600 italic tracking-widest">Highest engagement metrics recorded in current cycle</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10">
             {users.sort((a,b) => (b.sessions || 0) - (a.sessions || 0)).slice(0, 5).map((u, i) => (
                <div key={u.id} onClick={() => setSelectedUserForDetails(u)} className="glass-card hover:border-brand-500/40 hover:bg-brand-500/5 transition-all group/card cursor-pointer !p-6">
                   <div className="flex justify-between items-start mb-6">
                      <div className="relative">
                         <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} className="w-14 h-14 rounded-2xl border border-white/5 shadow-2xl" referrerPolicy="no-referrer" />
                         <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#0D1117] rounded-xl flex items-center justify-center border border-white/10 shadow-2xl">
                            <span className="text-[10px] font-black text-brand-500">#{i+1}</span>
                         </div>
                      </div>
                      {u.sessions > 20 && (
                         <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-500">
                            <Zap size={14} fill="currentColor" />
                         </div>
                      )}
                   </div>
                   <h4 className="text-xs font-black text-white truncate mb-1 tracking-tight">{u.workspaceName || u.displayName}</h4>
                   <p className={cn(
                     "text-[9px] font-black tracking-[0.1em]",
                     u.planType === 'premium' ? "text-amber-500" : "text-slate-600"
                   )}>{u.planType === 'premium' ? 'Pro Operative' : 'Standard Unit'}</p>
                   
                   <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.03]">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-black text-white leading-none">{u.sessions || 0}</span>
                        <span className="text-[7px] font-black text-slate-600 mt-1">Sessions</span>
                      </div>
                      {(u.sessions || 0) > 50 && <Star size={12} className="text-brand-500 fill-brand-500" />}
                   </div>
                </div>
             ))}
          </div>
        </section>

        {/* User Table Component */}
        <section className="glass-card !p-0 overflow-hidden">
          <header className="p-8 border-b border-white/5 flex flex-wrap gap-6 items-center justify-between">
            <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl flex-1 max-w-lg border border-white/5 focus-within:border-brand-500/50 transition-all">
              <Search size={18} className="text-slate-600" />
              <input 
                type="text" 
                placeholder="Locate Operative Identity..." 
                className="bg-transparent border-none outline-none text-white text-[11px] font-black tracking-[0.1em] w-full"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              {['All', 'Premium', 'Free', 'Active Today'].map(f => (
                <button 
                  key={f}
                  onClick={() => setUserFilter(f as any)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all border",
                    userFilter === f ? "bg-brand-500 text-[#0D1117] border-brand-500" : "bg-white/5 text-slate-500 border-white/10 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01] border-b border-white/[0.03]">
                  <th className="px-8 py-5 section-header !text-slate-600 lowercase">Visual Identity</th>
                  <th className="px-8 py-5 section-header !text-slate-600 lowercase">Operative Access</th>
                  <th className="px-8 py-5 section-header !text-slate-600 lowercase text-center">Protocol Engagement</th>
                  <th className="px-8 py-5 section-header !text-slate-600 lowercase text-right">System Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filteredUsers.map(u => (
                  <tr key={u.id} onClick={() => setSelectedUserForDetails(u)} className="hover:bg-white/[0.01] transition-colors group cursor-pointer">
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-5">
                         <img 
                          src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}&background=6366f1&color=fff`} 
                          className="w-12 h-12 rounded-2xl border border-white/10 shadow-2xl" 
                          referrerPolicy="no-referrer"
                         />
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-black text-white tracking-tight">{u.displayName}</p>
                              {(u.sessions || 0) > 50 && (
                                <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(0,200,83,0.5)]" />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-600 font-bold tracking-tight lowercase">{u.email}</p>
                         </div>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex flex-col gap-2">
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[9px] font-black tracking-[0.2em] w-fit border",
                            u.planType === 'premium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-white/5 text-slate-600 border-white/10"
                          )}>
                            {u.planType || 'FREE'}
                          </span>
                          {u.planExpiry && (
                            <p className="text-[8px] text-slate-700 font-black tracking-widest italic">Signal ends: {new Date(u.planExpiry).toLocaleDateString()}</p>
                          )}
                       </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <p className="text-xl font-black text-white leading-none">{u.sessions || 0}</p>
                       <p className="text-[8px] font-black text-slate-600 tracking-widest mt-1">Sessions</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setRewardModal({ uid: u.id, email: u.email, name: u.displayName }); }}
                            className="w-10 h-10 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-500 hover:bg-pink-500 hover:text-[#0D1117] transition-all flex items-center justify-center"
                          >
                             <Gift size={18} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onImpersonate(u.id); }}
                            className="w-10 h-10 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-500 hover:bg-brand-500 hover:text-[#0D1117] transition-all flex items-center justify-center"
                          >
                             <LogOut size={18} className="rotate-180" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setGrantModal({ uid: u.id, email: u.email, isPremium: u.planType === 'premium' }); }}
                            className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 hover:bg-amber-500 hover:text-[#0D1117] transition-all flex items-center justify-center"
                          >
                             <Shield size={18} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteModal({ uid: u.id, email: u.email, name: u.displayName }); }}
                            className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                          >
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed User Sidepanel */}
        <AnimatePresence>
          {selectedUserForDetails && (
             <div className="fixed inset-0 z-[200] pointer-events-none">
                <motion.div 
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-[#0D1117]/80 backdrop-blur-md pointer-events-auto"
                   onClick={() => setSelectedUserForDetails(null)}
                />
                <motion.div 
                   initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                   transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                   className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-[#0D1117] border-l border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] pointer-events-auto p-12 overflow-y-auto scrollbar-hide"
                >
                   <header className="flex items-center justify-between mb-12">
                      <h3 className="text-[10px] font-black text-brand-500 tracking-[0.4em]">Operative Intelligence</h3>
                      <button onClick={() => setSelectedUserForDetails(null)} className="w-10 h-10 flex items-center justify-center glass rounded-full text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                      </button>
                   </header>
                   
                   <div className="mb-12 flex flex-col items-center">
                      <div className="relative mb-8">
                         <div className="absolute inset-0 bg-brand-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                         <img 
                           src={selectedUserForDetails.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUserForDetails.email}`} 
                           className="w-32 h-32 rounded-[40px] border-2 border-brand-500 relative z-10 shadow-2xl" 
                           referrerPolicy="no-referrer" 
                         />
                      </div>
                      <h4 className="text-3xl font-black text-white tracking-tighter mb-2 text-center">{selectedUserForDetails.workspaceName || selectedUserForDetails.displayName}</h4>
                      <p className="text-slate-500 font-bold text-xs tracking-widest tracking-tighter">{selectedUserForDetails.email}</p>
                   </div>
 
                   {/* Deep Stats Grid */}
                   <div className="grid grid-cols-2 gap-6 mb-12">
                      <div className="glass-card !bg-white/[0.02] !p-6">
                         <span className="section-header mb-2 !text-slate-600 lowercase tracking-widest">Lifetime Yield</span>
                         {deepLoading ? <div className="h-8 w-24 bg-white/5 animate-pulse rounded-lg" /> : (
                           <p className="text-2xl font-black text-emerald-500 tracking-tighter leading-none">{formatCurrency(deepStats?.income || 0)}</p>
                         )}
                      </div>
                      <div className="glass-card !bg-white/[0.02] !p-6">
                         <span className="section-header mb-2 !text-slate-600 lowercase tracking-widest">Pending Protocol</span>
                         {deepLoading ? <div className="h-8 w-24 bg-white/5 animate-pulse rounded-lg" /> : (
                           <p className="text-2xl font-black text-rose-500 tracking-tighter leading-none">{formatCurrency(deepStats?.due || 0)}</p>
                         )}
                      </div>
                      <div className="glass-card !bg-white/[0.02] !p-6">
                         <span className="section-header mb-2 !text-slate-600 lowercase tracking-widest">Client Network</span>
                         {deepLoading ? <div className="h-8 w-12 bg-white/5 animate-pulse rounded-lg" /> : (
                           <p className="text-2xl font-black text-white tracking-tighter leading-none">{deepStats?.clients || 0}</p>
                         )}
                      </div>
                      <div className="glass-card !bg-white/[0.02] !p-6">
                         <span className="section-header mb-2 !text-slate-600 lowercase tracking-widest">Billable Units</span>
                         {deepLoading ? <div className="h-8 w-12 bg-white/5 animate-pulse rounded-lg" /> : (
                           <p className="text-2xl font-black text-cyan-500 tracking-tighter leading-none">{deepStats?.invoices || 0}</p>
                         )}
                      </div>
                   </div>
 
                   <div className="space-y-6">
                      <button 
                        onClick={() => onImpersonate(selectedUserForDetails.id)} 
                        className="w-full h-16 bg-brand-500 text-[#0D1117] rounded-3xl font-black text-xs tracking-[0.2em] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-brand-500/20"
                      >
                        <Zap size={20} fill="currentColor" /> Initialize Infiltration
                      </button>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setGrantModal(selectedUserForDetails)} 
                          className="h-14 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-[10px] tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                          <Shield size={16} /> Manage Access
                        </button>
                        <button 
                          onClick={() => setRewardModal(selectedUserForDetails)} 
                          className="h-14 bg-pink-500/10 text-pink-500 border border-pink-500/20 rounded-2xl font-black text-[10px] tracking-[0.2em] hover:bg-pink-500 transition-all flex items-center justify-center gap-2"
                        >
                          <Gift size={16} /> Send Reward
                        </button>
                      </div>
 
                      <button 
                        onClick={() => setDeleteModal({ uid: selectedUserForDetails.id, email: selectedUserForDetails.email, name: selectedUserForDetails.displayName })} 
                        className="w-full h-14 bg-red-500/5 text-red-500 border border-red-500/20 rounded-2xl font-black text-[10px] tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} /> Terminate Profile
                      </button>
                   </div>
                </motion.div>
             </div>
          )}
        </AnimatePresence>

        {grantModal && (
           <GenericModal isOpen={true} onClose={() => setGrantModal(null)}>
              <div className="p-8">
                 <h3 className="text-xl font-black text-white mb-8">Access Level Override</h3>
                 {grantModal.isPremium ? (
                    <button onClick={() => handleRevoke(grantModal.uid, grantModal.email)} className="w-full py-4 bg-red-600 text-white rounded-xl font-black text-xs">Revoke Pro Access</button>
                 ) : (
                    <div className="grid grid-cols-2 gap-4">
                       {[30, 100, 180, 365].map(d => (
                          <button key={d} onClick={() => handleGrant(grantModal.uid, d, grantModal.email)} className="py-4 bg-slate-800 text-white rounded-xl font-black text-[10px]">{d} Days</button>
                       ))}
                    </div>
                 )}
              </div>
           </GenericModal>
        )}

        {deleteModal && (
           <GenericModal isOpen={true} onClose={() => { setDeleteModal(null); setDeleteConfirm(''); }}>
              <div className="p-8 space-y-6">
                 <h3 className="text-xl font-black text-white">Obliteration Sequence</h3>
                 <p className="text-red-500 font-bold text-xs uppercase">Type "DELETE" to confirm elimination of {deleteModal.email}</p>
                 <input 
                   className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white font-black tracking-[0.4em] outline-none" 
                   value={deleteConfirm}
                   onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
                   placeholder="TYPE DELETE"
                 />
                 <button 
                   disabled={deleteConfirm !== 'DELETE'} 
                   onClick={() => handleDelete(deleteModal.uid, deleteModal.email)} 
                   className="w-full py-4 bg-red-600 disabled:opacity-20 text-white rounded-xl font-black text-xs"
                 >
                   Execute Deletion
                 </button>
              </div>
           </GenericModal>
        )}

        {rewardModal && (
           <GenericModal isOpen={true} onClose={() => setRewardModal(null)}>
              <div className="p-8 space-y-6">
                 <h3 className="text-xl font-black text-white">Reward Protocol</h3>
                 <p className="text-pink-500 font-bold text-xs uppercase underline">Recipient: {rewardModal.email}</p>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500">Personal Message (500 MAX)</label>
                    <textarea 
                       id="reward-msg"
                       className="w-full h-32 bg-slate-800 border border-white/10 rounded-2xl p-4 text-white font-medium text-xs resize-none"
                       placeholder="WRITE COMMENDATION..."
                       maxLength={500}
                    />
                 </div>
                 <button 
                   onClick={async () => {
                      const msg = (document.getElementById('reward-msg') as HTMLTextAreaElement).value;
                      if (!msg) return;
                      await addDoc(collection(db, 'notifications'), {
                         userId: rewardModal.uid,
                         title: 'REWARD RECEIVED',
                         message: msg,
                         type: 'reward',
                         fromAdmin: true,
                         read: false,
                         timestamp: serverTimestamp()
                      });
                      await addDoc(collection(db, 'adminLogs'), {
                         type: 'SEND_REWARD',
                         adminEmail: auth.currentUser?.email,
                         targetEmail: rewardModal.email,
                         details: `Sent reward message: ${msg.slice(0, 50)}...`,
                         timestamp: serverTimestamp()
                      });
                      setRewardModal(null);
                      addToast('success', 'Reward dispatched.');
                   }}
                   className="w-full py-4 bg-pink-500 text-white rounded-2xl font-black text-xs hover:scale-105 transition-all"
                 >
                    Transmit Commendation
                 </button>
              </div>
           </GenericModal>
        )}
      </div>
    );
  };

  const ProRequestsTab = () => {
     const [filter, setFilter] = useState<'Pending' | 'Approved' | 'Declined'>('Pending');
     const reqs = requests.filter(r => r.status === filter);

     const handleStatus = async (rid: string, status: string, email: string) => {
        await updateDoc(doc(db, 'proAccessRequests', rid), { status, updatedAt: serverTimestamp() });
        await addDoc(collection(db, 'adminLogs'), { type: `PRO_${status.toUpperCase()}`, adminEmail: auth.currentUser?.email, targetEmail: email, details: `${status} request.`, timestamp: serverTimestamp() });
        addToast('success', `Request ${status}.`);
     };

     return (
        <div className="space-y-8">
           <div className="flex gap-3">
              {['Pending', 'Approved', 'Declined'].map(f => (
                 <button 
                  key={f} 
                  onClick={() => setFilter(f as any)} 
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all border", 
                    filter === f ? "bg-brand-500 text-[#0D1117] border-brand-500" : "bg-white/5 text-slate-500 border-white/10 hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
           </div>
           <div className="glass-card overflow-hidden !p-0">
              <table className="w-full text-left">
                 <tbody className="divide-y divide-white/[0.02]">
                    {reqs.map(r => (
                       <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-8 py-6">
                             <p className="text-sm font-black text-white tracking-tight mb-0.5">{r.displayName}</p>
                             <p className="text-[10px] text-slate-600 font-bold tracking-widest lowercase">{r.email}</p>
                          </td>
                          <td className="px-8 py-6 text-right">
                             {r.status === 'Pending' && (
                                <div className="flex justify-end gap-3 text-[10px] font-black tracking-widest">
                                   <button 
                                    onClick={() => handleStatus(r.id, 'Approved', r.email)} 
                                    className="px-5 py-2.5 bg-brand-500 text-[#0D1117] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-500/10"
                                   >
                                     Approve Access
                                   </button>
                                   <button 
                                    onClick={() => handleStatus(r.id, 'Declined', r.email)} 
                                    className="px-5 py-2.5 bg-white/5 text-red-500 border border-red-500/10 rounded-xl hover:bg-red-500/10 transition-all"
                                   >
                                     Decline
                                   </button>
                                </div>
                             )}
                          </td>
                       </tr>
                    ))}
                    {reqs.length === 0 && (
                      <tr>
                        <td className="px-8 py-12 text-center text-slate-700 italic font-bold">No protocol requests found in current filter.</td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
     );
  };

  const InviteCodesTab = () => {
     const [newCode, setNewCode] = useState({ name: '', limit: '' });

     const handleCreate = async () => {
        if (!newCode.name || !newCode.limit) return;
        await setDoc(doc(db, 'inviteCodes', newCode.name), {
          code: newCode.name.toUpperCase(),
          maxLimit: parseInt(newCode.limit),
          usedCount: 0,
          active: true,
          createdAt: serverTimestamp()
        });
        setNewCode({ name: '', limit: '' });
        addToast('success', 'Code generated.');
     };

     const handleDeleteCode = async (id: string) => {
        if (window.confirm(`Delete code ${id}?`)) {
           await deleteDoc(doc(db, 'inviteCodes', id));
           addToast('success', 'Code deleted.');
        }
     };

     const handleResetCode = async (id: string) => {
        await updateDoc(doc(db, 'inviteCodes', id), { usedCount: 0 });
        addToast('success', 'Code usage reset.');
     };

     return (
        <div className="space-y-8">
           <div className="glass-card grid grid-cols-1 md:grid-cols-3 gap-6 !p-8">
              <div className="flex flex-col gap-2">
                <span className="section-header !text-slate-600 lowercase ml-1">Terminal Code</span>
                <input 
                  className="h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-black tracking-widest outline-none focus:border-brand-500/50 transition-all" 
                  placeholder="Code name..." 
                  value={newCode.name} 
                  onChange={e => setNewCode({...newCode, name: e.target.value.toUpperCase()})} 
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="section-header !text-slate-600 lowercase ml-1">Activation Limit</span>
                <input 
                  className="h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-black outline-none focus:border-brand-500/50 transition-all" 
                  placeholder="Numeric limit..." 
                  type="number"
                  value={newCode.limit} 
                  onChange={e => setNewCode({...newCode, limit: e.target.value})} 
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleCreate} 
                  className="w-full h-14 bg-brand-500 text-[#0D1117] rounded-2xl font-black tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-500/20"
                >
                  Generate Protocol
                </button>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inviteCodes.map(c => (
                 <div key={c.id} className="glass-card flex items-center justify-between group !p-6 hover:bg-white/[0.04] transition-all">
                    <div>
                       <h4 className="text-2xl font-black text-brand-500 tracking-tighter mb-1">{c.code}</h4>
                       <p className="text-[10px] text-slate-600 font-black tracking-widest">{c.usedCount} / {c.maxLimit} activations</p>
                    </div>
                    <div className="flex gap-3">
                       <button 
                         onClick={() => handleResetCode(c.id)}
                         className="w-10 h-10 bg-white/5 hover:bg-brand-500/10 text-slate-600 hover:text-brand-500 rounded-xl transition-all flex items-center justify-center border border-white/10"
                         title="Reset usage"
                       >
                         <RefreshCw size={16} />
                       </button>
                       <button 
                         onClick={() => handleDeleteCode(c.id)}
                         className="w-10 h-10 bg-white/5 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-xl transition-all flex items-center justify-center border border-white/10"
                         title="Delete code"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
     );
  };

  const NotificationsTab = () => {
     const [msg, setMsg] = useState('');
     const handleSend = async () => {
        if (!msg) return;
        const targets = users;
        const batch = writeBatch(db);
        targets.forEach(u => {
           batch.set(doc(collection(db, 'notifications')), {
              userId: u.id,
              message: msg,
              fromAdmin: true,
              timestamp: serverTimestamp(),
              read: false
           });
        });
        await batch.commit();
        await addDoc(collection(db, 'broadcasts'), { message: msg, timestamp: serverTimestamp() });
        setMsg('');
        addToast('success', 'Broadcast sent.');
     };

     return (
        <div className="glass-card !p-12 space-y-10 max-w-3xl mx-auto">
           <header className="text-center">
              <h3 className="text-2xl font-black text-white tracking-tighter mb-2">Mass Broadcast Signal</h3>
              <p className="text-xs font-bold text-slate-600 tracking-widest italic">Instant synchronization to all active operative terminals</p>
           </header>
           <div className="relative">
              <textarea 
                className="w-full h-56 bg-white/[0.02] border border-white/10 rounded-[32px] p-8 text-white text-sm font-medium focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 outline-none resize-none transition-all placeholder:text-slate-800" 
                placeholder="Encode message..." 
                value={msg} 
                onChange={e => setMsg(e.target.value)} 
              />
              <div className="absolute top-6 right-8 text-brand-500 opacity-20">
                 <Bell size={24} />
              </div>
           </div>
           <button 
            onClick={handleSend} 
            className="w-full h-16 bg-brand-500 text-[#0D1117] rounded-2xl font-black text-xs tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-brand-500/20"
           >
             Broadcast Signal
           </button>
        </div>
     );
  };

  // Auth Screen
  const FeedbackTab = () => {
    const handleDeleteFeedback = async (id: string) => {
      if (window.confirm('Delete this feedback?')) {
        await deleteDoc(doc(db, 'feedbacks', id));
        addToast('success', 'Feedback removed.');
      }
    };

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="glass-card !p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-pink-500/10 text-pink-500 rounded-2xl flex items-center justify-center mb-4">
                 <Heart size={20} fill="currentColor" />
              </div>
              <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] mb-1">Lifetime Feedback</p>
              <p className="text-3xl font-black text-white tracking-tighter">{feedbacks.length}</p>
           </div>
           <div className="glass-card !p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-brand-500/10 text-brand-500 rounded-2xl flex items-center justify-center mb-4">
                 <Star size={20} fill="currentColor" />
              </div>
              <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] mb-1">Avg Calibration</p>
              <p className="text-3xl font-black text-white tracking-tighter">
                {feedbacks.filter(f => f.rating).length ? (feedbacks.filter(f => f.rating).reduce((acc, f) => acc + (f.rating || 0), 0) / feedbacks.filter(f => f.rating).length).toFixed(1) : '0.0'}
              </p>
           </div>
        </div>

        <div className="glass-card overflow-hidden !p-0">
          <div className="p-8 border-b border-white/5">
             <h3 className="text-sm font-black text-white tracking-[0.2em] flex items-center gap-3">
                <MessageSquare size={18} className="text-brand-500" /> Operative Feedback Logs
             </h3>
             <p className="text-[10px] font-bold text-slate-600 tracking-widest mt-1">Direct signals from active studio units</p>
          </div>
          <div className="divide-y divide-white/[0.02]">
             {feedbacks.map((f) => (
               <div key={f.id} className="p-8 hover:bg-white/[0.01] transition-all group">
                  <div className="flex items-start justify-between mb-4">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 relative">
                           <MessageSquare size={20} className="text-slate-500" />
                           <span className="absolute -top-1 -right-1 bg-brand-500 text-[#0D1117] text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                             {f.type || 'Signal'}
                           </span>
                        </div>
                        <div>
                           <p className="text-sm font-black text-white tracking-tight">{f.userName}</p>
                           <p className="text-[10px] text-slate-600 font-bold tracking-widest">{f.userEmail} | {f.workspaceName}</p>
                        </div>
                     </div>
                     <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 mb-1">
                           {f.rating ? [1, 2, 3, 4, 5].map((s) => (
                             <Star 
                               key={s} 
                               size={12} 
                               className={cn(s <= f.rating ? "text-brand-500 fill-brand-500" : "text-slate-800")} 
                             />
                           )) : (
                             <span className="text-[9px] font-black text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Message Mode</span>
                           )}
                        </div>
                        <p className="text-[9px] font-bold text-slate-700 italic">{f.timestamp?.toDate().toLocaleString()}</p>
                     </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
                     <p className="text-xs text-slate-300 leading-relaxed italic">"{f.comment}"</p>
                     <button 
                       onClick={() => handleDeleteFeedback(f.id)}
                       className="absolute top-4 right-4 p-2 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>
               </div>
             ))}
             {feedbacks.length === 0 && (
               <div className="p-20 text-center text-slate-700 italic font-bold">No signal detected in feedback channel.</div>
             )}
          </div>
        </div>
      </div>
    );
  };

  if (isLocked) {
    return (
       <div className="fixed inset-0 z-[300] bg-[#0D1117] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-brand-500/5 blur-[100px] rounded-full animate-pulse" />
          <div className="text-center space-y-16 relative z-10 max-w-sm w-full">
             <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-[32px] bg-brand-500/10 flex items-center justify-center text-brand-500 mb-8 border border-brand-500/20 shadow-2xl">
                   <Shield size={44} strokeWidth={2.5} />
                </div>
                <h2 className="text-4xl font-black text-white tracking-tighter leading-none mb-4">Command Center</h2>
                <p className="text-[10px] font-black text-slate-500 tracking-widest leading-tight">Biometric Verification Required</p>
             </div>

             <div className="space-y-6">
               <input 
                 type="password" 
                 id="pin-input"
                 maxLength={4}
                 className="w-full h-20 bg-white/5 border border-white/10 rounded-3xl text-center text-4xl font-black tracking-[1em] text-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/50 outline-none transition-all placeholder:text-slate-900"
                 placeholder="••••"
                 value={pin}
                 onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPin(val);
                    if (val.length === 4) handlePinSubmit(val);
                 }}
                 autoFocus
               />
               <div className="flex justify-center gap-1.5 pt-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={cn(
                      "w-12 h-1 rounded-full transition-all duration-500",
                      pin.length >= i ? "bg-brand-500" : "bg-white/10"
                    )} />
                  ))}
               </div>
             </div>

             {lockoutUntil && (
                <div className="flex flex-col items-center gap-4 bg-red-500/10 border border-red-500/20 p-6 rounded-3xl animate-pulse">
                   <Clock size={20} className="text-red-500" />
                   <p className="text-[10px] font-black text-red-500 tracking-widest">Infiltration Detected. Locked for 10M.</p>
                </div>
             )}
             
             <div className="pt-8">
                <button 
                 onClick={() => window.location.href = '/'}
                 className="text-slate-600 hover:text-white font-black text-[10px] tracking-widest transition-colors"
               >
                 Return to Base
               </button>
             </div>
          </div>
       </div>
    );
 }

 return (
   <div className="page-container flex flex-col min-h-screen">
     <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pt-4">
       <div>
         <h1 className="page-title">Command Central</h1>
         <p className="page-subtitle">Production architecture and operative management protocols</p>
       </div>
       <div className="flex items-center gap-3">
          {isImpersonating && (
            <button 
             onClick={onExitImpersonation}
             className="px-6 py-3 bg-red-500 text-white rounded-xl font-black text-[10px] tracking-widest shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              <LogOut size={16} /> Break Impersonation
            </button>
          )}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <span className="text-[10px] font-black text-white tracking-widest">Protocol Active</span>
          </div>
       </div>
     </header>

     {/* Admin Tabs */}
     <nav className="flex items-center gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
       {[
         { id: 'dashboard', label: 'Architecture', icon: <LayoutDashboard size={18} /> },
         { id: 'users', label: 'Operatives', icon: <Users size={18} /> },
         { id: 'requests', label: 'Pro Auth', icon: <Shield size={18} /> },
         { id: 'codes', label: 'Frequency', icon: <Ticket size={18} /> },
         { id: 'notifications', label: 'Broadcast', icon: <Bell size={18} /> },
         { id: 'feedback', label: 'Signals', icon: <MessageSquare size={18} /> }
       ].map(t => (
         <button
           key={t.id}
           onClick={() => setActiveTab(t.id as any)}
           className={cn(
             "flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[11px] font-black tracking-widest transition-all whitespace-nowrap border shrink-0",
             activeTab === t.id 
               ? "bg-brand-500 text-[#0D1117] border-brand-500 shadow-xl shadow-brand-500/10 scale-105" 
               : "bg-white/5 text-slate-500 border-white/5 hover:border-white/20 hover:text-white"
           )}
         >
           {t.icon} {t.label}
         </button>
       ))}
     </nav>

     <main className="flex-1 pb-12">
       {activeTab === 'dashboard' && <DashboardTab />}
       {activeTab === 'users' && <UsersTab />}
       {activeTab === 'requests' && <ProRequestsTab />}
       {activeTab === 'codes' && <InviteCodesTab />}
       {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'feedback' && <FeedbackTab />}
     </main>

     <footer className="mt-auto py-8 border-t border-white/[0.03]">
       <div className="flex items-center justify-between">
          <p className="text-[9px] font-black text-slate-700 tracking-widest">Control System v4.0.0 (Protocol: Emerald)</p>
          <div className="flex items-center gap-6">
             <span className="text-[9px] font-black text-slate-700 tracking-widest">System Load: 2%</span>
             <span className="text-[9px] font-black text-slate-700 tracking-widest">Lat: 12ms</span>
          </div>
       </div>
     </footer>
   </div>
 );
}
