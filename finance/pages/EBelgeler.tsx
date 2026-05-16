import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Download, AlertCircle, CheckCircle2, Clock, FileText, Zap, Settings as SettingsIcon } from 'lucide-react';
import GradientHeader from '../../../components/GradientHeader';
import CustomSelect from '../../../components/CustomSelect';
import { efaturaService } from '../services/efaturaService';
import { EDocumentStatus, EDocumentType, EFaturaResponse } from '../../../shared/src';
import EFaturaSettingsForm from '../components/EFaturaSettingsForm';

const STATUS_LABELS: Record<EDocumentStatus, string> = {
    [EDocumentStatus.NOT_REQUESTED]: 'İstenmedi',
    [EDocumentStatus.QUEUED]: 'Kuyrukta',
    [EDocumentStatus.SENT_TO_PROVIDER]: 'BirFatura\'ya Gönderildi',
    [EDocumentStatus.PROVIDER_ACCEPTED]: 'Sağlayıcı Onayladı',
    [EDocumentStatus.GIB_PENDING]: 'GIB Bekliyor',
    [EDocumentStatus.GIB_ACCEPTED]: 'GIB Onayladı',
    [EDocumentStatus.GIB_REJECTED]: 'GIB Reddetti',
    [EDocumentStatus.FAILED]: 'Hata',
    [EDocumentStatus.CANCELLED]: 'İptal',
};

const STATUS_COLORS: Record<EDocumentStatus, string> = {
    [EDocumentStatus.NOT_REQUESTED]: 'bg-gray-100 text-gray-600',
    [EDocumentStatus.QUEUED]: 'bg-blue-100 text-blue-700',
    [EDocumentStatus.SENT_TO_PROVIDER]: 'bg-indigo-100 text-indigo-700',
    [EDocumentStatus.PROVIDER_ACCEPTED]: 'bg-purple-100 text-purple-700',
    [EDocumentStatus.GIB_PENDING]: 'bg-amber-100 text-amber-700',
    [EDocumentStatus.GIB_ACCEPTED]: 'bg-emerald-100 text-emerald-700',
    [EDocumentStatus.GIB_REJECTED]: 'bg-red-100 text-red-700',
    [EDocumentStatus.FAILED]: 'bg-red-100 text-red-700',
    [EDocumentStatus.CANCELLED]: 'bg-gray-100 text-gray-500',
};

const formatDate = (iso?: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
};

const EBelgeler: React.FC = () => {
    const [view, setView] = useState<'list' | 'settings'>('list');
    const [items, setItems] = useState<EFaturaResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<EDocumentStatus | 'ALL'>('ALL');
    const [retrying, setRetrying] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = statusFilter !== 'ALL' ? { status: [statusFilter] } : undefined;
            const result = await efaturaService.list(params);
            setItems(result.items);
        } catch (err) {
            setError((err as Error).message);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const handleRetry = async (id: string) => {
        setRetrying(id);
        try {
            await efaturaService.retry(id);
            await load();
        } catch (err) {
            alert(`Yeniden gönderme başarısız: ${(err as Error).message}`);
        } finally {
            setRetrying(null);
        }
    };

    const handleDownloadPdf = async (id: string) => {
        try {
            const url = await efaturaService.getPdfUrl(id);
            window.open(url, '_blank');
        } catch (err) {
            alert(`PDF alınamadı: ${(err as Error).message}`);
        }
    };

    const stats = useMemo(() => {
        const counts = items.reduce(
            (acc, it) => {
                if (it.status === EDocumentStatus.GIB_ACCEPTED) acc.accepted += 1;
                else if (it.status === EDocumentStatus.GIB_REJECTED || it.status === EDocumentStatus.FAILED) acc.failed += 1;
                else acc.pending += 1;
                return acc;
            },
            { accepted: 0, pending: 0, failed: 0 },
        );
        return counts;
    }, [items]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">
                <GradientHeader
                    icon="receipt_long"
                    title="E-Belgeler"
                    subtitle={view === 'settings' ? 'BirFatura entegrasyon ayarları' : `Toplam ${items.length} belge · ${stats.accepted} onaylı · ${stats.pending} bekliyor · ${stats.failed} hata`}
                >
                    <button
                        onClick={() => setView(view === 'settings' ? 'list' : 'settings')}
                        className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 transition flex items-center justify-center border border-white/20 text-white"
                        title="Ayarlar"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </button>
                    {view === 'list' && (
                        <button
                            onClick={load}
                            disabled={loading}
                            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 transition flex items-center justify-center border border-white/20 text-white disabled:opacity-50"
                            title="Yenile"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </GradientHeader>

                {view === 'settings' ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <EFaturaSettingsForm />
                    </div>
                ) : (
                <>
                {/* Filtre */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="w-64">
                        <CustomSelect
                            value={statusFilter}
                            onChange={(v) => setStatusFilter(v as EDocumentStatus | 'ALL')}
                            options={[
                                { value: 'ALL', label: 'Tüm Durumlar' },
                                ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })),
                            ]}
                            placeholder="Durum filtresi"
                        />
                    </div>
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Tablo */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-2xl shadow-soft">
                    {loading && items.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            Yükleniyor...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                            <FileText className="w-12 h-12 opacity-50" />
                            <p>Bu filtrede e-belge yok</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Tarih</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Tip</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Belge No</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Alıcı</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Tutar</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Durum</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it) => (
                                    <tr key={it.id} className="border-t hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-600">{formatDate(it.createdAt)}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={
                                                    'px-2 py-0.5 rounded-md text-xs font-medium ' +
                                                    (it.documentType === EDocumentType.EFATURA
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'bg-green-50 text-green-700')
                                                }
                                            >
                                                {it.documentType === EDocumentType.EFATURA ? 'e-Fatura' : 'e-Arşiv'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                            {it.documentNumber || it.uuid?.slice(0, 8) || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">-</td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {/* TotalAmount backend list endpoint'inde kurus olarak gelir */}
                                            -
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={
                                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ' +
                                                    STATUS_COLORS[it.status]
                                                }
                                            >
                                                {it.status === EDocumentStatus.GIB_ACCEPTED && <CheckCircle2 className="w-3 h-3" />}
                                                {(it.status === EDocumentStatus.GIB_PENDING || it.status === EDocumentStatus.QUEUED) && <Clock className="w-3 h-3" />}
                                                {(it.status === EDocumentStatus.GIB_REJECTED || it.status === EDocumentStatus.FAILED) && <AlertCircle className="w-3 h-3" />}
                                                {STATUS_LABELS[it.status]}
                                            </span>
                                            {it.errorMessage && (
                                                <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={it.errorMessage}>
                                                    {it.errorMessage}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                {it.pdfUrl && (
                                                    <button
                                                        onClick={() => handleDownloadPdf(it.id)}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100"
                                                        title="PDF İndir"
                                                    >
                                                        <Download className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                )}
                                                {(it.status === EDocumentStatus.FAILED || it.status === EDocumentStatus.GIB_REJECTED) && (
                                                    <button
                                                        onClick={() => handleRetry(it.id)}
                                                        disabled={retrying === it.id}
                                                        className="p-1.5 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                                                        title="Yeniden Dene"
                                                    >
                                                        <Zap className="w-4 h-4 text-blue-600" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                </>
                )}
            </div>
        </div>
    );
};

export default EBelgeler;
