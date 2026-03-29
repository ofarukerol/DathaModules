import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer, CustomerSegment, CustomerNote, SpecialOffer, SpecialOfferType, NonPayableReason } from './types';
import { uuidv7 } from '@/utils/uuid';

export type { Customer, CustomerSegment, CustomerNote, SpecialOffer, SpecialOfferType, NonPayableReason };

interface CustomerState {
    customers: Customer[];
    nonPayableReasons: NonPayableReason[];
    addCustomer: (customer: Omit<Customer, 'id'>) => void;
    updateCustomer: (id: string, data: Partial<Customer>) => void;
    deleteCustomer: (id: string) => void;
    ensureDemoCustomers: () => void;
    clearDemoCustomers: () => void;
}

const DEMO_CUSTOMERS: Customer[] = [
    {
        id: 'demo-c1',
        name: 'Defne Yılmaz',
        phone: '+90 532 555 0123',
        addressLine1: 'Konaklar Mah. Meşeli Sok. No:12',
        addressLine2: 'Mimoza Apt. Kat:3 D:5',
        ulke: 'Türkiye',
        il: 'İstanbul',
        ilce: 'Beşiktaş',
        mahalle: 'Konaklar Mah.',
        directions: "Migros'un arkasındaki sokak",
        address: 'Konaklar Mah. Meşeli Sok. No:12, Beşiktaş, İstanbul',
        isVip: true,
        recentOrders: 5,
        balance: 0,
        notes: 'Müşteri zili çalışmıyor, geldiğinizde lütfen telefonla arayın. Acı sos ekstra istiyor.',
        segment: 'vip',
        city: 'İstanbul, Türkiye',
        avgSpending: 1850,
        lastVisit: '1 Gün Önce',
        favoriteProducts: ['Latte', 'Cheesecake', 'Brownie'],
    },
    {
        id: 'demo-c2',
        name: 'Mehmet Demir',
        phone: '+90 555 123 4567',
        addressLine1: 'Caferağa Mah. Moda Cad. No:45',
        addressLine2: 'Kat:2 D:3',
        ulke: 'Türkiye',
        il: 'İstanbul',
        ilce: 'Kadıköy',
        mahalle: 'Caferağa Mah.',
        address: 'Caferağa Mah. Moda Cad. No:45, Kadıköy, İstanbul',
        isVip: false,
        recentOrders: 2,
        balance: 0,
        segment: 'aktif',
        city: 'İstanbul, Türkiye',
        avgSpending: 480,
        lastVisit: '1 Hafta Önce',
        favoriteProducts: ['Filtre Kahve', 'Cookie'],
    },
    {
        id: 'demo-c3',
        name: 'Ayşe Kaya',
        phone: '+90 533 987 6543',
        addressLine1: 'Halaskargazi Cad. No:78',
        addressLine2: 'B Blok Kat:5 D:10',
        ulke: 'Türkiye',
        il: 'İstanbul',
        ilce: 'Şişli',
        mahalle: 'Halaskargazi Mah.',
        address: 'Halaskargazi Cad. No:78, Şişli, İstanbul',
        isVip: false,
        recentOrders: 1,
        balance: 0,
        segment: 'potansiyel',
        city: 'İstanbul, Türkiye',
        avgSpending: 320,
        lastVisit: '2 Hafta Önce',
        favoriteProducts: ['Türk Kahvesi'],
    },
    {
        id: 'demo-c4',
        name: 'Ahmet Demir',
        phone: '+90 542 678 9012',
        email: 'ahmet.demir@email.com',
        ulke: 'Türkiye',
        il: 'Antalya',
        address: 'Lara Mah. Güzelyalı Cad. No:8, Muratpaşa, Antalya',
        isVip: true,
        recentOrders: 12,
        balance: 0,
        segment: 'vip',
        city: 'Antalya, Türkiye',
        avgSpending: 1250,
        lastVisit: '2 Gün Önce',
        favoriteProducts: ['Latte', 'Cheesecake'],
    },
    {
        id: 'demo-c5',
        name: 'Zeynep Kaya',
        phone: '+90 536 345 6789',
        email: 'zeynep.k@email.com',
        ulke: 'Türkiye',
        il: 'İstanbul',
        address: 'Cihangir Mah. Akarsu Cad. No:22, Beyoğlu, İstanbul',
        isVip: false,
        recentOrders: 3,
        balance: 0,
        segment: 'potansiyel',
        city: 'İstanbul, Türkiye',
        avgSpending: 480,
        lastVisit: '1 Hafta Önce',
        favoriteProducts: ['Filtre Kahve', 'Cookie'],
    },
    {
        id: 'demo-c6',
        name: 'Mehmet Yılmaz',
        phone: '+90 505 111 2233',
        ulke: 'Türkiye',
        il: 'İzmir',
        address: 'Alsancak Mah. Kıbrıs Şehitleri Cad. No:15, Konak, İzmir',
        isVip: false,
        recentOrders: 0,
        balance: 0,
        segment: 'yeni',
        city: 'İzmir, Türkiye',
        avgSpending: 350,
        lastVisit: 'Bugün',
        favoriteProducts: ['Türk Kahvesi'],
        registrationDate: 'Bugün',
    },
    {
        id: 'demo-c7',
        name: 'Elif Can',
        phone: '+90 544 222 3344',
        email: 'elif.can@email.com',
        ulke: 'Türkiye',
        il: 'Ankara',
        address: 'Bahçelievler Mah. 7. Cad. No:32, Çankaya, Ankara',
        isVip: false,
        recentOrders: 8,
        balance: 0,
        segment: 'aktif',
        city: 'Ankara, Türkiye',
        avgSpending: 920,
        lastVisit: '3 Gün Önce',
        favoriteProducts: ['Ice Latte', 'Tiramisu'],
    },
    {
        id: 'demo-c8',
        name: 'Ayşe Yüksel',
        phone: '+90 538 444 5566',
        email: 'ayse.yuksel@email.com',
        ulke: 'Türkiye',
        il: 'Antalya',
        address: 'Konyaaltı Mah. Atatürk Blv. No:55, Konyaaltı, Antalya',
        isVip: true,
        recentOrders: 25,
        balance: 0,
        segment: 'vip',
        city: 'Antalya, Türkiye',
        avgSpending: 2450,
        lastVisit: 'Dün',
        favoriteProducts: ['Special Blend', 'Kruvasan', 'Mocha'],
    },
    {
        id: 'demo-c9',
        name: 'Canan Kara',
        phone: '+90 507 666 7788',
        ulke: 'Türkiye',
        il: 'Bursa',
        address: 'Nilüfer Mah. Özlüce Cad. No:10, Nilüfer, Bursa',
        isVip: false,
        recentOrders: 1,
        balance: 0,
        segment: 'pasif',
        city: 'Bursa, Türkiye',
        avgSpending: 120,
        lastVisit: '3 Ay Önce',
        favoriteProducts: ['Çay'],
    },
];

