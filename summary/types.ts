export interface HourlyDataPoint {
    label: string;
    amount: number;
    hour: number;
}

export interface RecentActivity {
    id: string;
    type: string;
    title: string;
    description: string;
    amount?: number;
    date: string;
    itemCount?: number;
    status: string;
}

export interface EmployeeInfo {
    id: string;
    name: string;
    department: string;
    shift: string;
    status: string;
}

export interface TableStats {
    occupied: number;
    total: number;
    guests: number;
}

export interface TodoItem {
    id: string;
    title: string;
    status: string;
    priority?: string;
    due_date?: string;
}

export interface Tag {
    id: string;
    name: string;
    color: string;
}

export interface FavoriteItem {
    path: string;
    label: string;
    icon: string;
}

export interface SummaryContentProps {
    // Stat kartları
    todayIncome: number;
    yesterdayIncome: number;
    incomeChange: number;
    todayOrderCount: number;
    totalExpense: number;
    totalIncome: number;
    tableStats: TableStats;

    // Canlı Ciro
    chartData: HourlyDataPoint[];
    currentDataIdx: number;
    chartChange: number;
    storeOpenTime: string;
    storeCloseTime: string;

    // Görevler
    recentTodos: TodoItem[];
    todoTagsMap: Record<string, Tag[]>;
    newTaskTitle: string;
    onNewTaskTitleChange: (val: string) => void;
    onAddTask: () => void;
    onToggleTodoStatus: (id: string, currentStatus: string) => void;
    onNavigateToTodos: () => void;

    // Son İşlemler
    recentActivities: RecentActivity[];

    // Vardiyalı Personeller
    employees: EmployeeInfo[];
    onNavigateToShifts: () => void;

    // Alt eylem kartları
    onNavigateToSupport: () => void;

    // Demo banner
    isDemo: boolean;
    onLogoutAndRegister: () => void;

    // Favoriler
    favorites: FavoriteItem[];
    showFavoritesModal: boolean;
    onToggleFavoritesModal: (show: boolean) => void;
    onToggleFavorite: (fav: FavoriteItem) => void;
    onNavigate: (path: string) => void;
}
