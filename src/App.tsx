/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firebaseUtils';
import { formatCurrency, cn } from './lib/utils';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  type User
} from 'firebase/auth';
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  FileText, 
  Plus, 
  LogOut, 
  LogIn,
  Menu,
  X as CloseIcon,
  BarChart2,
  Mail,
  Shield,
  ArrowRight,
  HardDrive,
  User as UserIcon,
  ExternalLink,
  Trophy,
  CreditCard,
  Building,
  Upload,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sparkles,
  MessageSquare,
  Send,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import Dashboard from './components/Dashboard';
import ClientManagement from './components/ClientManagement';
import ProjectTracker from './components/ProjectTracker';
import InvoiceGenerator from './components/InvoiceGenerator';
import QuickAddProject from './components/QuickAddProject';
import Analytics from './components/Analytics';
import AccountSettings from './components/AccountSettings';
import LandingPage from './components/LandingPage';
import ClientPortal from './components/ClientPortal';
import MilestoneSystem from './components/MilestoneSystem';
import MilestonesTab from './components/MilestonesTab';
import AdminPanel from './components/AdminPanel';
import Pricing from './components/Pricing';
import FeedbackModal from './components/FeedbackModal';
import { Toaster, CustomModal, NotificationProvider, useNotifications, type ToastMessage } from './components/NotificationProvider';
import { DashboardSkeleton, ClientSkeleton, TableSkeleton } from './components/Skeleton';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, addDoc, setDoc, getDoc, runTransaction, increment, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { LockedFeature, ProLabel } from './components/LockedFeature';
import { ADMIN_EMAIL, SYSTEM_LAUNCH_DATE, PREMIUM_UPGRADE_URL } from './lib/constants';

function NavItem({ icon: IconComponent, label, active, onClick, badge, size = 16 }: { icon: React.ComponentType<{ size?: number, className?: string }>, label: string, active: boolean, onClick: () => void, badge?: number, size?: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-[11px] font-bold tracking-widest",
        active 
          ? "bg-brand-500 text-[#0D1117] shadow-lg shadow-brand-500/20" 
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <div className="flex items-center gap-3">
        <IconComponent size={size} className={cn("transition-transform group-hover:scale-110", active ? "text-[#0D1117]" : "text-slate-500 group-hover:text-brand-500")} />
        <span>{label}</span>
      </div>
      {badge ? (
        <span className={cn(
          "text-[9px] h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full font-black",
          active ? "bg-[#0D1117] text-brand-500" : "bg-red-500 text-white"
        )}>
           {badge}
        </span>
      ) : null}
    </button>
  );
}

