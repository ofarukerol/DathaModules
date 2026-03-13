// ─── Announcements Modülü — Tip Tanımları ───

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  isSlider: boolean;
  slideTag: string | null;
  slideTagColor: string | null;
  slideImageUrl: string | null;
  slideCta: string | null;
  isActive: boolean;
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  voteCount: number;
  createdAt: string;
  user: { id: string; firstName: string | null; lastName: string | null };
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  targetMonth: string | null;
  targetQuarter: string | null;
  startDate: string | null;
  targetDate: string | null;
  completedAt: string | null;
  isActive?: boolean;
  createdAt: string;
}
