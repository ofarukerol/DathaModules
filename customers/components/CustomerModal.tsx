import React, { useState, useEffect } from 'react';
import { useCustomerStore } from '../store';
import { useAddressPrefsStore } from '../addressPrefsStore';
import type { Customer } from '../types';
import AddressFields from './AddressFields';
import DatePicker from '../../../components/DatePicker';

interface CustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerToEdit?: Customer | null;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customerToEdit }) => {
    const { addCustomer, updateCustomer } = useCustomerStore();
    const {
        ulke: prefUlke, il: prefIl, ilce: prefIlce, mahalle: prefMahalle,
        setAllDefaults,
    } = useAddressPrefsStore();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [birthday, setBirthday] = useState('');
    const [notes, setNotes] = useState('');
    const [addrFields, setAddrFields] = useState({
        ulke: '', il: '', ilce: '', mahalle: '',
        line1: '', line2: '', directions: '',
    });

    const stripCountryCode = (p: string): string => {
        const cleaned = p.replace(/\s/g, '');
        if (cleaned.startsWith('+90')) return cleaned.slice(3);
        if (cleaned.startsWith('90') && cleaned.length > 10) return cleaned.slice(2);
        if (cleaned.startsWith('0') && cleaned.length === 11) return cleaned.slice(1);
        return cleaned;
    };

    const formatPhoneDisplay = (digits: string): string => {
        const d = digits.replace(/\D/g, '').slice(0, 10);
        if (d.length <= 3) return d;
        if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
        if (d.length <= 8) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
        return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
    };

    const handlePhoneChange = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 10);
        setPhone(formatPhoneDisplay(digits));
    };

    const validateEmail = (val: string): boolean => {
        if (!val.trim()) return true;
        if (/[çğıöşüÇĞİÖŞÜ]/.test(val)) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    };

    const handleEmailChange = (val: string) => {
        setEmail(val);
        if (emailError && (val.trim() === '' || validateEmail(val))) {
            setEmailError('');
        }
    };

    useEffect(() => {
        if (customerToEdit) {
            setName(customerToEdit.name);
            setPhone(formatPhoneDisplay(stripCountryCode(customerToEdit.phone)));
            setEmail(customerToEdit.email || '');
            setEmailError('');
            setBirthday(customerToEdit.birthday || '');
            setNotes(customerToEdit.notes || '');
            setAddrFields({
                ulke: customerToEdit.ulke || prefUlke || 'Türkiye',
                il: customerToEdit.il || prefIl || '',
                ilce: customerToEdit.ilce || prefIlce || '',
                mahalle: customerToEdit.mahalle || prefMahalle || '',
                line1: customerToEdit.addressLine1 || '',
                line2: customerToEdit.addressLine2 || '',
                directions: customerToEdit.directions || '',
            });
        } else {
            setName('');
            setPhone('');
            setEmail('');
            setEmailError('');
            setBirthday('');
            setNotes('');
            setAddrFields({
                ulke: prefUlke || 'Türkiye',
                il: prefIl || '',
                ilce: prefIlce || '',
                mahalle: prefMahalle || '',
                line1: '', line2: '', directions: '',
            });
        }
    }, [customerToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!name.trim()) return;

        if (email.trim() && !validateEmail(email)) {
            setEmailError(/[çğıöşüÇĞİÖŞÜ]/.test(email) ? 'E-posta Türkçe karakter içeremez' : 'Geçerli bir e-posta adresi girin');
            return;
        }

        setAllDefaults({ ulke: addrFields.ulke, il: addrFields.il, ilce: addrFields.ilce, mahalle: addrFields.mahalle });

        const phoneDigits = phone.replace(/\D/g, '');
        const fullPhone = phoneDigits ? `+90${phoneDigits}` : '';

        const addressData = {
            name, phone: fullPhone, email: email.trim(), notes,
            birthday: birthday || undefined,
            ulke: addrFields.ulke || undefined,
            il: addrFields.il || undefined,
            ilce: addrFields.ilce || undefined,
            mahalle: addrFields.mahalle || undefined,
            addressLine1: addrFields.line1 || undefined,
            addressLine2: addrFields.line2 || undefined,
            directions: addrFields.directions || undefined,
            address: [addrFields.line1, addrFields.ilce, addrFields.il].filter(Boolean).join(', ') || undefined,
        };

        if (customerToEdit) {
            updateCustomer(customerToEdit.id, addressData);
        } else {
            addCustomer({ ...addressData, balance: 0 });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-[540px] max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#663259]">person_add</span>
                        <h2 className="text-lg font-bold text-gray-800">
                            {customerToEdit ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-400 text-[20px]">close</span>
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(85vh-130px)] custom-scrollbar">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Ad Soyad *</label>
                        <input
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#663259]/30 text-sm"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Müşteri adı"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Telefon</label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-sm text-gray-400 font-medium select-none pointer-events-none">+90</span>
                            <input
                                className="w-full pl-11 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#663259]/30 text-sm"
                                value={phone}
                                onChange={(e) => handlePhoneChange(e.target.value)}
                                placeholder="554 329 02 51"
                                inputMode="numeric"
                                maxLength={13}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">E-posta</label>
                        <input
                            className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-sm ${emailError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#663259]/30'}`}
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            onBlur={() => { if (email.trim() && !validateEmail(email)) setEmailError(/[çğıöşüÇĞİÖŞÜ]/.test(email) ? 'E-posta Türkçe karakter içeremez' : 'Geçerli bir e-posta adresi girin'); }}
                            placeholder="ornek@email.com"
                            type="email"
                        />
                        {emailError && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">error</span>
                                {emailError}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Doğum Tarihi</label>
                        <DatePicker
                            value={birthday}
                            onChange={setBirthday}
                            placeholder="Doğum tarihi seçin"
                            icon="cake"
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Adres</label>
                        <AddressFields
                            values={{ ulke: addrFields.ulke, il: addrFields.il, ilce: addrFields.ilce, mahalle: addrFields.mahalle }}
                            onChange={(field, value) => setAddrFields(f => ({ ...f, [field]: value }))}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Sokak / Cadde / No</label>
                        <input
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#663259]/30 text-sm"
                            value={addrFields.line1}
                            onChange={(e) => setAddrFields(f => ({ ...f, line1: e.target.value }))}
                            placeholder="Örn: Atatürk Cad. No:12"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Daire / Kat / Blok</label>
                        <input
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#663259]/30 text-sm"
                            value={addrFields.line2}
                            onChange={(e) => setAddrFields(f => ({ ...f, line2: e.target.value }))}
                            placeholder="Örn: B Blok Kat:3 D:7"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tarif (opsiyonel)</label>
                        <input
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#663259]/30 text-sm"
                            value={addrFields.directions}
                            onChange={(e) => setAddrFields(f => ({ ...f, directions: e.target.value }))}
                            placeholder="Örn: Migros'un karşısındaki bina..."
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Not</label>
                        <textarea
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#663259]/30 text-sm resize-none"
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Müşteri notu..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm font-bold text-white bg-[#663259] rounded-xl hover:bg-[#7a3d6b] transition-colors"
                    >
                        {customerToEdit ? 'Güncelle' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerModal;
