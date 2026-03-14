export interface CalendarEvent {
    id: string;
    date: string;
    title: string;
    type: 'reservation' | 'shift' | 'special' | 'social_media' | 'sms' | 'whatsapp';
    color: string;
    time?: string;
    endTime?: string;
    details?: string;
    peopleCount?: number;
    table?: string;
    smPlatform?: string;
    smContentType?: string;
    description?: string;
}

export interface Reservation {
    id: string;
    time: string;
    name: string;
    people: number;
    table: string;
    status: 'confirmed' | 'waiting';
}

export interface StaffMember {
    id: string;
    name: string;
    role: string;
    hours: string;
    status: 'online' | 'offline';
    avatar: string;
}

export interface EventFormState {
    type: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    peopleCount: string;
    table: string;
    description: string;
    color: string;
    smPlatform: string;
    smContentType: string;
}
