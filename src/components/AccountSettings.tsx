import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { motion } from 'motion/react';
import { ProTooltip } from './LockedFeature';
import { PREMIUM_UPGRADE_URL } from '../lib/constants';
import { 
  User, 
  CreditCard, 
  QrCode, 
  Save, 
  Building, 
  MapPin, 
  Smartphone,
  ExternalLink,
  CheckCircle2,
  Image as ImageIcon,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { useNotifications } from './NotificationProvider';
import { cn } from '../lib/utils';

export default function AccountSettings() {
  const { addToast } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [formData, setFormData] = useState({
    workspaceName: '',
    userName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    upiId: '',
    qrCode: '',
    gstNumber: '',
    studioLogo: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    getDoc(doc(db, 'userProfiles', auth.currentUser.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setFormData({
          workspaceName: data.workspaceName || '',
          userName: data.userName || auth.currentUser?.displayName || '',
          bankName: data.paymentDetails?.bankName || '',
          accountNumber: data.paymentDetails?.accountNumber || '',
          ifsc: data.paymentDetails?.ifsc || '',
          upiId: data.paymentDetails?.upiId || '',
          qrCode: data.paymentDetails?.qrCode || '',
          gstNumber: data.gstNumber || '',
          studioLogo: data.studioLogo || ''
        });
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setSuccess(false);

    try {
      const docRef = doc(db, 'userProfiles', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      const payload = {
        workspaceName: formData.workspaceName,
        userName: formData.userName,
        gstNumber: formData.gstNumber,
        studioLogo: formData.studioLogo,
        paymentDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifsc: formData.ifsc,
          upiId: formData.upiId,
          qrCode: formData.qrCode
        },
        updatedAt: serverTimestamp()
      };

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          ...payload,
          uid: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          onboardingCompleted: true
        });
      } else {
        await updateDoc(docRef, payload);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'userProfiles');
      addToast('error', "Failed to save credentials. Check your internet connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, qrCode: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, studioLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="page-container">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="page-title">Account HQ</h1>
          <p className="page-subtitle">Control organizational identity and financial settlement protocols</p>
        </div>
        <div className="flex items-center gap-3">
           {profile?.planType === 'premium' ? (
             <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-500 px-5 py-2.5 rounded-xl border border-emerald-500/20 shadow-xl shadow-emerald-500/5">
                <Shield size={18} className="fill-emerald-500/20" />
                <div className="text-left">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">Pro Status Active</p>
                   {profile?.planExpiry && (
                     <p className="text-[8px] font-bold opacity-60 mt-1 uppercase tracking-widest italic">Subscription secure</p>
                   )}
                </div>
             </div>
           ) : (
             <div className="flex items-center gap-3 bg-white/5 text-slate-500 px-5 py-2.5 rounded-xl border border-white/10 italic">
                <Shield size={18} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">Free Domain</p>
             </div>
           )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Studio Identity */}
        <section className="glass-card">
          <span className="section-header mb-6">Organizational Identity</span>
          
          {/* Logo Upload */}
          <div className={cn(
            "mb-8 flex items-center gap-6 p-5 bg-white/[0.02] rounded-2xl border border-white/5 group transition-all",
            profile?.planType !== 'premium' ? "opacity-60 grayscale" : "hover:bg-white/[0.04]"
          )}
          onClick={() => {
            if (profile?.planType !== 'premium') {
              addToast('info', "Upgrade to Pro to add your logo to invoices.");
              window.location.href = PREMIUM_UPGRADE_URL;
            }
          }}
          >
             <div className="w-20 h-20 rounded-2xl bg-[#0D1117] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative shadow-2xl">
                {formData.studioLogo ? (
                   <img src={formData.studioLogo} alt="Studio Logo" className="w-full h-full object-contain" />
                ) : (
                   <Building size={32} className="text-slate-700" />
                )}
                {profile?.planType !== 'premium' && (
                  <div className="absolute inset-0 bg-[#0D1117]/60 flex items-center justify-center">
                    <Shield size={20} className="text-white fill-white opacity-40 shadow-2xl" />
                  </div>
                )}
             </div>
             <div className="flex-1 min-w-0">
                <label className={cn(
                  "block text-[9px] font-black uppercase tracking-[0.2em] mb-2 leading-none",
                  profile?.planType === 'premium' ? "text-brand-500 cursor-pointer hover:text-brand-400" : "text-slate-500"
                )}>
                   <input 
                     type="file" 
                     accept="image/*" 
                     className="hidden" 
                     onChange={handleLogoUpload} 
                     disabled={profile?.planType !== 'premium'}
                    />
                   {profile?.planType === 'premium' ? (formData.studioLogo ? 'Update Identity Asset' : 'Upload Identity Asset') : 'Pro Feature Locked'}
                </label>
                <p className="text-[10px] text-slate-500 font-bold italic tracking-wide">Identifier displayed in header of all outgoing invoices.</p>
             </div>
          </div>

          <div className="space-y-5">
            <div>
              <span className="section-header !text-slate-500 mb-2 ml-1">Studio / Entity Name</span>
              <div className="relative group">
                <input 
                  type="text"
                  className="w-full h-12 bg-white/5 text-white border border-white/10 rounded-xl px-5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all font-bold text-sm"
                  value={formData.workspaceName}
                  placeholder="Studio Identity..."
                  onChange={e => setFormData(prev => ({ ...prev, workspaceName: e.target.value }))}
                />
                <Building className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-500 transition-colors" size={18} />
              </div>
            </div>
            <div>
              <span className="section-header !text-slate-500 mb-2 ml-1">Executive Primary Identity</span>
              <div className="relative group">
                <input 
                  type="text"
                  className="w-full h-12 bg-white/5 text-white border border-white/10 rounded-xl px-5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all font-bold text-sm"
                  value={formData.userName}
                  placeholder="Your Name..."
                  onChange={e => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-500 transition-colors" size={18} />
              </div>
            </div>
            <div 
              className={cn(profile?.planType !== 'premium' && "opacity-50")}
              onClick={() => {
                if (profile?.planType !== 'premium') {
                  addToast('info', "Upgrade to Pro to add GST details to invoices.");
                  window.location.href = PREMIUM_UPGRADE_URL;
                }
              }}
            >
              <span className="section-header !text-slate-500 mb-2 ml-1">GSTIN Terminal</span>
              <input 
                type="text"
                placeholder="Registration Number..."
                disabled={profile?.planType !== 'premium'}
                className="w-full h-12 bg-white/5 text-white border border-white/10 rounded-xl px-5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all font-bold text-sm placeholder:text-slate-700"
                value={formData.gstNumber}
                onChange={e => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* QR Section */}
        <section className="glass-card">
          <div 
            className={cn(profile?.planType !== 'premium' && "opacity-50")}
            onClick={() => {
              if (profile?.planType !== 'premium') {
                addToast('info', "Upgrade to Pro to add a payment QR to invoices.");
                window.location.href = PREMIUM_UPGRADE_URL;
              }
            }}
          >
            <span className="section-header mb-8">Payment Terminal Verification (QR)</span>
            <div className="flex flex-col items-center gap-8">
              <div className="w-40 h-40 bg-white/[0.02] rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden group shadow-inner">
                {formData.qrCode ? (
                  <>
                    <img src={formData.qrCode} alt="Payment QR" className="w-full h-full object-contain p-4" />
                    <div className="absolute inset-0 bg-[#0D1117]/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center p-6">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (profile?.planType === 'premium') {
                            setFormData(prev => ({ ...prev, qrCode: '' }));
                          }
                        }}
                        className="w-full h-10 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-red-500/20 active:scale-95 transition-transform"
                      >
                        Reset Terminal
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon size={32} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Zero Link</p>
                  </div>
                )}
                {profile?.planType !== 'premium' && (
                  <div className="absolute inset-0 bg-[#0D1117]/40 backdrop-blur-[2px] flex items-center justify-center">
                    <Shield size={32} className="text-white fill-white opacity-20" />
                  </div>
                )}
              </div>
              <div className="w-full space-y-4">
                <label className={cn("block w-full", profile?.planType !== 'premium' && "pointer-events-none")}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleQrUpload} 
                    disabled={profile?.planType !== 'premium'}
                  />
                  <div className={cn(
                    "w-full h-12 rounded-xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 border",
                    profile?.planType === 'premium' ? "border-brand-500/30 text-brand-500 cursor-pointer hover:bg-brand-500 hover:text-[#0D1117]" : "border-white/10 text-slate-500"
                  )}>
                    <ImageIcon size={16} /> {profile?.planType === 'premium' ? (formData.qrCode ? 'Update Terminal Asset' : 'Establish QR Terminal') : 'Identity Verification Required'}
                  </div>
                </label>
                <p className="text-[10px] text-slate-500 font-bold italic text-center px-4 tracking-tight leading-relaxed">Identity QR will be embedded into the footer of all production settlement documents.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Financial Details */}
        <section className="md:col-span-2 glass-card">
          <span className="section-header mb-8">Settlement Credentials Protocol</span>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-5">
              <div>
                <span className="section-header !text-slate-500 mb-2 ml-1">Institutional Host (Bank Name)</span>
                <input 
                  type="text"
                  placeholder="e.g. Identity Bank..."
                  className="w-full h-12 bg-white/5 text-white border border-white/10 rounded-xl px-5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all font-bold text-sm"
                  value={formData.bankName}
                  onChange={e => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                />
              </div>
              <div>
                <span className="section-header !text-slate-500 mb-2 ml-1">Allocation Path (Account Number)</span>
                <input 
                  type="text"
                  placeholder="Sequence Number..."
                  className="w-full h-12 bg-white/5 text-white border border-white/10 rounded-xl px-5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all font-bold text-sm"
                  value={formData.accountNumber}
                  onChange={e => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-5">
              <div>
                <span className="section-header !text-slate-500 mb-2 ml-1">Routing Protocol (IFSC)</span>
                <input 
                  type="text"
                  placeholder="Network Code..."
                  className="w-full h-12 bg-white/5 text-white border border-white/10 rounded-xl px-5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all font-bold text-sm"
                  value={formData.ifsc}
                  onChange={e => setFormData(prev => ({ ...prev, ifsc: e.target.value }))}
                />
              </div>
              <div>
                <span className="section-header !text-slate-500 mb-2 ml-1">UPI Identity Line</span>
                <div className="relative group">
                  <input 
                    type="text"
                    placeholder="identifier@protocol..."
                    className="w-full h-12 bg-white/5 text-white border border-white/10 rounded-xl px-5 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 outline-none transition-all font-bold text-sm"
                    value={formData.upiId}
                    onChange={e => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
                  />
                  <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-500 transition-colors" size={18} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Support & filling space */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="glass-card !py-6">
            <span className="section-header !text-slate-500 mb-3">Security Protocol</span>
            <div className="flex items-center justify-between">
               <p className="text-[11px] font-black text-white uppercase tracking-wider">
                 {profile?.planType === 'premium' ? 'Enterprise Guard' : 'Standard Shield'}
               </p>
               <div className={cn(
                 "w-3 h-3 rounded-full animate-pulse",
                 profile?.planType === 'premium' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-brand-500 shadow-[0_0_10px_rgba(0,200,83,0.5)]"
               )} />
            </div>
         </div>
         <div className="glass-card md:col-span-2 flex items-center justify-between group cursor-pointer hover:bg-white/[0.04] transition-all">
            <div className="flex items-center gap-5">
               <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform">
                  <ExternalLink size={20} />
               </div>
               <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">Need Concierge Support?</h4>
                  <p className="text-[10px] font-bold text-slate-500 italic uppercase tracking-wider mt-1">Direct Line to Production HQ</p>
               </div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl text-slate-600 group-hover:text-white transition-colors">
               <Shield size={16} />
            </div>
         </div>
      </section>

      <div className="flex items-center justify-between gap-6 pt-12 pb-8 sticky bottom-0 z-20 mt-auto">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-slate-500 italic uppercase tracking-widest pl-2">Updates synchronize across all production documents instantly.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="h-14 px-10 bg-brand-500 text-[#0D1117] rounded-2xl font-black flex items-center gap-3 transition-all shadow-2xl shadow-brand-500/20 active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.2em] text-xs shrink-0"
        >
          {saving ? (
            <div className="w-5 h-5 border-3 border-[#0D1117] border-t-transparent rounded-full animate-spin" />
          ) : success ? (
            <CheckCircle2 size={20} strokeWidth={3} />
          ) : (
            <Save size={20} strokeWidth={3} />
          )}
          {saving ? 'Syncing...' : success ? 'Successfully Saved' : 'Synchronize Identity'}
        </button>
      </div>
    </div>
  );
}
