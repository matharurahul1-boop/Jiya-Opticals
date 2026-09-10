import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Eye, 
  FileText, 
  Glasses, 
  Mail,
  MessageSquare, 
  Plus, 
  Printer, 
  Search, 
  Send, 
  Sparkles, 
  UserPlus 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EyePower, LensCoating, LensType, Prescription } from '../types';

export const EyeTesting: React.FC = () => {
  const { 
    customers, 
    doctors, 
    addPrescriptionToCustomer, 
    setActiveTab, 
    storeProfile,
    selectedCustomerForAction,
    setSelectedCustomerForAction,
    openEmailModal
  } = useApp();

  // Selected Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    () => selectedCustomerForAction?.id || ''
  );
  const [doctorName, setDoctorName] = useState('Suresh Kumar (B.Optom)');
  const [optometristName, setOptometristName] = useState('In-House Optometrist');

  // Auto sync if selected customer changed
  React.useEffect(() => {
    if (selectedCustomerForAction) {
      setSelectedCustomerId(selectedCustomerForAction.id);
    }
  }, [selectedCustomerForAction]);

  // Eye Power States
  const [rightEye, setRightEye] = useState<EyePower>({
    sph: '',
    cyl: '',
    axis: '',
    add: '',
    dv: '6/6',
    nv: 'N6'
  });

  const [leftEye, setLeftEye] = useState<EyePower>({
    sph: '',
    cyl: '',
    axis: '',
    add: '',
    dv: '6/6',
    nv: 'N6'
  });

  const [pdMm, setPdMm] = useState('62');
  const [fittingHeight, setFittingHeight] = useState('18mm');
  const [lensType, setLensType] = useState<LensType>('Single Vision');
  const [lensCoating, setLensCoating] = useState<LensCoating>('Blue Cut / Blue Block');
  const [lensIndex, setLensIndex] = useState('1.56');
  const [notes, setNotes] = useState('');
  const [nextCheckupMonths, setNextCheckupMonths] = useState(12);

  // Search & Filter
  const [rxSearch, setRxSearch] = useState('');
  const [selectedRxForCard, setSelectedRxForCard] = useState<Prescription | null>(null);

  // All Prescriptions collected from customers
  const allPrescriptions: Prescription[] = customers.flatMap((c) => c.prescriptions);

  const filteredRx = allPrescriptions.filter(
    (rx) =>
      rx.customerName.toLowerCase().includes(rxSearch.toLowerCase()) ||
      rx.customerMobile.includes(rxSearch) ||
      rx.date.includes(rxSearch)
  );

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleSavePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer for this eye test.');
      return;
    }

    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + nextCheckupMonths);
    const nextCheckupStr = nextDate.toISOString().split('T')[0];

    const currentCustomer = customers.find((c) => c.id === selectedCustomerId);
    if (!currentCustomer) return;

    const newRx = addPrescriptionToCustomer({
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      customerMobile: currentCustomer.mobile,
      date: new Date().toISOString().split('T')[0],
      doctorName,
      optometristName,
      rightEye,
      leftEye,
      pdMm,
      fittingHeight,
      lensType,
      lensCoating,
      lensIndex,
      notes,
      nextCheckupDate: nextCheckupStr
    });

    setSelectedRxForCard(newRx);
  };

  const handleWhatsAppRx = (rx: Prescription) => {
    const text = `*${storeProfile.name} - EYE PRESCRIPTION* \n` +
      `👤 Patient: *${rx.customerName}*\n` +
      `📅 Exam Date: ${rx.date}\n` +
      `👨‍⚕️ Optometrist: ${rx.doctorName}\n\n` +
      `👁️ *Right Eye (OD)*:\n` +
      `  SPH: ${rx.rightEye.sph} | CYL: ${rx.rightEye.cyl} | AXIS: ${rx.rightEye.axis || '-'} | ADD: ${rx.rightEye.add || '-'}\n` +
      `  DV: ${rx.rightEye.dv} | NV: ${rx.rightEye.nv}\n\n` +
      `👁️ *Left Eye (OS)*:\n` +
      `  SPH: ${rx.leftEye.sph} | CYL: ${rx.leftEye.cyl} | AXIS: ${rx.leftEye.axis || '-'} | ADD: ${rx.leftEye.add || '-'}\n` +
      `  DV: ${rx.leftEye.dv} | NV: ${rx.leftEye.nv}\n\n` +
      `Recommended: ${rx.lensType} (${rx.lensCoating}, Index ${rx.lensIndex})\n` +
      `Pupillary Distance: ${rx.pdMm} mm\n` +
      `Next Checkup Due: ${rx.nextCheckupDate || 'After 1 Year'}\n\n` +
      `Helpline: ${storeProfile.phone}`;

    const url = `https://api.whatsapp.com/send?phone=91${rx.customerMobile}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleEmailRx = (rx: Prescription) => {
    const cust = customers.find((c) => c.id === rx.customerId || c.mobile === rx.customerMobile);
    const subject = `Eye Examination Prescription - ${rx.customerName} - ${storeProfile.name}`;
    const body = `Dear ${rx.customerName},\n\n` +
      `Here is your optical eye power & vision examination prescription from ${storeProfile.name}:\n\n` +
      `========================================\n` +
      `CLINIC: ${storeProfile.name}\n` +
      `EXAMINING OPTOMETRIST: ${rx.doctorName}\n` +
      `DATE OF EXAMINATION: ${rx.date}\n` +
      `CONTACT: ${storeProfile.phone}\n` +
      `ADDRESS: ${storeProfile.addressLine1}, ${storeProfile.city}\n` +
      `========================================\n\n` +
      `PATIENT: ${rx.customerName}\n` +
      `MOBILE: +91 ${rx.customerMobile}\n\n` +
      `--- VISION REFRACTION DATA ---\n` +
      `👁️ RIGHT EYE (OD):\n` +
      `  • Spherical (SPH): ${rx.rightEye.sph || '0.00'}\n` +
      `  • Cylindrical (CYL): ${rx.rightEye.cyl || '0.00'}\n` +
      `  • Axis: ${rx.rightEye.axis || '-'}\n` +
      `  • Add (Near): ${rx.rightEye.add || '-'}\n` +
      `  • Distant Vision: ${rx.rightEye.dv || '6/6'}\n` +
      `  • Near Vision: ${rx.rightEye.nv || 'N6'}\n\n` +
      `👁️ LEFT EYE (OS):\n` +
      `  • Spherical (SPH): ${rx.leftEye.sph || '0.00'}\n` +
      `  • Cylindrical (CYL): ${rx.leftEye.cyl || '0.00'}\n` +
      `  • Axis: ${rx.leftEye.axis || '-'}\n` +
      `  • Add (Near): ${rx.leftEye.add || '-'}\n` +
      `  • Distant Vision: ${rx.leftEye.dv || '6/6'}\n` +
      `  • Near Vision: ${rx.leftEye.nv || 'N6'}\n\n` +
      `--- LENS RECOMMENDATION ---\n` +
      `• Type: ${rx.lensType}\n` +
      `• Coating: ${rx.lensCoating}\n` +
      `• Pupillary Distance (PD): ${rx.pdMm} mm\n` +
      `${rx.notes ? `• Remarks: ${rx.notes}\n` : ''}` +
      `• Recommended Next Checkup: ${rx.nextCheckupDate || 'After 1 Year'}\n\n` +
      `Visit us anytime to try out our premium lightweight frames.\n\n` +
      `Warm Regards,\n${storeProfile.name}\n${storeProfile.phone}`;

    openEmailModal({
      recipientEmail: cust?.email || '',
      recipientName: rx.customerName,
      recipientMobile: rx.customerMobile,
      subject,
      body,
      documentType: 'Eye Prescription'
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-200/80 p-4 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              Eye Testing & Refraction
            </h1>
            <p className="text-xs text-stone-500">
              Record autorefractor and trial refraction readings.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('billing')}
          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <Glasses className="w-3.5 h-3.5" />
          <span>Billing POS</span>
        </button>
      </div>

      {/* Main Grid: Left Refraction Entry Form, Right History & Prescription Slip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Examination Form */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleSavePrescription} className="bg-white border border-amber-200/80 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <span className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Refraction Details
              </span>
              <span className="text-[11px] text-stone-500">Date: {new Date().toISOString().split('T')[0]}</span>
            </div>

            {/* Customer & Optometrist Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-stone-700 font-semibold block mb-1">Customer / Patient *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 outline-none focus:border-amber-600 font-medium"
                >
                  <option value="">-- Choose Patient --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (📱 {c.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-stone-700 font-semibold block mb-1">Optometrist / Doctor</label>
                <select
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 outline-none focus:border-amber-600"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.qualification})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Power Input Grid */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-3">
              <div className="text-[11px] uppercase font-bold text-stone-600 flex justify-between">
                <span>Vision Power Matrix</span>
                <span className="text-amber-800">Snellen Acuity</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                  <thead className="bg-stone-100 text-stone-700 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-2 text-left">Eye</th>
                      <th className="py-2 px-1">Sphere (SPH)</th>
                      <th className="py-2 px-1">Cylinder (CYL)</th>
                      <th className="py-2 px-1">Axis (°)</th>
                      <th className="py-2 px-1">Addition (ADD)</th>
                      <th className="py-2 px-1">DV</th>
                      <th className="py-2 px-1">NV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {/* Right Eye */}
                    <tr>
                      <td className="py-2 px-2 text-left font-bold text-amber-900">
                        Right (OD)
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={rightEye.sph}
                          onChange={(e) => setRightEye({ ...rightEye, sph: e.target.value })}
                          placeholder="-1.50"
                          className="w-18 bg-white border border-stone-300 focus:border-amber-600 rounded p-1.5 text-center font-mono font-bold text-stone-900 text-xs"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={rightEye.cyl}
                          onChange={(e) => setRightEye({ ...rightEye, cyl: e.target.value })}
                          placeholder="-0.50"
                          className="w-18 bg-white border border-stone-300 focus:border-amber-600 rounded p-1.5 text-center font-mono font-bold text-stone-900 text-xs"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={rightEye.axis}
                          onChange={(e) => setRightEye({ ...rightEye, axis: e.target.value })}
                          placeholder="90"
                          className="w-14 bg-white border border-stone-300 focus:border-amber-600 rounded p-1.5 text-center font-mono text-stone-900 text-xs"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={rightEye.add}
                          onChange={(e) => setRightEye({ ...rightEye, add: e.target.value })}
                          placeholder="+1.50"
                          className="w-14 bg-white border border-stone-300 focus:border-amber-600 rounded p-1.5 text-center font-mono text-stone-900 text-xs"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <select
                          value={rightEye.dv}
                          onChange={(e) => setRightEye({ ...rightEye, dv: e.target.value })}
                          className="bg-white border border-stone-300 rounded p-1.5 text-stone-900 text-xs"
                        >
                          <option value="6/6">6/6</option>
                          <option value="6/9">6/9</option>
                          <option value="6/12">6/12</option>
                          <option value="6/18">6/18</option>
                          <option value="6/24">6/24</option>
                          <option value="6/36">6/36</option>
                          <option value="6/60">6/60</option>
                        </select>
                      </td>
                      <td className="py-1 px-1">
                        <select
                          value={rightEye.nv}
                          onChange={(e) => setRightEye({ ...rightEye, nv: e.target.value })}
                          className="bg-white border border-stone-300 rounded p-1.5 text-stone-900 text-xs"
                        >
                          <option value="N6">N6</option>
                          <option value="N8">N8</option>
                          <option value="N10">N10</option>
                          <option value="N12">N12</option>
                          <option value="N18">N18</option>
                        </select>
                      </td>
                    </tr>

                    {/* Left Eye */}
                    <tr>
                      <td className="py-2 px-2 text-left font-bold text-amber-800">
                        Left (OS)
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={leftEye.sph}
                          onChange={(e) => setLeftEye({ ...leftEye, sph: e.target.value })}
                          placeholder="-1.75"
                          className="w-18 bg-white border border-stone-300 focus:border-amber-600 rounded p-1.5 text-center font-mono font-bold text-stone-900 text-xs"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={leftEye.cyl}
                          onChange={(e) => setLeftEye({ ...leftEye, cyl: e.target.value })}
                          placeholder="-0.75"
                          className="w-18 bg-white border border-stone-300 focus:border-amber-600 rounded p-1.5 text-center font-mono font-bold text-stone-900 text-xs"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={leftEye.axis}
                          onChange={(e) => setLeftEye({ ...leftEye, axis: e.target.value })}
                          placeholder="85"
                          className="w-14 bg-white border border-stone-300 focus:border-amber-600 rounded p-1.5 text-center font-mono text-stone-900 text-xs"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <input
                          type="text"
                          value={leftEye.add}
                          onChange={(e) => setLeftEye({ ...leftEye, add: e.target.value })}
                          placeholder="+1.50"
                          className="w-14 bg-white border border-stone-300 focus:border-amber-600 rounded p-1.5 text-center font-mono text-stone-900 text-xs"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <select
                          value={leftEye.dv}
                          onChange={(e) => setLeftEye({ ...leftEye, dv: e.target.value })}
                          className="bg-white border border-stone-300 rounded p-1.5 text-stone-900 text-xs"
                        >
                          <option value="6/6">6/6</option>
                          <option value="6/9">6/9</option>
                          <option value="6/12">6/12</option>
                          <option value="6/18">6/18</option>
                          <option value="6/24">6/24</option>
                          <option value="6/36">6/36</option>
                          <option value="6/60">6/60</option>
                        </select>
                      </td>
                      <td className="py-1 px-1">
                        <select
                          value={leftEye.nv}
                          onChange={(e) => setLeftEye({ ...leftEye, nv: e.target.value })}
                          className="bg-white border border-stone-300 rounded p-1.5 text-stone-900 text-xs"
                        >
                          <option value="N6">N6</option>
                          <option value="N8">N8</option>
                          <option value="N10">N10</option>
                          <option value="N12">N12</option>
                          <option value="N18">N18</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lens Type & Recommendation Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-stone-600 block mb-1">Recommended Lens Type</label>
                <select
                  value={lensType}
                  onChange={(e) => setLensType(e.target.value as LensType)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                >
                  <option value="Single Vision">Single Vision</option>
                  <option value="Bifocal">Bifocal</option>
                  <option value="Progressive">Progressive / Multifocal</option>
                  <option value="Zero Power / Plano">Plano / Zero Power</option>
                  <option value="Contact Lens">Contact Lens</option>
                </select>
              </div>

              <div>
                <label className="text-stone-600 block mb-1">Lens Coating</label>
                <select
                  value={lensCoating}
                  onChange={(e) => setLensCoating(e.target.value as LensCoating)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                >
                  <option value="Blue Cut / Blue Block">Blue Cut / Blue Block</option>
                  <option value="HMC (Anti-Reflective)">Anti-Reflective HMC</option>
                  <option value="Photochromic / Transition">Photochromic Day/Night</option>
                  <option value="Blue Cut + Photochromic">Blue Cut + Photochromic</option>
                  <option value="Polycarbonate Anti-Impact">Polycarbonate</option>
                  <option value="Drivewear / Polarized">Polarized</option>
                </select>
              </div>

              <div>
                <label className="text-stone-600 block mb-1">PD (mm)</label>
                <input
                  type="text"
                  value={pdMm}
                  onChange={(e) => setPdMm(e.target.value)}
                  placeholder="e.g. 62"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono"
                />
              </div>
            </div>

            {/* Clinical Remarks & Checkup Interval */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="text-stone-600 block mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Night driving glare"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div>
                <label className="text-stone-600 block mb-1">Next Checkup</label>
                <select
                  value={nextCheckupMonths}
                  onChange={(e) => setNextCheckupMonths(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                >
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months (1 Year)</option>
                  <option value={24}>24 Months (2 Years)</option>
                </select>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Prescription
            </button>
          </form>
        </div>

        {/* Right 5 Cols: Prescription Slips & Recent Exam History */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Card Preview if available */}
          {selectedRxForCard && (
            <div className="bg-white border-2 border-amber-400 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Prescription Card
                </span>
                <span className="text-[10px] text-stone-500 font-mono">Date: {selectedRxForCard.date}</span>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2 text-xs">
                <div className="border-b border-stone-200 pb-1 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-stone-900 uppercase text-xs">{storeProfile.name}</h4>
                    <p className="text-[10px] text-stone-500">Optometrist: {selectedRxForCard.doctorName}</p>
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-stone-800">
                  Patient: {selectedRxForCard.customerName} (📱 {selectedRxForCard.customerMobile})
                </div>

                {/* Power Grid */}
                <table className="w-full text-center text-[10px] border border-stone-300 bg-white">
                  <thead className="bg-stone-100 font-bold text-stone-700">
                    <tr>
                      <th className="py-0.5 text-left pl-1">Eye</th>
                      <th className="py-0.5">SPH</th>
                      <th className="py-0.5">CYL</th>
                      <th className="py-0.5">AXIS</th>
                      <th className="py-0.5">ADD</th>
                      <th className="py-0.5">DV</th>
                      <th className="py-0.5">NV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    <tr>
                      <td className="py-0.5 text-left pl-1 font-bold">OD (R)</td>
                      <td className="py-0.5 font-bold">{selectedRxForCard.rightEye.sph}</td>
                      <td className="py-0.5">{selectedRxForCard.rightEye.cyl}</td>
                      <td className="py-0.5">{selectedRxForCard.rightEye.axis || '-'}</td>
                      <td className="py-0.5">{selectedRxForCard.rightEye.add || '-'}</td>
                      <td className="py-0.5">{selectedRxForCard.rightEye.dv}</td>
                      <td className="py-0.5">{selectedRxForCard.rightEye.nv}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-left pl-1 font-bold">OS (L)</td>
                      <td className="py-0.5 font-bold">{selectedRxForCard.leftEye.sph}</td>
                      <td className="py-0.5">{selectedRxForCard.leftEye.cyl}</td>
                      <td className="py-0.5">{selectedRxForCard.leftEye.axis || '-'}</td>
                      <td className="py-0.5">{selectedRxForCard.leftEye.add || '-'}</td>
                      <td className="py-0.5">{selectedRxForCard.leftEye.dv}</td>
                      <td className="py-0.5">{selectedRxForCard.leftEye.nv}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-[10px] text-stone-600 flex justify-between">
                  <span>Lens: {selectedRxForCard.lensType} ({selectedRxForCard.lensCoating})</span>
                  <span>PD: {selectedRxForCard.pdMm}mm</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  id="btn-whatsapp-rx"
                  onClick={() => handleWhatsAppRx(selectedRxForCard)}
                  className="py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  title="Send Rx via WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> 
                  <span>WhatsApp</span>
                </button>
                <button
                  id="btn-email-rx"
                  onClick={() => handleEmailRx(selectedRxForCard)}
                  className="py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  title="Send Rx via Email"
                >
                  <Mail className="w-3.5 h-3.5" /> 
                  <span>Email</span>
                </button>
                <button
                  id="btn-bill-glasses-from-rx"
                  onClick={() => setActiveTab('billing')}
                  className="py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Glasses className="w-3.5 h-3.5" /> 
                  <span>Bill POS</span>
                </button>
              </div>
            </div>
          )}

          {/* Past Refraction History Search */}
          <div className="bg-white border border-amber-200/80 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase">Recent Tests ({filteredRx.length})</span>
            </div>

            <input
              type="text"
              placeholder="Search patient name or mobile..."
              value={rxSearch}
              onChange={(e) => setRxSearch(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-amber-600"
            />

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredRx.map((rx) => (
                <div
                  key={rx.id}
                  onClick={() => setSelectedRxForCard(rx)}
                  className="p-3 bg-stone-50 hover:bg-amber-50/50 border border-stone-200 hover:border-amber-400 rounded-lg cursor-pointer transition-colors space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">{rx.customerName}</span>
                    <span className="text-[10px] text-stone-500">{rx.date}</span>
                  </div>
                  <div className="text-[11px] text-stone-600">
                    📱 {rx.customerMobile} • OD: {rx.rightEye.sph} / OS: {rx.leftEye.sph}
                  </div>
                  <div className="text-[10px] text-amber-800 font-medium flex items-center justify-between pt-1">
                    <span>{rx.lensType} • {rx.lensCoating}</span>
                    <span className="underline">View Card →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
