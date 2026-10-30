import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Glasses, Languages, Lightbulb, Package, Pause, Play, Receipt, Users, Volume2, Wallet, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Lang = 'EN' | 'HI';
type Text = { en: string; hi: string };
type Icon = React.ComponentType<{ className?: string }>;
type Body =
  | { kind: 'stats'; items: { value: Text; label: Text }[] }
  | { kind: 'chips'; items: { title: Text; note: Text }[] }
  | { kind: 'steps'; items: { title: Text; note: Text }[] };
interface Slide { icon: Icon; grad: string; eyebrow: Text; title: Text; sub: Text; tags: Text[]; body: Body; voice: Text; adminOnly?: boolean }

const SLIDES: Slide[] = [
  {
    icon: Glasses, grad: 'from-amber-500 via-amber-600 to-orange-600',
    eyebrow: { en: 'Welcome', hi: 'स्वागत है' },
    title: { en: 'Jiya Opticals ERP', hi: 'जिया ऑप्टिकल्स ERP' },
    sub: { en: 'Billing, stock, clients and day book for your optical shop, in one place.', hi: 'आपकी ऑप्टिकल दुकान का बिलिंग, स्टॉक, ग्राहक और बहीखाता, एक ही जगह।' },
    tags: [{ en: 'Phone + computer', hi: 'फ़ोन + कंप्यूटर' }, { en: 'Hindi / English', hi: 'हिन्दी / English' }],
    body: {
      kind: 'stats', items: [
        { value: { en: 'Bill of Supply', hi: 'बिल ऑफ़ सप्लाई' }, label: { en: 'Composition scheme, GST 0 on bills', hi: 'कंपोज़िशन स्कीम, बिल पर GST 0' } },
        { value: { en: 'Every piece', hi: 'हर पीस' }, label: { en: 'gets its own barcode tag', hi: 'का अपना बारकोड टैग' } },
        { value: { en: '5 roles', hi: '5 भूमिकाएँ' }, label: { en: 'Admin to Lab Technician', hi: 'एडमिन से लैब टेक्नीशियन तक' } },
        { value: { en: 'Many shops', hi: 'कई दुकानें' }, label: { en: 'stock and sales kept shop-wise', hi: 'स्टॉक और बिक्री दुकान के हिसाब से' } },
      ],
    },
    voice: {
      en: 'Welcome to Jiya Opticals. This app handles your billing, stock, clients and day book in one place. Swipe or press Next for a quick tour.',
      hi: 'जिया ऑप्टिकल्स में आपका स्वागत है। इस ऐप में आपका बिलिंग, स्टॉक, ग्राहक और बहीखाता एक ही जगह है। छोटा सा टूर देखने के लिए आगे बढ़ें।',
    },
  },
  {
    icon: Receipt, grad: 'from-orange-500 via-orange-600 to-rose-600',
    eyebrow: { en: 'Step 1', hi: 'स्टेप 1' },
    title: { en: 'Make a bill', hi: 'बिल बनाएँ' },
    sub: { en: 'POS Billing: scan or search the frame, take the payment, print or share.', hi: 'POS बिलिंग: फ़्रेम स्कैन या सर्च करें, पैसे लें, प्रिंट या शेयर करें।' },
    tags: [{ en: 'POS Billing', hi: 'POS बिलिंग' }, { en: 'UPI QR', hi: 'UPI QR' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Choose the client', hi: 'ग्राहक चुनें' }, note: { en: 'Pick an existing client or add a new one on the spot.', hi: 'पुराना ग्राहक चुनें या वहीं नया जोड़ें।' } },
        { title: { en: 'Add items', hi: 'आइटम जोड़ें' }, note: { en: 'Scan the tag with a scanner or the camera, or search by brand and model.', hi: 'टैग को स्कैनर या कैमरे से स्कैन करें, या ब्रांड/मॉडल से खोजें।' } },
        { title: { en: 'Take the payment', hi: 'पेमेंट लें' }, note: { en: 'Cash, UPI or part payment. Any balance stays as the client\'s due.', hi: 'कैश, UPI या कुछ रक़म। बाकी रक़म ग्राहक के उधार में रहती है।' } },
        { title: { en: 'Save and share', hi: 'सेव करके भेजें' }, note: { en: 'Print the bill, or send it by WhatsApp or email.', hi: 'बिल प्रिंट करें, या WhatsApp/ईमेल से भेजें।' } },
      ],
    },
    voice: {
      en: 'To make a bill, open POS Billing. Choose the client, scan or search the frame, take the payment, then print the bill or send it on WhatsApp.',
      hi: 'बिल बनाने के लिए POS बिलिंग खोलें। ग्राहक चुनें, फ़्रेम स्कैन करें या खोजें, पेमेंट लें, फिर बिल प्रिंट करें या व्हाट्सऐप पर भेजें।',
    },
  },
  {
    icon: Package, grad: 'from-emerald-500 via-emerald-600 to-teal-700',
    eyebrow: { en: 'Step 2', hi: 'स्टेप 2' },
    title: { en: 'Stock and tags', hi: 'स्टॉक और टैग' },
    sub: { en: 'Add a material once. Stock, MRP and tags follow.', hi: 'मटेरियल एक बार जोड़ें। स्टॉक, MRP और टैग अपने आप जुड़ते हैं।' },
    tags: [{ en: 'Inventory', hi: 'इन्वेंटरी' }, { en: 'Purchases', hi: 'खरीद' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Add the material', hi: 'मटेरियल जोड़ें' }, note: { en: 'Brand, model, colour and MRP. If no sale price is set, the MRP is used on the bill.', hi: 'ब्रांड, मॉडल, रंग और MRP। बिक्री मूल्य न हो तो बिल में MRP लगता है।' } },
        { title: { en: 'Record the purchase', hi: 'खरीद दर्ज करें' }, note: { en: 'Enter the supplier bill so the stock goes up.', hi: 'सप्लायर का बिल भरें, स्टॉक बढ़ जाएगा।' } },
        { title: { en: 'Print the tags', hi: 'टैग प्रिंट करें' }, note: { en: 'Each piece gets its own code, like FR00001-001. Choose how many to print.', hi: 'हर पीस का अपना कोड, जैसे FR00001-001। कितने छापने हैं, चुनें।' } },
        { title: { en: 'Watch low stock', hi: 'कम स्टॉक देखें' }, note: { en: 'Items at or below the alert level show a red count.', hi: 'अलर्ट लेवल पर या उससे कम आइटम लाल गिनती में दिखते हैं।' } },
      ],
    },
    voice: {
      en: 'In Inventory, add a material once with its brand, model and M R P. Record purchases to raise stock, then print a barcode tag for every piece.',
      hi: 'इन्वेंटरी में मटेरियल एक बार जोड़ें, ब्रांड, मॉडल और एम आर पी के साथ। खरीद दर्ज करने से स्टॉक बढ़ता है, फिर हर पीस का बारकोड टैग प्रिंट करें।',
    },
  },
  {
    icon: Eye, grad: 'from-sky-500 via-sky-600 to-indigo-600',
    eyebrow: { en: 'Step 3', hi: 'स्टेप 3' },
    title: { en: 'Clients and eye tests', hi: 'ग्राहक और आँख की जाँच' },
    sub: { en: 'Keep every client\'s power, bills and dues together.', hi: 'हर ग्राहक का नंबर, बिल और उधार एक साथ।' },
    tags: [{ en: 'Clients', hi: 'ग्राहक' }, { en: 'Follow-ups', hi: 'फॉलो-अप' }],
    body: {
      kind: 'chips', items: [
        { title: { en: 'Eye Testing', hi: 'नेत्र परीक्षण' }, note: { en: 'Write the power once; it is saved with the client.', hi: 'नंबर एक बार लिखें, ग्राहक के साथ सेव रहता है।' } },
        { title: { en: 'Clients', hi: 'ग्राहक' }, note: { en: 'See every bill and the amount still due.', hi: 'सारे बिल और बाकी रक़म देखें।' } },
        { title: { en: 'Follow-ups', hi: 'फॉलो-अप' }, note: { en: 'Reminders for delivery, dues and re-checks.', hi: 'डिलीवरी, उधार और दोबारा जाँच के रिमाइंडर।' } },
        { title: { en: 'Delete a client', hi: 'ग्राहक हटाना' }, note: { en: 'You can keep their bills, so your sales stay correct.', hi: 'उनके बिल रख सकते हैं, ताकि बिक्री सही रहे।' } },
      ],
    },
    voice: {
      en: 'Eye Testing saves the power with the client. In Clients you see every bill and the amount still due, and Follow-ups reminds you about deliveries and dues.',
      hi: 'नेत्र परीक्षण में लिखा नंबर ग्राहक के साथ सेव रहता है। ग्राहक में हर बिल और बाकी रक़म दिखती है, और फॉलो-अप डिलीवरी और उधार याद दिलाता है।',
    },
  },
  {
    icon: Wallet, grad: 'from-violet-500 via-purple-600 to-fuchsia-700',
    eyebrow: { en: 'Step 4', hi: 'स्टेप 4' },
    title: { en: 'Day Book', hi: 'बहीखाता' },
    sub: { en: 'The day\'s sales, money in, expenses and dues at a glance.', hi: 'दिन की बिक्री, आया पैसा, ख़र्च और उधार एक नज़र में।' },
    tags: [{ en: 'Reports', hi: 'रिपोर्ट' }, { en: 'Expenses', hi: 'ख़र्च' }],
    body: {
      kind: 'stats', items: [
        { value: { en: 'Sales', hi: 'बिक्री' }, label: { en: 'every bill of the day', hi: 'दिन के सारे बिल' } },
        { value: { en: 'Collections', hi: 'वसूली' }, label: { en: 'cash, UPI and card received', hi: 'कैश, UPI, कार्ड से मिला पैसा' } },
        { value: { en: 'Expenses', hi: 'ख़र्च' }, label: { en: 'add what you spent', hi: 'जो ख़र्च किया वो जोड़ें' } },
        { value: { en: 'Dues', hi: 'उधार' }, label: { en: 'who still owes you', hi: 'किसका पैसा बाकी है' } },
      ],
    },
    voice: {
      en: 'The Day Book shows the day\'s sales, the money received, your expenses and the dues. Bills of deleted clients are listed at the top, so nothing goes missing.',
      hi: 'बहीखाते में दिन की बिक्री, मिला हुआ पैसा, ख़र्च और उधार दिखते हैं। हटाए गए ग्राहकों के बिल ऊपर अलग से दिखते हैं, इसलिए कुछ गायब नहीं होता।',
    },
  },
  {
    icon: Users, grad: 'from-rose-500 via-rose-600 to-red-700',
    eyebrow: { en: 'Step 5', hi: 'स्टेप 5' },
    title: { en: 'Team and access', hi: 'टीम और एक्सेस' },
    sub: { en: 'The admin invites staff and decides what each person can open.', hi: 'एडमिन स्टाफ़ को जोड़ता है और तय करता है कि कौन क्या खोल सकता है।' },
    tags: [{ en: 'Team & Access', hi: 'टीम' }, { en: 'Shop code', hi: 'शॉप कोड' }],
    body: {
      kind: 'chips', items: [
        { title: { en: 'Admin', hi: 'एडमिन' }, note: { en: 'Everything, including team and settings.', hi: 'सब कुछ, टीम और सेटिंग समेत।' } },
        { title: { en: 'Shop Manager', hi: 'शॉप मैनेजर' }, note: { en: 'Runs the shop; can add materials.', hi: 'दुकान संभालता है; मटेरियल जोड़ सकता है।' } },
        { title: { en: 'Optometrist', hi: 'ऑप्टोमेट्रिस्ट' }, note: { en: 'Eye tests and clients.', hi: 'आँख की जाँच और ग्राहक।' } },
        { title: { en: 'Cashier / Lab', hi: 'कैशियर / लैब' }, note: { en: 'Billing, or lab work only.', hi: 'सिर्फ़ बिलिंग, या सिर्फ़ लैब का काम।' } },
      ],
    },
    voice: {
      en: 'The admin adds team members from Team and Access. Each role sees only what it needs: manager, optometrist, cashier or lab technician. Staff join with the shop code.',
      hi: 'एडमिन टीम और एक्सेस से स्टाफ़ जोड़ता है। हर भूमिका को सिर्फ़ ज़रूरी स्क्रीन दिखती हैं: मैनेजर, ऑप्टोमेट्रिस्ट, कैशियर या लैब टेक्नीशियन। स्टाफ़ शॉप कोड से जुड़ता है।',
    },
    adminOnly: true,
  },
  {
    icon: Lightbulb, grad: 'from-amber-500 via-yellow-600 to-orange-600',
    eyebrow: { en: 'Good to know', hi: 'काम की बातें' },
    title: { en: 'Quick tips', hi: 'छोटे टिप्स' },
    sub: { en: 'A few things that save time every day.', hi: 'कुछ बातें जो रोज़ समय बचाती हैं।' },
    tags: [{ en: 'Search', hi: 'सर्च' }, { en: 'Language', hi: 'भाषा' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Search anything', hi: 'कुछ भी खोजें' }, note: { en: 'The search bar finds clients, bills and materials.', hi: 'सर्च बार से ग्राहक, बिल और मटेरियल मिलते हैं।' } },
        { title: { en: 'On the phone', hi: 'फ़ोन पर' }, note: { en: 'Tap the + button at the bottom right to open every screen.', hi: 'नीचे दाएँ + बटन दबाने पर सारी स्क्रीन खुलती हैं।' } },
        { title: { en: 'Change the language', hi: 'भाषा बदलें' }, note: { en: 'Open your profile menu and pick Hindi or English.', hi: 'प्रोफ़ाइल मेन्यू खोलकर हिन्दी या English चुनें।' } },
        { title: { en: 'See this guide again', hi: 'यह गाइड फिर देखें' }, note: { en: 'Profile menu, then App guide.', hi: 'प्रोफ़ाइल मेन्यू में "ऐप गाइड"।' } },
      ],
    },
    voice: {
      en: 'A few tips. Use the search bar to find anything. On the phone, tap the plus button to open every screen. Change the language from your profile menu, and open this guide again from there any time.',
      hi: 'कुछ टिप्स। कुछ भी खोजने के लिए सर्च बार इस्तेमाल करें। फ़ोन पर प्लस बटन से सारी स्क्रीन खुलती हैं। भाषा प्रोफ़ाइल मेन्यू से बदलें, और यह गाइड वहीं से फिर देख सकते हैं।',
    },
  },
];

