import { create } from 'zustand';
import {
  announcementApi,
  featureRequestApi,
  roadmapApi,
} from './service';
import type {
  Announcement,
  FeatureRequest,
  RoadmapItem,
} from './types';

/**
 * Backend response'tan diziyi cikarir.
 * Paginated:     { success, data: { data: T[], total, page, limit }, meta }
 * Non-paginated: { success, data: T[], meta }
 */
function extractArray<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result;

  const obj = result as Record<string, unknown> | null;
  if (!obj) return [];

  // Paginated response: result.data is { data: T[], total, ... }
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    const nested = obj.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) return nested.data as T[];
  }

  // Non-paginated response: result.data is T[]
  if (Array.isArray(obj.data)) return obj.data as T[];

  return [];
}

interface AnnouncementState {
  announcements: Announcement[];
  sliders: Announcement[];
  featureRequests: FeatureRequest[];
  roadmapItems: RoadmapItem[];
  votedIds: Set<string>;
  isLoading: boolean;

  fetchAnnouncements: () => Promise<void>;
  fetchSliders: () => Promise<void>;
  fetchFeatureRequests: (sort?: 'votes' | 'newest') => Promise<void>;
  fetchRoadmapItems: () => Promise<void>;
  fetchMyVotes: () => Promise<void>;
  createFeatureRequest: (data: { title: string; description: string; category?: string }) => Promise<boolean>;
  toggleVote: (id: string) => Promise<void>;
}

export const useAnnouncementStore = create<AnnouncementState>((set, get) => ({
  announcements: [],
  sliders: [],
  featureRequests: [],
  roadmapItems: [],
  votedIds: new Set(),
  isLoading: false,

  fetchAnnouncements: async () => {
    try {
      const result = await announcementApi.getAll(1, 50);
      set({ announcements: extractArray<Announcement>(result) });
    } catch {
      /* API offline - keep empty */
    }
  },

  fetchSliders: async () => {
    try {
      const result = await announcementApi.getSliders();
      set({ sliders: extractArray<Announcement>(result) });
    } catch {
      /* API offline - keep empty */
    }
  },

  fetchFeatureRequests: async (sort = 'votes') => {
    try {
      const result = await featureRequestApi.getAll(1, 50, sort);
      set({ featureRequests: extractArray<FeatureRequest>(result) });
    } catch {
      /* API offline - keep empty */
    }
  },

  fetchRoadmapItems: async () => {
    try {
      const result = await roadmapApi.getAll();
      set({ roadmapItems: extractArray<RoadmapItem>(result) });
    } catch {
      /* API offline - keep empty */
    }
  },

  fetchMyVotes: async () => {
    try {
      const result = await featureRequestApi.getMyVotes();
      const obj = result as Record<string, unknown> | null;
      const votedIds = (obj?.data as Record<string, unknown>)?.votedIds ?? (obj as Record<string, unknown>)?.votedIds ?? [];
      set({ votedIds: new Set(votedIds as string[]) });
    } catch {
      /* API offline - keep empty */
    }
  },

  createFeatureRequest: async (data) => {
    try {
      set({ isLoading: true });
      await featureRequestApi.create(data);
      await get().fetchFeatureRequests();
      return true;
    } catch {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  toggleVote: async (id: string) => {
    const { votedIds, featureRequests } = get();
    const isVoted = votedIds.has(id);

    // Optimistic update
    const newVotedIds = new Set(votedIds);
    const newRequests = featureRequests.map(r => {
      if (r.id === id) {
        return { ...r, voteCount: r.voteCount + (isVoted ? -1 : 1) };
      }
      return r;
    });

    if (isVoted) {
      newVotedIds.delete(id);
    } else {
      newVotedIds.add(id);
    }

    set({ votedIds: newVotedIds, featureRequests: newRequests });

    try {
      await featureRequestApi.toggleVote(id);
    } catch {
      // Revert on failure
      set({ votedIds, featureRequests });
    }
  },
}));
