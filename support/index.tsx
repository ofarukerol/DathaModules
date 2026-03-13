import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupportStore } from './store';
import { toast } from './toastStore';
import { liveChatApi, liveChatSocket } from './store';
import { useLiveChatStore } from './store';
import type {
    SupportTicket,
    SupportTicketMessage,
    SupportArticle,
    SupportTicketCategory,
    SupportTicketPriority,
    ChatMessage,
    ChatConversation,
} from './types';
import { useEscapeKey } from '../_shared/useEscapeKey';
import avatarFemale from './assets/avatar-female.svg';
import avatarMale from './assets/avatar-male.svg';

/* ─── Türkçe kadın isim seti (cinsiyet tespiti) ─── */
const FEMALE_NAMES = new Set([
    'zeynep','ayşe','fatma','elif','merve','büşra','esra','seda','gül','gülşen',
    'derya','hülya','sibel','sevgi','sevda','nazlı','ceren','yasemin','aslı',
    'ebru','pınar','gamze','neslihan','özge','tuğba','cansu','melek','leyla','nurgül',
    'hatice','emine','havva','rabia','selin','berna','burcu','dilek','nuray','filiz',
    'aysun','oya','songül','gülcan','bahar','defne','ece','ilknur','mine','nihal',
    'serap','şeyma','betül','irem','aleyna','su','ada','nehir','duru','sera',
]);

const detectGender = (firstName: string): 'female' | 'male' => {
    if (FEMALE_NAMES.has(firstName.toLowerCase())) return 'female';
    return 'male';
};

const getAvatarForName = (firstName: string): string => {
    return detectGender(firstName) === 'female' ? avatarFemale : avatarMale;
};

/* ─── Varsayılan Temsilci Bilgisi ─── */
const DEFAULT_REPRESENTATIVE = {
    name: 'Datha Destek',
    role: 'Teknik Destek Uzmanı',
    initials: 'DD',
    avatar: avatarMale,
};

/* ─── Karşılama Mesajları (random seçilir) ─── */
const GREETING_MESSAGES = [
    'Merhabalar, size nasıl yardımcı olabilirim?',
    'Hoş geldiniz! Bugün size nasıl destek olabilirim?',
    'Merhaba, Datha Destek hattına hoş geldiniz. Nasıl yardımcı olabilirim?',
    'İyi günler, size nasıl yardımcı olabilirim?',
    'Merhaba, destek ekibimize hoş geldiniz. Sizi dinliyorum.',
    'Merhabalar, Datha Destek\'e bağlandınız. Size nasıl yardımcı olabilirim?',
    'Hoş geldiniz! Sorunuzu veya isteğinizi paylaşabilirsiniz.',
    'Merhaba, yardımcı olmak için buradayım. Nasıl destek olabilirim?',
    'İyi günler, Datha Destek hattına hoş geldiniz. Sizi dinliyorum.',
    'Merhabalar! Size en iyi şekilde yardımcı olmaya çalışacağım. Buyurun.',
];

const NAME_ASK_MESSAGES = [
    'Hitap edebilmem için adınızı öğrenebilir miyim?',
    'Size nasıl hitap etmemi istersiniz?',
    'Adınızı öğrenebilir miyim?',
    'İsminizi öğrenebilir miyim, daha rahat iletişim kuralım.',
    'Size isminizle hitap etmek isterim, adınızı paylaşır mısınız?',
];

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/* ─── Sabit Haritalar ─── */
const STATUS_MAP: Record<string, { label: string; color: string; dotColor: string; borderColor: string }> = {
    OPEN: { label: 'Açık', color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-500', borderColor: 'border-blue-200' },
    IN_PROGRESS: { label: 'İnceleniyor', color: 'bg-yellow-100 text-yellow-800', dotColor: 'bg-yellow-500', borderColor: 'border-yellow-200' },
    WAITING_CUSTOMER: { label: 'Yanıt Bekleniyor', color: 'bg-orange-100 text-orange-800', dotColor: 'bg-orange-500', borderColor: 'border-orange-200' },
    RESOLVED: { label: 'Çözüldü', color: 'bg-green-100 text-green-800', dotColor: 'bg-green-500', borderColor: 'border-green-200' },
    CLOSED: { label: 'Kapalı', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400', borderColor: 'border-gray-200' },
};

const CATEGORY_MAP: Record<string, { label: string; icon: string; chipColor: string }> = {
    TECHNICAL: { label: 'Teknik', icon: 'build', chipColor: 'bg-blue-100 text-blue-800' },
    ACCOUNTING: { label: 'Muhasebe', icon: 'receipt_long', chipColor: 'bg-purple-100 text-purple-800' },
    SALES: { label: 'Satış', icon: 'storefront', chipColor: 'bg-green-100 text-green-800' },
    SETUP: { label: 'Kurulum', icon: 'settings_suggest', chipColor: 'bg-amber-100 text-amber-800' },
    REPORTING: { label: 'Raporlama', icon: 'assessment', chipColor: 'bg-indigo-100 text-indigo-800' },
    INTEGRATION: { label: 'Entegrasyon', icon: 'sync_alt', chipColor: 'bg-teal-100 text-teal-800' },
    GENERAL: { label: 'Genel', icon: 'help_outline', chipColor: 'bg-gray-100 text-gray-700' },
};

const CATEGORY_OPTIONS: { value: SupportTicketCategory; label: string }[] = [
    { value: 'GENERAL', label: 'Genel' },
    { value: 'TECHNICAL', label: 'Teknik' },
    { value: 'ACCOUNTING', label: 'Muhasebe' },
    { value: 'SALES', label: 'Satış' },
    { value: 'SETUP', label: 'Kurulum' },
    { value: 'REPORTING', label: 'Raporlama' },
    { value: 'INTEGRATION', label: 'Entegrasyon' },
];

const PRIORITY_OPTIONS: { value: SupportTicketPriority; label: string }[] = [
    { value: 'LOW', label: 'Düşük' },
    { value: 'MEDIUM', label: 'Orta' },
    { value: 'HIGH', label: 'Yüksek' },
    { value: 'URGENT', label: 'Acil' },
];

const DOC_CATEGORIES: {
    title: string; description: string; icon: string; filterKey: SupportTicketCategory;
    iconBg: string; iconColor: string; hoverIconBg: string; cornerBg: string;
    countColor: string; hoverCountColor: string;
}[] = [
    {
        title: 'Başlangıç & Kurulum',
        description: 'Hesap oluşturma, ilk ayarlar ve sisteme giriş adımları hakkında detaylı rehber.',
        icon: 'rocket_launch',
        filterKey: 'SETUP',
        iconBg: 'bg-purple-100',
        iconColor: 'text-[#663259]',
        hoverIconBg: 'group-hover:bg-[#663259]',
        cornerBg: 'bg-purple-50',
        countColor: 'text-[#663259]',
        hoverCountColor: 'group-hover:text-[#F97171]',
    },
    {
        title: 'Satış İşlemleri',
        description: 'POS kullanımı, satış iptali, iade süreçleri ve günlük kasa işlemleri.',
        icon: 'point_of_sale',
        filterKey: 'SALES',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        hoverIconBg: 'group-hover:bg-green-600',
        cornerBg: 'bg-green-50',
        countColor: 'text-green-600',
        hoverCountColor: 'group-hover:text-green-700',
    },
    {
        title: 'Raporlama',
        description: 'Gün sonu raporları, ciro analizleri ve performans metriklerini okuma kılavuzu.',
        icon: 'bar_chart',
        filterKey: 'REPORTING',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        hoverIconBg: 'group-hover:bg-blue-600',
        cornerBg: 'bg-blue-50',
        countColor: 'text-blue-600',
        hoverCountColor: 'group-hover:text-blue-700',
    },
    {
        title: 'Teknik Destek',
        description: 'Sistem hataları, bağlantı sorunları ve teknik altyapı çözümleri.',
        icon: 'build',
        filterKey: 'TECHNICAL',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        hoverIconBg: 'group-hover:bg-amber-600',
        cornerBg: 'bg-amber-50',
        countColor: 'text-amber-600',
        hoverCountColor: 'group-hover:text-amber-700',
    },
    {
        title: 'Muhasebe & Finans',
        description: 'Fatura, ödeme, kasa işlemleri ve muhasebe entegrasyonları.',
        icon: 'receipt_long',
        filterKey: 'ACCOUNTING',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        hoverIconBg: 'group-hover:bg-indigo-600',
        cornerBg: 'bg-indigo-50',
        countColor: 'text-indigo-600',
        hoverCountColor: 'group-hover:text-indigo-700',
    },
    {
        title: 'Entegrasyon',
        description: 'Üçüncü parti yazılım ve API entegrasyonları rehberi.',
        icon: 'sync_alt',
        filterKey: 'INTEGRATION',
        iconBg: 'bg-teal-100',
        iconColor: 'text-teal-600',
        hoverIconBg: 'group-hover:bg-teal-600',
        cornerBg: 'bg-teal-50',
        countColor: 'text-teal-600',
        hoverCountColor: 'group-hover:text-teal-700',
    },
];

/* ─── Yardımcı Fonksiyonlar ─── */
const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dk önce`;
    if (diffHour < 24) return `${diffHour} saat önce`;
    if (diffDay === 1) return `Dün, ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDay < 7) return `${diffDay} gün önce`;
    return formatDate(dateStr);
};

