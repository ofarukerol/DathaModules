import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../_shared/useEscapeKey';

interface EInvoiceIntegrationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DILEKCE_TEMPLATE = `
BANKA ADI: ____________________________
ŞUBE ADI: ____________________________

Sayın Yetkili,

Firmamızın aşağıda bilgileri bulunan hesabına ait hesap hareketlerinin,
muhasebe yazılımımız aracılığıyla elektronik ortamda otomatik olarak
çekilebilmesi için gerekli API / Open Banking erişim yetkisinin
tanımlanmasını talep ediyoruz.

FİRMA BİLGİLERİ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Firma Unvanı    : ____________________________
Vergi Dairesi   : ____________________________
Vergi No / TCKN : ____________________________
Ticaret Sicil No: ____________________________
Hesap No / IBAN : ____________________________

İLETİŞİM BİLGİLERİ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Yetkili Ad Soyad : ____________________________
Telefon          : ____________________________
E-Posta          : ____________________________

Gereğinin yapılmasını arz ederiz.

Tarih: ___/___/______

İmza & Kaşe


____________________________
(Firma Yetkilisi)
`.trim();

const EInvoiceIntegrationModal: React.FC<EInvoiceIntegrationModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<1 | 2>(1);
    useEscapeKey(onClose, isOpen);

    if (!isOpen) return null;

    const handleDownloadDilekce = () => {
        const blob = new Blob([DILEKCE_TEMPLATE], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Banka_Entegrasyon_Dilekce.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClose = () => {
        setStep(1);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative overflow-hidden">
                    <div
                        className="px-6 py-5"
                        style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 55%, #3d1d4b 100%)' }}
                    >
                        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
                            style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                                    <span className="material-symbols-outlined text-white text-[22px]">integration_instructions</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Banka Entegrasyonu</h3>
                                    <p className="text-white/60 text-xs mt-0.5">Hesap hareketlerini otomatik çekin</p>
                                </div>
                            </div>
                            <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={18} className="text-white/70" />
                            </button>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center gap-3 mt-4">
                            <div className="flex items-center gap-2 flex-1">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step >= 1 ? 'bg-white text-[#663259] border-white' : 'border-white/30 text-white/50'}`}>
                                    1
                                </div>
                                <span className={`text-xs font-bold transition-colors ${step >= 1 ? 'text-white' : 'text-white/40'}`}>Dilekçe</span>
                            </div>
                            <div className={`flex-1 h-0.5 rounded-full transition-colors ${step >= 2 ? 'bg-white/80' : 'bg-white/20'}`} />
                            <div className="flex items-center gap-2 flex-1 justify-end">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step >= 2 ? 'bg-white text-[#663259] border-white' : 'border-white/30 text-white/50'}`}>
                                    2
                                </div>
                                <span className={`text-xs font-bold transition-colors ${step >= 2 ? 'text-white' : 'text-white/40'}`}>Başvuru</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                {step === 1 ? (
                    <div className="p-6">
                        {/* Info Card */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-amber-600 text-[22px] shrink-0 mt-0.5">info</span>
                                <div>
                                    <p className="text-sm font-bold text-amber-800 mb-1">Banka Onayı Gerekli</p>
                                    <p className="text-xs text-amber-700 leading-relaxed">
                                        Banka hesap hareketlerinizi otomatik çekebilmemiz için bankanızın onayı gerekmektedir.
                                        Aşağıdaki dilekçeyi indirip doldurun.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="space-y-4 mb-6">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#663259]/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-black text-[#663259]">1</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Dilekçeyi İndirin</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Hazır dilekçe şablonunu indirip firma bilgilerinizi doldurun.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#663259]/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-black text-[#663259]">2</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Kaşe & İmza</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Dilekçeyi firma kaşesi ve yetkili imzası ile onaylayın.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#663259]/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-black text-[#663259]">3</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Şubeye İletin</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Kaşe/imzalı dilekçeyi banka şubenize götürün ve <strong>müşteri temsilcinize</strong> teslim edin.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Download Button */}
                        <button
                            onClick={handleDownloadDilekce}
                            className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all text-sm font-bold text-gray-700 active:scale-[0.98] mb-4"
                        >
                            <span className="material-symbols-outlined text-[20px] text-[#663259]">download</span>
                            Dilekçe Şablonunu İndir
                        </button>

                        {/* Action */}
                        <button
                            onClick={() => setStep(2)}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#663259] hover:bg-[#4a2340] text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-[#663259]/20 active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            Başvuru Yap
                        </button>
                    </div>
                ) : (
                    <div className="p-6">
                        {/* Success Illustration */}
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-green-500 text-[40px]">task_alt</span>
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mb-1">Başvurunuz Kaydedildi</h4>
                            <p className="text-sm text-gray-500 max-w-xs">
                                Entegrasyon başvurunuz alınmıştır. Banka onay sürecini takip edebilirsiniz.
                            </p>
                        </div>

                        {/* Status info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-blue-600 text-[22px] shrink-0 mt-0.5">schedule</span>
                                <div>
                                    <p className="text-sm font-bold text-blue-800 mb-1">Sonraki Adımlar</p>
                                    <ul className="text-xs text-blue-700 leading-relaxed space-y-1.5">
                                        <li className="flex items-start gap-1.5">
                                            <span className="text-blue-400 mt-0.5">•</span>
                                            Dilekçenizi kaşeleyip imzalayın
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <span className="text-blue-400 mt-0.5">•</span>
                                            Banka şubenize gidin ve müşteri temsilcinize teslim edin
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <span className="text-blue-400 mt-0.5">•</span>
                                            Banka onay süresi genellikle <strong>3-5 iş günü</strong> sürmektedir
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <span className="text-blue-400 mt-0.5">•</span>
                                            Onay sonrası API bilgileri size iletilecektir
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Contact info */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-gray-500 text-[18px]">support_agent</span>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Destek</p>
                            </div>
                            <p className="text-sm text-gray-600">
                                Entegrasyon sürecinde sorun yaşarsanız <strong>Destek</strong> bölümünden bize ulaşabilirsiniz.
                            </p>
                        </div>

                        {/* Close */}
                        <button
                            onClick={handleClose}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#663259] hover:bg-[#4a2340] text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-[#663259]/20 active:scale-[0.98]"
                        >
                            Tamam
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EInvoiceIntegrationModal;
