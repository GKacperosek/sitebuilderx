import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Activity, Project } from '@sitebuilder/shared/types';
import { api } from './api';
export function useProjects(trash = false) { return useQuery({ queryKey: ['projects', trash], queryFn: () => api<{ projects: Project[] }>(`/projects${trash ? '?trash=1' : ''}`) }); }
export function useActivity() { return useQuery({ queryKey: ['activity'], queryFn: () => api<{ activities: Activity[] }>('/activity') }); }
export function useInvalidate() { const client = useQueryClient(); return () => { void client.invalidateQueries({ queryKey: ['projects'] }); void client.invalidateQueries({ queryKey: ['publications'] }); void client.invalidateQueries({ queryKey: ['activity'] }); void client.invalidateQueries({ queryKey: ['analytics'] }); }; }
export function formatDate(value: string, language: 'pl' | 'en', withTime = false) { return new Date(value).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-GB', { day: 'numeric', month: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }); }
export function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; }