const OPEN_EVENT = 'jiya:open-guide';
const seenKey = (who: string) => `JIYA_GUIDE_SEEN_${who}`;

/** Open the guide from anywhere (the profile menu uses this). */
export const openGuide = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** First-time guide: full-screen swipeable cards with an optional voice-over in Hindi or English. */
export function GuideModal() {
  const { currentUser, language: appLanguage } = useApp();
  const who = currentUser.email || currentUser.id || 'local';
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [lang, setLang] = useState<Lang>(appLanguage);
  const [speaking, setSpeaking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [noVoice, setNoVoice] = useState(false);
  const touchX = useRef<number | null>(null);

  const slides = useMemo(() => SLIDES.filter((s) => !s.adminOnly || currentUser.role === 'Admin'), [currentUser.role]);
  const slide = slides[Math.min(index, slides.length - 1)];
  const last = index >= slides.length - 1;
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

  const stop = useCallback(() => { try { synth?.cancel(); } catch { /* no speech support */ } setSpeaking(false); setProgress(0); }, [synth]);

  const close = useCallback(() => {
    stop();
    try { localStorage.setItem(seenKey(who), '1'); } catch { /* storage blocked */ }
    setOpen(false);
  }, [stop, who]);

  // Show once for a new user, and whenever the profile menu asks for it.
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(seenKey(who)) === '1'; } catch { /* storage blocked */ }
    if (!seen) { setIndex(0); setOpen(true); }
    const show = () => { setIndex(0); setLang(appLanguage); setOpen(true); };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, [who, appLanguage]);

  const go = useCallback((to: number) => { stop(); setIndex(Math.max(0, Math.min(slides.length - 1, to))); }, [stop, slides.length]);

  const speak = useCallback(() => {
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') { setNoVoice(true); return; }
    synth.cancel();
    const text = slide.voice[lang === 'HI' ? 'hi' : 'en'];
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'HI' ? 'hi-IN' : 'en-IN';
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(lang === 'HI' ? 'hi' : 'en'));
    if (voice) u.voice = voice; else if (lang === 'HI') setNoVoice(true);
    u.onboundary = (e) => setProgress(Math.min(1, e.charIndex / text.length));
    u.onend = () => { setSpeaking(false); setProgress(1); };
    u.onerror = () => setSpeaking(false);
    setNoVoice(lang === 'HI' && !voice);
    setProgress(0);
    setSpeaking(true);
    synth.speak(u);
  }, [synth, slide, lang]);

  const togglePlay = () => {
    if (speaking) stop(); else speak();
  };

  const switchLang = (next: Lang) => {
    if (next === lang) return;
    stop();
    setLang(next);
    setNoVoice(false);
  };

  // Stop the voice when the guide goes away.
  useEffect(() => () => { try { synth?.cancel(); } catch { /* no speech support */ } }, [synth]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, index, go, close]);

  if (!open) return null;
  const L = lang === 'HI' ? 'hi' : 'en';
  const Icon = slide.icon;
  const hi = lang === 'HI';

  return (
    <div
      className="guide-overlay fixed inset-0 z-[80] bg-stone-900/70 backdrop-blur-sm flex items-stretch md:items-center justify-center md:p-6 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={hi ? 'ऐप गाइड' : 'App guide'}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="relative bg-white w-full md:max-w-4xl md:h-[min(88vh,620px)] md:rounded-[28px] shadow-2xl flex flex-col overflow-hidden">
        {/* Dots and close */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 md:px-6">
          <div className="flex items-center gap-1.5" role="tablist" aria-label={hi ? 'कार्ड' : 'Cards'}>
            {slides.map((s, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1} / ${slides.length}`}
                onClick={() => go(i)}
                className={'h-2 rounded-full transition-all cursor-pointer ' + (i === index ? 'w-6 bg-amber-600' : 'w-2 bg-stone-300 hover:bg-stone-400')}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-400">{index + 1} / {slides.length}</span>
            <button onClick={close} aria-label={hi ? 'बंद करें' : 'Close'} className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 px-3 md:px-6 overflow-y-auto">
          <div key={index} className={`guide-card-hero relative shrink-0 md:w-[42%] rounded-[28px] bg-gradient-to-br ${slide.grad} text-white p-5 md:p-7 flex flex-col justify-between gap-5 overflow-hidden`}>
            <span aria-hidden="true" className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/10" />
            <span aria-hidden="true" className="absolute -right-2 top-16 w-20 h-20 rounded-full bg-white/10" />
            <span className="relative grid place-items-center w-14 h-14 rounded-2xl bg-white shadow-lg"><Icon className="w-7 h-7 text-amber-700" /></span>
            <div className="relative space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">{slide.eyebrow[L]}</p>
              <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">{slide.title[L]}</h2>
              <p className="text-sm text-white/90 leading-relaxed">{slide.sub[L]}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {slide.tags.map((tag, i) => <span key={i} className="px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-semibold">{tag[L]}</span>)}
              </div>
            </div>
          </div>

          <div key={'b' + index} className="guide-card-body flex-1 min-w-0 py-1 md:py-3 md:pl-2">
            {slide.body.kind === 'stats' && (
              <div className="grid grid-cols-2 gap-2.5">
                {slide.body.items.map((it, i) => (
                  <div key={i} className="rounded-2xl bg-amber-50 border border-amber-100 p-3.5">
                    <p className="text-base font-extrabold text-amber-800 leading-tight">{it.value[L]}</p>
                    <p className="text-xs text-stone-600 mt-1 leading-snug">{it.label[L]}</p>
                  </div>
                ))}
              </div>
            )}
            {slide.body.kind === 'chips' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {slide.body.items.map((it, i) => (
                  <div key={i} className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-amber-600 text-white text-xs font-bold">{it.title[L]}</span>
                    <p className="text-xs text-stone-600 mt-2 leading-snug">{it.note[L]}</p>
                  </div>
                ))}
              </div>
            )}
            {slide.body.kind === 'steps' && (
              <ol className="space-y-2.5">
                {slide.body.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-3">
                    <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-amber-600 text-white text-sm font-bold">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-stone-900">{it.title[L]}</span>
                      <span className="block text-xs text-stone-600 mt-0.5 leading-snug">{it.note[L]}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Voice-over bar */}
        <div className="mx-3 md:mx-6 mt-3 rounded-2xl bg-stone-100 p-2.5 flex items-center gap-2.5">
          <button
            onClick={togglePlay}
            aria-label={speaking ? (hi ? 'रोकें' : 'Pause voice-over') : (hi ? 'सुनें' : 'Play voice-over')}
            className="shrink-0 w-10 h-10 rounded-full bg-amber-600 hover:bg-amber-700 text-white grid place-items-center cursor-pointer"
          >
            {speaking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-stone-700 leading-snug line-clamp-2">
              <Volume2 className="inline w-3.5 h-3.5 mr-1 text-amber-700 -mt-0.5" />
              {noVoice
                ? (hi ? 'इस डिवाइस में हिन्दी आवाज़ नहीं मिली, पर नीचे लिखा हुआ पढ़ सकते हैं।' : 'No voice found on this device. You can read the caption instead.')
                : slide.voice[L]}
            </p>
            <div className="mt-1.5 h-1 rounded-full bg-stone-300 overflow-hidden"><div className="h-full bg-amber-600 transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          </div>
          <div className="shrink-0 flex items-center rounded-full bg-white border border-stone-200 p-0.5" role="group" aria-label={hi ? 'भाषा' : 'Language'}>
            <Languages className="w-3.5 h-3.5 text-stone-400 mx-1.5" />
            {(['HI', 'EN'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => switchLang(l)}
                aria-pressed={lang === l}
                className={'px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ' + (lang === l ? 'bg-amber-600 text-white' : 'text-stone-600')}
              >{l === 'HI' ? 'हिन्दी' : 'English'}</button>
            ))}
          </div>
        </div>

        {/* Back / Next */}
        <div className="flex items-center justify-between gap-3 px-3 md:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm font-bold disabled:opacity-30 cursor-pointer disabled:cursor-default"
          ><ChevronLeft className="w-4 h-4" />{hi ? 'पीछे' : 'Back'}</button>
          {!last && <button onClick={close} className="text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer">{hi ? 'छोड़ें' : 'Skip'}</button>}
          <button
            onClick={() => (last ? close() : go(index + 1))}
            className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer"
          >{last ? (hi ? 'शुरू करें' : 'Get started') : (hi ? 'आगे' : 'Next')}{!last && <ChevronRight className="w-4 h-4" />}</button>
        </div>
      </div>
    </div>
  );
}
