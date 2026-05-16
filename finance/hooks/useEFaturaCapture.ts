import { useCallback, useMemo } from 'react';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import {
    CreateEFaturaDTO,
    EDocumentType,
    EFaturaItem,
} from '../../../shared/src';
import { efaturaService } from '../services/efaturaService';

export interface PaymentContextForEFatura {
    tenantId: string;
    invoiceLocalId: string;
    orderId?: string;
    items: Array<{
        name: string;
        quantity: number;
        unitPriceKurus: number;
        taxRate: number;
        discountKurus?: number;
    }>;
    paymentMethod?: string;
    paidAt?: Date;
}

export interface RecipientInput {
    requested: boolean;          // 'Fatura Istiyorum' isaretli mi?
    name?: string;
    vkn?: string;
    tckn?: string;
    taxOffice?: string;
    email?: string;
    phone?: string;
    address?: string;
}

/**
 * Odeme akisi sirasinda fatura kesilip kesilmeyecegini ve payload'unu hazirlar.
 *
 * Kullanim:
 *  const { isEnabled, shouldCreate, capture, buildPayload } = useEFaturaCapture();
 *  if (shouldCreate(recipient)) {
 *      await capture(paymentContext, recipient);
 *  }
 *
 * KURAL 6: 4 POS sayfasi (Hizli/Gel-Al/Paket/Masa) bu hook'u ortak kullanir;
 * her sayfa kendi modal JSX'ini barindirir, ortak component'e cikarmaz.
 */
export function useEFaturaCapture() {
    const efaturaSettings = useSettingsStore((s) => s.efaturaSettings);

    const isEnabled = useMemo(() => efaturaSettings.mode !== 'DISABLED', [efaturaSettings.mode]);

    const shouldCreate = useCallback(
        (recipient: RecipientInput): boolean => {
            if (!isEnabled) return false;
            if (efaturaSettings.mode === 'AUTO') return true;
            // MANUAL: sadece tik isaretli ise
            return recipient.requested === true;
        },
        [isEnabled, efaturaSettings.mode],
    );

    const buildPayload = useCallback(
        (ctx: PaymentContextForEFatura, recipient: RecipientInput): CreateEFaturaDTO => {
            const items: EFaturaItem[] = ctx.items.map((it) => ({
                name: it.name,
                quantity: it.quantity,
                unitPriceKurus: it.unitPriceKurus,
                taxRate: it.taxRate,
                discountKurus: it.discountKurus,
            }));

            return {
                clientRequestId: crypto.randomUUID(),
                tenantId: ctx.tenantId,
                invoiceLocalId: ctx.invoiceLocalId,
                orderId: ctx.orderId,
                documentType: efaturaSettings.defaultDocumentType as EDocumentType,
                recipient: {
                    name: recipient.name?.trim() || 'NIHAI MUSTERI',
                    vkn: recipient.vkn,
                    tckn: recipient.tckn,
                    taxOffice: recipient.taxOffice ?? efaturaSettings.taxOffice,
                    email: recipient.email,
                    phone: recipient.phone,
                    address: recipient.address,
                },
                items,
                paymentMethod: ctx.paymentMethod,
                paidAt: (ctx.paidAt ?? new Date()).toISOString(),
                sendEmailToCustomer: efaturaSettings.emailToCustomer && !!recipient.email,
            };
        },
        [efaturaSettings],
    );

    /**
     * Online ise direkt backend'e POST eder; offline ise local queue'ya yazar.
     * Hata fırlatmaz — log basıp toast eden tarafa false döner.
     */
    const capture = useCallback(
        async (ctx: PaymentContextForEFatura, recipient: RecipientInput): Promise<{ queued: boolean; submittedOnline: boolean; error?: string }> => {
            const dto = buildPayload(ctx, recipient);
            // Once local queue'ya yaz (offline-first guvencesi)
            await efaturaService.enqueueLocally(dto);

            // Online ise hemen dene
            if (navigator.onLine !== false) {
                try {
                    await efaturaService.submit(dto);
                    return { queued: true, submittedOnline: true };
                } catch (err) {
                    return {
                        queued: true,
                        submittedOnline: false,
                        error: (err as Error).message,
                    };
                }
            }
            return { queued: true, submittedOnline: false };
        },
        [buildPayload],
    );

    return { isEnabled, shouldCreate, buildPayload, capture, settings: efaturaSettings };
}
