import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { LockedFeature } from './LockedFeature';
import { PREMIUM_UPGRADE_URL } from '../lib/constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { TrendingUp, DollarSign, Video, CheckCircle, Clock, Star, Trophy, Shield, AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { MILESTONES, HexagonBadge } from './MilestoneSystem';
import { DashboardSkeleton } from './Skeleton';

export default function Analytics({ userProfile }: { userProfile?: any }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const journeyMilestones = useMemo(() => {
    if (!userProfile?.milestones) return [];
    return userProfile.milestones.map((id: string) => {
      const m = MILESTONES.find(ms => ms.id === id);
      return m;
    }).filter(Boolean);
  }, [userProfile?.milestones]);

  const overallJourneyProgress = Math.round((journeyMilestones.length / MILESTONES.length) * 100);

  useEffect(() => {
    if (!auth.currentUser) return;

    const studioOwnerId = userProfile?.teamOwnerId || auth.currentUser?.uid;

    const q = query(collection(db, 'projects'), where('teamOwnerId', '==', studioOwnerId));
    const unsubProjects = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        list.push({ 
          id: doc.id, 
          ...data,
          createdAtDate: data.createdAt?.toDate() || new Date()
        });
      });
      setProjects(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    const qClients = query(collection(db, 'clients'), where('teamOwnerId', '==', studioOwnerId));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setClients(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    return () => {
      unsubProjects();
      unsubClients();
    };
  }, [userProfile?.uid]);

  // Performance Data (Revenue by month)
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i);
    return {
      month: format(date, 'MMM'),
      start: startOfMonth(date),
      end: endOfMonth(date),
      revenue: 0,
    };
  }).reverse();

  projects.forEach(p => {
    if (p.createdAtDate instanceof Date) {
      last6Months.forEach(m => {
        if (isWithinInterval(p.createdAtDate, { start: m.start, end: m.end })) {
          m.revenue += (p.budget || 0);
        }
      });
    }
  });

  // Client Concentration & Star Client
  const clientStats = projects.reduce((acc: any, p) => {
    if (!acc[p.clientId]) {
      acc[p.clientId] = { revenue: 0, projects: 0 };
    }
    acc[p.clientId].revenue += (p.budget || 0);
    acc[p.clientId].projects += 1;
    return acc;
  }, {});

  const starClientId = Object.keys(clientStats).sort((a, b) => clientStats[b].revenue - clientStats[a].revenue)[0];
  const starClient = clients.find(c => c.id === starClientId);

  const clientData = Object.keys(clientStats).map(id => {
    const client = clients.find(c => c.id === id);
    return {
      name: client?.name || 'Direct Entry',
      value: clientStats[id].revenue
    };
  }).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#0F9D58', '#6366F1', '#F4B400', '#EC4899', '#06B6D4'];

  const totalRevenue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalReceived = projects.reduce((sum, p) => sum + (p.received || 0), 0);
  const pendingRevenue = totalRevenue - totalReceived;

  // Best Day Calculation
  const getBestDayData = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
    const dayEarnings = new Array(7).fill(0);
    
    projects.forEach(p => {
      if (p.createdAt?.toDate) {
        const day = p.createdAt.toDate().getDay();
        dayCounts[day]++;
        dayEarnings[day] += (p.budget || 0);
      }
    });
    
    const maxIndex = dayCounts.indexOf(Math.max(...dayCounts));
    const avgEarnings = dayCounts[maxIndex] > 0 ? (dayEarnings[maxIndex] / dayCounts[maxIndex]) : 0;
    
    return {
      day: dayCounts[maxIndex] > 0 ? days[maxIndex] : 'N/A',
      avg: avgEarnings
    };
  };

  const bestDay = getBestDayData();

  // Risky Clients Calculation
  const riskyClients = clients.filter(client => {
    const clientProjects = projects.filter(p => p.clientId === client.id && p.paymentStatus !== 'Paid');
    return clientProjects.some(p => {
      if (!p.createdAt?.toDate) return false;
      const daysSince = (Date.now() - p.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 30;
    });
  }).map(client => {
    const pendingAmount = projects
      .filter(p => p.clientId === client.id && p.paymentStatus !== 'Paid')
      .reduce((sum, p) => sum + (p.dueMoney || 0), 0);
    return { ...client, pendingAmount };
  }).sort((a, b) => b.pendingAmount - a.pendingAmount).slice(0, 3);

  const isPremium = userProfile?.planType === 'premium';

  return (
    <div className="page-container">
      {/* Strategic Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Day Badge */}
        <LockedFeature 
          isLocked={!isPremium} 
          onUpgrade={() => window.location.href = PREMIUM_UPGRADE_URL}
        >
          <div className="relative group p-6 rounded-2xl bg-brand-500 text-[#0D1117] overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl shadow-brand-500/10 active:scale-[0.99] transition-transform">
             <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -mr-24 -mt-24" />
             <div className="flex items-center gap-5 relative z-10 w-full">
                <div className="w-12 h-12 rounded-xl bg-[#0D1117]/10 flex items-center justify-center text-[#0D1117] backdrop-blur-md group-hover:scale-110 transition-transform duration-500">
                   <Trophy size={24} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 block mb-1">Peak Performance</span>
                   <h4 className="text-xl font-black uppercase tracking-tight">Best Day: <span className="text-white">{bestDay.day}</span></h4>
                   <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Cycle Average: {formatCurrency(bestDay.avg)}</p>
                </div>
             </div>
          </div>
        </LockedFeature>

        {/* Risky Client Badge */}
        <LockedFeature 
          isLocked={!isPremium} 
          onUpgrade={() => window.location.href = PREMIUM_UPGRADE_URL}
        >
          <div className="relative group p-6 rounded-2xl bg-[#161B22] border border-red-500/20 overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
             <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full blur-3xl -mr-24 -mt-24" />
             <div className="flex items-center gap-5 relative z-10 w-full">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 group-hover:rotate-12 transition-transform duration-500">
                   <AlertCircle size={24} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                   <span className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.2em] block mb-1">Settlement Risk</span>
                   <h4 className="text-xl font-black text-white uppercase tracking-tight truncate">
                     {riskyClients.length > 0 ? riskyClients[0].name : 'Stability Confirmed'}
                   </h4>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">
                     {riskyClients.length > 0 ? `${formatCurrency(riskyClients[0].pendingAmount)} > 30 Days` : 'All portfolios within terms'}
                   </p>
                </div>
             </div>
          </div>
        </LockedFeature>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="page-title">Intelligence</h1>
          <p className="page-subtitle">Strategic overview of production performance and capital flow</p>
        </div>
        
        <LockedFeature 
          isLocked={!isPremium} 
          onUpgrade={() => window.location.href = PREMIUM_UPGRADE_URL}
        >
          {starClient && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative group shrink-0"
            >
              <div className="glass-card !py-3 !px-5 flex items-center gap-4 transition-transform hover:scale-105 duration-300">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20" style={{ backgroundColor: starClient.color || '#6366f1' }}>
                  <Star size={20} fill="currentColor" strokeWidth={0} />
                </div>
                <div className="text-left min-w-[120px]">
                  <span className="text-[9px] font-black text-brand-500 uppercase tracking-[0.2em] block mb-1">Star Entity</span>
                  <p className="text-sm font-black text-white leading-tight uppercase truncate">{starClient.name}</p>
                </div>
              </div>
            </motion.div>
          )}
        </LockedFeature>
      </header>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<DollarSign className="text-brand-500" size={18} strokeWidth={3} />} 
          label="Lifetime Gross" 
          value={formatCurrency(totalRevenue)} 
          sub="Contracted"
        />
        <StatCard 
          icon={<TrendingUp className="text-emerald-500" size={18} strokeWidth={3} />} 
          label="Settled Cash" 
          value={formatCurrency(totalReceived)} 
          sub="Realized Equity"
        />
        <StatCard 
          icon={<Clock className="text-amber-500" size={18} strokeWidth={3} />} 
          label="Outstanding" 
          value={formatCurrency(pendingRevenue)} 
          sub="Active Receivables"
        />
        <StatCard 
          icon={<CheckCircle className="text-brand-500" size={18} strokeWidth={3} />} 
          label="Delivery Rate" 
          value={`${Math.round((projects.filter(p => p.publicStatus === 'Finalized').length / (projects.length || 1)) * 100)}%`} 
          sub="Finalized Feed"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <LockedFeature 
          isLocked={!isPremium} 
          onUpgrade={() => window.location.href = PREMIUM_UPGRADE_URL}
          className="lg:col-span-2 h-full"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card flex flex-col h-full"
          >
            <span className="section-header mb-8">Capital Velocity Trend</span>
            <div className="h-[280px] w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last6Months}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff0a" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#4B5563', fontSize: 10, fontWeight: 900}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#4B5563', fontSize: 10, fontWeight: 900}} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      background: '#161B22',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
                      padding: '12px'
                    }}
                    itemStyle={{ color: '#00C853', fontWeight: '900', fontSize: '11px', textTransform: 'uppercase' }}
                    labelStyle={{ color: '#6B7280', fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Line 
                     type="monotone" 
                     dataKey="revenue" 
                     stroke="#00C853" 
                     strokeWidth={4} 
                     dot={{ r: 4, fill: '#00C853', strokeWidth: 0 }} 
                     activeDot={{ r: 6, strokeWidth: 2, stroke: '#161B22', fill: '#00C853' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </LockedFeature>

        {/* Client Distribution */}
        <LockedFeature 
          isLocked={!isPremium} 
          onUpgrade={() => window.location.href = PREMIUM_UPGRADE_URL}
          className="h-full"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card flex flex-col h-full"
          >
            <span className="section-header mb-6">Partner Portfolio Concentration</span>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {clientData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ 
                       borderRadius: '12px', 
                       border: '1px solid rgba(255,255,255,0.1)', 
                       background: '#161B22',
                       fontWeight: '900',
                       fontSize: '11px'
                     }}
                     formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-3 mt-auto">
               {clientData.map((c, i) => (
                  <div key={i} className="flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-white font-black text-[11px] uppercase tracking-wider truncate max-w-[120px]">{c.name}</span>
                     </div>
                     <span className="font-black text-slate-500 text-[11px]">{Math.round((c.value / (totalRevenue || 1)) * 100)}%</span>
                  </div>
               ))}
            </div>
          </motion.div>
        </LockedFeature>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
         <LockedFeature 
           isLocked={!isPremium} 
           onUpgrade={() => window.location.href = PREMIUM_UPGRADE_URL}
         >
           <div className="glass-card !bg-white/5 border-white/[0.03] relative overflow-hidden h-full group">
              <span className="section-header mb-8">Factory Bandwidth Distribution</span>
              <div className="space-y-8 relative z-10">
                  <ProgressRow 
                    label="Long Form Productions" 
                    value={projects.filter(p => p.videoType === 'Long Form').length} 
                    total={projects.length} 
                    color="#00C853"
                  />
                  <ProgressRow 
                    label="Social Media Shorts" 
                    value={projects.filter(p => p.videoType === 'Short Form').length} 
                    total={projects.length} 
                    color="#FFAB00"
                  />
              </div>
              <Video className="absolute -bottom-10 -right-10 text-white/[0.02] w-48 h-48 rotate-12 transition-transform duration-700 group-hover:rotate-0" strokeWidth={1} />
           </div>
         </LockedFeature>

          {/* Your Journey Timeline */}
          <LockedFeature 
            isLocked={!isPremium} 
            onUpgrade={() => window.location.href = PREMIUM_UPGRADE_URL}
            className="h-full"
          >
            <div className="glass-card relative overflow-hidden group h-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-6">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <Trophy size={24} className="text-amber-500" /> Organizational Journey
                  </h3>
                  <p className="section-header mt-2 !text-slate-500">Historical sequence of achievements</p>
                </div>
                <div className="bg-emerald-500 text-[#0D1117] px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                    Dominance: {overallJourneyProgress}%
                  </p>
                </div>
              </div>
              
              <div className="flex gap-10 overflow-x-auto pb-4 pt-2 custom-scrollbar snap-x">
                {journeyMilestones.map((m, i) => (
                  <div key={m.id} className="flex-shrink-0 flex flex-col items-center gap-6 group/item w-[140px] snap-center">
                    <div className="relative">
                      {i < journeyMilestones.length - 1 && (
                        <div className="absolute left-[100%] top-[2.5rem] w-10 h-0.5 border-t-2 border-dashed border-white/10 z-0" />
                      )}
                      <div className="relative z-10 transition-transform duration-500 group-hover/item:scale-110">
                        <HexagonBadge icon={m.icon} category={m.category} size={64} />
                      </div>
                    </div>
                    <div className="text-center w-full">
                      <p className="text-[11px] font-black text-white uppercase tracking-tight leading-tight mb-2 truncate px-2">{m.name}</p>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] bg-white/5 px-2 py-1 rounded-md">Rank {i + 1}</span>
                    </div>
                  </div>
                ))}
                {journeyMilestones.length === 0 && (
                  <div className="w-full text-center py-12">
                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10">
                      <Trophy size={32} className="text-slate-700" />
                    </div>
                    <p className="section-header !text-slate-500">Your legacy begins with your first win</p>
                  </div>
                )}
              </div>
            </div>
          </LockedFeature>
      </div>

      {/* Output Liquidity Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LockedFeature 
          isLocked={!isPremium} 
          onUpgrade={() => window.location.href = PREMIUM_UPGRADE_URL}
        >
          <div className="glass-card relative overflow-hidden group">
             <div className="flex justify-between items-start mb-10">
                <div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                     <TrendingUp size={24} className="text-emerald-500" /> Output Liquidity
                   </h3>
                   <p className="section-header mt-2 !text-slate-500">Conversion cycle efficiency monitoring</p>
                </div>
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-emerald-500">94</span>
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-[-2px]">Score</span>
                </div>
             </div>
             <div className="p-8 bg-white/[0.02] border border-white/5 rounded-2xl text-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-4 italic">Liquidity Threshold Verification</span>
                <p className="text-sm font-bold text-white uppercase tracking-wider">Efficiency Baseline Operating at Optimal Capacity</p>
             </div>
          </div>
        </LockedFeature>

        <section className="glass-card border-brand-500/20 relative overflow-hidden h-full flex flex-col justify-center">
           <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-[100px] -mr-40 -mt-40" />
           <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex-1 text-center md:text-left">
                 <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">Growth Vector</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wide leading-relaxed italic">
                    Based on current performance of <span className="text-brand-500">{formatCurrency(totalRevenue)}</span> gross, your ecosystem is operating at <span className="text-emerald-500">{Math.round((totalReceived / (totalRevenue || 1)) * 100)}%</span> liquidity. Social volume expansion is recommended.
                 </p>
              </div>
              <div className="flex gap-10 shrink-0">
                 <div className="text-center">
                    <span className="section-header block mb-2 opacity-60">Success Propensity</span>
                    <div className="text-2xl font-black text-emerald-500 uppercase tracking-tighter">Extreme</div>
                 </div>
                 <div className="text-center">
                    <span className="section-header block mb-2 opacity-60">Market Index</span>
                    <div className="text-2xl font-black text-brand-500 uppercase tracking-tighter">Tier 1</div>
                 </div>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, sub: string }) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/10 premium-shadow glow-hover flex flex-col items-center text-center group relative overflow-hidden min-w-0 h-full"
    >
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-brand-500/5 rounded-full blur-[40px] group-hover:bg-brand-500/10 transition-all duration-700" />
      <div className="w-8 h-8 bg-slate-50 dark:bg-white/5 rounded flex items-center justify-center mb-3 text-slate-900 dark:text-white shadow-inner group-hover:scale-110 group-hover:bg-brand-500/5 transition-all duration-500 shrink-0">
        {icon}
      </div>
      <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10 truncate w-full">{label}</p>
      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1.5 leading-tight tracking-tighter relative z-10 truncate w-full px-1" title={value}>{value}</h3>
      <p className="text-[6px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded relative z-10 truncate max-w-full">{sub}</p>
    </motion.div>
  );
}

function ProgressRow({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = Math.round((value / (total || 1)) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
        <span className="text-slate-400">{label} • {percentage}%</span>
        <span className="text-white">{value} / {total}</span>
      </div>
      <div className="h-4 bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full rounded-full shadow-lg relative"
          style={{ backgroundColor: color }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
        </motion.div>
      </div>
    </div>
  );
}

