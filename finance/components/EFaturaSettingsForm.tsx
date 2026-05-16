import React, { useState } from 'react';
import { Save, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { efaturaService } from '../services/efaturaService';

const EFaturaSettingsForm: React.FC = () => {
    const { efaturaSettings, setEFaturaSettings } = useSettingsStore();
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const r = await efaturaService.ping();
            setTestResult({
                ok: r.ok,
                msg: r.ok
                    ? `Bağlantı başarılı (kontör: ${JSON.stringify(r.credits)})`
                    : r.error ?? 'Bilinmeyen hata',
            });
        } catch (err) {
            setTestResult({ ok: false, msg: (err as Error).message });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Mod */}
            <div className="bg-white rounded-2xl p-5 shadow-soft">
                <h3 className="font-bold text-base mb-4">E-Belge Modu</h3>
                <CustomSelect
                    value={efaturaSettings.mode}
                    onChange={(v) => setEFaturaSettings({ mode: v as 'AUTO' | 'MANUAL' | 'DISABLED' })}
                    options={[
                        { value: 'DISABLED', label: 'Devre Dışı', icon: 'block' },
                        { value: 'MANUAL', label: 'Manuel — Müşteri istediğinde', icon: 'fact_check' },
                        { value: 'AUTO', label: 'Otomatik — Her ödemede', icon: 'bolt' },
                    ]}
                    placeholder="Mod seçin"
                />
                <p className="text-xs text-gray-500 mt-2">
                    Manuel modda ödeme ekranında "Fatura İstiyorum" kutucuğu görünür. Otomatik modda her ödenen siparişe e-belge düzenlenir.
                </p>
            </div>

            {/* Belge tipi varsayilan */}
            <div className="bg-white rounded-2xl p-5 shadow-soft">
                <h3 className="font-bold text-base mb-4">Varsayılan Belge Tipi</h3>
                <CustomSelect
                    value={efaturaSettings.defaultDocumentType}
                    onChange={(v) => setEFaturaSettings({ defaultDocumentType: v as 'EFATURA' | 'EARSIV' | 'AUTO_DECIDE' })}
                    options={[
                        { value: 'AUTO_DECIDE', label: 'Otomatik (Önerilen) — VKN varsa e-Fatura, yoksa e-Arşiv' },
                        { value: 'EFATURA', label: 'e-Fatura (Hep B2B)' },
                        { value: 'EARSIV', label: 'e-Arşiv (Hep B2C)' },
                    ]}
                />
                <label className="flex items-center gap-2 mt-3 cursor-pointer text-sm">
                    <input
                        type="checkbox"
                        checked={efaturaSettings.fallbackToEArsivIfNoVkn}
                        onChange={(e) => setEFaturaSettings({ fallbackToEArsivIfNoVkn: e.target.checked })}
                        className="rounded"
                    />
                    VKN mükellef değilse otomatik e-Arşiv'e geç
                </label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer text-sm">
                    <input
                        type="checkbox"
                        checked={efaturaSettings.emailToCustomer}
                        onChange={(e) => setEFaturaSettings({ emailToCustomer: e.target.checked })}
                        className="rounded"
                    />
                    Müşteriye e-posta gönder
                </label>
            </div>

            {/* Mukellef bilgileri */}
            <div className="bg-white rounded-2xl p-5 shadow-soft">
                <h3 className="font-bold text-base mb-4">Mükellef Bilgileri</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-gray-700">VKN</label>
                        <input
                            type="text"
                            value={efaturaSettings.vkn}
                            onChange={(e) => setEFaturaSettings({ vkn: e.target.value })}
                            placeholder="10 haneli VKN"
                            maxLength={10}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Vergi Dairesi</label>
                        <input
                            type="text"
                            value={efaturaSettings.taxOffice}
                            onChange={(e) => setEFaturaSettings({ taxOffice: e.target.value })}
                            placeholder="Örn: Beyoğlu V.D."
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-[#663259] focus:ring-1 focus:ring-[#663259] outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium text-gray-700">e-Fatura Seri Ön Eki</label>
                            <input
                                type="text"
                                value={efaturaSettings.seriesPrefixEFatura}
                                onChange={(e) => setEFaturaSettings({ seriesPrefixEFatura: e.target.value })}
                                placeholder="Örn: DTH2026"
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#663259]"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">e-Arşiv Seri Ön Eki</label>
                            <input
                                type="text"
                                value={efaturaSettings.seriesPrefixEArsiv}
                                onChange={(e) => setEFaturaSettings({ seriesPrefixEArsiv: e.target.value })}
                                placeholder="Örn: DTA2026"
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#663259]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Test */}
            <div className="bg-white rounded-2xl p-5 shadow-soft">
                <h3 className="font-bold text-base mb-3">Bağlantı Testi</h3>
                <p className="text-xs text-gray-500 mb-3">
                    BirFatura sunucusuyla iletişimi test eder (kontör sorgular). Hatlar ve API anahtarları doğru ayarlanmış olmalıdır.
                </p>
                <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="flex items-center gap-2 px-4 py-2 bg-[#663259] text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                    <Zap className="w-4 h-4" />
                    {testing ? 'Test ediliyor...' : 'Bağlantıyı Test Et'}
                </button>
                {testResult && (
                    <div
                        className={
                            'mt-3 flex items-start gap-2 p-3 rounded-xl text-sm ' +
                            (testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')
                        }
                    >
                        {testResult.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                        <span>{testResult.msg}</span>
                    </div>
                )}
            </div>

            <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Save className="w-3 h-3" /> Değişiklikler otomatik kaydedilir.
            </p>
        </div>
    );
};

export default EFaturaSettingsForm;