// @ts-expect-error reserved for future seeding
const SAMPLE_CUSTOMERS: Customer[] = [
    {
        id: 'sample-c1',
        name: 'Ahmet Yılmaz',
        phone: '+90 532 100 0001',
        email: 'ahmet.yilmaz@email.com',
        addressLine1: 'Bağcılar Mah. Cumhuriyet Cad. No:12',
        ulke: 'Türkiye', il: 'İstanbul', ilce: 'Bağcılar',
        balance: 0, segment: 'aktif', avgSpending: 650,
        lastVisit: '2 Gün Önce', recentOrders: 7,
        registrationDate: '2024-06-15',
    },
    {
        id: 'sample-c2',
        name: 'Fatma Şahin',
        phone: '+90 533 100 0002',
        email: 'fatma.sahin@email.com',
        addressLine1: 'Çankaya Mah. Tunalı Hilmi Cad. No:45',
        ulke: 'Türkiye', il: 'Ankara', ilce: 'Çankaya',
        isVip: true, balance: 0, segment: 'vip', avgSpending: 1800,
        lastVisit: 'Dün', recentOrders: 18,
        registrationDate: '2024-01-10',
    },
    {
        id: 'sample-c3',
        name: 'Mehmet Kara',
        phone: '+90 534 100 0003',
        addressLine1: 'Konak Mah. Atatürk Cad. No:88',
        ulke: 'Türkiye', il: 'İzmir', ilce: 'Konak',
        balance: 0, segment: 'aktif', avgSpending: 420,
        lastVisit: '1 Hafta Önce', recentOrders: 4,
        registrationDate: '2024-09-20',
    },
    {
        id: 'sample-c4',
        name: 'Zeynep Arslan',
        phone: '+90 535 100 0004',
        email: 'zeynep.arslan@email.com',
        addressLine1: 'Muratpaşa Mah. Şarampol Cad. No:22',
        ulke: 'Türkiye', il: 'Antalya', ilce: 'Muratpaşa',
        balance: 0, segment: 'yeni', avgSpending: 280,
        lastVisit: 'Bugün', recentOrders: 1,
        registrationDate: '2026-02-18',
    },
    {
        id: 'sample-c5',
        name: 'Ali Çelik',
        phone: '+90 536 100 0005',
        email: 'ali.celik@email.com',
        addressLine1: 'Nilüfer Mah. Beşevler Cad. No:5',
        ulke: 'Türkiye', il: 'Bursa', ilce: 'Nilüfer',
        isVip: true, balance: 0, segment: 'vip', avgSpending: 2200,
        lastVisit: '3 Gün Önce', recentOrders: 22,
        registrationDate: '2023-11-05',
    },
    {
        id: 'sample-c6',
        name: 'Elif Demir',
        phone: '+90 537 100 0006',
        addressLine1: 'Seyhan Mah. Ziyapaşa Blv. No:67',
        ulke: 'Türkiye', il: 'Adana', ilce: 'Seyhan',
        balance: 0, segment: 'aktif', avgSpending: 540,
        lastVisit: '4 Gün Önce', recentOrders: 9,
        registrationDate: '2024-04-12',
    },
    {
        id: 'sample-c7',
        name: 'Hasan Özkan',
        phone: '+90 538 100 0007',
        email: 'hasan.ozkan@email.com',
        addressLine1: 'Selçuklu Mah. Ankara Cad. No:34',
        ulke: 'Türkiye', il: 'Konya', ilce: 'Selçuklu',
        balance: 0, segment: 'potansiyel', avgSpending: 310,
        lastVisit: '2 Hafta Önce', recentOrders: 2,
        registrationDate: '2025-08-30',
    },
    {
        id: 'sample-c8',
        name: 'Ayşe Güler',
        phone: '+90 539 100 0008',
        email: 'ayse.guler@email.com',
        addressLine1: 'Osmangazi Mah. İnönü Cad. No:18',
        ulke: 'Türkiye', il: 'Eskişehir', ilce: 'Odunpazarı',
        balance: 0, segment: 'aktif', avgSpending: 780,
        lastVisit: '5 Gün Önce', recentOrders: 11,
        registrationDate: '2024-02-28',
    },
    {
        id: 'sample-c9',
        name: 'Mustafa Aydın',
        phone: '+90 540 100 0009',
        addressLine1: 'Melikgazi Mah. Sivas Cad. No:101',
        ulke: 'Türkiye', il: 'Kayseri', ilce: 'Melikgazi',
        balance: 0, segment: 'pasif', avgSpending: 150,
        lastVisit: '1 Ay Önce', recentOrders: 1,
        registrationDate: '2025-05-14',
    },
    {
        id: 'sample-c10',
        name: 'Selin Öztürk',
        phone: '+90 541 100 0010',
        email: 'selin.ozturk@email.com',
        addressLine1: 'Bornova Mah. Kazımdirik Cad. No:77',
        ulke: 'Türkiye', il: 'İzmir', ilce: 'Bornova',
        isVip: false, balance: 0, segment: 'aktif', avgSpending: 920,
        lastVisit: '1 Gün Önce', recentOrders: 14,
        registrationDate: '2023-12-20',
    },
];

