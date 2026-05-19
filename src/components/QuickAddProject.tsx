import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  Timestamp, 
  serverTimestamp,
  getDoc,
  doc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { motion, AnimatePresence } from 'motion/react';
import { X, Video, Link, User, Phone, DollarSign } from 'lucide-react';

interface QuickAddProps {
  isOpen: boolean;
  userProfile?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickAddProject({ isOpen, userProfile, onClose, onSuccess }: QuickAddProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    videoType: 'Short Form',
    urgency: 'Normal',
    quantity: 1,
    pricePerVideo: 0,
    budget: 0,
    received: 0,
    driveLink: '',
    contact: '',
    publicStatus: 'In Queue',
    revisions: 0,
    startDate: '',
    dueDate: ''
  });

  // Auto-fill contact info when client is selected
  useEffect(() => {
    if (formData.clientId) {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      if (selectedClient && !formData.contact) {
        setFormData(prev => ({ ...prev, contact: selectedClient.phone || selectedClient.email || '' }));
      }
    }
  }, [formData.clientId, clients]);

  useEffect(() => {
    if (!auth.currentUser || !isOpen) return;

    const ownerId = auth.currentUser.uid;
    const isOwner = true;

    const q = query(collection(db, 'clients'), where('teamOwnerId', '==', ownerId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setClients(list.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !formData.clientId || !formData.name) return;

    const budget = Number(formData.budget);
    const received = Number(formData.received);
    const dueMoney = budget - received;
    const paymentStatus = dueMoney > 0 ? 'Not Paid' : 'Paid';

    try {
      const studioOwnerId = userProfile?.teamOwnerId || auth.currentUser?.uid;

      const projectData: any = {
        ...formData,
        budget,
        received,
        dueMoney,
        paymentStatus,
        progress: 'Working',
        urgency: formData.urgency || 'Normal',
        startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : null,
        dueDate: formData.dueDate ? Timestamp.fromDate(new Date(formData.dueDate)) : null,
        ownerId: auth.currentUser.uid,
        teamOwnerId: studioOwnerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'projects'), projectData);

      setFormData({
        name: '',
        clientId: '',
        videoType: 'Short Form',
        urgency: 'Normal',
        quantity: 1,
        pricePerVideo: 0,
        budget: 0,
        received: 0,
        driveLink: '',
        contact: '',
        publicStatus: 'In Queue',
        revisions: 0,
        startDate: '',
        dueDate: ''
      });
      onSuccess();
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="glass dark:bg-slate-900 rounded-lg overflow-hidden shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] border-none"
      >
        <div className="bg-brand-600 p-4 sm:p-5 text-white flex flex-col sm:flex-row justify-between items-center text-center sm:text-left relative overflow-hidden gap-3">
          <div className="relative z-10">
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">New Production</h2>
            <p className="text-brand-100 text-[9px] mt-0.5 font-medium italic">Initialize a new production entry.</p>
          </div>
          <button onClick={onClose} className="relative z-10 p-1.5 bg-white/10 hover:bg-white/20 rounded transition-all active:scale-90">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 flex items-center gap-2">
                  <Video size={10} className="text-brand-500" /> Title
                </label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Wedding Highlight"
                  className="w-full bg-slate-100 dark:bg-white/5 dark:text-white border border-transparent rounded px-3 py-2 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all font-bold text-xs"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 flex items-center gap-2">
                  <User size={10} className="text-brand-500" /> Client
                </label>
                <select 
                  required
                  className="w-full bg-slate-100 dark:bg-white/5 dark:text-white border-none rounded px-3 py-2 focus:ring-2 focus:ring-brand-500/50 appearance-none font-bold text-xs cursor-pointer"
                  value={formData.clientId}
                  onChange={e => setFormData({...formData, clientId: e.target.value})}
                >
                  <option value="" className="bg-white dark:bg-navy-900">Select partner...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id} className="bg-white dark:bg-navy-900">{client.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1">Production Type</label>
                <div className="flex gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded">
                  {['Short Form', 'Long Form'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({...formData, videoType: t})}
                      className={`flex-1 py-1 rounded font-black text-[7px] uppercase tracking-widest transition-all ${
                        formData.videoType === t ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-brand-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

               <div>
                 <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1">Urgency</label>
                 <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded">
                   {['Low', 'Normal', 'High', 'Urgent'].map(u => (
                     <button
                       key={u}
                       type="button"
                       onClick={() => setFormData({...formData, urgency: u})}
                       className={`flex-1 py-1 rounded font-black text-[6px] uppercase tracking-widest transition-all ${
                         formData.urgency === u ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-brand-500'
                       }`}
                     >
                       {u}
                     </button>
                   ))}
                 </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 flex items-center gap-2">
                  <Link size={10} className="text-brand-500" /> Drive Source
                </label>
                <input 
                  type="url" 
                  placeholder="https://drive..."
                  className="w-full bg-slate-100 dark:bg-white/5 dark:text-white border border-transparent rounded px-3 py-1.5 focus:ring-2 focus:ring-brand-500/50 outline-none font-medium text-[10px]"
                  value={formData.driveLink}
                  onChange={e => setFormData({...formData, driveLink: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Start</label>
                  <input type="date" className="w-full bg-slate-100 dark:bg-white/5 dark:text-white border-none rounded px-3 py-1.5 font-bold text-[10px]" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[7px] font-black text-brand-500 uppercase tracking-widest mb-1 pl-1">Final Due</label>
                  <input type="date" className="w-full bg-slate-100 dark:bg-white/5 dark:text-white border border-brand-500/20 rounded px-3 py-1.5 font-bold text-[10px]" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
              </div>
          </div>

          <div className="pt-2">
            <div className="bg-slate-200 dark:bg-white/10 px-3 py-1.5 rounded-t-lg border-b border-white/5">
               <span className="text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">[ project budget & quantity ]</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-100 dark:bg-white/5 rounded-b-lg border border-transparent">
               <div className="flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="block text-[7px] font-black text-slate-400 uppercase mb-1 pl-1">Quantity</label>
                        <input type="number" min="1" className="w-full bg-white dark:bg-slate-900 border-none rounded px-2 py-1.5 font-black text-xs" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Math.max(1, Number(e.target.value))})} />
                     </div>
                     <div>
                        <label className="block text-[7px] font-black text-slate-400 uppercase mb-1 pl-1">Project Price</label>
                        <input type="number" className="w-full bg-white dark:bg-slate-900 border-none rounded px-2 py-1.5 font-black text-xs" value={formData.pricePerVideo} onChange={e => setFormData({...formData, pricePerVideo: Number(e.target.value)})} />
                     </div>
                  </div>
               </div>
               <div className="flex flex-col gap-3">
                  <div className="p-3 bg-slate-900 rounded text-white flex items-center justify-between shadow-inner">
                     <label className="text-[7px] font-black text-brand-500 uppercase tracking-widest">Total Budget</label>
                     <span className="text-sm font-black tracking-tighter">Rs. {formData.budget}</span>
                  </div>
               </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={!formData.clientId || !formData.name}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded font-black text-xs transition-all shadow-xl shadow-brand-500/30 uppercase tracking-widest active:scale-[0.98]"
          >
            Create Entry
          </button>
        </form>
      </motion.div>
    </div>
  );
}
