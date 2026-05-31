import React, { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, arrayUnion, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, MessageSquare, Send, Clock, User, Link as LinkIcon, ShieldAlert, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface ProjectDetailsPanelProps {
  project: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectDetailsPanel({ project: initialProject, isOpen, onClose }: ProjectDetailsPanelProps) {
  const [project, setProject] = useState(initialProject);
  const [note, setNote] = useState('');
  const [internalNotes, setInternalNotes] = useState(initialProject?.internalNotes || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingInternal, setIsSavingInternal] = useState(false);
  const [videoType, setVideoType] = useState(initialProject?.videoType || 'Short Form');
  const [quantity, setQuantity] = useState<number | string>(initialProject?.quantity ?? 1);
  const [duration, setDuration] = useState(initialProject?.duration || '');
  const [isUpdatingParams, setIsUpdatingParams] = useState(false);

  useEffect(() => {
    if (initialProject) {
      setVideoType(initialProject.videoType || 'Short Form');
      setQuantity(initialProject.quantity ?? 1);
      setDuration(initialProject.duration || '');
    }
  }, [initialProject?.id]);

  useEffect(() => {
    if (!initialProject?.id || !isOpen) return;
    
    setProject(initialProject);

    const unsub = onSnapshot(doc(db, 'projects', initialProject.id), (document) => {
      if (document.exists()) {
        const data = document.data();
        setProject((prev: any) => ({ ...prev, ...data, id: document.id }));
        setInternalNotes(data.internalNotes || '');
        setVideoType(data.videoType || 'Short Form');
        setQuantity(data.quantity ?? 1);
        setDuration(data.duration || '');
      }
    }, (error) => {
      console.debug("Project panel listener error:", error);
    });

    return () => unsub();
  }, [initialProject?.id, isOpen]);

  const handleUpdateDuration = async (newDuration: string) => {
    setIsUpdatingParams(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        duration: newDuration,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    } finally {
      setIsUpdatingParams(false);
    }
  };

  const handleUpdateParams = async (newType: string, newQty: number) => {
    setIsUpdatingParams(true);
    try {
      const parsedQty = Math.max(0, newQty);
      const pricePer = project.pricePerVideo || 0;
      const budget = parsedQty * pricePer;
      const received = project.received || 0;
      const dueMoney = budget - received;
      const paymentStatus = dueMoney > 0 ? 'Not Paid' : 'Paid';

      await updateDoc(doc(db, 'projects', project.id), {
        videoType: newType,
        quantity: parsedQty,
        budget,
        dueMoney,
        paymentStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    } finally {
      setIsUpdatingParams(false);
    }
  };

  const handleSaveInternalNotes = async () => {
    setIsSavingInternal(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        internalNotes: internalNotes.trim(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    } finally {
      setIsSavingInternal(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        progress: status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    try {
      const newNote = {
        text: note.trim(),
        senderName: auth.currentUser?.displayName || 'User',
        senderId: auth.currentUser?.uid,
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, 'projects', project.id), {
        notes: arrayUnion(newNote),
        updatedAt: serverTimestamp()
      });
      setNote('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    }
  };

  if (!isOpen || !project) return null;

  const isValidDate = (date: any) => {
    if (!date) return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0D1117]/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
        className="glass border-l border-white/[0.03] w-full max-w-xl h-full shadow-[0_0_100px_rgba(0,0,0,0.5)] relative z-10 flex flex-col"
      >
        {/* Header */}
        <div className="p-10 border-b border-white/[0.03] flex items-center justify-between sticky top-0 z-20">
          <div className="min-w-0">
             <div className="flex items-center gap-3 mb-2">
                <span className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black tracking-widest border",
                  project?.videoType === 'Short Form' ? "bg-brand-500/10 text-brand-500 border-brand-500/20" : 
                  "bg-amber-500/10 text-amber-500 border-amber-500/20"
                )}>
                  {project?.videoType || 'Short Form'}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <span className="text-[9px] font-black text-slate-600 tracking-widest leading-none">Prod-{project.id?.slice(-4).toUpperCase()}</span>
             </div>
             <h2 className="text-3xl font-black text-white tracking-tighter truncate leading-none">
               {project?.name || initialProject?.name || 'Untitled Ops'}
             </h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 bg-white/5 text-slate-500 rounded-2xl hover:bg-white/10 hover:text-white transition-all flex items-center justify-center border border-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-6">
             <div className="glass-card !p-8 relative overflow-hidden group border border-white/[0.03]">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Clock size={40} />
                </div>
                <p className="text-[9px] font-black text-brand-500 tracking-widest mb-4">Mode</p>
                <p className="text-xl font-black text-white tracking-tight leading-none">{project.videoType || 'N/A'}</p>
             </div>
             <div className="glass-card !p-8 relative overflow-hidden group border border-white/[0.03]">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <ShieldAlert size={40} />
                </div>
                <p className="text-[9px] font-black text-emerald-500 tracking-widest mb-4">Phase</p>
                <p className="text-xl font-black text-white tracking-tight leading-none">{project.progress || 'Working'}</p>
             </div>
          </div>

          {/* Assigned By Card */}
          <section className="space-y-6">
             <span className="section-header !text-slate-700 ml-1">Originating Director</span>
             <div className="glass-card !p-8 relative z-10 border border-white/[0.03]">
                <div className="flex items-center gap-6">
                   <div className="relative">
                      <div className="w-20 h-20 rounded-3xl bg-white/5 overflow-hidden border border-white/10 shadow-2xl">
                         {project.assignedByPhoto ? (
                            <img src={project.assignedByPhoto} alt="" className="w-full h-full object-cover" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-800 font-black text-4xl">
                               {(project.assignedByName || 'M').charAt(0)}
                            </div>
                         )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 border-4 border-[#0D1117] rounded-xl flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                         <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      </div>
                   </div>
                   <div>
                      <h4 className="text-xl font-black text-white tracking-tighter leading-none mb-2">{project.assignedByName || 'Lead Producer'}</h4>
                      <p className="text-[10px] font-black text-brand-500/60 tracking-widest">Operative Hub Identified</p>
                   </div>
                </div>
             </div>
          </section>

          {/* Production Brief */}
          <section className="space-y-6">
             <span className="section-header !text-slate-700 ml-1">Executive Brief</span>
             <div className="glass-card !p-10 relative group/brief border border-white/[0.03]">
                <p className="text-slate-400 text-sm font-medium leading-[1.8] whitespace-pre-wrap relative z-10 italic">
                   {project.brief || 'Zero executive signal provided for this production segment.'}
                </p>
                <div className="absolute top-6 right-6 opacity-[0.02] group-hover/brief:opacity-10 transition-opacity">
                   <MessageSquare size={100} strokeWidth={1} />
                </div>
             </div>
          </section>

          {/* Production Details (Format and Quantity) */}
          <section className="space-y-6">
             <span className="section-header !text-slate-700 ml-1">Production Details</span>
             <div className="glass-card !p-8 space-y-6 border border-white/[0.03]">
                {/* Video Format control */}
                <div className="space-y-2">
                   <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Video Format</label>
                   <div className="grid grid-cols-2 gap-3 p-1.5 bg-white/5 rounded-2xl border border-white/5">
                      {['Short Form', 'Long Form'].map((typeOption) => (
                         <button
                            key={typeOption}
                            type="button"
                            disabled={isUpdatingParams}
                            onClick={() => {
                               setVideoType(typeOption);
                               handleUpdateParams(typeOption, Number(quantity));
                            }}
                            className={cn(
                               "py-3 rounded-[1.2rem] font-black text-[10px] tracking-widest transition-all",
                               videoType === typeOption 
                                  ? "bg-brand-500 text-[#0D1117] shadow-lg shadow-brand-500/10" 
                                  : "text-slate-400 hover:text-white"
                            )}
                         >
                            {typeOption}
                         </button>
                      ))}
                   </div>
                </div>

                {/* Quantity control */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                   <div className="space-y-2">
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Quantity (Decimals Approved)</label>
                      <div className="relative">
                         <input 
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g. 1.5"
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm outline-none text-white focus:border-brand-500/50 transition-all font-black"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            onBlur={() => {
                               const parsed = parseFloat(quantity as string);
                               if (!isNaN(parsed) && parsed >= 0) {
                                  handleUpdateParams(videoType, parsed);
                               }
                            }}
                         />
                         {String(quantity) !== String(project.quantity) && (
                            <button
                               type="button"
                               onClick={() => {
                                  const parsed = parseFloat(quantity as string);
                                  if (!isNaN(parsed) && parsed >= 0) {
                                     handleUpdateParams(videoType, parsed);
                                  }
                               }}
                               className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black tracking-widest text-[#0D1117] bg-brand-500 px-3 py-1.5 rounded-lg hover:scale-105 transition-all shadow-md"
                            >
                               Apply
                            </button>
                         )}
                      </div>
                   </div>

                   <div className="space-y-1.5 flex flex-col justify-end pb-1 pl-1">
                      <div className="flex justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest">
                         <span>Rate per video:</span>
                         <span className="text-white">Rs. {project.pricePerVideo || 0}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest pt-1">
                         <span>Recalculated Budget:</span>
                         <span className="text-brand-500">Rs. {((parseFloat(quantity as string) || 0) * (project.pricePerVideo || 0)).toFixed(2)}</span>
                      </div>
                   </div>
                </div>

                {videoType === 'Long Form' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                         <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Video Duration (hh:mm:ss)</label>
                         <div className="relative">
                            <input 
                               type="text"
                               placeholder="e.g. 00:45:00"
                               className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm outline-none text-white focus:border-brand-500/50 transition-all font-black"
                               value={duration}
                               onChange={(e) => setDuration(e.target.value)}
                               onBlur={() => handleUpdateDuration(duration)}
                            />
                            {duration !== (project.duration || '') && (
                               <button
                                  type="button"
                                  onClick={() => handleUpdateDuration(duration)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black tracking-widest text-[#0D1117] bg-brand-500 px-3 py-1.5 rounded-lg hover:scale-105 transition-all shadow-md"
                               >
                                  Save
                               </button>
                            )}
                         </div>
                      </div>
                      <div className="space-y-1 flex flex-col justify-end pb-2 pl-1 text-[9px] font-black text-slate-500 tracking-widest leading-relaxed">
                         <p className="text-white italic">Long Form configuration active.</p>
                         <p className="text-[8px] uppercase tracking-normal opacity-60">This optional duration is saved and printed automatically within generated invoices.</p>
                      </div>
                   </div>
                )}
             </div>
          </section>

          {/* Internal Project Notes */}
          <section className="space-y-6">
             <div className="flex items-center justify-between px-1">
                <span className="section-header !text-slate-700 ml-1">Confidential Metadata</span>
                {internalNotes !== (project.internalNotes || '') && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleSaveInternalNotes}
                    disabled={isSavingInternal}
                    className="text-[9px] font-black tracking-widest text-[#0D1117] bg-brand-500 px-4 py-2 rounded-xl shadow-lg shadow-brand-500/10 transition-all hover:scale-105 active:scale-95"
                  > 
                    {isSavingInternal ? 'Syncing...' : 'Force Sync'} 
                  </motion.button>
                )}
             </div>
             <div className="relative">
                <textarea 
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="Encode sensitive metadata..."
                  className="w-full min-h-[160px] glass-card !p-10 border border-white/10 text-white font-medium text-sm leading-[1.8] outline-none focus:border-brand-500/30 focus:ring-8 focus:ring-brand-500/5 transition-all resize-none shadow-2xl placeholder:opacity-20"
                />
                <div className="absolute bottom-10 right-10 opacity-10">
                   <ShieldAlert size={24} className="text-slate-700" />
                </div>
             </div>
          </section>

          {/* Resource Assets */}
          <section className="space-y-6">
             <span className="section-header !text-slate-700 ml-1">Asset Vault</span>
             <div className="grid grid-cols-1 gap-4">
                {project.fileLinks && project.fileLinks.length > 0 ? (
                  project.fileLinks.map((link: string, idx: number) => (
                    <motion.button 
                      whileHover={{ x: 8 }}
                      key={idx}
                      onClick={() => window.open(link, '_blank')}
                      className="glass-card !p-6 border border-white/[0.03] flex items-center justify-between group hover:border-brand-500/30 hover:bg-brand-500/[0.02] transition-colors"
                    >
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-600 group-hover:bg-brand-500 group-hover:text-[#0D1117] transition-all border border-white/5">
                             <LinkIcon size={18} strokeWidth={2.5} />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black text-white tracking-widest mb-1">Asset Package {idx + 1}</p>
                            <p className="text-[9px] font-black text-slate-700 tracking-widest">Protocol Secured Link</p>
                          </div>
                       </div>
                       <ExternalLink size={16} className="text-slate-800 group-hover:text-brand-500 transition-colors" />
                    </motion.button>
                  ))
                ) : project.driveLink ? (
                  <button 
                    onClick={() => window.open(project.driveLink, '_blank')}
                    className="p-8 bg-brand-500 text-[#0D1117] rounded-[32px] flex items-center justify-between group shadow-2xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-[#0D1117] rounded-3xl flex items-center justify-center text-brand-500 shadow-xl">
                           <LinkIcon size={24} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                          <p className="text-lg font-black tracking-tighter leading-none mb-1">Vault Carrier</p>
                          <p className="text-[10px] font-black text-[#0D1117]/60 tracking-widest">Drive Access Authorized</p>
                        </div>
                     </div>
                     <ExternalLink size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" strokeWidth={3} />
                  </button>
                ) : (
                  <div className="p-16 text-center border-4 border-dashed border-white/5 rounded-[40px] opacity-30">
                     <p className="text-[10px] font-black text-slate-600 tracking-widest italic tracking-[0.4em]">Zero Asset Signatures</p>
                  </div>
                )}
             </div>
          </section>

          {/* Finalization Toggle */}
          <section className="space-y-6">
             <span className="section-header !text-slate-700 ml-1">Logic Overrides</span>
             <div className="grid grid-cols-3 gap-3 p-2 bg-white/5 rounded-[2.5rem] border border-white/10">
                {['Working', 'Final', 'Revision'].map((s) => (
                  <button
                    key={s}
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus(s)}
                    className={cn(
                      "py-4 rounded-[2rem] font-black text-[10px] tracking-widest transition-all",
                      project.progress === s 
                        ? (s === 'Working' ? "bg-amber-500 text-[#0D1117] shadow-xl shadow-amber-500/20" : 
                           s === 'Final' ? "bg-emerald-500 text-[#0D1117] shadow-xl shadow-emerald-500/20" : 
                           "bg-red-500 text-white shadow-xl shadow-red-500/20")
                        : "text-slate-600 hover:text-white"
                    )}
                  >
                    {s}
                  </button>
                ))}
             </div>
          </section>

          {/* Activity Log */}
          <section className="space-y-8 pt-8">
             <span className="section-header !text-slate-700 ml-1">Tactical Log Stream</span>
             <div className="space-y-8 pb-4">
                {project.notes && project.notes.length > 0 ? (
                  project.notes.map((n: any, idx: number) => (
                    <div key={idx} className={cn(
                      "flex flex-col gap-3 max-w-[85%]",
                      n.senderId === auth.currentUser?.uid ? "ml-auto items-end text-right" : "mr-auto items-start text-left"
                    )}>
                       <div className={cn(
                         "px-8 py-5 rounded-[2rem] text-sm font-medium leading-[1.6] shadow-2xl relative",
                         n.senderId === auth.currentUser?.uid 
                           ? "bg-brand-500 text-[#0D1117] rounded-tr-none" 
                           : "glass-card text-white border border-white/10 rounded-tl-none"
                       )}>
                          {n.text}
                       </div>
                       <div className="flex items-center gap-3 px-2">
                          <p className="text-[9px] font-black text-slate-700 tracking-widest leading-none">
                             {n.senderId === auth.currentUser?.uid ? 'Operative' : (n.senderName || 'Command')}
                          </p>
                          <div className="w-1 h-1 rounded-full bg-slate-800" />
                          <p className="text-[9px] font-black text-slate-800 tracking-widest italic opacity-60">
                             {isValidDate(n.timestamp) ? format(new Date(n.timestamp), 'h:mm a') : 'Synced'}
                          </p>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center border border-white/5 rounded-[40px] opacity-10">
                     <p className="text-[10px] font-black tracking-widest italic">Silent Channel</p>
                  </div>
                )}
             </div>
          </section>
        </div>

        {/* Footer Interaction */}
        <div className="p-10 border-t border-white/[0.03] backdrop-blur-3xl">
           <form onSubmit={handleAddNote} className="flex gap-4">
              <div className="flex-1 relative group">
                 <input 
                   type="text" 
                   placeholder="Transmit note to log..."
                   className="w-full h-16 glass border-white/10 focus:border-brand-500/50 rounded-2xl px-8 text-sm focus:ring-8 focus:ring-brand-500/5 outline-none text-white transition-all placeholder:text-slate-800 font-medium"
                   value={note}
                   onChange={e => setNote(e.target.value)}
                 />
                 <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                    <Activity size={18} className="text-brand-500" />
                 </div>
              </div>
              <button 
                type="submit"
                disabled={!note.trim()}
                className="w-16 h-16 bg-brand-500 text-[#0D1117] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-500/20 disabled:opacity-20 disabled:scale-100 flex items-center justify-center shrink-0 border border-brand-500/50"
              >
                 <Send size={24} strokeWidth={2.5} />
              </button>
           </form>
        </div>
      </motion.div>
    </div>
  );
}
