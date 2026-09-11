import { t } from '../lib/i18n';
import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  X, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  User, 
  FileText, 
  Sparkles,
  Smartphone,
  Globe
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ManualEmailModal: React.FC = () => {
  const { emailModalData, closeEmailModal, storeProfile } = useApp();

  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeClientTab, setActiveClientTab] = useState<'Default' | 'Gmail' | 'Outlook'>('Default');

  useEffect(() => {
    if (emailModalData) {
      setToEmail(emailModalData.recipientEmail || '');
      setSubject(emailModalData.subject || `Message from ${storeProfile.name}`);
      setBody(emailModalData.body || '');
      setCopied(false);
    }
  }, [emailModalData, storeProfile.name]);

  if (!emailModalData) return null;

  const handleCopyText = async () => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendViaMailto = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(toEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_self');
  };

  const handleSendViaGmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail.trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendViaOutlook = () => {
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(toEmail.trim())}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(outlookUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendViaWhatsApp = () => {
    if (!emailModalData.recipientMobile) {
      alert('Mobile number not available for this recipient.');
      return;
    }
    const cleanMobile = emailModalData.recipientMobile.replace(/\D/g, '');
    const waUrl = `https://api.whatsapp.com/send?phone=91${cleanMobile}&text=${encodeURIComponent(body)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div 
      id="manual-email-modal-overlay" 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        id="manual-email-modal-card" 
        className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold">
                  {t("Send Email (Manual Mailer) ")}</h2>
                {emailModalData.documentType && (
                  <span className="text-[10px] bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                    {emailModalData.documentType}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                {t("Compose, review, or launch in your preferred email client (Gmail, Outlook, Mail App) ")}</p>
            </div>
          </div>

          <button
            id="btn-close-email-modal"
            onClick={closeEmailModal}
            className="p-1.5 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Context Bar */}
        {emailModalData.recipientName && (
          <div className="bg-amber-50/80 border-b border-amber-200/80 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center space-x-2 text-stone-800">
              <User className="w-3.5 h-3.5 text-amber-700" />
              <span className="font-semibold">{t("Recipient:")}</span>
              <span className="font-bold text-amber-900">{emailModalData.recipientName}</span>
              {emailModalData.recipientMobile && (
                <span className="text-stone-500 flex items-center gap-1">
                  (📱 +91 {emailModalData.recipientMobile})
                </span>
              )}
            </div>

            {emailModalData.recipientMobile && (
              <button
                id="btn-switch-to-whatsapp"
                onClick={handleSendViaWhatsApp}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-100/80 hover:bg-emerald-200/80 px-2 py-1 rounded transition-colors cursor-pointer"
                title={t("Send same content via WhatsApp")}
              >
                <MessageSquare className="w-3 h-3" />
                <span>{t("Switch to WhatsApp")}</span>
              </button>
            )}
          </div>
        )}

        {/* Body Fields */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
          {/* Recipient Email */}
          <div>
            <label className="block text-stone-700 font-semibold mb-1 flex items-center justify-between">
              <span>{t("Customer / Recipient Email Address *")}</span>
              {!toEmail && (
                <span className="text-rose-500 text-[11px] font-normal">
                  {t("(Enter customer's email ID below) ")}</span>
              )}
            </label>
            <div className="relative">
              <input
                id="input-recipient-email"
                type="email"
                required
                placeholder={t("e.g. customer@gmail.com, jiya@example.com")}
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-stone-900 font-medium focus:border-amber-600 focus:bg-white outline-none"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-stone-700 font-semibold mb-1">
              {t("Email Subject Line * ")}</label>
            <input
              id="input-email-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 font-medium focus:border-amber-600 focus:bg-white outline-none"
            />
          </div>

          {/* Message Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-stone-700 font-semibold">
                {t("Message Body (Formatted Content) ")}</label>
              <button
                id="btn-copy-email-body"
                type="button"
                onClick={handleCopyText}
                className="text-stone-600 hover:text-amber-800 flex items-center gap-1 text-[11px] font-semibold cursor-pointer bg-stone-100 hover:bg-amber-100 px-2 py-0.5 rounded transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">{t("Copied!")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t("Copy Content")}</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              id="input-email-body"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg p-3 text-stone-900 font-mono text-[11px] leading-relaxed focus:border-amber-600 focus:bg-white outline-none"
            />
          </div>

          {/* Sender Signature notice */}
          <div className="p-2.5 bg-stone-100 rounded-lg border border-stone-200 text-stone-600 text-[11px] flex items-center justify-between">
            <span>
              {t("🏢 Sending from: ")}<strong className="text-stone-800">{storeProfile.name}</strong> ({storeProfile.email})
            </span>
            <span className="text-stone-500">{t("Phone: ")}{storeProfile.phone}</span>
          </div>
        </div>

        {/* Footer Quick Launch Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-stone-500 hidden sm:block">
            {t("Choose your email client to dispatch immediately: ")}</div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Launch Gmail Web */}
            <button
              id="btn-send-via-gmail"
              type="button"
              onClick={handleSendViaGmail}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title={t("Compose directly in Gmail web browser")}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t("Gmail Web")}</span>
            </button>

            {/* Launch Outlook Web */}
            <button
              id="btn-send-via-outlook"
              type="button"
              onClick={handleSendViaOutlook}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title={t("Compose directly in Outlook / Hotmail web")}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{t("Outlook")}</span>
            </button>

            {/* Default Mail Client (mailto:) */}
            <button
              id="btn-send-via-mailto"
              type="button"
              onClick={handleSendViaMailto}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title={t("Open default email application on your device")}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t("Send via Default Mail App")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