export const useCustomerStore = create<CustomerState>()(
    persist(
        (set, get) => ({
            customers: [],
            nonPayableReasons: [
                { id: 'np-1', name: 'Personel Yemek', type: 'personel' },
                { id: 'np-2', name: 'Patron İkramı', type: 'ikram' },
                { id: 'np-3', name: 'Müşteri İkramı', type: 'ikram' },
                { id: 'np-4', name: 'Diğer', type: 'diger' },
            ],

            addCustomer: (customer) =>
                set((state) => ({
                    customers: [
                        ...state.customers,
                        { ...customer, id: uuidv7() },
                    ],
                })),

            updateCustomer: (id, data) =>
                set((state) => ({
                    customers: state.customers.map((c) =>
                        c.id === id ? { ...c, ...data } : c
                    ),
                })),

            deleteCustomer: (id) =>
                set((state) => ({
                    customers: state.customers.filter((c) => c.id !== id),
                })),

            ensureDemoCustomers: () => {
                const { customers } = get();
                const missing = DEMO_CUSTOMERS.filter(d => !customers.find(c => c.id === d.id));
                if (missing.length > 0) {
                    set((state) => ({ customers: [...missing, ...state.customers] }));
                }
            },

            clearDemoCustomers: () =>
                set((state) => ({
                    customers: state.customers.filter((c) => !c.id.startsWith('demo-')),
                })),
        }),
        {
            name: 'customer-storage',
            version: 3,
            migrate: (persistedState: unknown, version) => {
                if (version < 3) {
                    const old = persistedState as Partial<CustomerState>;
                    const realCustomers = (old.customers || []).filter(
                        (c: Customer) => !c.id.startsWith('demo-') && !c.id.startsWith('sample-')
                    );
                    return { customers: realCustomers };
                }
                return persistedState;
            },
        }
    )
);
