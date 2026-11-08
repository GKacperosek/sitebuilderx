export type Device = 'desktop' | 'laptop' | 'tablet' | 'mobile';
export const DEVICE_WIDTHS: Record<Device, number> = { desktop: 1440, laptop: 1024, tablet: 768, mobile: 390 };
export type StyleMap = Record<string, string | number>;
export type NodeProps = Record<string, any>;
export type ElementCategory = 'text' | 'media' | 'layout' | 'interactive' | 'commerce' | 'sections';
export interface SiteNode {
  id: string;
  type: string;
  name: string;
  props: NodeProps;
  children: string[];
  styles: StyleMap;
  responsive: Partial<Record<Exclude<Device, 'desktop'>, StyleMap>>;
  hover: StyleMap;
  hidden: Partial<Record<Device, boolean>>;
  animation?: 'none' | 'fade' | 'slide' | 'zoom' | 'float';
  locked?: boolean;
}
export interface PageSEO { title: string; description: string; keywords: string; ogImage: string; noindex: boolean }
export interface SitePage { id: string; name: string; slug: string; rootIds: string[]; seo: PageSEO }
export interface SiteTheme {
  name: string;
  colors: { background: string; surface: string; text: string; muted: string; primary: string; secondary: string; border: string };
  fontFamily: string;
  headingFont: string;
  radius: number;
}
export interface SiteDocument { version: 1; pages: SitePage[]; nodes: Record<string, SiteNode>; theme: SiteTheme; language: 'pl' | 'en'; }
export interface NodeSpec { type: string; name?: string; props?: NodeProps; styles?: StyleMap; responsive?: SiteNode['responsive']; hover?: StyleMap; animation?: SiteNode['animation']; children?: NodeSpec[]; }
export interface ElementDefinition { type: string; label: string; labelPl: string; category: ElementCategory; icon: string; allowsChildren: boolean; defaultProps: NodeProps; defaultStyles: StyleMap; }
export interface LibraryItem { id: string; name: string; namePl: string; category: ElementCategory; type: string; description: string; tags: string[]; spec: NodeSpec; }
export interface SiteTemplate { id: string; name: string; description: string; descriptionPl?: string; category: string; accent: string; dark: boolean; featured?: boolean; tags: string[]; create: (language?: 'pl' | 'en') => SiteDocument; }
export interface VNode { tag: string; attrs?: Record<string, string | number | boolean | undefined>; text?: string; html?: string; children?: Array<VNode | { slot: true }>; }
export interface User { id: string; email: string; name: string; avatar: string | null; language: 'pl' | 'en'; settings: Record<string, any>; createdAt: string; }
export interface Project {
  id: string; name: string; description: string; document: SiteDocument; revision: number;
  publishedSlug: string | null; publishedAt: string | null; deletedAt: string | null;
  createdAt: string; updatedAt: string; thumbnail: string | null;
}
export interface MediaAsset { id: string; name: string; url: string; mimeType: string; size: number; folder: string; createdAt: string; }
export interface Activity { id: string; action: string; detail: string; projectId: string | null; createdAt: string; }
export interface ProjectVersion { id: string; label: string; revision: number; createdAt: string; }
export interface Domain { id: string; hostname: string; projectId: string; verified: boolean; token: string; createdAt: string; }
export interface Submission { id: string; projectId: string; pageSlug: string; formName: string; data: Record<string, string>; createdAt: string; }
