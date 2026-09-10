import React, { useState } from 'react';
import { 
  Calendar, 
  Edit3,
  Eye, 
  FileText, 
  History, 
  Mail,
  MessageSquare, 
  Phone, 
  Plus, 
  Receipt, 
  Search, 
  Send, 
  User, 
  UserPlus, 
  Users, 
  Wallet 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';

export const CustomerCRM: React.FC = () => {
  const { 
    customers, 
    addCustomer, 
    updateCustomer, 
    receiveCustomerPayment, 
    invoices, 
    setSelectedInvoiceForPrint, 
    storeProfile,
    openEmailModal
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'WithDues' | 'Recent'>('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>('UPI / QR');
  const [showPayModal, setShowPayModal] = useState(false);

  // Form State (New)
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    city: 'New Delhi',
    address: '',
    gstin: ''
  });

  // Form State (Edit)
  const [editFormData, setEditFormData] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobile.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'WithDues') return c.outstandingBalance > 0;
    return true;
  });

  const totalDuesAll = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const totalCustomersCount = customers.length;

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      mobile: '',
      email: '',
      city: 'New Delhi',
      address: '',
      gstin: ''
    });
    setShowAddModal(true);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      alert('Name and Mobile are required');
      return;
    }

    const created = addCustomer({
      ...formData,
      email: formData.email.trim() || undefined
    });
    setSelectedCustomer(created);
    setShowAddModal(false);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditFormData({ ...c });
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !editFormData.name.trim() || !editFormData.mobile.trim()) {
      alert('Customer Name and Mobile are required.');
      return;
    }

    const updated: Customer = {
      ...editFormData,
      name: editFormData.name.trim(),
      mobile: editFormData.mobile.trim(),
      email: editFormData.email?.trim() || undefined,
      city: editFormData.city?.trim() || 'New Delhi',
      address: editFormData.address?.trim()
    };

    updateCustomer(updated);
    setSelectedCustomer(updated);
    setShowEditModal(false);
  };

  const handleOpenReceivePay = (c: Customer) => {
    setSelectedCustomer(c);
    setPayAmount(c.outstandingBalance);
    setShowPayModal(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || payAmount <= 0) return;

    receiveCustomerPayment(selectedCustomer.id, payAmount, payMode);
    setShowPayModal(false);

    // Refresh selected customer state
    const updated = customers.find((c) => c.id === selectedCustomer.id);
    if (updated) {
      setSelectedCustomer({
        ...updated,
        outstandingBalance: Math.max(0, updated.outstandingBalance - payAmount)
      });
    }
  };

  const sendWhatsAppDueReminder = (c: Customer) => {
    const text = `Namaste *${c.name}*,\n` +
      `Gentle reminder from *${storeProfile.name}* regarding your pending optical balance of *₹${c.outstandingBalance}*.\n` +
      `You can clear your payment via UPI: *${storeProfile.upiId}* or visit our store.\n` +
      `Thank you! Helpline: ${storeProfile.phone}`;

    const url = `https://api.whatsapp.com/send?phone=91${c.mobile}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const sendWhatsAppEyeCheckupDue = (c: Customer) => {
    const text = `Namaste *${c.name}*! 👁️\n` +
      `It's been a while since your last vision test at *${storeProfile.name}*.\n` +
      `Regular eye checkups are essential for healthy vision and comfortable screen work.\n` +
      `We invite you for a complimentary eye examination!\n` +
      `📍 Store: ${storeProfile.addressLine1}, ${storeProfile.city}\n` +
      `📞 Helpline: ${storeProfile.phone}`;

    const url = `https://api.whatsapp.com/send?phone=91${c.mobile}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const sendEmailDueReminder = (c: Customer) => {
    const subject = `Statement of Account & Balance Reminder - ${c.name} - ${storeProfile.name}`;
    const body = `Dear ${c.name},\n\n` +
      `We hope you are enjoying clear vision with your spectacles from ${storeProfile.name}.\n\n` +
      `This is a gentle reminder regarding your pending optical account balance:\n\n` +
      `========================================\n` +
      `CUSTOMER NAME: ${c.name}\n` +
      `MOBILE: +91 ${c.mobile}\n` +
      `TOTAL OUTSTANDING BALANCE: ₹${c.outstandingBalance}\n` +
      `========================================\n\n` +
      `${storeProfile.upiId ? `Pay easily via UPI ID: ${storeProfile.upiId}\n\n` : ''}` +
      `STORE ADDRESS: ${storeProfile.addressLine1}, ${storeProfile.city} - ${storeProfile.pincode}\n` +
      `HELPLINE: ${storeProfile.phone}\n` +
      `EMAIL: ${storeProfile.email}\n\n` +
      `If you have already paid recently, please disregard this notice.\n\n` +
      `Warm Regards,\n${storeProfile.name}`;

    openEmailModal({
      recipientEmail: c.email || '',
      recipientName: c.name,
      recipientMobile: c.mobile,
      subject,
      body,
      documentType: 'Payment Due Reminder'
    });
  };

  const sendEmailEyeCheckupDue = (c: Customer) => {
    const subject = `Time for Your Annual Vision Checkup! - ${storeProfile.name}`;
    const body = `Dear ${c.name},\n\n` +
      `It has been some time since your last vision test with us at ${storeProfile.name}.\n\n` +
      `Doctors recommend an annual refraction test to maintain optimal eye comfort, reduce digital screen eye-strain, and verify your lens power.\n\n` +
      `We warmly invite you for a complimentary computerized eye examination:\n\n` +
      `CLINIC: ${storeProfile.name}\n` +
      `ADDRESS: ${storeProfile.addressLine1}, ${storeProfile.city} - ${storeProfile.pincode}\n` +
      `TIMINGS: 10:00 AM - 9:00 PM\n` +
      `PHONE: ${storeProfile.phone}\n\n` +
      `Book your slot or walk in directly anytime!\n\n` +
      `Best Regards,\n${storeProfile.name}`;

    openEmailModal({
      recipientEmail: c.email || '',
      recipientName: c.name,
      recipientMobile: c.mobile,
      subject,
      body,
      documentType: 'Eye Checkup Reminder'
    });
  };

  const sendEmailPromotionalOffer = (c: Customer) => {
    const subject = `Special Privileges & New Frame Collection at ${storeProfile.name}`;
    const body = `Dear ${c.name},\n\n` +
      `Greetings from ${storeProfile.name}!\n\n` +
      `We have just added a new designer collection of:\n` +
      `• Ultra-light Titanium & TR-90 Spectacle Frames\n` +
      `• Premium Blue-Block Anti-Fatigue Computer Glasses\n` +
      `• Polarized & UV400 Sunglasses\n` +
      `• Daily & Monthly Contact Lenses with Hydration Tech\n\n` +
      `As our valued patron, enjoy special seasonal discounts on your next upgrade.\n\n` +
      `STORE: ${storeProfile.name}\n` +
      `ADDRESS: ${storeProfile.addressLine1}, ${storeProfile.city}\n` +
      `HELPLINE: ${storeProfile.phone}\n\n` +
      `Warm Regards,\n${storeProfile.name}`;

    openEmailModal({
      recipientEmail: c.email || '',
      recipientName: c.name,
      recipientMobile: c.mobile,
      subject,
      body,
      documentType: 'Broadcast Announcement'
    });
  };

  // Invoices of selected customer
  const customerInvoices = selectedCustomer
    ? invoices.filter((i) => i.customerId === selectedCustomer.id)
    : [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-200/80 p-4 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              Customer & Patient CRM
            </h1>
            <p className="text-xs text-stone-500">
              Manage patient database, prescription history, and accounts.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-500">Total Patients</span>
          <div className="text-xl font-bold text-stone-900 mt-1">{totalCustomersCount} Patients</div>
        </div>
        <div className="bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-600">Pending Dues</span>
          <div className="text-xl font-bold text-rose-600 mt-1">₹{totalDuesAll.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700">Prescriptions on File</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {customers.reduce((sum, c) => sum + c.prescriptions.length, 0)} Records
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setFilterType('All')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              filterType === 'All' ? 'bg-amber-600 text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            All Patients ({customers.length})
          </button>
          <button
            onClick={() => setFilterType('WithDues')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              filterType === 'WithDues' ? 'bg-rose-600 text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Pending Dues ({customers.filter((c) => c.outstandingBalance > 0).length})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient name, mobile, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-stone-50 border border-stone-300 text-xs rounded-lg pl-8 pr-3 py-1.5 text-stone-900 outline-none focus:border-amber-600"
          />
        </div>
      </div>

      {/* Main Grid: Customer Table & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Customer Table */}
        <div className="lg:col-span-7 bg-white border border-amber-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-100 text-stone-700 uppercase text-[10px] font-bold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Patient Name</th>
                  <th className="py-2.5 px-2">Mobile / City</th>
                  <th className="py-2.5 px-2 text-right">Total Spent</th>
                  <th className="py-2.5 px-2 text-right">Dues</th>
                  <th className="py-2.5 px-2 text-center">Rx</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`hover:bg-amber-50/50 cursor-pointer transition-colors ${
                      selectedCustomer?.id === c.id ? 'bg-amber-50/80 border-l-4 border-amber-600 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-stone-900">{c.name}</div>
                      <div className="text-[10px] text-stone-500">Joined: {c.createdAt}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-stone-800 font-mono text-[11px]">📱 {c.mobile}</div>
                      {c.email && (
                        <div className="text-[10px] text-sky-700 truncate max-w-[150px]" title={c.email}>
                          ✉️ {c.email}
                        </div>
                      )}
                      <div className="text-[10px] text-stone-500">{c.city || 'Local'}</div>
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-stone-800">
                      ₹{c.totalSpent}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {c.outstandingBalance > 0 ? (
                        <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-xs">
                          ₹{c.outstandingBalance}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">₹0</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-stone-100 text-stone-700 font-mono">
                        {c.prescriptions.length}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 rounded cursor-pointer"
                        title="Edit Customer Details & Email"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      {c.outstandingBalance > 0 && (
                        <button
                          onClick={() => handleOpenReceivePay(c)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                        >
                          Collect ₹
                        </button>
                      )}
                      <button
                        onClick={() => sendWhatsAppEyeCheckupDue(c)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 rounded cursor-pointer"
                        title="Send Eye Checkup Reminder via WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => sendEmailEyeCheckupDue(c)}
                        className="p-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-700 rounded cursor-pointer"
                        title="Send Eye Checkup Reminder via Email"
                      >
                        <Mail className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Cols: Selected Customer Detail & History Drawer */}
        <div className="lg:col-span-5 space-y-4">
          {selectedCustomer ? (
            <div className="bg-white border border-amber-200/80 rounded-xl p-4 space-y-4 shadow-xs">
              <div className="flex items-start justify-between border-b border-stone-200 pb-3 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-stone-900">{selectedCustomer.name}</h3>
                    <button
                      onClick={() => handleOpenEdit(selectedCustomer)}
                      className="p-1 hover:bg-stone-100 text-stone-500 hover:text-stone-800 rounded text-xs transition-colors cursor-pointer"
                      title="Edit Customer Details & Email"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">📱 +91 {selectedCustomer.mobile} • {selectedCustomer.city}</p>
                  <p className="text-xs text-sky-700 font-medium mt-0.5 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-sky-600" />
                    {selectedCustomer.email ? (
                      <span>{selectedCustomer.email}</span>
                    ) : (
                      <span className="text-stone-400 italic">No email saved (<button onClick={() => handleOpenEdit(selectedCustomer)} className="text-amber-700 hover:underline">Add Email</button>)</span>
                    )}
                  </p>
                  {selectedCustomer.address && (
                    <p className="text-[11px] text-stone-500 mt-0.5">📍 {selectedCustomer.address}</p>
                  )}
                </div>
                {selectedCustomer.outstandingBalance > 0 && (
                  <button
                    onClick={() => handleOpenReceivePay(selectedCustomer)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                  >
                    Receive ₹{selectedCustomer.outstandingBalance}
                  </button>
                )}
              </div>

              {/* Quick Communication Triggers (WhatsApp & Email) */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-stone-600 uppercase flex items-center justify-between">
                  <span>Quick Customer Dispatch</span>
                  <span className="text-stone-400 font-normal">WhatsApp & Email</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedCustomer.outstandingBalance > 0 ? (
                    <>
                      <button
                        id="btn-whatsapp-due-reminder"
                        onClick={() => sendWhatsAppDueReminder(selectedCustomer)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Send Due Reminder via WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-rose-600" /> 
                        <span>WhatsApp Due</span>
                      </button>
                      <button
                        id="btn-email-due-reminder"
                        onClick={() => sendEmailDueReminder(selectedCustomer)}
                        className="p-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Send Due Reminder via Email"
                      >
                        <Mail className="w-3.5 h-3.5 text-sky-600" /> 
                        <span>Email Due</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        id="btn-whatsapp-checkup-reminder"
                        onClick={() => sendWhatsAppEyeCheckupDue(selectedCustomer)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Send Vision Checkup Invite via WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> 
                        <span>WhatsApp Rx</span>
                      </button>
                      <button
                        id="btn-email-checkup-reminder"
                        onClick={() => sendEmailEyeCheckupDue(selectedCustomer)}
                        className="p-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Send Vision Checkup Invite via Email"
                      >
                        <Mail className="w-3.5 h-3.5 text-sky-600" /> 
                        <span>Email Checkup</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <button
                    onClick={() => {
                      const text = `Greetings from *${storeProfile.name}*! Visit us for the latest collection of spectacle frames & sunglasses.`;
                      window.open(`https://api.whatsapp.com/send?phone=91${selectedCustomer.mobile}&text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-300 text-stone-800 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-600" /> 
                    <span>WhatsApp Offer</span>
                  </button>
                  <button
                    onClick={() => sendEmailPromotionalOffer(selectedCustomer)}
                    className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-300 text-stone-800 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-sky-600" /> 
                    <span>Email Offer</span>
                  </button>
                </div>
              </div>

              {/* Prescriptions on Record */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-700 uppercase flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-700" />
                  Prescriptions ({selectedCustomer.prescriptions.length})
                </span>

                {selectedCustomer.prescriptions.length === 0 ? (
                  <div className="p-3 text-center text-stone-400 text-xs bg-stone-50 rounded-lg border border-stone-200">
                    No prescription on file.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedCustomer.prescriptions.map((rx) => (
                      <div key={rx.id} className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-stone-900">
                          <span>Exam: {rx.date}</span>
                          <span className="text-amber-800">{rx.doctorName}</span>
                        </div>
                        <div className="text-[11px] text-stone-600 font-mono">
                          OD: SPH {rx.rightEye.sph} | CYL {rx.rightEye.cyl} | AXIS {rx.rightEye.axis || '0'}
                        </div>
                        <div className="text-[11px] text-stone-600 font-mono">
                          OS: SPH {rx.leftEye.sph} | CYL {rx.leftEye.cyl} | AXIS {rx.leftEye.axis || '0'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Purchase History Invoices */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-700 uppercase flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  Invoices ({customerInvoices.length})
                </span>

                {customerInvoices.length === 0 ? (
                  <div className="p-3 text-center text-stone-400 text-xs bg-stone-50 rounded-lg border border-stone-200">
                    No past purchases.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {customerInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => setSelectedInvoiceForPrint(inv)}
                        className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg flex items-center justify-between cursor-pointer text-xs"
                      >
                        <div>
                          <div className="font-bold text-stone-900">{inv.invoiceNo}</div>
                          <div className="text-[10px] text-stone-500">{inv.date} • {inv.orderStatus}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-stone-900">₹{inv.netPayable}</div>
                          <span className="text-[10px] text-amber-800 underline">View Bill</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-amber-200/80 rounded-xl p-12 text-center text-stone-400 text-xs shadow-xs">
              Select any customer on the left to view profile and history.
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-200 rounded-xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-600" />
                Register New Customer
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-500 hover:text-stone-800 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amit Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">Mobile Number (10 Digits) *</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 mb-1">City / Area</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">
                    Email Address <span className="text-[10px] text-sky-600">(for Invoices & Rx)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="House / Street / Locality"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Profile Modal */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-200 rounded-xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600" />
                Edit Customer Profile & Email
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-stone-500 hover:text-stone-800 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">Mobile Number (10 Digits) *</label>
                <input
                  type="tel"
                  required
                  value={editFormData.mobile}
                  onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">
                  Email Address <span className="text-[10px] text-sky-600 font-medium">(Used for sending Tax Invoices, Rx & Due Reminders)</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full pl-8 pr-2.5 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 mb-1">City / Area</label>
                  <input
                    type="text"
                    value={editFormData.city || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">Residential Address</label>
                  <input
                    type="text"
                    placeholder="Locality / Landmark"
                    value={editFormData.address || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Update Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Khata Payment Modal */}
      {showPayModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-200 rounded-xl p-5 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h4 className="text-xs font-bold text-stone-900">Receive Due Payment</h4>
              <button onClick={() => setShowPayModal(false)} className="text-stone-500 hover:text-stone-800 cursor-pointer">✕</button>
            </div>

            <div className="text-xs bg-stone-50 p-2.5 rounded-lg border border-stone-200 space-y-0.5">
              <div className="font-bold text-stone-900">{selectedCustomer.name}</div>
              <div className="text-stone-500">📱 {selectedCustomer.mobile}</div>
              <div className="text-rose-600 font-bold mt-1">Outstanding Balance: ₹{selectedCustomer.outstandingBalance}</div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 mb-1">Amount Receiving (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedCustomer.outstandingBalance}
                  placeholder="0"
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-center text-lg font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">Payment Method</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                >
                  <option value="UPI / QR">UPI / QR</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
