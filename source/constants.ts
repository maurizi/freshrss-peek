export const supportsSidebar = 'sidebarAction' in chrome;

export const ALARM_ID = 'freshrss-notify__alarm';

export enum MenuItem {
  CheckNow = 'freshrss-notify__contextMenu_checkNow',
  OpenPage = 'freshrss-notify__contextMenu_openPage',
  OpenSidebar = 'freshrss-notify__contextMenu_openSidebar',
}

export interface Options {
  url: string;
  username: string;
  password: string;
  interval: number;
  sidebar: boolean;
  maxArticles: number;
  notifications: boolean;
}

export enum BadgeColor {
  Normal = 'blue',
  Warning = 'yellow',
  Failure = 'red',
}

export enum LocalStorageKey {
  Sidebar = 'sidebar',
  Url = 'url',
}

export enum MessageVariant {
  Success = 'success',
  Error = 'error',
}

export enum MessageType {
  GetArticles = 'get-articles',
  GetUnreadCount = 'get-unread-count',
  ToggleRead = 'toggle-read',
  Refresh = 'refresh',
  GetOptions = 'get-options',
}

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface ToggleReadPayload {
  itemId: string;
  currentlyRead: boolean;
}

export interface Article {
  id: string;
  title: string;
  link: string;
  content: string;
  feedTitle: string;
  feedUrl: string;
  isRead: boolean;
  timestamp: number;
}

export interface ArticlesResponse {
  articles: Article[];
  unreadCount: number;
}
