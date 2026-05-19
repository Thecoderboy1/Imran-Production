import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Star, MessageSquare, ShieldCheck, Heart } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { useNotifications } from './NotificationProvider';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
}

export default function FeedbackModal({ isOpen, onClose, userProfile }: FeedbackModalProps) {
  const [signalMode, setSignalMode] = useState<'FEEDBACK' | 'MESSAGE'>('FEEDBACK');
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [type, setType] = useState('Suggestion');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      addToast('error', 'Please provide a rating.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedbacks'), {
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        userName: userProfile?.professionalName || userProfile?.displayName || 'Anonymous',
        workspaceName: userProfile?.workspaceName || 'Unknown',
        rating: signalMode === 'FEEDBACK' ? rating : null,
        mode: signalMode,
        type: signalMode === 'MESSAGE' ? 'Direct Message' : type,
        comment,
        timestamp: serverTimestamp(),
        status: 'new'
      });
      addToast('success', signalMode === 'FEEDBACK' ? 'Feedback submitted! Thank you.' : 'Message transmitted to command center.');
      onClose();
      // Reset state for next time
      setRating(0);
      setComment('');
      setType('Suggestion');
    } catch (err) {
      console.error("Feedback submission failed:", err);
      addToast('error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" 
          />
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-[3rem] max-w-lg w-full relative z-10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]"
          >
            {/* Header branding */}
            <div className="bg-gradient-to-br from-brand-500/10 to-emerald-500/10 p-8 border-b border-white/5 relative">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all"
              >
                <X size={20} />
              </button>
              
              <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg glow-brand">
                <Heart className="text-white fill-current" size={24} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tighter mb-1">Feedback Sequence</h2>
              <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] italic">Evolving the studio protocols</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
              <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                {(['FEEDBACK', 'MESSAGE'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSignalMode(m)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all",
                      signalMode === m 
                        ? "bg-brand-500 text-[#0D1117] shadow-lg" 
                        : "text-slate-500 hover:text-white"
                    )}
                  >
                    {m === 'FEEDBACK' ? 'SYSTEM FEEDBACK' : 'ADMIN MESSAGE'}
                  </button>
                ))}
              </div>

              {signalMode === 'FEEDBACK' && (
                <>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 tracking-widest block ml-1">Signal Category</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Bug', 'Suggestion', 'Praise', 'Other'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          className={cn(
                            "py-3 rounded-xl text-[10px] font-black tracking-widest border transition-all",
                            type === t 
                              ? "bg-brand-500/10 border-brand-500 text-brand-500" 
                              : "bg-white/5 text-slate-400 border-white/10"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 tracking-widest block ml-1 lowercase">Experience Calibration (1-5)</label>
                    <div className="flex items-center gap-4">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setRating(num)}
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all border",
                            rating >= num 
                              ? "bg-brand-500/10 border-brand-500 text-brand-500 scale-110 shadow-lg shadow-brand-500/20" 
                              : "bg-white/5 border-white/10 text-slate-600 hover:border-slate-500"
                          )}
                        >
                          <Star size={20} className={cn(rating >= num && "fill-current")} />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 tracking-widest block ml-1 lowercase">
                  {signalMode === 'FEEDBACK' ? 'Observations & Signal Analysis' : 'Your Message to command center'}
                </label>
                <textarea
                  required
                  placeholder={signalMode === 'FEEDBACK' ? "What can we improve?" : "Type your message here..."}
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all resize-none"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="pt-4 pb-2">
                <button
                  type="submit"
                  disabled={isSubmitting || (signalMode === 'FEEDBACK' && !rating)}
                  className="w-full py-5 bg-brand-500 text-[#0D1117] rounded-2xl font-black tracking-widest text-sm shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-[#0D1117]/30 border-t-[#0D1117] rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      {signalMode === 'FEEDBACK' ? 'Transmit Signal' : 'Send Message'}
                    </>
                  )}
                </button>
                <p className="text-center text-[9px] font-black text-slate-600 mt-4 tracking-[0.2em] italic">Direct secure channel to command center</p>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
