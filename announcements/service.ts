import api from '../_shared/api';
import type { Announcement, FeatureRequest, RoadmapItem } from './types';

// Re-export types for backward compatibility
export type { Announcement, FeatureRequest, RoadmapItem };

// ─── API Functions ───

export const announcementApi = {
  getAll: (page = 1, limit = 20) =>
    api.get('/announcements', { params: { page, limit } }).then(r => r.data),

  getSliders: () =>
    api.get('/announcements/sliders').then(r => r.data),

  getOne: (id: string) =>
    api.get(`/announcements/${id}`).then(r => r.data),
};

export const featureRequestApi = {
  getAll: (page = 1, limit = 20, sort: 'votes' | 'newest' = 'votes') =>
    api.get('/feature-requests', { params: { page, limit, sort } }).then(r => r.data),

  getMyVotes: () =>
    api.get('/feature-requests/my-votes').then(r => r.data),

  create: (data: { title: string; description: string; category?: string }) =>
    api.post('/feature-requests', data).then(r => r.data),

  toggleVote: (id: string) =>
    api.post(`/feature-requests/${id}/vote`).then(r => r.data),
};

export const roadmapApi = {
  getAll: () =>
    api.get('/roadmap').then(r => r.data),

  getOne: (id: string) =>
    api.get(`/roadmap/${id}`).then(r => r.data),
};
