import { t } from '../lib/i18n';
import React, { useState } from 'react';
import { 
  Send, 
  MessageSquare, 
  Mail,
  Calendar, 
  Bell, 
  CheckCircle, 
  Clock, 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Filter, 
  Sparkles,
  Smartphone,
  PhoneCall,
  Store,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FollowUpReminder, WhatsAppTemplate } from '../types';

export const FollowUpAndBroadcast: React.FC = () => {
  const {
    followUps,
    updateFollowUpStatus,
    deleteFollowUp,
    sendFollowUpWhatsApp,
    whatsappTemplates,
    addWhatsAppTemplate,
    updateWhatsAppTemplate,
    deleteWhatsAppTemplate,
    formatWhatsAppMessage,
    customers,
    shops,
    selectedShopFilter,
    currentUser,
    storeProfile,
    openEmailModal
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'followups' | 'broadcast' | 'templates'>('followups');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('Pending');

  // Push Notification state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [notificationStatusMsg, setNotificationStatusMsg] = useState<string | null>(null);

  // Template Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState<WhatsAppTemplate['category']>('Eye Checkup Reminder');
  const [templateBody, setTemplateBody] = useState('');

  // Broadcast campaign state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    whatsappTemplates[0]?.id || ''
  );
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'due_checkup' | 'has_balance'>('due_checkup');
  const [customBroadcastMessage, setCustomBroadcastMessage] = useState('');

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationStatusMsg('Browser notifications are not supported on this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setNotificationStatusMsg('Push notifications enabled! You will be alerted for follow-ups.');
        new Notification(`${storeProfile.name || 'Jiya Opticals'} Notifications Active`, {
          body: 'You will receive reminders when client eye tests or orders are due!',
          icon: '/favicon.ico'
        });
      } else {
        setNotificationStatusMsg('Notification permission was denied or dismissed.');
      }
    } catch {
      setNotificationStatusMsg('Error requesting push permission.');
    }
  };

  // Filtered Follow-ups
  const filteredFollowUps = followUps.filter((fol) => {
    if (selectedShopFilter !== 'all' && fol.shopId !== selectedShopFilter) {
      return false;
    }
    if (filterType !== 'All' && fol.type !== filterType) {
      return false;
    }
    if (filterStatus !== 'All' && fol.status !== filterStatus) {
      return false;
    }
    return true;
  });

  // Template handling
  const handleOpenTemplateModal = (tmpl?: WhatsAppTemplate) => {
    if (tmpl) {
      setEditingTemplate(tmpl);
      setTemplateName(tmpl.name);
      setTemplateCategory(tmpl.category);
      setTemplateBody(tmpl.body);
    } else {
      setEditingTemplate(null);
      setTemplateName('');
      setTemplateCategory('Eye Checkup Reminder');
      setTemplateBody('Namaste {name}, reminder from {store_name} ({shop_name}) for your checkup on {due_date}. Call: {phone}');
    }
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateBody.trim()) {
      alert('Please fill out template title and message text.');
      return;
    }

    if (editingTemplate) {
      updateWhatsAppTemplate({
        ...editingTemplate,
        name: templateName,
        category: templateCategory,
        body: templateBody
      });
    } else {
      addWhatsAppTemplate({
        name: templateName,
        category: templateCategory,
        body: templateBody,
        isDefault: false
      });
    }
    setShowTemplateModal(false);
  };

  // Broadcast Targets
  const targetCustomers = customers.filter((c) => {
    if (selectedShopFilter !== 'all' && c.shopId && c.shopId !== selectedShopFilter) {
      return false;
    }
    if (broadcastTarget === 'due_checkup') {
      return true; // all customers with follow-up or past visit
    }
    if (broadcastTarget === 'has_balance') {
      return c.outstandingBalance > 0;
    }
    return true;
  });

  const selectedTemplate = whatsappTemplates.find((t) => t.id === selectedTemplateId) || whatsappTemplates[0];

  const handleSendSingleBroadcast = (c: (typeof targetCustomers)[0]) => {
    const formatted = formatWhatsAppMessage(selectedTemplate, {
      name: c.name,
      amount: c.outstandingBalance > 0 ? c.outstandingBalance : undefined,
      dueDate: c.nextFollowUpDate,
      shopId: c.shopId
    });
    const cleanPhone = c.mobile.replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(formatted)}`, '_blank');
  };

  const handleSendSingleBroadcastEmail = (c: (typeof targetCustomers)[0]) => {
    const formatted = formatWhatsAppMessage(selectedTemplate, {
      name: c.name,
      amount: c.outstandingBalance > 0 ? c.outstandingBalance : undefined,
      dueDate: c.nextFollowUpDate,
      shopId: c.shopId
    });

    openEmailModal({
      recipientEmail: c.email || '',
      recipientName: c.name,
      recipientMobile: c.mobile,
      subject: `${selectedTemplate?.category || 'Announcement'} - ${storeProfile.name}`,
      body: formatted,
      documentType: 'Broadcast Email'
    });
  };

  const sendFollowUpEmail = (fol: FollowUpReminder) => {
    const cust = customers.find((c) => c.mobile === fol.customerMobile || c.id === fol.customerId);
    const shopObj = shops.find((s) => s.id === fol.shopId) || shops[0];
    const shopName = shopObj?.name || storeProfile.name;
    const shopAddress = shopObj?.address || `${storeProfile.addressLine1}, ${storeProfile.city}`;
    const shopPhone = shopObj?.phone || storeProfile.phone;

    const subject = `${fol.type} - ${shopName}`;
    const body = `Dear ${fol.customerName},\n\n` +
      `Greetings from ${shopName}!\n\n` +
      `This is regarding your scheduled follow-up: ${fol.type}.\n\n` +
      `========================================\n` +
      `PATIENT / CLIENT: ${fol.customerName}\n` +
      `CONTACT: +91 ${fol.customerMobile}\n` +
      `FOLLOW-UP REASON: ${fol.type}\n` +
      `DUE DATE: ${fol.dueDate}\n` +
      `${fol.notes ? `NOTES: ${fol.notes}\n` : ''}` +
      `========================================\n\n` +
      `Regular vision care is essential for comfortable sight, preventing headaches and maintaining eye health.\n\n` +
      `STORE LOCATION: ${shopAddress}\n` +
      `STORE TIMINGS: 10:00 AM - 9:00 PM\n` +
      `HELPLINE / APPOINTMENTS: ${shopPhone}\n\n` +
      `We welcome you to visit at your earliest convenience.\n\n` +
      `Warm Regards,\n${shopName}`;

    openEmailModal({
      recipientEmail: cust?.email || '',
      recipientName: fol.customerName,
      recipientMobile: fol.customerMobile,
      subject,
      body,
      documentType: 'Follow-up Reminder'
    });
  };

  return (
    <div id="followup-broadcast-container" className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header & Push Alert */}
      <div className="bg-white border border-stone-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              {t("Follow-ups & WhatsApp Broadcast ")}<span className="text-[11px] bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                {t("6M / 1Y Reminders ")}</span>
            </h1>
            <p className="text-xs text-stone-500">
              {t("Vision checkup reminders & delivery notifications ")}</p>
          </div>
        </div>

        <button
          id="btn-enable-push-notifications"
          onClick={requestNotificationPermission}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer ${
            notificationPermission === 'granted'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-stone-900 hover:bg-stone-800 text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>
            {notificationPermission === 'granted' ? t("Push Alerts Active") : t("Enable Push Alerts")}
          </span>
        </button>
      </div>

      {notificationStatusMsg && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg flex items-center justify-between">
          <span>{notificationStatusMsg}</span>
          <button onClick={() => setNotificationStatusMsg(null)} className="font-bold underline text-xs cursor-pointer">{t("Dismiss")}</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-200 space-x-4">
        <button
          id="subtab-followups"
          onClick={() => setActiveSubTab('followups')}
          className={`pb-2.5 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'followups'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t("Follow-ups")}</span>
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
            {followUps.filter((f) => f.status === 'Pending').length}
          </span>
        </button>

        <button
          id="subtab-broadcast"
          onClick={() => setActiveSubTab('broadcast')}
          className={`pb-2.5 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'broadcast'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>{t("Broadcast")}</span>
        </button>

        <button
          id="subtab-templates"
          onClick={() => setActiveSubTab('templates')}
          className={`pb-2.5 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'templates'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t("Templates (")}{whatsappTemplates.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: Follow-ups List */}
      {activeSubTab === 'followups' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-stone-500 flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5" />
                <span>{t("Filter:")}</span>
              </span>

              {['All', '6-Month Vision Review', 'Annual Eye Checkup', 'Spectacle Delivery', 'Balance Payment'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    filterType === t
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <select
                id="select-followup-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-stone-100 border border-stone-200 rounded-lg text-xs font-medium text-stone-700"
              >
                <option value="All">{t("All Statuses")}</option>
                <option value="Pending">{t("Pending Only")}</option>
                <option value="Sent">{t("Sent / Contacted")}</option>
                <option value="Completed">{t("Completed")}</option>
              </select>
            </div>
          </div>

          {/* Follow-up Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFollowUps.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-stone-200">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <h4 className="font-bold text-stone-800 text-sm">{t("No Pending Follow-ups")}</h4>
                <p className="text-xs text-stone-500 mt-1">{t("All follow-ups for this branch are up to date!")}</p>
              </div>
            ) : (
              filteredFollowUps.map((fol) => {
                const shopObj = shops.find((s) => s.id === fol.shopId);
                const isOverdue = new Date(fol.dueDate) < new Date(new Date().toDateString());
                const isToday = fol.dueDate === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={fol.id}
                    id={`followup-card-${fol.id}`}
                    className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all ${
                      fol.status === 'Pending'
                        ? isOverdue
                          ? 'border-red-300 bg-red-50/20'
                          : isToday
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-stone-200'
                        : 'border-stone-200 opacity-75'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-stone-900">{fol.customerName}</span>
                            {isToday && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                                {t("Due Today ")}</span>
                            )}
                            {isOverdue && fol.status === 'Pending' && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                                {t("Overdue ")}</span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 font-mono">📞 {fol.customerMobile}</p>
                        </div>

                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                          fol.status === 'Sent'
                            ? 'bg-blue-100 text-blue-800'
                            : fol.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {fol.status}
                        </span>
                      </div>

                      <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-700">{fol.type}</span>
                          <span className="font-mono text-stone-500">📅 {fol.dueDate}</span>
                        </div>
                        {fol.notes && (
                          <p className="text-xs text-stone-500 italic line-clamp-2">
                            {t("&ldquo;")}{fol.notes}{t("&rdquo; ")}</p>
                        )}
                        {shopObj && (
                          <div className="text-[11px] text-stone-400 flex items-center space-x-1 pt-1">
                            <Store className="w-3 h-3" />
                            <span>{shopObj.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-stone-100 flex flex-col gap-1.5 mt-3">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          id={`btn-send-wa-${fol.id}`}
                          onClick={() => sendFollowUpWhatsApp(fol)}
                          className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1 transition-colors shadow-xs"
                          title={t("Send WhatsApp follow-up")}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{t("WhatsApp")}</span>
                        </button>

                        <button
                          id={`btn-send-email-${fol.id}`}
                          onClick={() => sendFollowUpEmail(fol)}
                          className="py-1.5 px-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1 transition-colors shadow-xs"
                          title={t("Send Email follow-up")}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>{t("Email")}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-end gap-1.5">
                        {fol.status === 'Pending' && (
                          <button
                            id={`btn-complete-fol-${fol.id}`}
                            onClick={() => updateFollowUpStatus(fol.id, 'Completed')}
                            title={t("Mark as Completed")}
                            className="flex-1 py-1 px-2 bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-800 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t("Mark Completed")}</span>
                          </button>
                        )}

                        <button
                          id={`btn-del-fol-${fol.id}`}
                          onClick={() => {
                            if (confirm(`Remove follow-up for ${fol.customerName}?`)) {
                              deleteFollowUp(fol.id);
                            }
                          }}
                          title={t("Delete")}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: WhatsApp Broadcast */}
      {activeSubTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Broadcast Config */}
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
              <Send className="w-4 h-4 text-amber-600" />
              <span>{t("Broadcast Campaign")}</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t("Select WhatsApp Template ")}</label>
              <select
                id="select-broadcast-template"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-amber-500"
              >
                {whatsappTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t("Target Audience Group ")}</label>
              <select
                id="select-broadcast-target"
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value as 'all' | 'due_checkup' | 'has_balance')}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-amber-500"
              >
                <option value="due_checkup">{t("👓 All Clients Due For Vision Check (")}{customers.length})</option>
                <option value="has_balance">{t("💰 Clients With Balance Due (")}{customers.filter((c) => c.outstandingBalance > 0).length})</option>
                <option value="all">{t("👥 All Registered Clients in Branch (")}{targetCustomers.length})</option>
              </select>
            </div>

            {/* Template Live Preview */}
            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t("Message Preview")}</span>
              </div>
              <p className="text-xs text-stone-700 font-sans leading-relaxed whitespace-pre-wrap">
                {selectedTemplate
                  ? formatWhatsAppMessage(selectedTemplate, {
                      name: 'Rahul Sharma',
                      amount: 1450,
                      dueDate: '2026-09-01'
                    })
                  : t("Select a template")}
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">{t("📱 WhatsApp Direct Protocol")}</p>
              <p className="text-[11px] text-amber-800 leading-snug">
                {t("Clicking send for each client opens WhatsApp Web / Mobile app with personalized tags ready to send with 1 tap. ")}</p>
            </div>
          </div>

          {/* Audience List */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  {t("Campaign Recipients (")}{targetCustomers.length})
                </h3>
                <p className="text-xs text-stone-500">
                  {t("Showing clients matching current shop and criteria ")}</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {targetCustomers.map((c) => (
                <div
                  key={c.id}
                  id={`broadcast-recipient-${c.id}`}
                  className="p-3 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50/50 flex items-center justify-between transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-stone-900">{c.name}</div>
                    <div className="text-[11px] text-stone-500 font-mono flex items-center space-x-2">
                      <span>📞 {c.mobile}</span>
                      {c.outstandingBalance > 0 && (
                        <span className="text-red-600 font-semibold font-sans">
                          {t("Due: ₹")}{c.outstandingBalance}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id={`btn-send-broadcast-wa-${c.id}`}
                      onClick={() => handleSendSingleBroadcast(c)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-xs transition-colors"
                      title={t("Send WhatsApp message")}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{t("WhatsApp")}</span>
                    </button>

                    <button
                      id={`btn-send-broadcast-email-${c.id}`}
                      onClick={() => handleSendSingleBroadcastEmail(c)}
                      className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-xs transition-colors"
                      title={t("Send Email message")}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{t("Email")}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Templates Manager */}
      {activeSubTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">{t("WhatsApp Message Templates")}</h3>
              <p className="text-xs text-stone-500">
                {t("Variables: ")}{t("{name}")}, {t("{store_name}")}, {t("{shop_name}")}, {t("{invoice_no}")}, {t("{amount}")}, {t("{due_date}")}, {t("{phone}")}
              </p>
            </div>
            <button
              id="btn-create-wa-template"
              onClick={() => handleOpenTemplateModal()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t("+ New Template")}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {whatsappTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                id={`template-card-${tmpl.id}`}
                className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-stone-900 text-sm">{tmpl.name}</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                      {tmpl.category}
                    </span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-700 leading-relaxed font-sans whitespace-pre-wrap">
                    {tmpl.body}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => handleOpenTemplateModal(tmpl)}
                    className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-stone-100 rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t("Edit")}</span>
                  </button>
                  {!tmpl.isDefault && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete template "${tmpl.name}"?`)) {
                          deleteWhatsAppTemplate(tmpl.id);
                        }
                      }}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Edit / Create Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#ffffff] text-stone-900 w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm">
                {editingTemplate ? t("Edit WhatsApp Template") : t("Create WhatsApp Template")}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t("Template Title ")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("e.g. 6-Month Refraction Reminder")}
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t("Category ")}</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value as WhatsAppTemplate['category'])}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="Eye Checkup Reminder">{t("Eye Checkup Reminder")}</option>
                  <option value="Order Ready">{t("Order Ready")}</option>
                  <option value="Invoice Share">{t("Invoice Share")}</option>
                  <option value="Payment Due Reminder">{t("Payment Due Reminder")}</option>
                  <option value="Promotional / Festive">{t("Promotional / Festive")}</option>
                  <option value="Custom">{t("Custom")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t("Message Body ")}</label>
                <textarea
                  rows={4}
                  required
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-sans"
                  placeholder={t("Type message with {name}, {store_name}, {due_date}, {phone}...")}
                />
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                <strong>{t("Supported Dynamic Placeholders:")}</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['{name}', '{store_name}', '{shop_name}', '{invoice_no}', '{amount}', '{due_date}', '{delivery_date}', '{phone}'].map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 bg-amber-200/80 rounded font-mono text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 font-semibold rounded-xl text-xs"
                >
                  {t("Cancel ")}</button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs"
                >
                  {t("Save Template ")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
