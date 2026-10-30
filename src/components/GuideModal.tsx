import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Glasses, Home, Languages, Lightbulb, Package, Pause, Play, Receipt, ScanBarcode, Send, Settings, Truck, Users, Volume2, Wallet, X } from 'lucide-react';
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
    sub: { en: 'Everything for your optical shop in one app. This tour takes about 3 minutes and shows the work in the order you will do it.', hi: 'आपकी ऑप्टिकल दुकान का सारा काम एक ऐप में। यह टूर करीब 3 मिनट का है और काम उसी क्रम में दिखाता है जिस क्रम में आप करेंगे।' },
    tags: [{ en: 'Phone + computer', hi: 'फ़ोन + कंप्यूटर' }, { en: 'Hindi / English', hi: 'हिन्दी / English' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Set up once', hi: 'एक बार सेटअप' }, note: { en: 'Shop details, materials and your team.', hi: 'दुकान की जानकारी, मटेरियल और आपकी टीम।' } },
        { title: { en: 'Run the shop every day', hi: 'रोज़ का काम' }, note: { en: 'Eye test, billing, tags, delivery and follow-ups.', hi: 'आँख की जाँच, बिलिंग, टैग, डिलीवरी और फॉलो-अप।' } },
        { title: { en: 'Check the money', hi: 'हिसाब देखें' }, note: { en: 'Day Book shows sales, money received, expenses and dues.', hi: 'बहीखाते में बिक्री, मिला पैसा, ख़र्च और उधार दिखता है।' } },
        { title: { en: 'Need help later?', hi: 'बाद में मदद चाहिए?' }, note: { en: 'Open "App guide" from the left menu, or the profile menu.', hi: 'बाएँ मेन्यू या प्रोफ़ाइल मेन्यू से "ऐप गाइड" खोलें।' } },
      ],
    },
    voice: {
      en: 'Welcome to Jiya Opticals. This short tour shows the work in the order you will do it. First the one-time setup, then the daily work like eye tests and billing, and finally how to check your money. You can open this guide again from the left menu at any time.',
      hi: 'जिया ऑप्टिकल्स में आपका स्वागत है। यह छोटा टूर काम को उसी क्रम में दिखाता है जिसमें आप करेंगे। पहले एक बार का सेटअप, फिर रोज़ का काम जैसे आँख की जाँच और बिलिंग, और आख़िर में हिसाब देखना। यह गाइड आप बाएँ मेन्यू से कभी भी दोबारा खोल सकते हैं।',
    },
  },
  {
    icon: Settings, grad: 'from-stone-600 via-stone-700 to-stone-900',
    eyebrow: { en: 'Setup 1 of 3', hi: 'सेटअप 1 / 3' },
    title: { en: 'Shop details', hi: 'दुकान की जानकारी' },
    sub: { en: 'Do this first. It prints on every bill, so fill it carefully. Admin only.', hi: 'सबसे पहले यह करें। यह हर बिल पर छपता है, इसलिए ध्यान से भरें। सिर्फ़ एडमिन।' },
    tags: [{ en: 'Masters & Settings', hi: 'मास्टर व सेटिंग' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Store Profile & GSTIN', hi: 'स्टोर प्रोफ़ाइल व GSTIN' }, note: { en: 'Shop name, address, phone and GSTIN. These appear on the bill header.', hi: 'दुकान का नाम, पता, फ़ोन और GSTIN। ये बिल के ऊपर छपते हैं।' } },
        { title: { en: 'Shop Branches', hi: 'दुकानें / ब्रांच' }, note: { en: 'Add each branch with its code, like C1. The code becomes part of the bill number, JO/26-27/C1/001.', hi: 'हर ब्रांच कोड के साथ जोड़ें, जैसे C1। यह कोड बिल नंबर का हिस्सा बनता है, JO/26-27/C1/001।' } },
        { title: { en: 'Doctors & Optometrists', hi: 'डॉक्टर व ऑप्टोमेट्रिस्ट' }, note: { en: 'Add the people who do eye tests, so they can be picked on a test or a bill.', hi: 'आँख की जाँच करने वालों को जोड़ें, ताकि जाँच या बिल में चुन सकें।' } },
        { title: { en: 'Bill of Supply', hi: 'बिल ऑफ़ सप्लाई' }, note: { en: 'Under the composition scheme the bill carries GST 0, so no tax is added to the price.', hi: 'कंपोज़िशन स्कीम में बिल पर GST 0 रहता है, यानी क़ीमत में टैक्स नहीं जुड़ता।' } },
      ],
    },
    voice: {
      en: 'Start with Masters and Settings. Fill in your shop name, address, phone and G S T I N, because they print on every bill. Then add each branch with a short code like C 1. That code becomes part of your bill number. Last, add your doctors and optometrists.',
      hi: 'शुरुआत मास्टर और सेटिंग से करें। दुकान का नाम, पता, फ़ोन और जी एस टी आई एन भरें, क्योंकि ये हर बिल पर छपते हैं। फिर हर ब्रांच जोड़ें, C 1 जैसे छोटे कोड के साथ। यही कोड आपके बिल नंबर का हिस्सा बनता है। आख़िर में अपने डॉक्टर और ऑप्टोमेट्रिस्ट जोड़ें।',
    },
    adminOnly: true,
  },
  {
    icon: Package, grad: 'from-emerald-500 via-emerald-600 to-teal-700',
    eyebrow: { en: 'Setup 2 of 3', hi: 'सेटअप 2 / 3' },
    title: { en: 'Add your materials', hi: 'मटेरियल जोड़ें' },
    sub: { en: 'A material is a frame, sunglass, lens or contact lens. Add it once and every shop can stock it.', hi: 'मटेरियल यानी फ़्रेम, सनग्लास, लेंस या कॉन्टैक्ट लेंस। एक बार जोड़ें, हर दुकान में रख सकते हैं।' },
    tags: [{ en: 'Inventory', hi: 'इन्वेंटरी' }, { en: 'MRP', hi: 'MRP' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Open Inventory, add a material', hi: 'इन्वेंटरी खोलें, मटेरियल जोड़ें' }, note: { en: 'Pick the category, then fill brand, model and colour.', hi: 'कैटेगरी चुनें, फिर ब्रांड, मॉडल और रंग भरें।' } },
        { title: { en: 'Fill the prices', hi: 'क़ीमतें भरें' }, note: { en: 'MRP is the printed price. Sale price is what you charge. If you leave sale price empty, the bill uses MRP.', hi: 'MRP छपी हुई क़ीमत है। सेल प्राइस वह है जो आप लेते हैं। सेल प्राइस खाली छोड़ें तो बिल में MRP लगता है।' } },
        { title: { en: 'Set a low-stock alert', hi: 'कम स्टॉक अलर्ट रखें' }, note: { en: 'When stock reaches this number, a red count shows on Inventory.', hi: 'स्टॉक इस संख्या पर पहुँचे तो इन्वेंटरी पर लाल गिनती दिखती है।' } },
        { title: { en: 'Lenses are different', hi: 'लेंस थोड़े अलग हैं' }, note: { en: 'Spectacle lenses are made to order, so they take type, index and coating instead of colour and tags.', hi: 'चश्मे के लेंस ऑर्डर पर बनते हैं, इसलिए उनमें रंग और टैग की जगह टाइप, इंडेक्स और कोटिंग भरते हैं।' } },
      ],
    },
    voice: {
      en: 'In Inventory, add each material once. Choose the category, then fill brand, model and colour. M R P is the printed price. Sale price is what you charge, and if you leave it empty the bill uses M R P. Spectacle lenses are made to order, so they use type, index and coating instead.',
      hi: 'इन्वेंटरी में हर मटेरियल एक बार जोड़ें। कैटेगरी चुनें, फिर ब्रांड, मॉडल और रंग भरें। एम आर पी छपी हुई क़ीमत है। सेल प्राइस वह है जो आप लेते हैं, और खाली छोड़ें तो बिल में एम आर पी लगता है। चश्मे के लेंस ऑर्डर पर बनते हैं, इसलिए उनमें टाइप, इंडेक्स और कोटिंग भरते हैं।',
    },
  },
  {
    icon: Truck, grad: 'from-teal-500 via-cyan-600 to-sky-700',
    eyebrow: { en: 'Setup 3 of 3', hi: 'सेटअप 3 / 3' },
    title: { en: 'Bring stock in', hi: 'स्टॉक चढ़ाएँ' },
    sub: { en: 'Adding a material does not add stock. Stock goes up only when you record a purchase.', hi: 'मटेरियल जोड़ने से स्टॉक नहीं बढ़ता। स्टॉक तब बढ़ता है जब आप ख़रीद दर्ज करते हैं।' },
    tags: [{ en: 'Purchases', hi: 'खरीद' }, { en: 'Suppliers', hi: 'सप्लायर' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Open Purchases', hi: 'खरीद खोलें' }, note: { en: 'Choose the supplier and the shop that is receiving the goods.', hi: 'सप्लायर और माल पाने वाली दुकान चुनें।' } },
        { title: { en: 'Add each item with quantity and cost', hi: 'हर आइटम मात्रा और लागत के साथ जोड़ें' }, note: { en: 'Pick the material, then enter how many pieces came and the purchase price.', hi: 'मटेरियल चुनें, फिर कितने पीस आए और ख़रीद का भाव भरें।' } },
        { title: { en: 'Save', hi: 'सेव करें' }, note: { en: 'Stock for that shop goes up straight away. Each shop keeps its own count.', hi: 'उस दुकान का स्टॉक तुरंत बढ़ जाता है। हर दुकान की गिनती अलग रहती है।' } },
        { title: { en: 'Then print tags', hi: 'फिर टैग छापें' }, note: { en: 'Next card shows how.', hi: 'कैसे, यह अगले कार्ड में है।' } },
      ],
    },
    voice: {
      en: 'Adding a material does not add stock. To bring stock in, open Purchases, choose the supplier and the receiving shop, add each item with quantity and cost, and save. That shop\'s stock goes up at once, and every shop keeps its own count.',
      hi: 'मटेरियल जोड़ने से स्टॉक नहीं बढ़ता। स्टॉक चढ़ाने के लिए खरीद खोलें, सप्लायर और माल पाने वाली दुकान चुनें, हर आइटम मात्रा और लागत के साथ जोड़ें और सेव करें। उस दुकान का स्टॉक तुरंत बढ़ जाता है, और हर दुकान की गिनती अलग रहती है।',
    },
  },
  {
    icon: ScanBarcode, grad: 'from-lime-500 via-green-600 to-emerald-700',
    eyebrow: { en: 'Daily work', hi: 'रोज़ का काम' },
    title: { en: 'Print and scan tags', hi: 'टैग छापें और स्कैन करें' },
    sub: { en: 'Every piece gets its own barcode, so you always know which exact frame was sold.', hi: 'हर पीस का अपना बारकोड होता है, इसलिए पता रहता है कि ठीक कौन-सा फ़्रेम बिका।' },
    tags: [{ en: 'Barcode', hi: 'बारकोड' }, { en: 'TSC printer', hi: 'TSC प्रिंटर' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Open the tag printer', hi: 'टैग प्रिंट खोलें' }, note: { en: 'From the material in Inventory, choose print tags.', hi: 'इन्वेंटरी में मटेरियल से टैग प्रिंट चुनें।' } },
        { title: { en: 'Choose size and count', hi: 'साइज़ और संख्या चुनें' }, note: { en: 'Default is the frame strip, 100 × 15 mm with a 33 mm tail gap. Set how many pieces to print.', hi: 'सामान्य साइज़ फ़्रेम स्ट्रिप 100 × 15 mm है, 33 mm टेल गैप के साथ। कितने पीस छापने हैं, चुनें।' } },
        { title: { en: 'Print', hi: 'प्रिंट करें' }, note: { en: 'Use the browser print, or download the TSC .prn file for a TSC label printer.', hi: 'ब्राउज़र प्रिंट करें, या TSC लेबल प्रिंटर के लिए TSC .prn फ़ाइल डाउनलोड करें।' } },
        { title: { en: 'Stick it, scan it', hi: 'चिपकाएँ, स्कैन करें' }, note: { en: 'Each code looks like FR00001-001 (item code, then piece number). Scan it while billing to add the item.', hi: 'हर कोड FR00001-001 जैसा होता है (आइटम कोड, फिर पीस नंबर)। बिलिंग में स्कैन करने से आइटम जुड़ जाता है।' } },
      ],
    },
    voice: {
      en: 'Open the tag printer from the material in Inventory. Choose the size, the usual one is the frame strip, a hundred by fifteen millimetres, and say how many pieces to print. Every piece gets its own code, like F R zero zero zero zero one, dash zero zero one. Stick it on the frame and scan it while billing.',
      hi: 'इन्वेंटरी में मटेरियल से टैग प्रिंट खोलें। साइज़ चुनें, सामान्य साइज़ फ़्रेम स्ट्रिप है, सौ गुणा पंद्रह मिलीमीटर, और बताएँ कि कितने पीस छापने हैं। हर पीस का अपना कोड होता है, जैसे F R शून्य शून्य शून्य शून्य एक, डैश शून्य शून्य एक। इसे फ़्रेम पर चिपकाएँ और बिलिंग में स्कैन करें।',
    },
  },
  {
    icon: Eye, grad: 'from-sky-500 via-sky-600 to-indigo-600',
    eyebrow: { en: 'Daily work', hi: 'रोज़ का काम' },
    title: { en: 'Client and eye test', hi: 'ग्राहक और आँख की जाँच' },
    sub: { en: 'Every walk-in starts here. The power you write is saved with the client for next time.', hi: 'हर आने वाले की शुरुआत यहीं से होती है। आपका लिखा नंबर ग्राहक के साथ सेव रहता है।' },
    tags: [{ en: 'Clients', hi: 'ग्राहक' }, { en: 'Eye Testing', hi: 'नेत्र परीक्षण' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Add the client', hi: 'ग्राहक जोड़ें' }, note: { en: 'Name and mobile number are enough to start. You can add more later.', hi: 'शुरू करने के लिए नाम और मोबाइल नंबर काफ़ी हैं। बाक़ी बाद में जोड़ सकते हैं।' } },
        { title: { en: 'Do the eye test', hi: 'आँख की जाँच करें' }, note: { en: 'Open Eye Testing, pick the client and enter the refraction power for both eyes.', hi: 'नेत्र परीक्षण खोलें, ग्राहक चुनें और दोनों आँखों का नंबर भरें।' } },
        { title: { en: 'See the history', hi: 'इतिहास देखें' }, note: { en: 'The client page lists all tests, all bills and the amount still due.', hi: 'ग्राहक के पेज पर सारी जाँचें, सारे बिल और बाकी रक़म दिखती है।' } },
        { title: { en: 'Deleting a client', hi: 'ग्राहक हटाना' }, note: { en: 'You are asked whether to keep the bills. Keep them to keep your sales correct; they stay in the Day Book.', hi: 'पूछा जाता है कि बिल रखने हैं या नहीं। बिक्री सही रखने के लिए रखें; वे बहीखाते में रहते हैं।' } },
      ],
    },
    voice: {
      en: 'Every walk-in starts with the client. Name and mobile number are enough. Then open Eye Testing, pick the client and enter the power for both eyes. It is saved, so next visit you do not start again. The client page shows all tests, all bills and what is still due.',
      hi: 'हर ग्राहक की शुरुआत ग्राहक जोड़ने से होती है। नाम और मोबाइल नंबर काफ़ी हैं। फिर नेत्र परीक्षण खोलें, ग्राहक चुनें और दोनों आँखों का नंबर भरें। यह सेव रहता है, इसलिए अगली बार शुरुआत से नहीं करनी पड़ती। ग्राहक के पेज पर सारी जाँचें, सारे बिल और बाकी रक़म दिखती है।',
    },
  },
  {
    icon: Receipt, grad: 'from-orange-500 via-orange-600 to-rose-600',
    eyebrow: { en: 'Daily work', hi: 'रोज़ का काम' },
    title: { en: 'Make a bill', hi: 'बिल बनाएँ' },
    sub: { en: 'There are two kinds: Direct Sale (taken away today) and Advance / Delivery Order (made for the client).', hi: 'दो तरह के बिल हैं: डायरेक्ट सेल (आज ही ले गए) और एडवांस / डिलीवरी ऑर्डर (ग्राहक के लिए बनवाना)।' },
    tags: [{ en: 'POS Billing', hi: 'POS बिलिंग' }, { en: 'UPI QR', hi: 'UPI QR' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Choose the client and the type', hi: 'ग्राहक और बिल का प्रकार चुनें' }, note: { en: 'Direct Sale for ready items. Advance / Delivery Order when lenses or frames must be made or fitted.', hi: 'तैयार माल के लिए डायरेक्ट सेल। लेंस या फ़्रेम बनवाना/फ़िट करना हो तो एडवांस / डिलीवरी ऑर्डर।' } },
        { title: { en: 'Add the items', hi: 'आइटम जोड़ें' }, note: { en: 'Scan the tag with a scanner or the camera, or search by name. Add a discount or fitting charge if needed.', hi: 'टैग को स्कैनर या कैमरे से स्कैन करें, या नाम से खोजें। ज़रूरत हो तो डिस्काउंट या फ़िटिंग चार्ज जोड़ें।' } },
        { title: { en: 'Take the payment', hi: 'पेमेंट लें' }, note: { en: 'UPI / QR, Cash or Card. For an order, enter the advance; the rest is shown as balance due.', hi: 'UPI / QR, कैश या कार्ड। ऑर्डर में एडवांस भरें; बाकी बैलेंस के रूप में दिखता है।' } },
        { title: { en: 'Save, then print or share', hi: 'सेव करें, फिर प्रिंट या शेयर' }, note: { en: 'Print the bill, or send it by WhatsApp or email. Stock goes down automatically.', hi: 'बिल प्रिंट करें, या WhatsApp/ईमेल से भेजें। स्टॉक अपने आप घट जाता है।' } },
      ],
    },
    voice: {
      en: 'To make a bill, open POS Billing. Choose the client and the type. Direct Sale is for items taken away today. Advance or Delivery Order is when lenses or frames must be made. Scan or search the items, take the payment by U P I, cash or card, and for an order enter the advance. Save, then print or share on WhatsApp. Stock goes down by itself.',
      hi: 'बिल बनाने के लिए पी ओ एस बिलिंग खोलें। ग्राहक और प्रकार चुनें। डायरेक्ट सेल उस सामान के लिए है जो आज ही ले जाएँ। एडवांस या डिलीवरी ऑर्डर तब, जब लेंस या फ़्रेम बनवाना हो। आइटम स्कैन करें या खोजें, यू पी आई, कैश या कार्ड से पेमेंट लें, और ऑर्डर में एडवांस भरें। सेव करें, फिर प्रिंट करें या व्हाट्सऐप पर भेजें। स्टॉक अपने आप घट जाता है।',
    },
  },
  {
    icon: Home, grad: 'from-fuchsia-500 via-purple-600 to-violet-700',
    eyebrow: { en: 'Daily work', hi: 'रोज़ का काम' },
    title: { en: 'Follow an order to delivery', hi: 'ऑर्डर से डिलीवरी तक' },
    sub: { en: 'Open orders show on the Dashboard. Move each one forward as work is done.', hi: 'खुले ऑर्डर डैशबोर्ड पर दिखते हैं। काम होने पर हर ऑर्डर को आगे बढ़ाएँ।' },
    tags: [{ en: 'Dashboard', hi: 'डैशबोर्ड' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Order Booked', hi: 'ऑर्डर बुक' }, note: { en: 'The order is taken and the advance is received.', hi: 'ऑर्डर लिया गया और एडवांस मिल गया।' } },
        { title: { en: 'In Progress, then Fitting Done', hi: 'काम जारी, फिर फ़िटिंग पूरी' }, note: { en: 'The lab is working on it, then the lenses are fitted.', hi: 'लैब में काम चल रहा है, फिर लेंस फ़िट हो गए।' } },
        { title: { en: 'Ready for Delivery, then Delivered', hi: 'डिलीवरी के लिए तैयार, फिर डिलीवर' }, note: { en: 'Tell the client it is ready. Collect the balance and mark it Delivered.', hi: 'ग्राहक को बताएँ कि तैयार है। बाकी रक़म लेकर डिलीवर्ड करें।' } },
        { title: { en: 'Made a mistake?', hi: 'कोई ग़लती हुई?' }, note: { en: 'Open the order, then Edit bill to correct it. Stock and the client\'s balance adjust by themselves.', hi: 'ऑर्डर खोलें, फिर एडिट बिल से ठीक करें। स्टॉक और ग्राहक का बैलेंस अपने आप ठीक हो जाता है।' } },
      ],
    },
    voice: {
      en: 'Open orders show on the Dashboard. Move each one forward: Order Booked, In Progress, Fitting Done, Ready for Delivery, and finally Delivered. If you made a mistake, open the order and choose Edit bill. Stock and the client\'s balance fix themselves.',
      hi: 'खुले ऑर्डर डैशबोर्ड पर दिखते हैं। हर ऑर्डर को आगे बढ़ाएँ: ऑर्डर बुक, काम जारी, फ़िटिंग पूरी, डिलीवरी के लिए तैयार, और आख़िर में डिलीवर्ड। कोई ग़लती हो जाए तो ऑर्डर खोलकर एडिट बिल चुनें। स्टॉक और ग्राहक का बैलेंस अपने आप ठीक हो जाते हैं।',
    },
  },
  {
    icon: Send, grad: 'from-pink-500 via-rose-500 to-red-600',
    eyebrow: { en: 'Daily work', hi: 'रोज़ का काम' },
    title: { en: 'Follow-ups and dues', hi: 'फॉलो-अप और उधार' },
    sub: { en: 'So no delivery, payment or re-check is forgotten.', hi: 'ताकि कोई डिलीवरी, भुगतान या दोबारा जाँच न भूले।' },
    tags: [{ en: 'Follow-ups', hi: 'फॉलो-अप' }, { en: 'Clients', hi: 'ग्राहक' }],
    body: {
      kind: 'chips', items: [
        { title: { en: 'Follow-ups', hi: 'फॉलो-अप' }, note: { en: 'A list of people to call or message. A number on the menu shows how many are pending.', hi: 'किसे फ़ोन या मैसेज करना है उसकी सूची। मेन्यू पर संख्या दिखती है कि कितने बाकी हैं।' } },
        { title: { en: 'Dues', hi: 'उधार' }, note: { en: 'Clients who still owe money show with a count on Clients. Open one to see the amount.', hi: 'जिन ग्राहकों का पैसा बाकी है उनकी गिनती ग्राहक पर दिखती है। खोलकर रक़म देखें।' } },
        { title: { en: 'Messages', hi: 'मैसेज' }, note: { en: 'Send reminders and offers to clients by WhatsApp from the Follow-ups screen.', hi: 'फॉलो-अप स्क्रीन से ग्राहकों को WhatsApp पर रिमाइंडर और ऑफ़र भेजें।' } },
        { title: { en: 'Red badges', hi: 'लाल गिनती' }, note: { en: 'On the menu, a red number means something needs you: low stock, dues or follow-ups.', hi: 'मेन्यू पर लाल संख्या का मतलब है कि कुछ करना बाकी है: कम स्टॉक, उधार या फॉलो-अप।' } },
      ],
    },
    voice: {
      en: 'Follow-ups is your list of people to call or message. Clients who still owe money show with a red count on the Clients menu. A red number anywhere on the menu means something needs your attention, like low stock, dues or follow-ups.',
      hi: 'फॉलो-अप में उन लोगों की सूची है जिन्हें फ़ोन या मैसेज करना है। जिन ग्राहकों का पैसा बाकी है उनकी लाल गिनती ग्राहक मेन्यू पर दिखती है। मेन्यू में कहीं भी लाल संख्या का मतलब है कि कुछ करना बाकी है, जैसे कम स्टॉक, उधार या फॉलो-अप।',
    },
  },
  {
    icon: Wallet, grad: 'from-violet-500 via-purple-600 to-fuchsia-700',
    eyebrow: { en: 'Check the money', hi: 'हिसाब देखें' },
    title: { en: 'Day Book', hi: 'बहीखाता' },
    sub: { en: 'Close the day here. It shows what came in, what went out and what is still pending.', hi: 'दिन का हिसाब यहीं बंद करें। कितना आया, कितना गया और कितना बाकी है, सब दिखता है।' },
    tags: [{ en: 'Reports', hi: 'रिपोर्ट' }, { en: 'Expenses', hi: 'ख़र्च' }],
    body: {
      kind: 'stats', items: [
        { value: { en: 'Sales', hi: 'बिक्री' }, label: { en: 'All bills of the day, with the total', hi: 'दिन के सारे बिल और उनका कुल' } },
        { value: { en: 'Collections', hi: 'वसूली' }, label: { en: 'Cash, UPI and card money actually received', hi: 'कैश, UPI, कार्ड से सच में मिला पैसा' } },
        { value: { en: 'Expenses', hi: 'ख़र्च' }, label: { en: 'Add rent, tea, courier or any spend', hi: 'किराया, चाय, कूरियर जैसा कोई भी ख़र्च जोड़ें' } },
        { value: { en: 'Dues', hi: 'उधार' }, label: { en: 'Balance not yet paid by clients', hi: 'ग्राहकों का बाकी बैलेंस' } },
      ],
    },
    voice: {
      en: 'The Day Book is where you close the day. It shows all bills with the total, the money actually received by cash, U P I and card, your expenses, and the dues. Add every spend, like rent or courier, so the profit is right. Bills of clients you deleted are listed at the top, so nothing goes missing.',
      hi: 'बहीखाते में आप दिन का हिसाब बंद करते हैं। इसमें सारे बिल कुल के साथ, कैश, यू पी आई और कार्ड से सच में मिला पैसा, आपका ख़र्च और उधार दिखता है। हर ख़र्च जोड़ें, जैसे किराया या कूरियर, ताकि मुनाफ़ा सही रहे। हटाए गए ग्राहकों के बिल ऊपर अलग से दिखते हैं, इसलिए कुछ गायब नहीं होता।',
    },
  },
  {
    icon: Users, grad: 'from-rose-500 via-rose-600 to-red-700',
    eyebrow: { en: 'Team', hi: 'टीम' },
    title: { en: 'Team and access', hi: 'टीम और एक्सेस' },
    sub: { en: 'The admin adds staff and decides what each person can open. Staff join with the shop code.', hi: 'एडमिन स्टाफ़ जोड़ता है और तय करता है कि कौन क्या खोल सकता है। स्टाफ़ शॉप कोड से जुड़ता है।' },
    tags: [{ en: 'Team & Access', hi: 'टीम' }, { en: 'Shop code', hi: 'शॉप कोड' }],
    body: {
      kind: 'chips', items: [
        { title: { en: 'Admin', hi: 'एडमिन' }, note: { en: 'Everything: settings, team, stock, bills and reports.', hi: 'सब कुछ: सेटिंग, टीम, स्टॉक, बिल और रिपोर्ट।' } },
        { title: { en: 'Shop Manager', hi: 'शॉप मैनेजर' }, note: { en: 'Runs one shop and can add new materials there.', hi: 'एक दुकान संभालता है और वहाँ नए मटेरियल जोड़ सकता है।' } },
        { title: { en: 'Optometrist', hi: 'ऑप्टोमेट्रिस्ट' }, note: { en: 'Eye tests and clients.', hi: 'आँख की जाँच और ग्राहक।' } },
        { title: { en: 'Cashier', hi: 'कैशियर' }, note: { en: 'Billing and payments.', hi: 'बिलिंग और पेमेंट।' } },
        { title: { en: 'Lab Technician', hi: 'लैब टेक्नीशियन' }, note: { en: 'Fitting and order work.', hi: 'फ़िटिंग और ऑर्डर का काम।' } },
      ],
    },
    voice: {
      en: 'The admin adds staff from Team and Access. Staff join with the shop code and the admin approves them. Each role sees only what it needs: Shop Manager, Optometrist, Cashier or Lab Technician. Choose the role carefully, because it decides what the person can open.',
      hi: 'एडमिन टीम और एक्सेस से स्टाफ़ जोड़ता है। स्टाफ़ शॉप कोड से जुड़ता है और एडमिन उसे मंज़ूर करता है। हर भूमिका को सिर्फ़ ज़रूरी स्क्रीन दिखती हैं: शॉप मैनेजर, ऑप्टोमेट्रिस्ट, कैशियर या लैब टेक्नीशियन। भूमिका सोच-समझकर चुनें, क्योंकि वही तय करती है कि व्यक्ति क्या खोल सकता है।',
    },
    adminOnly: true,
  },
  {
    icon: Lightbulb, grad: 'from-amber-500 via-yellow-600 to-orange-600',
    eyebrow: { en: 'Good to know', hi: 'काम की बातें' },
    title: { en: 'Quick tips', hi: 'छोटे टिप्स' },
    sub: { en: 'Small things that save time every day.', hi: 'छोटी बातें जो रोज़ समय बचाती हैं।' },
    tags: [{ en: 'Search', hi: 'सर्च' }, { en: 'Language', hi: 'भाषा' }],
    body: {
      kind: 'steps', items: [
        { title: { en: 'Search anything', hi: 'कुछ भी खोजें' }, note: { en: 'The search bar finds clients, bills and materials.', hi: 'सर्च बार से ग्राहक, बिल और मटेरियल मिलते हैं।' } },
        { title: { en: 'On the phone', hi: 'फ़ोन पर' }, note: { en: 'Tap the + button at the bottom right to open every screen, including App guide.', hi: 'नीचे दाएँ + बटन दबाने पर सारी स्क्रीन खुलती हैं, ऐप गाइड भी।' } },
        { title: { en: 'Change the language', hi: 'भाषा बदलें' }, note: { en: 'Open your profile menu and pick Hindi or English.', hi: 'प्रोफ़ाइल मेन्यू खोलकर हिन्दी या English चुनें।' } },
        { title: { en: 'Several shops', hi: 'कई दुकानें' }, note: { en: 'Pick the shop at the top. Clients, stock and bills stay with the shop you chose.', hi: 'ऊपर से दुकान चुनें। ग्राहक, स्टॉक और बिल चुनी हुई दुकान के साथ रहते हैं।' } },
        { title: { en: 'See this guide again', hi: 'यह गाइड फिर देखें' }, note: { en: 'Left menu, then App guide.', hi: 'बाएँ मेन्यू में "ऐप गाइड"।' } },
      ],
    },
    voice: {
      en: 'A few tips. Use the search bar to find clients, bills and materials. On the phone, tap the plus button to open every screen. Change the language from your profile menu. If you have several shops, choose the shop at the top, because clients, stock and bills stay with that shop. Open this guide again from App guide in the menu.',
      hi: 'कुछ टिप्स। ग्राहक, बिल और मटेरियल खोजने के लिए सर्च बार इस्तेमाल करें। फ़ोन पर प्लस बटन से सारी स्क्रीन खुलती हैं। भाषा प्रोफ़ाइल मेन्यू से बदलें। कई दुकानें हों तो ऊपर से दुकान चुनें, क्योंकि ग्राहक, स्टॉक और बिल उसी दुकान के साथ रहते हैं। यह गाइड मेन्यू में ऐप गाइड से दोबारा खोलें।',
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
            <p className="text-xs text-stone-700 leading-snug line-clamp-3">
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