function AuthScreen({ onGoogleLogin }: { onGoogleLogin: () => void }) {
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 max-w-sm w-full text-center"
      >
        <div className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center mx-auto mb-8 relative group">
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-brand-500 blur-2xl rounded-full" 
          />
          <span className="text-[#0D1117] font-black text-2xl relative z-10 tracking-widest">FT</span>
        </div>
        
        <h1 className="text-3xl font-black text-white mb-2 tracking-widest">FrameTrack</h1>
        <p className="text-slate-500 mb-12 font-bold italic text-xs tracking-[0.2em]">High fidelity production Hub</p>

        <button 
          onClick={onGoogleLogin}
          className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl relative overflow-hidden group mb-6"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          <span className="text-lg tracking-tight">Sign in with Google</span>
          <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>
        
        <p className="text-[10px] font-black text-slate-600 tracking-[0.3em] mb-6">Sign in to your production studio.</p>

        {isIframe && (
          <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl text-left space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-2.5">
              <span className="text-sm">⚠️</span>
              <p className="text-[11px] font-bold text-slate-400 leading-normal">
                Running inside a preview iframe. Popups may be blocked by your browser's security policy.
              </p>
            </div>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-1 w-full py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-brand-500/10 hover:border-brand-500/20 transition-all text-center"
            >
              Open in New Tab
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function InviteScreen({ onInviteComplete, onSkip }: { onInviteComplete: (code: string) => void, onSkip: () => void }) {
  const [code, setCode] = useState('');
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-white/5 p-10 rounded-[3rem] max-w-md w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
        
        <h2 className="text-2xl font-black text-white mb-4 tracking-tight">Access Protocol</h2>
        <p className="text-slate-400 mb-8 font-medium italic text-sm leading-relaxed">
          Have an invite code? Enter it here for Pro access.
        </p>

        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Enter Code..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white font-black text-xl tracking-[0.3em] focus:ring-2 focus:ring-amber-500 outline-none"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
          />

          <button 
            onClick={() => onInviteComplete(code)}
            className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black tracking-widest text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Claim Pro Access
          </button>
          
          <button 
            onClick={onSkip}
            className="w-full py-4 text-slate-500 font-black tracking-[0.2em] text-[10px] hover:text-white transition-colors"
          >
            Skip for now
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function FinalSetupScreen({ user, onComplete }: { user: User, onComplete: (data: any) => void }) {
  const [data, setData] = useState({
    studioName: '',
    professionalName: '',
    gstNumber: '',
    bankDetails: '',
    upiId: '',
    logoUrl: '',
    qrUrl: ''
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-white/5 p-10 rounded-[3rem] max-w-xl w-full shadow-2xl"
      >
        <div className="border-l-4 border-emerald-500 pl-6 mb-8">
           <h2 className="text-3xl font-black text-white tracking-tighter">Studio Setup</h2>
           <p className="text-slate-400 font-bold tracking-[0.2em] text-[9px] mt-1">Complete your studio setup to get started.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1">Studio Name</label>
             <input 
               autoFocus
               type="text" 
               className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
               value={data.studioName}
               onChange={e => setData({...data, studioName: e.target.value})}
             />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1">Professional Name</label>
             <input 
               type="text" 
               className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
               value={data.professionalName}
               onChange={e => setData({...data, professionalName: e.target.value})}
             />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1">GST Number (Optional)</label>
             <input 
               type="text" 
               className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
               value={data.gstNumber}
               onChange={e => setData({...data, gstNumber: e.target.value})}
             />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1">UPI ID</label>
             <input 
               type="text" 
               className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
               value={data.upiId}
               onChange={e => setData({...data, upiId: e.target.value})}
             />
          </div>
          <div className="sm:col-span-2 space-y-1">
             <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1">Bank Details (Bank, Branch, Acc No, IFSC)</label>
             <textarea 
               className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 h-20"
               value={data.bankDetails}
               onChange={e => setData({...data, bankDetails: e.target.value})}
             />
          </div>
        </div>

        <button 
          onClick={() => onComplete(data)}
          disabled={!data.studioName || !data.professionalName}
          className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black tracking-widest text-sm shadow-xl shadow-emerald-500/20 hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-50"
        >
          Save settings
        </button>
      </motion.div>
    </div>
  );
}


function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [systemError, setSystemError] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'projects' | 'invoices' | 'analytics' | 'milestones' | 'account' | 'admin' | 'pricing' | 'feedback'>('dashboard');
  const [onboardingStep, setOnboardingStep] = useState<'INVITE' | 'SETUP' | 'COMPLETE'>('INVITE');
  const [impersonatingUser, setImpersonatingUser] = useState<string | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  
  const { addToast, showConfirm } = useNotifications();

  const [celebration, setCelebration] = useState<{ show: boolean, number?: number, text?: string, buttonText?: string }>({ show: false });
  const [lastPlanState, setLastPlanState] = useState<string | null>(null);

  // Detect Premium Unlock and Auto-Refresh
  useEffect(() => {
    if (!userProfile || impersonatingUser) return;
    
    const currentPlan = userProfile.planType || 'free';
    
    // Initialize lastPlanState on first load of userProfile
    if (lastPlanState === null) {
      setLastPlanState(currentPlan);
      return;
    }

    // Detect upgrade transition
    if (lastPlanState !== 'premium' && currentPlan === 'premium') {
      console.log("Premium detected! Triggering refresh.");
      localStorage.setItem('premium_unlocked_celebration', 'true');
      if (userProfile.planExpiry) {
        localStorage.setItem('premium_expiry_date', userProfile.planExpiry);
      }
      
      // We don't call reload directly if we just did it in handleInviteCode
      // But to be safe, we can delay it
      const isAlreadyReloading = localStorage.getItem('is_reloading');
      if (!isAlreadyReloading) {
        localStorage.setItem('is_reloading', 'true');
        window.location.reload();
      }
    }
    
    if (lastPlanState !== currentPlan) {
      setLastPlanState(currentPlan);
    }
  }, [userProfile?.planType, impersonatingUser, lastPlanState]);

  // Handle Celebration after Refresh
  useEffect(() => {
    localStorage.removeItem('is_reloading');
    const shouldCelebrate = localStorage.getItem('premium_unlocked_celebration');
    if (shouldCelebrate === 'true') {
      const expiry = localStorage.getItem('premium_expiry_date');
      const userNum = localStorage.getItem('premium_user_number');
      let message = "Welcome to the studio. You have unlocked Pro access.";
      
      if (expiry) {
        const days = Math.max(1, Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        message = `Congratulations! You have just unlocked Premium for ${days} days.`;
      }
      
      setCelebration({
        show: true,
        number: userNum ? parseInt(userNum) : undefined,
        text: message,
        buttonText: "CONTINUE TO STUDIO"
      });
      
      localStorage.removeItem('premium_unlocked_celebration');
      localStorage.removeItem('premium_expiry_date');
      localStorage.removeItem('premium_user_number');
    }
  }, []);
  const [proRequestModal, setProRequestModal] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [welcomeCodeStatus, setWelcomeCodeStatus] = useState({ exists: false, used: 0, limit: 0 });
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === null ? true : saved === 'true';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalData, setGlobalData] = useState<{ projects: any[], clients: any[], invoices: any[] }>({
    projects: [],
    clients: [],
    invoices: []
  });

  // Check for Client Portal or Admin Route
  const urlParams = new URLSearchParams(window.location.search);
  const portalToken = urlParams.get('portal');
  const path = window.location.pathname;

  useEffect(() => {
    if (portalToken) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setLoading(false);
        setUserProfile(null);
      } else {
        // If path is admin, we will set it after profile loads or if it's already known
        if (path === '/studio-admin' && firebaseUser.email === ADMIN_EMAIL) {
          setActiveTab('admin');
        }
      }
    });
    return unsubscribe;
  }, [path]);

  // Identity Sync and Session Update
  useEffect(() => {
    if (!user || impersonatingUser) return;

    const syncIdentity = async () => {
      const profileRef = doc(db, 'userProfiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      const now = new Date();
      
      const identityData = {
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email?.toLowerCase(),
        photoURL: user.photoURL,
        lastActiveAt: serverTimestamp(),
      };

      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          ...identityData,
          uid: user.uid,
          createdAt: serverTimestamp(),
          planType: 'free',
          seenPremiumOnboarding: false,
          sessions: 1,
          onboardingCompleted: false
        });
      } else {
        const data = profileSnap.data();
        const updates: any = {
          lastActiveAt: serverTimestamp(),
          sessions: increment(1)
        };

        // Automatic Migration / Sync
        if (!data.displayName || data.displayName === 'anonymous' || data.displayName === 'Anonymous') {
          updates.displayName = identityData.displayName;
        }
        if (!data.photoURL && identityData.photoURL) {
          updates.photoURL = identityData.photoURL;
        }
        if (!data.email) {
          updates.email = identityData.email;
        }

        await updateDoc(profileRef, updates);
      }
      
      // Log Sign-in event - ONLY for Admin log as per rules
      if (user.email === ADMIN_EMAIL) {
        try {
          await addDoc(collection(db, 'adminLogs'), {
            type: 'SIGN_IN',
            adminEmail: 'SYSTEM',
            targetEmail: user.email,
            details: `Admin signed in. Accessing control protocols.`,
            timestamp: serverTimestamp()
          });
        } catch (e) {
          console.error("Log failed", e);
        }
      }
    };

    syncIdentity();
  }, [user?.uid]);

  useEffect(() => {
    if (userProfile && userProfile.sessions >= 25 && !userProfile.feedbackPrompted) {
      setTimeout(() => {
        setIsFeedbackOpen(true);
        // Mark as prompted immediately to avoid repeat
        if (user?.uid) {
          updateDoc(doc(db, 'userProfiles', user.uid), { feedbackPrompted: true });
        }
      }, 3000);
    }
  }, [userProfile?.sessions, userProfile?.feedbackPrompted, user?.uid]);

  // Fetch Profile
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const profileRef = doc(db, 'userProfiles', user.uid);
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile((prev: any) => {
          if (prev && JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    }, (error) => {
      // If profile doesn't exist, it's not really a system error during lookup
      if (error.code === 'permission-denied' && user) {
         // Profile might not be created yet, ignore for now until onboarding
         setLoading(false);
         return;
      }
      setSystemError(error);
      handleFirestoreError(error, OperationType.GET, 'userProfiles');
      setLoading(false);
    });

    return () => {
      unsubProfile();
    };
  }, [user]);


  // Global Data Fetching for Milestone Tracking
  useEffect(() => {
    if (!user) return;

    // Listen for real-time notifications from Admin
    const qNotif = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid), 
      where('read', '==', false)
      // Removed orderBy to avoid index requirement for now
    );
    
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          let message = data.message;
          if (data.fromAdmin) {
            message = `🚨 [ MESSAGE FROM ADMIN ] 🚨\n-> ${message}`;
            addToast('warning', message);
          } else {
            addToast('success', message);
          }
          // Mark as read immediately for toast flow
          updateDoc(doc(db, 'notifications', change.doc.id), { read: true });
        }
      });
    }, (err) => {
      console.error("Notifications snapshot error:", err);
    });

    // We use userProfile.teamOwnerId primarily if available, otherwise fallback to current user
    const studioOwnerId = impersonatingUser || userProfile?.teamOwnerId || user.uid;

    const qClients = query(collection(db, 'clients'), where('teamOwnerId', '==', studioOwnerId));
    
    const unsubClients = onSnapshot(qClients, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setGlobalData(prev => ({ ...prev, clients: list }));
    }, (err) => {
      console.error("Clients snapshot error:", err);
      handleFirestoreError(err, OperationType.LIST, 'clients');
    });

    const qProjects = query(collection(db, 'projects'), where('teamOwnerId', '==', studioOwnerId));
    
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setGlobalData(prev => ({ ...prev, projects: list }));
    }, (err) => {
      console.error("Projects snapshot error:", err);
      handleFirestoreError(err, OperationType.LIST, 'projects');
    });

    const qInvoices = query(collection(db, 'invoices'), where('teamOwnerId', '==', studioOwnerId));
      
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setGlobalData(prev => ({ ...prev, invoices: list }));
    }, (err) => {
      console.error("Invoices snapshot error:", err);
      handleFirestoreError(err, OperationType.LIST, 'invoices');
    });

    return () => {
      unsubNotif();
      unsubClients();
      unsubProjects();
      unsubInvoices();
    };
  }, [user, userProfile?.teamOwnerId, impersonatingUser]);

  // Sync theme with system or state
  useEffect(() => {
    document.title = 'FrameTrack | Executive Pipeline';
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);


  const handleLogin = async () => {
    // Traffic Spike Rate Limiting Check
    const loginAttempts = JSON.parse(localStorage.getItem('auth_attempts') || '[]');
    const now = Date.now();
    const recentAttempts = loginAttempts.filter((t: number) => now - t < 60000);
    if (recentAttempts.length > 50) {
      const lockTime = localStorage.getItem('auth_lock_time');
      if (lockTime && now - parseInt(lockTime) < 600000) {
        addToast('error', "Too many attempts. Please wait a moment.");
        return;
      } else {
        localStorage.setItem('auth_lock_time', now.toString());
        addToast('error', "Too many attempts. Rate limited for 10 minutes.");
        return;
      }
    }
    localStorage.setItem('auth_attempts', JSON.stringify([...recentAttempts, now]));

    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    try {
      console.log("[AUTH] Initializing Google Sign-In with popup...");
      const result = await signInWithPopup(auth, provider);
      console.log("[AUTH] Google Sign-In successful. User:", result.user?.email);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_drive_access_token', credential.accessToken);
      }
    } catch (error: any) {
      console.error("[AUTH] Detailed Google Sign-In failure:", {
        code: error.code,
        message: error.message,
        customData: error.customData,
        name: error.name,
        stack: error.stack
      });

      let errMsg = "Something went wrong. Please try again.";
      if (error.code === 'auth/popup-blocked') {
        errMsg = "Popup blocked! Please allow popups for this site, or run the app in a new tab.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errMsg = "Sign-in popup was closed before completion. Please try again.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errMsg = "Popup sign-in was cancelled. Please try again.";
      } else if (error.code === 'auth/network-request-failed') {
        errMsg = "Network request failed. Please check your internet connection.";
      } else if (error.message && error.message.includes('opener-policy')) {
        errMsg = "COOP browser policy blocked popup feedback. Try opening the app in a new tab.";
      } else if (error.message) {
        errMsg = `Google Sign-in failed: ${error.message}`;
      }
      
      addToast('error', errMsg);
    }
  };

  const handleInviteCode = async (code: string) => {
    if (!user) {
      console.error("Premium claim failed: No authenticated user.");
      return;
    }

    console.log(`[PREMIUM_CLAIM] Initializing claim for code: ${code}, UID: ${user.uid}`);

    if (code === 'WELCOME100') {
      try {
        // 1. Validate and Increment Invite Code in a single transaction
        const result = await runTransaction(db, async (transaction) => {
          const codeRef = doc(db, 'inviteCodes', 'WELCOME100');
          const codeSnap = await transaction.get(codeRef);
          
          if (!codeSnap.exists()) {
            throw new Error("Invalid code protocol: Record missing.");
          }
          
          const codeData = codeSnap.data();
          console.log(`[PREMIUM_CLAIM] Found code data: limit=${codeData.maxLimit}, used=${codeData.usedCount}`);

          if (codeData.usedCount >= codeData.maxLimit) {
            console.warn(`[PREMIUM_CLAIM] Code capacity exhausted.`);
            return { success: false, exhausted: true };
          }
          
          const newCount = (codeData.usedCount || 0) + 1;
          transaction.update(codeRef, { usedCount: newCount });
          
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 100);
          
          return { success: true, userNumber: newCount, expiry: expiryDate };
        });

        console.log(`[PREMIUM_CLAIM] Transaction result:`, result);

        if (result.success && result.expiry && result.userNumber) {
          // DATABASE-FIRST: Perform critical write before any UI state changes
          try {
            if (userProfile) {
              console.log(`[PREMIUM_CLAIM] Upgrading existing profile at userProfiles/${user.uid}`);
              await updateDoc(doc(db, 'userProfiles', user.uid), {
                planType: 'premium',
                planExpiry: result.expiry.toISOString(),
                updatedAt: serverTimestamp()
              });
              
              console.log(`[PREMIUM_CLAIM] Firestore write confirmed. Proceeding to UI sync.`);
              
              // Only after confirmed write:
              localStorage.setItem('premium_user_number', result.userNumber.toString());
              localStorage.setItem('premium_unlocked_celebration', 'true');
              localStorage.setItem('premium_expiry_date', result.expiry.toISOString());
              
              addToast('success', "Pro Protocol Activated. Syncing session...");
              // We refresh via the useEffect that listens to planType or reload
            } else {
              console.log(`[PREMIUM_CLAIM] Caching premium info for onboarding setup.`);
              // User is still in onboarding (no profile doc yet)
              // We cache this so handleOnboardingComplete can include it
              localStorage.setItem('pending_premium', JSON.stringify({ 
                planType: 'premium', 
                planExpiry: result.expiry.toISOString(),
                userNumber: result.userNumber
              }));

              // UI changes only on success
              const celebrationText = `Congratulations! You have just unlocked Premium for 100 days.`;
              setCelebration({ 
                show: true, 
                number: result.userNumber, 
                text: celebrationText, 
                buttonText: "SET UP YOUR STUDIO" 
              });
              setOnboardingStep('SETUP');
            }
          } catch (dbError) {
            console.error(`[PREMIUM_CLAIM] CRITICAL: Firestore profile update failed!`, dbError);
            addToast('error', "Database synchronization failed. Please try again or contact support.");
            // UI does NOT show success because we didn't hit those lines
          }
        } else if (result.exhausted) {
          setProRequestModal(true);
        }
      } catch (err: any) {
        console.error(`[PREMIUM_CLAIM] Invite code validation failed:`, err);
        handleFirestoreError(err, OperationType.WRITE, 'inviteCodes/WELCOME100');
      }
    } else {
      console.warn(`[PREMIUM_CLAIM] Invalid code entered: ${code}`);
      addToast('error', "Invalid invite code.");
    }
  };

  const handleRequestProAccess = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'proAccessRequests', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: userProfile?.professionalName || user.displayName,
        signupDate: userProfile?.createdAt || serverTimestamp(),
        requestDate: serverTimestamp(),
        status: 'Pending'
      });
      setProRequestModal(false);
      addToast('success', "Pro Upgrade Request transmitted. Admin will review shortly.");
      if (onboardingStep === 'INVITE' && !userProfile) {
        setOnboardingStep('SETUP');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'proAccessRequests');
    }
  };

  const handleOnboardingComplete = async (data: any) => {
    if (!user) return;
    
    let premiumInfo = {};
    const pendingPremium = localStorage.getItem('pending_premium');
    if (pendingPremium) {
      premiumInfo = JSON.parse(pendingPremium);
      localStorage.removeItem('pending_premium');
    }

    const profile = {
      uid: user.uid,
      workspaceName: data.studioName,
      professionalName: data.professionalName,
      gstNumber: data.gstNumber,
      bankDetails: data.bankDetails,
      upiId: data.upiId,
      logoUrl: data.logoUrl,
      qrUrl: data.qrUrl,
      createdAt: serverTimestamp(),
      onboardingCompleted: true,
      planType: 'free',
      teamOwnerId: user.uid,
      role: 'Admin',
      ...premiumInfo
    };
    
    try {
      await setDoc(doc(db, 'userProfiles', user.uid), profile);
      setUserProfile(profile);
      addToast('success', "Studio is ready. Let's get to work.");
    } catch (error) {
      console.error("Onboarding setup failed:", error);
      addToast('error', "Setup failed. Try again.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  if (portalToken) {
    return <ClientPortal portalToken={portalToken} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-full max-w-6xl p-8">
           <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    if (showAuth) {
      return (
        <GoogleReCaptchaProvider reCaptchaKey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI">
          <AuthScreen onGoogleLogin={handleLogin} />
        </GoogleReCaptchaProvider>
      );
    }
    return (
      <LandingPage onGetStarted={() => setShowAuth(true)} />
    );
  }

  if (!userProfile) {
    if (onboardingStep === 'INVITE') {
      return (
        <div className="min-h-screen bg-slate-950">
          <InviteScreen onInviteComplete={handleInviteCode} onSkip={() => setOnboardingStep('SETUP')} />
          
          <AnimatePresence>
            {proRequestModal && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 border border-emerald-500/30 p-10 rounded-[3rem] max-w-md w-full relative z-10 text-center">
                  <p className="text-slate-400 italic mb-8">The WELCOME100 code has been fully claimed. But you can request early Pro access from the developer.</p>
                  <button onClick={handleRequestProAccess} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black tracking-widest text-sm shadow-xl shadow-emerald-500/20 mb-4">Request Pro Access</button>
                  <button onClick={() => setProRequestModal(false)} className="text-slate-500 hover:text-white font-black tracking-widest mt-4 transition-colors">Cancel</button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-950">
        <FinalSetupScreen user={user} onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  const isAdmin = user.email === ADMIN_EMAIL;
  
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'projects', icon: Video, label: 'Projects' },
    { id: 'analytics', icon: BarChart2, label: 'Analytics' },
    { id: 'milestones', icon: Trophy, label: 'Milestones', badge: userProfile?.unseenMilestones?.length },
    { id: 'invoices', icon: FileText, label: 'Invoices' },
    { id: 'clients', icon: Users, label: 'Clients' },
    { id: 'feedback', icon: MessageSquare, label: 'Feedback' },
    { id: 'account', icon: UserIcon, label: 'Account' },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', icon: Shield, label: 'Admin Hub' });
  }

  // Handle Admin Redirect if not admin but on admin tab
  if (activeTab === 'admin' && !isAdmin) {
    setActiveTab('dashboard');
  }

  if (systemError) {
    throw systemError;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row transition-colors duration-300">
       {/* Offline Banner */}
       {!navigator.onLine && (
         <div className="fixed top-0 left-0 right-0 z-[200] bg-red-500 text-white text-[10px] font-black tracking-[0.3em] py-1 text-center">
           You are offline. Changes will sync when connection is restored.
         </div>
       )}

      {/* Mobile Header */}
      <header className="md:hidden bg-slate-950 sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg relative shrink-0">
             <motion.div 
               animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
               transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
               className="absolute inset-0 bg-brand-500 blur-lg rounded-full" 
             />
             <span className="text-[#0D1117] font-black text-[10px] relative z-10 tracking-widest">FT</span>
          </div>
          <div className="min-w-0 text-left">
            <span className="font-black text-sm text-white tracking-tight block truncate leading-none">
              FrameTrack
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:bg-white/5 rounded-xl transition-colors"
          >
            {isMobileMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 z-40 md:hidden bg-slate-950 mt-[72px]"
          >
            <nav className="p-6 space-y-3">
              {navItems.map((item) => (
                <NavItem 
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                />
              ))}

              {userProfile?.planType !== 'premium' && (
                <button 
                  onClick={() => {
                    setActiveTab('pricing');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full mt-4 p-5 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl relative overflow-hidden group text-left shadow-xl shadow-brand-500/20"
                >
                   <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={14} className="text-white fill-white" />
                        <span className="text-[9px] font-black text-white/80 tracking-[0.2em]">Ultimate Access</span>
                      </div>
                      <p className="text-sm font-black text-white tracking-tight">Upgrade to Pro Protocol</p>
                   </div>
                   <Sparkles size={24} className="absolute top-2 right-2 text-white/20" />
                </button>
              )}
              <div className="pt-6 mt-6 border-t border-white/5">
                <button 
                  onClick={() => {
                    if (globalData.clients.length === 0) {
                      showConfirm(
                        "No clients added yet",
                        "You need to add a client before registering a project. Projects are linked to clients.",
                        () => setActiveTab('clients'),
                        'info'
                      );
                      setIsMobileMenuOpen(false);
                      return;
                    }
                    setIsQuickAddOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-4 bg-brand-500 text-white rounded-2xl font-black glow-brand text-xs shadow-xl shadow-brand-500/30"
                >
                  + New Production
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-[220px] bg-[#0D1117] border-r border-white/10 md:min-h-screen flex-col sticky top-0 z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg relative shrink-0">
             <motion.div 
               animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
               transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
               className="absolute inset-0 bg-brand-500 blur-lg rounded-full" 
             />
             <span className="text-[#0D1117] font-black text-[10px] relative z-10 tracking-widest">FT</span>
          </div>
          <div className="min-w-0">
            <span className="font-black text-xs text-white leading-none block truncate tracking-tight" title="FrameTrack">
              FrameTrack
            </span>
            <span className="text-[7px] font-bold text-brand-500 tracking-widest mt-1 block">
              Control Center
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {/* MANAGEMENT GROUP */}
          <p className="nav-group-label">Management</p>
          <NavItem icon={LayoutDashboard} label="Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={Video} label="Projects" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
          <NavItem icon={BarChart2} label="Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          <NavItem icon={Trophy} label="Milestones" active={activeTab === 'milestones'} onClick={() => setActiveTab('milestones')} badge={userProfile?.unseenMilestones?.length} />

          {/* FINANCE GROUP */}
          <p className="nav-group-label">Finance</p>
          <NavItem icon={FileText} label="Invoices" active={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')} />
          <NavItem icon={Users} label="Clients" active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />

          {/* Studio Group */}
          <p className="nav-group-label">Studio</p>
          <NavItem icon={UserIcon} label="Account" active={activeTab === 'account'} onClick={() => setActiveTab('account')} />
          <NavItem icon={MessageSquare} label="Feedback" active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} />
          
          {isAdmin && (
            <NavItem icon={Shield} label="Admin Hub" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
          )}

          {userProfile?.planType !== 'premium' && (
            <div className="px-3 pt-6">
              <button 
                onClick={() => setActiveTab('pricing')}
                className={cn(
                  "w-full p-4 rounded-xl relative overflow-hidden group transition-all text-left",
                  activeTab === 'pricing' ? "bg-brand-500 shadow-lg shadow-brand-500/20" : "bg-white/5 hover:bg-white/10 border border-white/5"
                )}
              >
                 <div className="relative z-10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap size={10} className={cn("fill-current text-white")} />
                      <span className={cn("text-[8px] font-black tracking-[0.2em] text-white/80")}>Upgrade</span>
                    </div>
                    <p className={cn("text-[10px] font-black tracking-tight text-white")}>Pro Access</p>
                 </div>
                 <Sparkles size={14} className={cn("absolute top-3 right-3 transition-transform group-hover:rotate-12 text-white/40")} />
                 <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-brand-500/10 rounded-full blur-2xl" />
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="bg-white/5 p-3 rounded-2xl flex items-center justify-between group">
             <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0 font-bold overflow-hidden">
                   {userProfile?.photoURL ? (
                     <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                   ) : (
                     userProfile?.professionalName?.[0] || user.email?.[0]?.toUpperCase() 
                   )}
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-black text-white truncate">
                      {userProfile?.professionalName?.trim().split(/\s+/)[0] || 
                       userProfile?.displayName?.trim().split(/\s+/)[0] || 
                       user.displayName?.trim().split(/\s+/)[0] || 
                       user.email?.split('@')[0] || 
                       'Member'}
                    </p>
                   <p className="text-[8px] text-slate-500 truncate">{user.email}</p>
                </div>
             </div>
             <button 
               onClick={handleLogout}
               className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
             >
                <LogOut size={16} />
             </button>
          </div>
          
          <button 
            onClick={() => {
              if (globalData.clients.length === 0) {
                 showConfirm(
                   "No clients added yet",
                   "You need to add a client before registering a project. Projects are linked to clients.",
                   () => {
                     setActiveTab('clients');
                   },
                   'info'
                 );
                 return;
              }
              setIsQuickAddOpen(true);
            }}
            className="w-full mt-4 py-3.5 bg-white text-[#0D1117] rounded-xl font-black tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
          >
            + New Project
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn("flex-1 flex flex-col p-4 md:p-8 overflow-x-hidden min-h-0 custom-scrollbar", impersonatingUser && "pt-10 border-t-4 border-red-600")}>
        <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col"
            >
              {activeTab === 'dashboard' && <Dashboard userProfile={userProfile} setActiveTab={setActiveTab} />}
              {activeTab === 'analytics' && <Analytics userProfile={userProfile} />}
              {activeTab === 'milestones' && <MilestonesTab userProfile={userProfile} projects={globalData.projects} clients={globalData.clients} invoices={globalData.invoices} />}
              {activeTab === 'clients' && <ClientManagement userProfile={userProfile} />}
              {activeTab === 'projects' && <ProjectTracker userProfile={userProfile} />}
              {activeTab === 'invoices' && <InvoiceGenerator userProfile={userProfile} />}
              {activeTab === 'account' && <AccountSettings />}
              {activeTab === 'admin' && (
                <AdminPanel 
                  onExitImpersonation={() => {
                    setImpersonatingUser(null);
                    addToast('success', "Returned to Admin session.");
                  }}
                  isImpersonating={!!impersonatingUser}
                  onImpersonate={(uid) => {
                    setImpersonatingUser(uid);
                    setActiveTab('dashboard');
                    addToast('success', "Impersonation protocol active.");
                  }}
                />
              )}
              {activeTab === 'pricing' && (
                <Pricing 
                  userProfile={userProfile} 
                  onUpgradeRequest={handleRequestProAccess} 
                  onRedeemCode={async (code) => {
                    await handleInviteCode(code);
                  }}
                />
              )}
              {activeTab === 'feedback' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 bg-brand-500/10 rounded-[2rem] flex items-center justify-center mb-6 border border-brand-500/20">
                     <Heart className="text-brand-500 fill-brand-500/20" size={32} />
                  </div>
                  <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Signal Hub</h2>
                  <p className="text-slate-400 font-bold italic mb-8 max-w-sm mx-auto">Your feedback directly shapes the evolution of this production studio. Send us your signal.</p>
                  <button 
                    onClick={() => setIsFeedbackOpen(true)}
                    className="px-10 py-5 bg-brand-500 text-[#0D1117] rounded-2xl font-black tracking-widest text-sm shadow-xl shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                  >
                    <Send size={18} />
                    Open Signal Channel
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Impersonation Banner */}
      {impersonatingUser && (
        <div className="fixed top-0 left-0 right-0 z-[1000] bg-red-600 text-white px-4 py-2 text-[10px] font-black tracking-widest text-center flex items-center justify-between shadow-2xl">
          <div className="w-20" />
          <span>ADMIN SHADOW-VIEW: {impersonatingUser} | READ-ONLY PROTOCOL</span>
          <button 
            onClick={() => {
              setImpersonatingUser(null);
              setActiveTab('admin');
            }}
            className="bg-white text-red-600 px-3 py-1 rounded font-black hover:bg-slate-100 transition-all text-[9px]"
          >
            EXIT SHADOW
          </button>
        </div>
      )}



      {/* Quick Add Modal */}
      <QuickAddProject 
        isOpen={isQuickAddOpen} 
        userProfile={userProfile}
        onClose={() => setIsQuickAddOpen(false)} 
        onSuccess={() => {
          setIsQuickAddOpen(false);
          if (activeTab !== 'projects') setActiveTab('projects');
        }}
      />

      <MilestoneSystem 
        userProfile={userProfile}
        projects={globalData.projects}
        clients={globalData.clients}
        invoices={globalData.invoices}
      />

      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
        userProfile={userProfile} 
      />

      <AnimatePresence>
        {celebration.show && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
             <motion.div 
               initial={{ scale: 0.5, opacity: 0 }} 
               animate={{ scale: 1, opacity: 1 }} 
               exit={{ scale: 0.5, opacity: 0 }}
               className="bg-slate-900 border-2 border-emerald-500 p-12 rounded-[4rem] max-w-lg w-full relative z-10 text-center shadow-[0_0_100px_rgba(16,185,129,0.3)] glow-brand"
             >
               <span className="text-[10px] font-black text-emerald-500 tracking-[0.5em] mb-4 block">Access Granted</span>
               <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2">
                 {celebration.number ? `YOU ARE USER #${celebration.number}` : "PREMIUM UNLOCKED"}
               </h2>
               <p className="text-slate-400 font-bold italic mb-12">{celebration.text}</p>
               <button 
                onClick={() => setCelebration({ ...celebration, show: false })}
                className="px-10 py-5 bg-emerald-500 text-white rounded-2xl font-black tracking-widest text-sm shadow-xl shadow-emerald-500/20 hover:scale-110 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto"
               >
                 {celebration.buttonText || "CONTINUE"}
                 <Sparkles size={16} />
               </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}