const shortId = (id: string) => {
    if (id.length > 10) return `#TR-${id.slice(-4).toUpperCase()}`;
    return `#${id}`;
};

const cleanSubject = (subject: string) =>
    subject.replace(/^\[AI Escalation\]\s*/i, '').trim();

/* ─── Ana Bileşen ─── */
const Support: React.FC = () => {
    const navigate = useNavigate();
    const {
        tickets, articles, selectedTicket, isLoading, isArticlesLoading, isDetailLoading,
        fetchTickets, fetchArticles, loadTicketDetail, createTicket, sendMessage, clearSelectedTicket,
    } = useSupportStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewTicketModal, setShowNewTicketModal] = useState(false);
    const [showDocsView, setShowDocsView] = useState(false);
    const [docsFilter, setDocsFilter] = useState<SupportTicketCategory | 'ALL'>('ALL');
    const [selectedArticle, setSelectedArticle] = useState<SupportArticle | null>(null);

    // Chat panel — Live Chat (persistent state → Zustand store)
    const {
        chatPhase, setChatPhase,
        chatConversation, setChatConversation,
        chatMessages, setChatMessages,
        queuePosition, setQueuePosition,
        estimatedWait, setEstimatedWait,
        queueEnteredAt, setQueueEnteredAt,
        resetChat,
    } = useLiveChatStore();

    // Chat panel — ephemeral local state (resets on navigation, OK)
    const [chatInput, setChatInput] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const [chatConnected, setChatConnected] = useState(false);
    const [adminTyping, setAdminTyping] = useState(false);
    const [aiTypingName, setAiTypingName] = useState<string | null>(null);
    const [showExitChat, setShowExitChat] = useState(false);
    const [exitRating, setExitRating] = useState(0);
    const [exitNote, setExitNote] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const replyDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Temsilci bilgisi — backend'den ajan gelirse onu kullan, yoksa varsayılan
    const agentInfo = chatConversation?.aiAgent;
    const representative = agentInfo
        ? { name: `${agentInfo.firstName} ${agentInfo.lastName}`, role: agentInfo.role, initials: agentInfo.avatar, avatar: getAvatarForName(agentInfo.firstName) }
        : DEFAULT_REPRESENTATIVE;

    // Yeni bilet formu
    const [newSubject, setNewSubject] = useState('');
    const [newBody, setNewBody] = useState('');
    const [newCategory, setNewCategory] = useState<SupportTicketCategory>('GENERAL');
    const [newPriority, setNewPriority] = useState<SupportTicketPriority>('MEDIUM');
    const [isCreating, setIsCreating] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);

    // Ticket detay — yanıt
    const [replyBody, setReplyBody] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    // Konuşma geçmişi
    const [pastConversations, setPastConversations] = useState<ChatConversation[]>([]);

    // Geçmiş sohbet drawer (kapalı sohbetler ticket gibi açılır)
    const [selectedPastChat, setSelectedPastChat] = useState<{ conversation: ChatConversation; messages: ChatMessage[] } | null>(null);
    const [pastChatLoading, setPastChatLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ESC ile drawer'ları kapat
    useEscapeKey(() => setSelectedPastChat(null), !!selectedPastChat);

    useEffect(() => {
        fetchTickets();
        fetchArticles();
        // Konuşma geçmişini çek
        liveChatApi.getMyConversations().then(setPastConversations).catch(() => {});
    }, [fetchTickets, fetchArticles]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedTicket?.messages]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, adminTyping, aiTypingName]);

    // Sohbet başlat — kullanıcı butona tıklayınca
    const startChat = async () => {
        setChatPhase('connecting');

        // Backend'den conversation oluştur, başarısız olursa lokal fallback
        let conversation: ChatConversation;
        try {
            conversation = await liveChatApi.startConversation();
        } catch {
            // Backend erişilemez — lokal conversation oluştur
            const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            conversation = {
                id: localId,
                tenantId: '',
                userId: '',
                status: 'ACTIVE',
                isAiHandled: false,
                aiAgentId: null,
                aiAgent: null,
                lastMessage: null,
                lastMessageAt: null,
                unreadCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messages: [],
            };
        }

        setChatConversation(conversation);

        // Sıra bilgisini kontrol et — ajan sayısından fazla talep varsa sıra göster
        let queuePos = 0;
        try {
            const queueInfo = await liveChatApi.getQueueInfo(conversation.id);
            queuePos = queueInfo.position;
            if (queuePos > 0) {
                setQueueEnteredAt(Date.now());
                setQueuePosition(queuePos);
                setEstimatedWait(Math.max(0, queueInfo.estimatedWaitMinutes));
                // Sıra varsa connecting ekranında kal — polling useEffect geçişi yönetecek
                return;
            }
        } catch { /* sıra bilgisi alınamazsa direkt bağlan */ }

        // Sıra yok → kısa bağlanma gecikmesi + aktif faza geç
        const connectDelay = 3000 + Math.floor(Math.random() * 2001);
        await new Promise(resolve => setTimeout(resolve, connectDelay));
        activateChat(conversation);
    };

    // Sohbeti aktif faza geçir — karşılama mesajı + active state
    const activateChat = (conversation: ChatConversation) => {
        // Karşılama mesajı — 10 mesajdan random seçim
        const greetingBody = pickRandom(GREETING_MESSAGES);
        const greetingMsg: ChatMessage = {
            id: `greeting-${Date.now()}`,
            senderType: 'ADMIN',
            senderId: conversation.aiAgent?.id || 'representative',
            body: greetingBody,
            createdAt: new Date().toISOString(),
        };

        const existingMessages = conversation.messages || [];
        setChatMessages([...existingMessages, greetingMsg]);

        // %50 ihtimalle 2-3 sn sonra isim sorma mesajı gönder
        const shouldAskName = Math.random() < 0.5;
        if (shouldAskName) {
            const nameDelay = 2000 + Math.floor(Math.random() * 1001);
            setTimeout(() => {
                const nameAskMsg: ChatMessage = {
                    id: `name-ask-${Date.now()}`,
                    senderType: 'ADMIN',
                    senderId: conversation.aiAgent?.id || 'representative',
                    body: pickRandom(NAME_ASK_MESSAGES),
                    createdAt: new Date().toISOString(),
                };
                setChatMessages(prev => [...prev, nameAskMsg]);
            }, nameDelay);
        }

        setQueuePosition(0);
        setEstimatedWait(0);
        setChatPhase('active');
    };

    // Socket.IO bağlantısı — chatConversation var olduğunda (ilk başlatma veya sayfa dönüşünde)
    useEffect(() => {
        if (!chatConversation || chatPhase !== 'active') return;

        let sock: ReturnType<typeof liveChatSocket.connect> | null = null;
        try {
            sock = liveChatSocket.connect();
            liveChatSocket.joinConversation(chatConversation.id);
            setChatConnected(sock.connected);

            sock.on('connect', () => setChatConnected(true));
            sock.on('disconnect', () => setChatConnected(false));

            liveChatSocket.onNewMessage((data) => {
                if (data.conversationId === chatConversation.id && (data.message.senderType === 'ADMIN' || data.message.senderType === 'AI')) {
                    // Doğal typing delay: 4-8 sn okuma + yazma simülasyonu
                    const readDelay = 4000 + Math.floor(Math.random() * 4001);
                    setAdminTyping(true);
                    if (replyDelayRef.current) clearTimeout(replyDelayRef.current);
                    replyDelayRef.current = setTimeout(() => {
                        setChatMessages(prev => {
                            if (prev.some(m => m.id === data.message.id)) return prev;
                            return [...prev, data.message];
                        });
                        setAdminTyping(false);
                        setAiTypingName(null);
                    }, readDelay);
                }
            });

            liveChatSocket.onTyping((data) => {
                if (data.senderType === 'ADMIN') {
                    setAdminTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setAdminTyping(false), 3000);
                }
            });

            liveChatSocket.onAiTyping((data) => {
                if (data.conversationId === chatConversation.id) {
                    // Doğal gecikme: 1-2 sn sonra typing göster (okuma simülasyonu)
                    const typingDelay = 1000 + Math.floor(Math.random() * 1001);
                    setTimeout(() => {
                        setAiTypingName(data.agentName);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setAiTypingName(null), 10000);
                    }, typingDelay);
                }
            });

            liveChatSocket.onAiHandoff((data) => {
                if (data.conversationId === chatConversation.id) {
                    setChatConversation({ ...chatConversation, isAiHandled: false });
                    setAiTypingName(null);
                }
            });
        } catch {
            // Socket bağlantı hatası — lokal modda devam
        }

        return () => {
            // Socket handler'ları temizle ama socket'ı KAPATMA
            // (navigation sırasında socket açık kalır, geri dönünce yeniden bağlanır)
            if (sock) {
                sock.removeAllListeners('connect');
                sock.removeAllListeners('disconnect');
                sock.removeAllListeners('message:new');
                sock.removeAllListeners('typing');
                sock.removeAllListeners('ai:typing');
                sock.removeAllListeners('ai:handoff');
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatConversation?.id, chatPhase]);

    // Polling fallback — socket bağlı değilse her 5sn'de mesajları çek
    useEffect(() => {
        if (!chatConversation) return;
        // Socket bağlıysa polling'e gerek yok
        if (chatConnected) return;

        const pollMessages = async () => {
            try {
                const result = await liveChatApi.getMessages(chatConversation.id);
                if (result.data && result.data.length > 0) {
                    setChatMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const newMsgs = result.data.filter(m => !existingIds.has(m.id));
                        if (newMsgs.length > 0) {
                            // Admin veya AI yanıtı — doğal typing delay ile göster
                            const responseMsgs = newMsgs.filter(m => m.senderType === 'ADMIN' || m.senderType === 'AI');
                            const userMsgs = newMsgs.filter(m => m.senderType === 'USER');

                            if (responseMsgs.length > 0) {
                                // Typing indicator göster, gecikme sonrası mesajı ekle
                                setAdminTyping(true);
                                const delay = 4000 + Math.floor(Math.random() * 4001);
                                if (replyDelayRef.current) clearTimeout(replyDelayRef.current);
                                replyDelayRef.current = setTimeout(() => {
                                    setChatMessages(p => {
                                        const ids = new Set(p.map(m => m.id));
                                        const fresh = responseMsgs.filter(m => !ids.has(m.id));
                                        return fresh.length > 0 ? [...p, ...fresh] : p;
                                    });
                                    setAdminTyping(false);
                                    setAiTypingName(null);
                                }, delay);
                            }

                            // Kullanıcı mesajları gecikme olmadan ekle
                            if (userMsgs.length > 0) {
                                return [...prev, ...userMsgs];
                            }
                        }
                        return prev;
                    });
                }
            } catch {
                // Polling hata — sessizce devam et
            }
        };

        // İlk çağrı hemen yap (admin yanıtlarını göster)
        pollMessages();
        const interval = setInterval(pollMessages, 5000);
        return () => clearInterval(interval);
    }, [chatConversation, chatConnected]);

    // Sıra polling — SADECE connecting fazında ve sıra > 0 iken çalışır
    // Sıra düşünce otomatik olarak active faza geçirir
    useEffect(() => {
        if (chatPhase !== 'connecting' || !chatConversation || queuePosition <= 0) return;

        // queueEnteredAt store'da null ise (remount / eski oturum) şu anı başlangıç say
        if (!queueEnteredAt) setQueueEnteredAt(Date.now());

        const MAX_QUEUE_WAIT_MS = 60_000; // 60 saniye sonra sıra boşalmasa da bağlan

        const pollQueue = async () => {
            // Maksimum bekleme süresi aşıldıysa direkt aktif faza geç
            // queueEnteredAt store'da tutulur → remount'ta da kaybolmaz
            const elapsed = queueEnteredAt ? Date.now() - queueEnteredAt : 0;
            if (elapsed >= MAX_QUEUE_WAIT_MS) {
                setQueueEnteredAt(null);
                activateChat(chatConversation);
                return;
            }

            try {
                const queueInfo = await liveChatApi.getQueueInfo(chatConversation.id);
                if (queueInfo.position <= 0 || queueInfo.hasAdminResponse) {
                    // Sıra bitti → sohbeti aktif faza geçir
                    setQueueEnteredAt(null);
                    activateChat(chatConversation);
                } else {
                    setQueuePosition(queueInfo.position);
                    setEstimatedWait(Math.max(0, queueInfo.estimatedWaitMinutes));
                }
            } catch {
                // Hata durumunda direkt aktif faza geç
                setQueueEnteredAt(null);
                activateChat(chatConversation);
            }
        };

        const interval = setInterval(pollQueue, 10000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatPhase, chatConversation?.id, queuePosition, queueEnteredAt]);

    // Component unmount → typing timeout temizle (socket'ı KAPATMA — aktif chat korunacak)
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (replyDelayRef.current) clearTimeout(replyDelayRef.current);
        };
    }, []);

    // Hesaplamalar
    const openTicketCount = tickets.filter(t => ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'].includes(t.status)).length;
    const filteredTickets = searchQuery
        ? tickets.filter(t =>
            cleanSubject(t.subject).toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.id.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : tickets;

    // Birleşik liste: talepler + konuşma geçmişi
    type UnifiedItem =
        | { type: 'ticket'; data: SupportTicket; sortDate: number }
        | { type: 'chat'; data: ChatConversation; sortDate: number };

    const unifiedItems: UnifiedItem[] = [
        ...filteredTickets.map(t => ({
            type: 'ticket' as const,
            data: t,
            sortDate: new Date(t.updatedAt).getTime(),
        })),
        ...pastConversations
            .filter(c => {
                // Mevcut aktif konuşmayı sağ panelde zaten gösteriyoruz, listeden çıkar
                if (chatConversation && c.id === chatConversation.id && c.status !== 'CLOSED') return false;
                // En az 1 mesaj olan konuşmaları göster
                if ((c._count?.messages ?? 0) === 0 && !c.lastMessage) return false;
                // Arama filtresi
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    return (c.lastMessage || '').toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
                }
                return true;
            })
            .map(c => ({
                type: 'chat' as const,
                data: c,
                sortDate: new Date(c.lastMessageAt || c.updatedAt).getTime(),
            })),
    ].sort((a, b) => b.sortDate - a.sortDate);

    /* ─── Handlers ─── */
    const handleSelectTicket = (ticket: SupportTicket) => {
        loadTicketDetail(ticket.id);
        setReplyBody('');
    };

    const handleSelectConversation = async (conv: ChatConversation) => {
        // Geçmiş listesinden tıklanan TÜM sohbetler drawer'da açılır
        // Sağ panel sadece initLiveChat ile başlatılan mevcut oturum içindir
        setPastChatLoading(true);
        setSelectedPastChat({ conversation: conv, messages: [] });
        try {
            const result = await liveChatApi.getMessages(conv.id);
            setSelectedPastChat({ conversation: conv, messages: result.data });
        } catch {
            setSelectedPastChat({ conversation: conv, messages: [] });
        } finally {
            setPastChatLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!selectedTicket || !replyBody.trim()) return;
        setSendingReply(true);
        try {
            await sendMessage(selectedTicket.id, replyBody.trim());
            setReplyBody('');
        } catch {
            toast.error('Mesaj kaydedilemedi. Lütfen tekrar deneyin.');
        } finally {
            setSendingReply(false);
        }
    };

    const handleExitChat = async () => {
        // Backend'e sohbeti kapat + rating/note gönder
        if (chatConversation) {
            try {
                await liveChatApi.closeConversation(chatConversation.id, {
                    rating: exitRating > 0 ? exitRating : undefined,
                    note: exitNote.trim() || undefined,
                });
            } catch { /* sessizce devam — lokal olarak kapat */ }
            liveChatSocket.leaveConversation(chatConversation.id);
        }
        // Socket'ı kapat — sohbet bitirildi
        liveChatSocket.disconnect();
        // Store + local state sıfırla
        resetChat();
        setChatConnected(false);
        setShowExitChat(false);
        setExitRating(0);
        setExitNote('');
        // Geçmiş konuşmaları yenile
        liveChatApi.getMyConversations().then(setPastConversations).catch(() => {});
    };

    const handleChatSend = async () => {
        const text = chatInput.trim();
        if (!text || !chatConversation) return;
        setChatInput('');
        setChatSending(true);

        try {
            const message = await liveChatApi.sendMessage(chatConversation.id, text);
            setChatMessages(prev => {
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
        } catch {
            // Backend erişilemez — mesajı lokal olarak ekle
            const localMsg: ChatMessage = {
                id: `local-msg-${Date.now()}`,
                senderType: 'USER',
                senderId: 'local-user',
                body: text,
                createdAt: new Date().toISOString(),
            };
            setChatMessages(prev => [...prev, localMsg]);
        } finally {
            setChatSending(false);
        }
    };

    const handleCreateTicket = async () => {
        if (!newSubject.trim() || !newBody.trim()) return;
        setIsCreating(true);
        try {
            const ticket = await createTicket({
                subject: newSubject.trim(),
                body: newBody.trim(),
                category: newCategory,
                priority: newPriority,
            });
            setNewSubject('');
            setNewBody('');
            setNewCategory('GENERAL');
            setNewPriority('MEDIUM');
            setCreateSuccess(true);

            if (ticket._synced) {
                toast.success('Talebiniz oluşturuldu ve gönderildi.');
            } else {
                toast.info('Talebiniz kaydedildi. İnternet bağlantısında otomatik gönderilecek.');
            }

            setTimeout(() => {
                setCreateSuccess(false);
                setShowNewTicketModal(false);
            }, 2000);
        } catch {
            toast.error('Talep kaydedilemedi. Lütfen tekrar deneyin.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F3F4F6]">
            <div className="flex-1 overflow-hidden p-5 pt-4 flex flex-col gap-4">

                {/* ─── Scrollable Content ─── */}
                <div className="shrink-0 overflow-y-auto -mr-2 pr-2 flex flex-col gap-6 max-h-[45%]">

                    {/* Search Hero */}
                    <div className="w-full rounded-2xl p-8 relative overflow-hidden text-center shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #663259 0%, #8E44AD 100%)' }}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 pointer-events-none blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F97171]/20 rounded-full -ml-12 -mb-12 pointer-events-none blur-2xl" />
                        <h3 className="text-3xl font-bold text-white mb-6 relative z-10">Size Nasıl Yardımcı Olabiliriz?</h3>
                        <div className="max-w-2xl mx-auto relative z-10">
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-24 py-4 rounded-xl border-0 focus:ring-4 focus:ring-[#F97171]/30 text-gray-800 placeholder-gray-400 shadow-xl text-lg transition-all outline-none"
                                    placeholder="Bir konu arayın (örn: Fatura, Kurulum, API)..."
                                />
                                <span className="material-symbols-outlined absolute left-4 top-4 text-gray-400 text-[28px] group-focus-within:text-[#F97171] transition-colors">search</span>
                                <button className="absolute right-3 top-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors">
                                    Ara
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-3 mt-4 text-white/70 text-sm relative z-10">
                            <span>Popüler:</span>
                            <button onClick={() => setSearchQuery('Şifremi unuttum')} className="hover:text-white hover:underline transition-colors">Şifremi unuttum</button>
                            <span className="w-1 h-1 bg-white/40 rounded-full" />
                            <button onClick={() => setSearchQuery('Fatura')} className="hover:text-white hover:underline transition-colors">Fatura görüntüleme</button>
                            <span className="w-1 h-1 bg-white/40 rounded-full" />
                            <button onClick={() => setSearchQuery('Sipariş iptali')} className="hover:text-white hover:underline transition-colors">Sipariş iptali</button>
                        </div>
                    </div>

                    {/* Dökümantasyon & Rehberler */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Dökümantasyon & Rehberler</h3>
                            <button
                                onClick={() => { setShowDocsView(true); setDocsFilter('ALL'); setSelectedArticle(null); }}
                                className="text-sm font-medium text-[#663259] hover:underline flex items-center gap-1 transition-colors"
                            >
                                Tümünü Gör <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {DOC_CATEGORIES.slice(0, 3).map((doc) => {
                                const catArticleCount = articles.filter(a => a.category === doc.filterKey).length;
                                return (
                                    <div
                                        key={doc.title}
                                        onClick={() => { setShowDocsView(true); setDocsFilter(doc.filterKey); setSelectedArticle(null); }}
                                        className="bg-white/85 backdrop-blur-sm p-6 rounded-2xl hover:shadow-lg transition-all duration-300 group border border-white relative overflow-hidden hover:-translate-y-1 cursor-pointer"
                                    >
                                        <div className={`absolute right-0 top-0 w-24 h-24 ${doc.cornerBg} rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
                                        <div className={`w-14 h-14 rounded-xl ${doc.iconBg} ${doc.iconColor} flex items-center justify-center mb-4 relative z-10 ${doc.hoverIconBg} group-hover:text-white transition-colors`}>
                                            <span className="material-symbols-outlined text-[32px]">{doc.icon}</span>
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900 mb-2">{doc.title}</h4>
                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{doc.description}</p>
                                        <div className={`flex items-center gap-2 text-xs font-bold ${doc.countColor} ${doc.hoverCountColor} transition-colors`}>
                                            <span>{catArticleCount} Makale</span>
                                            <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* ─── İki Kolonlu Alan: Talepler + Canlı Destek (sidebar hizalı) ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5 flex-1 min-h-0">

                        {/* Sol Kolon — Destek Geçmişi (talepler + sohbetler) */}
                        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">Destek Geçmişi</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Talepleriniz ve canlı destek sohbetleriniz</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 font-medium">{unifiedItems.length} kayıt</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12 text-gray-400">
                                    <span className="material-symbols-outlined animate-spin text-[22px] mr-2">progress_activity</span>
                                    <span className="text-sm">Yükleniyor...</span>
                                </div>
                            ) : unifiedItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                                    <span className="material-symbols-outlined text-[40px] mb-2">forum</span>
                                    <p className="text-sm font-medium text-gray-400">
                                        {searchQuery ? 'Aramanızla eşleşen kayıt bulunamadı' : 'Henüz destek kaydınız yok'}
                                    </p>
                                    {!searchQuery && (
                                        <button onClick={() => setShowNewTicketModal(true)} className="mt-2 text-xs font-bold text-[#663259] hover:underline">
                                            Yeni talep oluşturun →
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {unifiedItems.map((item) => {
                                        if (item.type === 'ticket') {
                                            const ticket = item.data;
                                            const statusInfo = STATUS_MAP[ticket.status] ?? STATUS_MAP.OPEN;
                                            const catInfo = CATEGORY_MAP[ticket.category] ?? CATEGORY_MAP.GENERAL;
                                            return (
                                                <div
                                                    key={`ticket-${ticket.id}`}
                                                    onClick={() => handleSelectTicket(ticket)}
                                                    className="px-5 py-3.5 hover:bg-gray-50/70 transition-colors cursor-pointer group"
                                                >
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="material-symbols-outlined text-[14px] text-gray-400">confirmation_number</span>
                                                            <span className="text-[11px] font-mono text-gray-400">{shortId(ticket.id)}</span>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${catInfo.chipColor}`}>
                                                                {catInfo.label}
                                                            </span>
                                                        </div>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.color} border ${statusInfo.borderColor} shrink-0`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                                                            {statusInfo.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-[#663259] transition-colors">{cleanSubject(ticket.subject)}</p>
                                                    <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(ticket.updatedAt)}</p>
                                                </div>
                                            );
                                        } else {
                                            const conv = item.data;
                                            const isActive = conv.status === 'ACTIVE' || conv.status === 'WAITING';
                                            const msgCount = conv._count?.messages ?? 0;
                                            return (
                                                <div
                                                    key={`chat-${conv.id}`}
                                                    onClick={() => handleSelectConversation(conv)}
                                                    className="px-5 py-3.5 hover:bg-purple-50/50 transition-colors cursor-pointer group"
                                                >
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="material-symbols-outlined text-[14px] text-[#663259]">chat</span>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#663259]/10 text-[#663259]">
                                                                Canlı Sohbet
                                                            </span>
                                                            {msgCount > 0 && (
                                                                <span className="text-[10px] text-gray-400">{msgCount} mesaj</span>
                                                            )}
                                                        </div>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                                                            isActive
                                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                            {isActive ? 'Aktif' : 'Kapalı'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 truncate group-hover:text-[#663259] transition-colors">
                                                        {conv.lastMessage || 'Sohbet başlatıldı'}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 mt-1">
                                                        {formatRelativeTime(conv.lastMessageAt || conv.updatedAt)}
                                                    </p>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            )}

                            </div>
                        </div>

                        {/* Sağ Kolon — Canlı Destek Paneli */}
                        <div className="rounded-2xl overflow-hidden flex flex-col bg-white border border-red-100/40 shadow-[0_2px_12px_rgba(249,113,113,0.08)]">

                            {/* ── FAZ: IDLE — Canlı Desteğe Bağlan Banner ── */}
                            {chatPhase === 'idle' && (
                                <div className="flex-1 flex flex-col items-center justify-center p-6">
                                    {/* Şirin banner kartı */}
                                    <div className="w-full max-w-[300px] bg-gradient-to-br from-red-50 via-white to-orange-50 rounded-2xl border border-red-100/60 shadow-[0_4px_24px_rgba(249,113,113,0.12)] p-6 text-center relative overflow-hidden">
                                        {/* Dekoratif arka plan daireleri */}
                                        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#F97171]/[0.06]" />
                                        <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-orange-200/20" />

                                        {/* İkon */}
                                        <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F97171] to-[#E05A5A] flex items-center justify-center shadow-lg shadow-red-200/40 mb-4">
                                            <span className="material-symbols-outlined text-white text-[28px]">headset_mic</span>
                                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                                        </div>

                                        {/* Başlık */}
                                        <h3 className="text-[15px] font-bold text-gray-800 mb-1.5">Canli Destek</h3>
                                        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                                            Temsilcilerimiz size yardimci olmak icin hazir
                                        </p>

                                        {/* Çevrimiçi durumu */}
                                        <div className="flex items-center justify-center gap-1.5 mb-5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-[11px] font-semibold text-emerald-600">Cevrimici</span>
                                        </div>

                                        {/* Sohbet başlat butonu */}
                                        <button
                                            onClick={startChat}
                                            className="w-full bg-[#F97171] hover:bg-[#E05A5A] text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-red-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-200/60 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">chat</span>
                                            Sohbet Baslat
                                        </button>

                                        <p className="text-[10px] text-gray-400 mt-3">Ortalama yanit suresi: ~2 dk</p>
                                    </div>
                                </div>
                            )}

                            {/* ── FAZ: CONNECTING — Bağlanılıyor Ekranı ── */}
                            {chatPhase === 'connecting' && (
                                <div className="flex-1 flex flex-col">
                                    {/* Mini header */}
                                    <div className="shrink-0 px-4 py-3 bg-[#F97171] border-b border-red-300/30">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-[18px] animate-pulse">support_agent</span>
                                            </div>
                                            <div>
                                                <h4 className="text-[13px] font-bold text-white leading-tight">Canli Destek</h4>
                                                <span className="text-[10px] font-medium text-white/70">Baglaniliyor...</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                        {/* Animasyonlu bağlantı ikonu */}
                                        <div className="relative mb-6">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F97171] to-[#E05A5A] flex items-center justify-center shadow-lg">
                                                <span className="material-symbols-outlined text-white text-[30px] animate-pulse">headset_mic</span>
                                            </div>
                                            <div className="absolute inset-[-8px] rounded-full border-2 border-[#F97171]/20 animate-ping" />
                                            <div className="absolute inset-[-16px] rounded-full border border-[#F97171]/10 animate-ping" style={{ animationDelay: '500ms' }} />
                                        </div>

                                        {queuePosition > 0 ? (
                                            <>
                                                <h3 className="text-base font-bold text-gray-800 mb-2">Sirada Bekliyorsunuz</h3>
                                                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-3 w-full max-w-[260px]">
                                                    <div className="flex items-center justify-center gap-2 mb-1">
                                                        <span className="material-symbols-outlined text-[#F97171] text-[20px]">group</span>
                                                        <span className="text-lg font-bold text-red-700">{queuePosition}. sira</span>
                                                    </div>
                                                    <p className="text-[11px] text-red-400">Tahmini bekleme: &lt;{Math.max(1, estimatedWait)} dk</p>
                                                </div>
                                                <p className="text-xs text-gray-400 max-w-[260px] leading-relaxed">
                                                    Tum temsilcilerimiz su an mesgul. Sirayla yonlendirileceksiniz.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="text-base font-bold text-gray-800 mb-2">Baglaniliyor...</h3>
                                                <p className="text-sm text-gray-500 max-w-[260px] leading-relaxed mb-1">
                                                    Sizi uygun temsilcimize aktariyoruz,
                                                </p>
                                                <p className="text-sm text-gray-500 max-w-[260px] leading-relaxed">
                                                    lutfen bekleyiniz.
                                                </p>
                                            </>
                                        )}

                                        {/* Bouncing dots */}
                                        <div className="flex gap-1.5 mt-6">
                                            <span className="w-2 h-2 bg-[#F97171] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-[#F97171] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-[#F97171] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>

                                        {/* İptal butonu */}
                                        <button
                                            onClick={() => { setQueueEnteredAt(null); resetChat(); }}
                                            className="mt-5 px-5 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-all"
                                        >
                                            Iptal Et
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── FAZ: ACTIVE — Sohbet Ekranı ── */}
                            {chatPhase === 'active' && (
                                <>
                                    {/* Chat Header — Temsilci bilgisi */}
                                    <div className="shrink-0 px-4 py-3 flex items-center justify-between bg-[#F97171] border-b border-red-300/30">
                                        <div className="flex items-center gap-2.5">
                                            <div className="relative">
                                                <img src={representative.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/30" />
                                                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-[#F97171] ${chatConnected ? 'bg-emerald-400' : 'bg-red-300'}`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <h4 className="text-[13px] font-bold text-white leading-tight">{representative.name}</h4>
                                                </div>
                                                <span className={`text-[10px] font-medium ${chatConnected ? 'text-emerald-200' : 'text-white/50'}`}>
                                                    {chatConnected ? representative.role : 'Cevrimdisi'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowExitChat(true)}
                                                className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 border border-white/20"
                                                title="Sohbetten Ayrıl"
                                            >
                                                <span className="material-symbols-outlined text-[12px]">logout</span>
                                                Ayrıl
                                            </button>
                                            <span className={`w-2 h-2 rounded-full ${chatConnected ? 'bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.5)]' : 'bg-white/30'}`} />
                                        </div>
                                    </div>

                                    {/* Chat Messages */}
                                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-gray-50/50">
                                        {chatMessages.map((msg) => {
                                            const isAgent = msg.senderType === 'ADMIN' || msg.senderType === 'AI';
                                            return (
                                            <div key={msg.id} className={`flex ${msg.senderType === 'USER' ? 'justify-end' : 'gap-2'}`}>
                                                {isAgent && (
                                                    <img src={representative.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-gray-200" />
                                                )}
                                                <div className="max-w-[85%]">
                                                    {/* Temsilci ünvanı */}
                                                    {isAgent && (
                                                        <div className="flex items-center gap-1 mb-0.5">
                                                            <span className="text-[9px] font-bold text-[#663259]/60">{representative.name}</span>
                                                            <span className="text-[8px] text-gray-400">· {representative.role}</span>
                                                        </div>
                                                    )}
                                                    <div className={`px-3 py-2 text-[12px] leading-relaxed ${
                                                        msg.senderType === 'USER'
                                                            ? 'bg-[#F97171] text-white rounded-xl rounded-br-sm shadow-sm'
                                                            : 'bg-white text-gray-600 rounded-xl rounded-bl-sm shadow-sm border border-gray-100'
                                                    }`}>
                                                        <p className="whitespace-pre-wrap">{msg.body}</p>
                                                        <span className={`text-[9px] block mt-0.5 ${msg.senderType === 'USER' ? 'text-red-200 text-right' : 'text-gray-400'}`}>
                                                            {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    {/* Feedback butonları — confidence 0.60-0.74 arası mesajlar */}
                                                    {isAgent && msg.confidence != null && msg.confidence < 0.75 && msg.confidence >= 0.60 && (
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="text-[9px] text-gray-400">Bu yanit yardimci oldu mu?</span>
                                                            <button className="w-5 h-5 rounded bg-gray-100 hover:bg-green-100 flex items-center justify-center transition-colors group">
                                                                <span className="material-symbols-outlined text-[12px] text-gray-400 group-hover:text-green-600">thumb_up</span>
                                                            </button>
                                                            <button className="w-5 h-5 rounded bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors group">
                                                                <span className="material-symbols-outlined text-[12px] text-gray-400 group-hover:text-red-500">thumb_down</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            );
                                        })}
                                        {(adminTyping || aiTypingName) && (
                                            <div className="flex gap-2">
                                                <img src={representative.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-200" />
                                                <div className="bg-white px-3 py-2 rounded-xl rounded-bl-sm shadow-sm border border-gray-100">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="flex gap-0.5">
                                                            <span className="w-1 h-1 bg-[#F97171]/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <span className="w-1 h-1 bg-[#F97171]/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <span className="w-1 h-1 bg-[#F97171]/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                        </span>
                                                        <span className="text-[9px] text-gray-400 font-medium">
                                                            {aiTypingName ? `${aiTypingName} yazıyor...` : 'yazıyor...'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Chat Input */}
                                    {chatConversation?.status === 'CLOSED' ? (
                                        <div className="shrink-0 px-3 py-2.5 bg-red-50/50 border-t border-gray-100 text-center">
                                            <p className="text-[11px] text-gray-500">Bu sohbet kapatilmis.</p>
                                            <button
                                                onClick={() => {
                                                    liveChatSocket.disconnect();
                                                    resetChat();
                                                }}
                                                className="mt-1 text-[11px] font-bold text-[#F97171] hover:text-[#E05A5A] hover:underline transition-colors"
                                            >
                                                Yeni sohbet baslat
                                            </button>
                                        </div>
                                    ) : showExitChat ? (
                                        /* ─── Sohbetten Ayrıl Paneli ─── */
                                        <div className="shrink-0 px-3 py-3 bg-white border-t border-gray-100 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-bold text-gray-700">Sohbetten ayrılmak istiyor musunuz?</p>
                                                <button onClick={() => setShowExitChat(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                </button>
                                            </div>
                                            {/* Yıldız Puanlama */}
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-gray-400 mr-1">Puanla:</span>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setExitRating(exitRating === star ? 0 : star)}
                                                        className="transition-transform hover:scale-110"
                                                    >
                                                        <span className={`material-symbols-outlined text-[18px] ${star <= exitRating ? 'text-amber-400' : 'text-gray-200'}`}>
                                                            {star <= exitRating ? 'star' : 'star'}
                                                        </span>
                                                    </button>
                                                ))}
                                                {exitRating > 0 && (
                                                    <span className="text-[9px] text-gray-400 ml-1">{exitRating}/5</span>
                                                )}
                                            </div>
                                            {/* Not Alanı */}
                                            <textarea
                                                value={exitNote}
                                                onChange={(e) => setExitNote(e.target.value)}
                                                placeholder="Not bırakmak ister misiniz? (opsiyonel)"
                                                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] resize-none focus:outline-none focus:ring-1 focus:ring-[#F97171]/30 focus:border-[#F97171]/40 placeholder:text-gray-300"
                                                rows={2}
                                            />
                                            {/* Butonlar */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowExitChat(false)}
                                                    className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-bold rounded-lg transition-all"
                                                >
                                                    Vazgeç
                                                </button>
                                                <button
                                                    onClick={handleExitChat}
                                                    className="flex-1 px-3 py-1.5 bg-[#F97171] hover:bg-[#E05A5A] text-white text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[12px]">logout</span>
                                                    Sohbetten Ayrıl
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="shrink-0 px-3 py-2.5 bg-white border-t border-gray-100">
                                            <div className="flex gap-1.5">
                                                <input
                                                    type="text"
                                                    value={chatInput}
                                                    onChange={(e) => {
                                                        setChatInput(e.target.value);
                                                        if (chatConversation) liveChatSocket.emitTyping(chatConversation.id);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleChatSend();
                                                        }
                                                    }}
                                                    placeholder="Mesajinizi yazin..."
                                                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-[#F97171]/30 focus:border-[#F97171]/40 transition-all placeholder:text-gray-300"
                                                    disabled={chatSending || !chatConversation}
                                                />
                                                <button
                                                    onClick={handleChatSend}
                                                    disabled={chatSending || !chatInput.trim() || !chatConversation}
                                                    className="w-8 h-8 bg-[#F97171] hover:bg-[#E05A5A] text-white rounded-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                                                >
                                                    {chatSending ? (
                                                        <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[14px]">send</span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                        </div>

                </div>
            </div>

            {/* ─── Yeni Talep Modal ─── */}

            {showNewTicketModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => !isCreating && setShowNewTicketModal(false)}>
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
                        {createSuccess ? (
                            <div className="flex flex-col items-center justify-center py-12 px-6">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-green-600 text-[32px]">check_circle</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-1">Talebiniz Oluşturuldu!</h3>
                                <p className="text-sm text-gray-500">Destek ekibimiz en kısa sürede dönecektir.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#663259]/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[#663259] text-[22px]">edit_note</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800">Yeni Destek Talebi</h3>
                                            <p className="text-xs text-gray-500">Sorununuzu detaylı olarak anlatın</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowNewTicketModal(false)}
                                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 mb-1.5 block">Konu</label>
                                        <input
                                            type="text"
                                            value={newSubject}
                                            onChange={(e) => setNewSubject(e.target.value)}
                                            placeholder="Sorununuzu özetleyin"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#663259] focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Kategori</label>
                                            <select
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value as SupportTicketCategory)}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#663259] focus:border-transparent transition-all appearance-none"
                                            >
                                                {CATEGORY_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Öncelik</label>
                                            <select
                                                value={newPriority}
                                                onChange={(e) => setNewPriority(e.target.value as SupportTicketPriority)}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#663259] focus:border-transparent transition-all appearance-none"
                                            >
                                                {PRIORITY_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 mb-1.5 block">Açıklama</label>
                                        <textarea
                                            value={newBody}
                                            onChange={(e) => setNewBody(e.target.value)}
                                            placeholder="Sorununuzu detaylı olarak açıklayın. Ekran görüntüsü, hata mesajı gibi bilgiler işimizi kolaylaştırır."
                                            rows={5}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#663259] focus:border-transparent transition-all resize-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateTicket}
                                        disabled={isCreating || !newSubject.trim() || !newBody.trim()}
                                        className="w-full py-3 bg-[#663259] text-white rounded-xl hover:bg-[#8E44AD] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg"
                                    >
                                        {isCreating ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                                Gönderiliyor...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[18px]">send</span>
                                                Talep Oluştur
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Dökümantasyon Tümünü Gör Overlay ─── */}
            {showDocsView && (
                <div className="fixed inset-0 z-50 flex flex-col bg-[#F3F4F6]">
                    {/* Header */}
                    <div className="shrink-0 relative overflow-hidden shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #663259 0%, #4A235A 55%, #3d1d4b 100%)' }}>
                        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
                            style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                        <div className="relative px-6 py-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => { setShowDocsView(false); setSelectedArticle(null); }}
                                    className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-white text-[22px]">arrow_back</span>
                                </button>
                                <div>
                                    <h1 className="text-xl font-bold text-white leading-tight">Dökümantasyon & Rehberler</h1>
                                    <p className="text-white/60 text-xs mt-0.5">{articles.length} makale mevcut</p>
                                </div>
                            </div>
                            <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl">
                                <span className="text-white/80 text-xs font-medium">{DOC_CATEGORIES.length} Kategori</span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Kategori Filtreleri */}
                        <div className="flex items-center gap-2 mb-6 flex-wrap">
                            <button
                                onClick={() => { setDocsFilter('ALL'); setSelectedArticle(null); }}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                    docsFilter === 'ALL'
                                        ? 'bg-[#663259] text-white shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                Tümü ({articles.length})
                            </button>
                            {DOC_CATEGORIES.map((doc) => {
                                const count = articles.filter(a => a.category === doc.filterKey).length;
                                return (
                                    <button
                                        key={doc.filterKey}
                                        onClick={() => { setDocsFilter(doc.filterKey); setSelectedArticle(null); }}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                            docsFilter === doc.filterKey
                                                ? 'bg-[#663259] text-white shadow-md'
                                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{doc.icon}</span>
                                        {doc.title} ({count})
                                    </button>
                                );
                            })}
                        </div>

                        {selectedArticle ? (
                            /* ─── Makale Detay ─── */
                            <div className="max-w-4xl">
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    className="flex items-center gap-2 text-sm font-medium text-[#663259] hover:underline mb-4 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                    Makalelere Dön
                                </button>
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-8 py-6 border-b border-gray-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(CATEGORY_MAP[selectedArticle.category] ?? CATEGORY_MAP.GENERAL).chipColor}`}>
                                                <span className="material-symbols-outlined text-[14px] mr-1">{(CATEGORY_MAP[selectedArticle.category] ?? CATEGORY_MAP.GENERAL).icon}</span>
                                                {(CATEGORY_MAP[selectedArticle.category] ?? CATEGORY_MAP.GENERAL).label}
                                            </span>
                                            <span className="text-xs text-gray-400">{formatDate(selectedArticle.createdAt)}</span>
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedArticle.title}</h2>
                                    </div>
                                    <div className="px-8 py-6">
                                        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {selectedArticle.body}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* ─── Makale Listesi ─── */
                            <>
                                {/* Kategori Kartları (sadece Tümü filtresinde) */}
                                {docsFilter === 'ALL' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-8">
                                        {DOC_CATEGORIES.map((doc) => {
                                            const count = articles.filter(a => a.category === doc.filterKey).length;
                                            return (
                                                <div
                                                    key={doc.filterKey}
                                                    onClick={() => setDocsFilter(doc.filterKey)}
                                                    className="bg-white/85 backdrop-blur-sm p-5 rounded-2xl hover:shadow-lg transition-all duration-300 group border border-white relative overflow-hidden hover:-translate-y-0.5 cursor-pointer"
                                                >
                                                    <div className={`absolute right-0 top-0 w-20 h-20 ${doc.cornerBg} rounded-bl-full -mr-3 -mt-3 transition-transform group-hover:scale-110`} />
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-11 h-11 rounded-xl ${doc.iconBg} ${doc.iconColor} flex items-center justify-center relative z-10 ${doc.hoverIconBg} group-hover:text-white transition-colors shrink-0`}>
                                                            <span className="material-symbols-outlined text-[24px]">{doc.icon}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-sm font-bold text-gray-900 truncate">{doc.title}</h4>
                                                            <p className="text-xs text-gray-500 truncate">{doc.description}</p>
                                                        </div>
                                                        <span className={`text-xs font-bold ${doc.countColor} ml-auto shrink-0`}>{count}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Makaleler */}
                                {isArticlesLoading ? (
                                    <div className="flex items-center justify-center py-16 text-gray-400">
                                        <span className="material-symbols-outlined animate-spin text-[24px] mr-2">progress_activity</span>
                                        Makaleler yükleniyor...
                                    </div>
                                ) : (() => {
                                    const filtered = docsFilter === 'ALL' ? articles : articles.filter(a => a.category === docsFilter);
                                    return filtered.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                                            <span className="material-symbols-outlined text-[56px] mb-3">article</span>
                                            <p className="text-base font-medium text-gray-400 mb-1">Makale bulunamadı</p>
                                            <p className="text-sm text-gray-400">Bu kategoride henüz yayınlanmış makale yok.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {filtered.map((article) => {
                                                const catInfo = CATEGORY_MAP[article.category] ?? CATEGORY_MAP.GENERAL;
                                                return (
                                                    <div
                                                        key={article.id}
                                                        onClick={() => setSelectedArticle(article)}
                                                        className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${catInfo.chipColor}`}>
                                                                <span className="material-symbols-outlined text-[12px] mr-0.5">{catInfo.icon}</span>
                                                                {catInfo.label}
                                                            </span>
                                                            <span className="text-[11px] text-gray-400 ml-auto">{formatDate(article.createdAt)}</span>
                                                        </div>
                                                        <h4 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#663259] transition-colors">
                                                            {article.title}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                                                            {article.body.slice(0, 120)}{article.body.length > 120 ? '...' : ''}
                                                        </p>
                                                        <div className="flex items-center gap-1 mt-3 text-xs font-bold text-[#663259] group-hover:text-[#F97171] transition-colors">
                                                            <span>Devamını Oku</span>
                                                            <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Ticket Detail Drawer ─── */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={clearSelectedTicket} />
                    <div className="w-[520px] max-w-full bg-white shadow-2xl flex flex-col h-full">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-gray-400">{shortId(selectedTicket.id)}</span>
                                <button
                                    onClick={clearSelectedTicket}
                                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-3">{cleanSubject(selectedTicket.subject)}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${(STATUS_MAP[selectedTicket.status] ?? STATUS_MAP.OPEN).color} border ${(STATUS_MAP[selectedTicket.status] ?? STATUS_MAP.OPEN).borderColor}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${(STATUS_MAP[selectedTicket.status] ?? STATUS_MAP.OPEN).dotColor}`} />
                                    {(STATUS_MAP[selectedTicket.status] ?? STATUS_MAP.OPEN).label}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(CATEGORY_MAP[selectedTicket.category] ?? CATEGORY_MAP.GENERAL).chipColor}`}>
                                    {(CATEGORY_MAP[selectedTicket.category] ?? CATEGORY_MAP.GENERAL).label}
                                </span>
                                <span className="text-xs text-gray-400 ml-auto">{formatDate(selectedTicket.createdAt)}</span>
                            </div>
                        </div>

                        {/* Mesajlar */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {isDetailLoading ? (
                                <div className="flex items-center justify-center py-8 text-gray-400">
                                    <span className="material-symbols-outlined animate-spin text-[24px] mr-2">progress_activity</span>
                                    Yükleniyor...
                                </div>
                            ) : selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                                selectedTicket.messages.map((msg: SupportTicketMessage) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.senderType === 'USER' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.senderType === 'USER'
                                            ? 'bg-[#663259] text-white rounded-br-md'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                                            }`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-bold ${msg.senderType === 'USER' ? 'text-white/70' : 'text-gray-500'}`}>
                                                    {msg.senderType === 'USER' ? 'Siz' : 'Destek Ekibi'}
                                                </span>
                                                <span className={`text-[10px] ${msg.senderType === 'USER' ? 'text-white/50' : 'text-gray-400'}`}>
                                                    {formatDateTime(msg.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center py-8 text-gray-300">
                                    <p className="text-sm">Henüz mesaj yok</p>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Yanıt — sadece açık ticket'lar için */}
                        {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'RESOLVED' && (
                            <div className="px-6 py-4 border-t border-gray-100 shrink-0">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={replyBody}
                                        onChange={(e) => setReplyBody(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendReply();
                                            }
                                        }}
                                        placeholder="Mesajınızı yazın..."
                                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#663259] focus:border-transparent transition-all"
                                    />
                                    <button
                                        onClick={handleSendReply}
                                        disabled={sendingReply || !replyBody.trim()}
                                        className="px-5 py-2.5 bg-[#663259] text-white rounded-xl hover:bg-[#8E44AD] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-bold shadow-sm shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                        Gönder
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Past Chat Drawer (Geçmiş Sohbet Detay) ─── */}
            {selectedPastChat && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedPastChat(null)} />
                    <div className="w-[520px] max-w-full bg-white shadow-2xl flex flex-col h-full">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[14px] text-[#663259]">chat</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#663259]/10 text-[#663259]">
                                        Canlı Sohbet
                                    </span>
                                    {selectedPastChat.conversation._count?.messages && (
                                        <span className="text-[10px] text-gray-400">{selectedPastChat.conversation._count.messages} mesaj</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedPastChat(null)}
                                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-3">Sohbet Geçmişi</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                    Kapalı
                                </span>
                                <span className="text-xs text-gray-400 ml-auto">
                                    {formatDate(selectedPastChat.conversation.lastMessageAt || selectedPastChat.conversation.updatedAt)}
                                </span>
                            </div>
                        </div>

                        {/* Mesajlar */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {pastChatLoading ? (
                                <div className="flex items-center justify-center py-8 text-gray-400">
                                    <span className="material-symbols-outlined animate-spin text-[24px] mr-2">progress_activity</span>
                                    Yükleniyor...
                                </div>
                            ) : selectedPastChat.messages.length > 0 ? (
                                selectedPastChat.messages.map((msg) => {
                                    const pastAgent = selectedPastChat.conversation.aiAgent;
                                    const pastRep = pastAgent
                                        ? { name: `${pastAgent.firstName} ${pastAgent.lastName}`, initials: pastAgent.avatar, role: pastAgent.role, avatar: getAvatarForName(pastAgent.firstName) }
                                        : { name: 'Destek Ekibi', initials: 'DD', role: DEFAULT_REPRESENTATIVE.role, avatar: DEFAULT_REPRESENTATIVE.avatar };
                                    const isPastAgent = msg.senderType === 'ADMIN' || msg.senderType === 'AI';
                                    return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.senderType === 'USER' ? 'justify-end' : 'gap-2'}`}
                                    >
                                        {isPastAgent && (
                                            <img src={pastRep.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 border border-gray-200" />
                                        )}
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.senderType === 'USER'
                                            ? 'bg-[#663259] text-white rounded-br-md'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                                            }`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-bold ${msg.senderType === 'USER' ? 'text-white/70' : 'text-gray-500'}`}>
                                                    {msg.senderType === 'USER' ? 'Siz' : pastRep.name}
                                                </span>
                                                {isPastAgent && (
                                                    <span className="text-[8px] text-gray-400">· {pastRep.role || DEFAULT_REPRESENTATIVE.role}</span>
                                                )}
                                                <span className={`text-[10px] ${msg.senderType === 'USER' ? 'text-white/50' : 'text-gray-400'}`}>
                                                    {formatDateTime(msg.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                                        </div>
                                    </div>
                                    );
                                })
                            ) : (
                                <div className="flex items-center justify-center py-8 text-gray-300">
                                    <p className="text-sm">Bu sohbette mesaj bulunamadı</p>
                                </div>
                            )}
                        </div>

                        {/* Alt bilgi — sohbet kapalı */}
                        <div className="px-6 py-4 border-t border-gray-100 shrink-0 text-center">
                            <p className="text-xs text-gray-400">Bu sohbet kapatılmıştır</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Support;
