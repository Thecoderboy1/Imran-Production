import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc, writeBatch, Timestamp, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { formatCurrency, cn, isGrandfathered } from '../lib/utils';
import { FREE_MONTHLY_INVOICE_LIMIT, SYSTEM_LAUNCH_DATE, PREMIUM_UPGRADE_URL } from '../lib/constants';
import { motion, AnimatePresence } from 'motion/react';
import { LockedFeature, ProTooltip } from './LockedFeature';
import { 
  FileText, 
  Download, 
  User, 
  Calendar, 
  CreditCard,
  CheckCircle,
  AlertCircle,
  Building,
  Mail,
  Send,
  Zap,
  Shield
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isAfter } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNotifications } from './NotificationProvider';

export default function InvoiceGenerator({ userProfile }: { userProfile?: any }) {
  const { addToast } = useNotifications();
  const isPremium = userProfile?.planType === 'premium';
  const [activeView, setActiveView] = useState<'create' | 'history'>('create');
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [unpaidProjects, setUnpaidProjects] = useState<any[]>([]);
  const [includeQr, setIncludeQr] = useState(true);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstPercentage, setGstPercentage] = useState(18);
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('INV-001');

  // FrameTrack's fixed details for invoice
  const [vendorDetails, setVendorDetails] = useState({
    name: "FrameTrack",
    userName: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
    qrCode: "",
    gstNumber: "",
    studioLogo: "",
    email: auth.currentUser?.email || ""
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const totalDue = unpaidProjects.reduce((sum, p) => sum + (p.dueMoney || 0), 0);

  useEffect(() => {
    if (!auth.currentUser) return;

    const studioOwnerId = userProfile?.teamOwnerId || auth.currentUser?.uid;

    // Fetch User Profile
    getDoc(doc(db, 'userProfiles', studioOwnerId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setVendorDetails(prev => ({
          ...prev,
          name: data.workspaceName || prev.name,
          userName: data.userName || "",
          bankName: data.paymentDetails?.bankName || "",
          accountNumber: data.paymentDetails?.accountNumber || "",
          ifsc: data.paymentDetails?.ifsc || "",
          upiId: data.paymentDetails?.upiId || "",
          qrCode: data.paymentDetails?.qrCode || "",
          gstNumber: data.gstNumber || "",
          studioLogo: data.studioLogo || ""
        }));
      }
    });

    // Fetch Invoices
    const qInvoices = query(collection(db, 'invoices'), where('teamOwnerId', '==', studioOwnerId));
    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      const sorted = list.sort((a, b) => {
        const numA = parseInt(a.invoiceNumber?.split('-')[1] || '0');
        const numB = parseInt(b.invoiceNumber?.split('-')[1] || '0');
        return numB - numA;
      });
      setInvoices(sorted);
      
      // Calculate next invoice number
      if (sorted.length > 0) {
        const lastNum = parseInt(sorted[0].invoiceNumber?.split('-')[1] || '0');
        setNextInvoiceNumber(`INV-${String(lastNum + 1).padStart(3, '0')}`);
      } else {
        setNextInvoiceNumber('INV-001');
      }
    });

    // Fetch clients
    const qClients = query(collection(db, 'clients'), where('teamOwnerId', '==', studioOwnerId));
    const unsubscribeClients = onSnapshot(qClients, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setClients(list.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    // Fetch only unpaid projects for the workspace
    const qProjects = query(collection(db, 'projects'), where('teamOwnerId', '==', studioOwnerId), where('paymentStatus', '==', 'Not Paid'));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setProjects(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => {
      unsubscribeClients();
      unsubscribeProjects();
      unsubscribeInvoices();
    };
  }, [userProfile?.uid]);

  useEffect(() => {
    if (selectedClientId) {
      const filtered = projects.filter(p => p.clientId === selectedClientId && p.paymentStatus === 'Not Paid');
      setUnpaidProjects(filtered);
    } else {
      setUnpaidProjects([]);
    }
  }, [selectedClientId, projects]);

  const handleMarkAsPaid = async (invoice: any) => {
    try {
      // Update invoice status
      await updateDoc(doc(db, 'invoices', invoice.id), { 
        status: 'Paid',
        updatedAt: serverTimestamp()
      });

      // Update connected projects
      const batch = writeBatch(db);
      invoice.projectIds?.forEach((pid: string) => {
        const project = projects.find(p => p.id === pid);
        if (project) {
          batch.update(doc(db, 'projects', pid), {
            received: project.budget || 0,
            dueMoney: 0,
            paymentStatus: 'Paid',
            updatedAt: serverTimestamp()
          });
        }
      });
      await batch.commit();
      addToast('success', "Settlement recorded successfully.");
    } catch (error) {
      console.error("Payment update failed:", error);
    }
  };

  const saveInvoiceToDb = async (invoiceNumber: string, total: number) => {
    if (!auth.currentUser) return;
    const studioOwnerId = userProfile?.teamOwnerId || auth.currentUser?.uid;

    const invoiceData: any = {
      invoiceNumber,
      clientId: selectedClientId,
      clientName: selectedClient?.name,
      amount: total,
      status: 'Draft',
      invoiceDate: Timestamp.fromDate(new Date(invoiceDate)),
      dueDate: Timestamp.fromDate(new Date(dueDate)),
      createdAt: serverTimestamp(),
      ownerId: auth.currentUser.uid,
      teamId: studioOwnerId,
      teamOwnerId: studioOwnerId,
      projectIds: unpaidProjects.map(p => p.id)
    };

    try {
      await addDoc(collection(db, 'invoices'), invoiceData);
    } catch (error) {
      console.error("Failed to save invoice record:", error);
    }
  };

  const exportToPDF = () => {
    if (!selectedClient || unpaidProjects.length === 0) return;

    // Premium Limit Check
    if (userProfile?.planType !== 'premium') {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      const currentMonthInvoices = invoices.filter(inv => {
        const dateRaw = inv.createdAt?.toDate ? inv.createdAt.toDate() : (inv.createdAt ? new Date(inv.createdAt) : new Date());
        return dateRaw >= monthStart && dateRaw <= monthEnd && dateRaw >= SYSTEM_LAUNCH_DATE;
      });

      if (currentMonthInvoices.length >= FREE_MONTHLY_INVOICE_LIMIT) {
        addToast('error', `Monthly free limit reached (${FREE_MONTHLY_INVOICE_LIMIT} invoices). Upgrade to Pro for unlimited billing.`);
        return;
      }
    }

    const invoiceNum = nextInvoiceNumber;
    const subtotal = totalDue;
    const gstAmount = gstEnabled ? (subtotal * gstPercentage / 100) : 0;
    const finalTotal = subtotal + gstAmount;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header - Professional Slate
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Add Logo if exists
    if (vendorDetails.studioLogo && isPremium) {
      try {
        doc.addImage(vendorDetails.studioLogo, 'PNG', 20, 10, 15, 15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(255);
        doc.text(vendorDetails.name.toUpperCase(), 40, 22);
      } catch (e) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(255);
        doc.text(vendorDetails.name.toUpperCase(), 20, 25);
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(255);
      doc.text(vendorDetails.name.toUpperCase(), 20, 25);
    }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255);
    doc.text(vendorDetails.gstNumber && isPremium ? `GSTIN: ${vendorDetails.gstNumber}` : 'TAX INVOICE', 20, 35);
    
    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.text(`INVOICE: ${invoiceNum}`, pageWidth - 20, 20, { align: 'right' });
    doc.text(`DATE: ${format(new Date(invoiceDate), 'dd MMM yyyy')}`, pageWidth - 20, 28, { align: 'right' });
    doc.text(`DUE: ${format(new Date(dueDate), 'dd MMM yyyy')}`, pageWidth - 20, 36, { align: 'right' });

    // Client Info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("BILL TO:", 20, 65);
    doc.setFontSize(14);
    doc.text(selectedClient.name.toUpperCase(), 20, 75);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    if (selectedClient.company) doc.text(selectedClient.company, 20, 82);
    if (selectedClient.email) doc.text(selectedClient.email, 20, 88);

    // Table
    const tableData = unpaidProjects.map(p => [
      p.name,
      p.videoType,
      formatCurrency(p.dueMoney).replace('₹', 'Rs.')
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['DESCRIPTION', 'CATEGORY', 'AMOUNT']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] as any, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, cellPadding: 6 },
      margin: { left: 20, right: 20 }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`SUBTOTAL:`, pageWidth - 80, finalY);
    doc.text(formatCurrency(subtotal).replace('₹', 'Rs.'), pageWidth - 20, finalY, { align: 'right' });
    
    if (gstEnabled) {
      doc.text(`GST (${gstPercentage}%):`, pageWidth - 80, finalY + 8);
      doc.text(formatCurrency(gstAmount).replace('₹', 'Rs.'), pageWidth - 20, finalY + 8, { align: 'right' });
    }

    doc.setFillColor(15, 23, 42);
    doc.rect(pageWidth - 90, finalY + 14, 70, 12, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL DUE:`, pageWidth - 80, finalY + 22);
    doc.text(formatCurrency(finalTotal).replace('₹', 'Rs.'), pageWidth - 25, finalY + 22, { align: 'right' });

    // Settlement
    const settY = finalY + 50;
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text("SETTLEMENT DETAILS", 20, settY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`BANK: ${vendorDetails.bankName}`, 20, settY + 8);
    doc.text(`A/C: ${vendorDetails.accountNumber}`, 20, settY + 14);
    doc.text(`IFSC: ${vendorDetails.ifsc}`, 20, settY + 20);
    doc.text(`UPI: ${vendorDetails.upiId}`, 20, settY + 26);

    if (includeQr && vendorDetails.qrCode && isPremium) {
      try {
        doc.addImage(vendorDetails.qrCode, 'PNG', pageWidth - 50, settY - 5, 30, 30);
      } catch (e) {}
    }

    saveInvoiceToDb(invoiceNum, finalTotal);
    doc.save(`${invoiceNum}_${selectedClient.name.replace(/\s/g, '_')}.pdf`);
  };

  const generateReminderMessage = (type: 'whatsapp' | 'email') => {
    if (!selectedClient || unpaidProjects.length === 0) return "";
    
    const projectList = unpaidProjects.map(p => `- ${p.name}: ${formatCurrency(p.dueMoney)}`).join('\n');
    const totalAmount = formatCurrency(totalDue);
    const studioName = vendorDetails.name || 'FrameTrack';
    const profName = vendorDetails.userName || 'Producer';
    
    const message = `Hi ${selectedClient.name}, hope you're doing well. This is a reminder from ${studioName} regarding the following pending settlements:

${projectList}

Total Due: ${totalAmount}
Invoice: ${nextInvoiceNumber}
Due Date: ${format(new Date(dueDate), 'dd MMM yyyy')}

Payment Details:
UPI: ${vendorDetails.upiId || 'N/A'}
Bank: ${vendorDetails.bankName || 'N/A'} | ${vendorDetails.accountNumber || 'N/A'} | IFSC: ${vendorDetails.ifsc || 'N/A'}

Please let us know once the payment is processed. Thank you for your continued partnership.

— ${profName}, ${studioName}`;

    return type === 'whatsapp' ? encodeURIComponent(message) : message;
  };

  const handleWhatsAppReminder = () => {
    if (!selectedClient) return;
    const phone = selectedClient.phone ? selectedClient.phone.replace(/\D/g, '') : '';
    const message = generateReminderMessage('whatsapp');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleEmailReminder = () => {
    if (!selectedClient) return;
    const email = selectedClient.email || '';
    const subject = encodeURIComponent(`Payment Reminder — ${nextInvoiceNumber} — ${vendorDetails.name}`);
    const body = encodeURIComponent(generateReminderMessage('email'));
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  const displayInvoices = isPremium ? invoices : invoices.slice(0, 3);

  return (
    <div className="page-container">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="page-title">Billing Terminal</h1>
          <p className="page-subtitle">Professional financial settlements and auditing</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 h-10">
          <button
            onClick={() => setActiveView('create')}
            className={cn(
              "px-6 rounded-lg text-[10px] font-black transition-all tracking-widest",
              activeView === 'create' ? "bg-brand-500 text-[#0D1117] shadow-lg" : "text-slate-500 hover:text-white"
            )}
          > Create </button>
          <button
            onClick={() => setActiveView('history')}
            className={cn(
              "px-6 rounded-lg text-[10px] font-black transition-all tracking-widest",
              activeView === 'history' ? "bg-brand-500 text-[#0D1117] shadow-lg" : "text-slate-500 hover:text-white"
            )}
          > History </button>
        </div>
      </header>

      {activeView === 'history' ? (
        <div className="glass-card !p-0 overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 tracking-[0.2em]">Invoice / Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 tracking-[0.2em]">Client</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 tracking-[0.2em]">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 tracking-[0.2em]">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 tracking-[0.2em] text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {displayInvoices.map(inv => (
                  <tr key={inv.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-black text-white text-xs tracking-tight group-hover:text-brand-500 transition-colors">{inv.invoiceNumber}</p>
                      <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">{inv.invoiceDate?.toDate ? format(inv.invoiceDate.toDate(), 'dd MMM yyyy') : 'No Date'}</p>
                    </td>
                    <td className="px-6 py-4 font-black text-[11px] text-slate-400 group-hover:text-white transition-colors">{inv.clientName}</td>
                    <td className="px-6 py-4 font-black text-xs text-brand-500">{formatCurrency(inv.amount)}</td>
                    <td className="px-6 py-4">
                       <span className={cn(
                         "px-3 py-1 rounded-full text-[9px] font-black tracking-widest border",
                         inv.status === 'Paid' ? "bg-emerald-500 text-[#0D1117] border-emerald-400" : 
                         inv.status === 'Sent' ? "bg-brand-500 text-[#0D1117] border-brand-400" :
                         "bg-white/5 text-slate-500 border-white/10"
                       )}>
                         {inv.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2">
                         {inv.status !== 'Paid' && (
                           <>
                             {isPremium ? (
                               <>
                                 <button 
                                   onClick={() => updateDoc(doc(db, 'invoices', inv.id), { status: 'Sent' })}
                                   className="h-8 px-4 bg-white/5 text-slate-400 rounded-lg hover:text-brand-500 hover:bg-brand-500/10 border border-white/10 transition-all font-black text-[9px] tracking-widest"
                                 > Sent </button>
                                 <button 
                                   onClick={() => handleMarkAsPaid(inv)}
                                   className="h-8 px-4 bg-emerald-500 text-[#0D1117] rounded-lg font-black text-[9px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
                                 > Paid </button>
                               </>
                             ) : (
                               <div onClick={() => window.location.href = PREMIUM_UPGRADE_URL} className="cursor-pointer">
                                 <ProTooltip label="Auto Sync" />
                               </div>
                             )}
                           </>
                         )}
                       </div>
                    </td>
                  </tr>
                ))}
                {!isPremium && invoices.length > 3 && (
                   <tr>
                      <td colSpan={5} className="px-6 py-12">
                         <div className="text-center opacity-40">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">
                               {invoices.length - 3} older invoices are archived in premium cloud.
                            </p>
                         </div>
                      </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Selection Pane */}
          <div className="lg:col-span-4 max-h-fit">
            <div className="glass-card flex flex-col gap-6">
              <div>
                <span className="section-header">Client Identity</span>
                <div className="relative mt-2">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <select 
                      className="w-full h-11 pl-12 pr-6 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 appearance-none outline-none font-bold text-xs tracking-wider transition-all"
                      value={selectedClientId}
                      onChange={e => setSelectedClientId(e.target.value)}
                    >
                      <option value="" className="bg-[#0D1117]">-- Select Client --</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id} className="bg-[#0D1117]">{client.name}</option>
                      ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="section-header">Invoice Date</span>
                  <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-bold text-white outline-none focus:border-brand-500" />
                </div>
                <div className="space-y-1">
                  <span className="section-header">Due Date</span>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-bold text-white outline-none focus:border-brand-500" />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white tracking-tight">Apply GST Taxation</span>
                    <span className="text-[9px] text-slate-500 font-bold tracking-widest italic">{isPremium ? 'Standard 18%' : 'Pro Feature'}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (isPremium) setGstEnabled(!gstEnabled);
                      else window.location.href = PREMIUM_UPGRADE_URL;
                    }} 
                    className={cn(
                      "w-10 h-6 rounded-full relative transition-all", 
                      gstEnabled ? "bg-brand-500" : "bg-white/10",
                    )}
                  >
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md", gstEnabled ? "right-1" : "left-1")} />
                  </button>
                </div>
                {gstEnabled && isPremium && (
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] font-black text-brand-500">%</span>
                     <input type="number" value={gstPercentage} onChange={e => setGstPercentage(Number(e.target.value))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[11px] font-black text-white outline-none" />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white tracking-tight">Include Secure QR</span>
                    <span className="text-[9px] text-slate-500 font-bold tracking-widest italic">{isPremium ? 'Instant UPI' : 'Pro Feature'}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (isPremium) setIncludeQr(!includeQr);
                      else window.location.href = PREMIUM_UPGRADE_URL;
                    }} 
                    className={cn(
                      "w-10 h-6 rounded-full relative transition-all", 
                      includeQr ? "bg-brand-500" : "bg-white/10",
                    )}
                  >
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md", includeQr ? "right-1" : "left-1")} />
                  </button>
                </div>
              </div>

              {selectedClient && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 pt-6 border-t border-white/5"
                >
                  <p className="section-header !text-brand-500 mb-3">Target Profile</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center font-black text-lg text-brand-500">
                      {selectedClient.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-white truncate uppercase tracking-tight">{selectedClient.name}</p>
                      <p className="text-[10px] font-bold text-slate-500 italic truncate opacity-60 tracking-wider font-mono">{selectedClient.email}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* List Pane */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="glass-card flex-1 flex flex-col !p-0 overflow-hidden">
              <div className="px-8 py-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter">{nextInvoiceNumber} Audit</h3>
                  <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] mt-1 italic">Vetting unpaid production cycles</p>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black text-slate-500 tracking-widest opacity-60 mb-1">Audit Valuation</span>
                   <p className="text-3xl font-black text-emerald-500 tracking-tighter leading-none">
                     {formatCurrency(gstEnabled ? (totalDue * (1 + gstPercentage/100)) : totalDue)}
                   </p>
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto max-h-[500px] custom-scrollbar">
                <AnimatePresence mode="wait">
                  {unpaidProjects.length > 0 ? (
                    <motion.div 
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      {unpaidProjects.map((project) => (
                        <div key={project.id} className="group flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-brand-500/50 transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-brand-500 group-hover:bg-brand-500/10 transition-all">
                               <CheckCircle size={24} strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-white text-base tracking-tight leading-tight group-hover:text-brand-500 transition-colors truncate max-w-[200px] md:max-w-md">{project.name}</p>
                              <p className="text-[10px] font-black text-slate-600 tracking-[0.2em] mt-2 italic">
                                Organized {(project.startDate?.toDate || project.createdAt?.toDate) ? format((project.startDate?.toDate ? project.startDate.toDate() : project.createdAt.toDate()), 'do MMM yy') : 'Recently'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                             <p className="text-xl font-black text-white tracking-tighter leading-none">{formatCurrency(project.dueMoney)}</p>
                             <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                <span className="text-[8px] font-black tracking-widest">Billable Part</span>
                             </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center py-12"
                    >
                      <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10 text-slate-500">
                        <FileText size={40} strokeWidth={1} />
                      </div>
                      <p className="text-slate-500 max-w-[280px] font-black text-xs italic leading-relaxed uppercase tracking-[0.2em] text-center opacity-60">
                        {selectedClientId 
                          ? "This client has zero outstanding settlement obligations." 
                          : "Audit selection required to process settlements."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {unpaidProjects.length > 0 && (
                <div className="p-8 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center justify-between gap-6">
                   <div className="flex gap-2">
                     <button 
                      onClick={exportToPDF}
                      disabled={unpaidProjects.length === 0}
                      className="h-11 px-6 bg-white/10 text-white rounded-xl font-black flex items-center gap-2 hover:bg-white/20 transition-all disabled:opacity-20 uppercase text-[10px] tracking-widest border border-white/10"
                     >
                        <Download size={16} strokeWidth={3} /> PDF
                     </button>
                     <button 
                      onClick={handleWhatsAppReminder}
                      disabled={unpaidProjects.length === 0}
                      className="h-11 px-6 bg-brand-500 text-[#0D1117] rounded-xl font-black flex items-center gap-2 transition-all disabled:opacity-20 shadow-xl shadow-brand-500/10 hover:scale-[1.02] active:scale-95 uppercase text-[10px] tracking-widest"
                     >
                        <Send size={16} strokeWidth={3} /> WhatsApp
                     </button>
                     <button 
                      onClick={handleEmailReminder}
                      disabled={unpaidProjects.length === 0}
                      className="h-11 px-6 bg-white/5 text-slate-400 rounded-xl font-black flex items-center gap-2 hover:text-white border border-white/10 transition-all disabled:opacity-20 uppercase text-[10px] tracking-widest"
                     >
                        <Mail size={16} strokeWidth={3} /> Email
                     </button>
                   </div>
                   <div className="flex flex-col items-end">
                      <p className="text-[10px] text-slate-500 font-bold italic uppercase tracking-[0.1em] opacity-40">
                        * auditing "Not Paid" entries only
                      </p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Billing Stats Bar */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
         <div className="glass-card">
            <span className="section-header">Active Vouchers</span>
            <p className="text-2xl font-black text-white uppercase tracking-tighter">
              {invoices.filter(inv => inv.status !== 'Paid').length} Drafts
            </p>
         </div>
         <div className="glass-card">
            <span className="section-header">Floating Capital</span>
            <p className="text-2xl font-black text-white uppercase tracking-tighter">
              {formatCurrency(invoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + (inv.amount || 0), 0))}
            </p>
         </div>
         <div className="bg-brand-500 p-6 rounded-xl shadow-xl shadow-brand-500/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-[#0D1117]/60 uppercase tracking-[0.2em] mb-1 block">Settlement Health</span>
              <p className="text-2xl font-black text-[#0D1117] uppercase tracking-tighter">
                {Math.round((invoices.filter(inv => inv.status === 'Paid').length / (invoices.length || 1)) * 100)}% Rate
              </p>
            </div>
            <div className="w-12 h-12 bg-[#0D1117]/10 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-[#0D1117]" />
            </div>
         </div>
      </section>
    </div>
  );
}
