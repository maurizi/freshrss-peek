import {
  ALARM_ID,
  type ArticlesResponse,
  BadgeColor,
  LocalStorageKey,
  type Message,
  MenuItem,
  MessageType,
  type ToggleReadPayload,
  supportsSidebar,
} from './constants';
import { FreshRSSApi } from './greader-api';
import { getOptions } from './storage';

const i18n = {
  contextMenu_checkNow: chrome.i18n.getMessage('contextMenu_checkNow'),
  contextMenu_sidebar: chrome.i18n.getMessage('contextMenu_sidebar'),
  contextMenu_noSidebar: chrome.i18n.getMessage('contextMenu_noSidebar'),
  badge_error: chrome.i18n.getMessage('badge_error'),
};

let api: FreshRSSApi | null = null;

const getApi = async (): Promise<FreshRSSApi> => {
  if (!api) {
    const { url, username, password } = await getOptions();
    api = new FreshRSSApi(url, username, password);
  }
  return api;
};

const invalidateApi = () => {
  api = null;
};

const setBadge = (color: BadgeColor, text: string) => {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
};

export const checkFeeds = async () => {
  const { url, username, password } = await getOptions();
  if (url === '' || username === '' || password === '') {
    setBadge(BadgeColor.Warning, '!');
    return;
  }

  try {
    const client = await getApi();
    const count = await client.getUnreadCount();
    setBadge(BadgeColor.Normal, count > 0 ? count.toString() : '');
  } catch (error) {
    console.error(error);
    setBadge(BadgeColor.Failure, i18n.badge_error);
    invalidateApi();
  }
};

export const handleMessage = async (message: Message): Promise<unknown> => {
  switch (message.type) {
    case MessageType.GetArticles: {
      const client = await getApi();
      const { maxArticles } = await getOptions();
      const [articles, unreadCount] = await Promise.all([client.getArticles(maxArticles), client.getUnreadCount()]);
      setBadge(BadgeColor.Normal, unreadCount > 0 ? unreadCount.toString() : '');
      return { articles, unreadCount } satisfies ArticlesResponse;
    }
    case MessageType.GetUnreadCount: {
      const client = await getApi();
      return { unreadCount: await client.getUnreadCount() };
    }
    case MessageType.ToggleRead: {
      const { itemId, currentlyRead } = message.payload as ToggleReadPayload;
      const client = await getApi();
      await client.toggleReadState(itemId, currentlyRead);
      await checkFeeds();
      return { success: true };
    }
    case MessageType.MarkAllRead: {
      const { itemIds } = message.payload as { itemIds: string[] };
      const client = await getApi();
      await Promise.all(itemIds.map((id) => client.toggleReadState(id, false)));
      await checkFeeds();
      return { success: true };
    }
    case MessageType.Refresh: {
      await checkFeeds();
      const client = await getApi();
      const { maxArticles } = await getOptions();
      const [articles, unreadCount] = await Promise.all([client.getArticles(maxArticles), client.getUnreadCount()]);
      return { articles, unreadCount } satisfies ArticlesResponse;
    }
    case MessageType.GetOptions: {
      return await getOptions();
    }
    default:
      return null;
  }
};

export const openFreshRssPage = async () => {
  const { url } = await getOptions();
  if (url === '') {
    chrome.runtime.openOptionsPage();
    return;
  }
  chrome.tabs.create({ url });
};

export const openFreshRssInSidebar = async () => {
  const url = localStorage.getItem('url');
  if (url === null || url === '') {
    chrome.runtime.openOptionsPage();
    return;
  }

  chrome.sidebarAction.setPanel({ panel: url });
  await chrome.sidebarAction.open();
};

export const setupAlarm = async (interval: number) => {
  const alarm = await chrome.alarms.get(ALARM_ID);

  if (!alarm || alarm.periodInMinutes !== interval) {
    await chrome.alarms.create(ALARM_ID, {
      periodInMinutes: interval,
    });
  }
};

export const createOpenPageMenu = () => {
  chrome.contextMenus.create({
    id: MenuItem.OpenPage,
    title: i18n.contextMenu_noSidebar,
    contexts: ['action'],
  });
};

export const createOpenSidebarMenu = () => {
  chrome.contextMenus.create({
    id: MenuItem.OpenSidebar,
    title: i18n.contextMenu_sidebar,
    contexts: ['action'],
  });
};

export const onInstalled = async () => {
  const { url, sidebar } = await getOptions();

  chrome.contextMenus.create({
    id: MenuItem.CheckNow,
    title: i18n.contextMenu_checkNow,
    contexts: ['action'],
  });

  if (supportsSidebar) {
    if (sidebar) {
      createOpenPageMenu();
    } else {
      createOpenSidebarMenu();
    }
  }

  // Firefox needs user action for opening the sidebar.
  // So we will save these options to localStorage, since reading them
  // asynchronously loses the "user interaction".
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1800401
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(LocalStorageKey.Url, url);
    localStorage.setItem(LocalStorageKey.Sidebar, String(sidebar));
  }

  checkFeeds();
};

export const onStorageChanged = (changes: { [key: string]: chrome.storage.StorageChange }) => {
  if (changes.interval) {
    setupAlarm(changes.interval.newValue);
  }
  if (changes.username || changes.password || changes.url) {
    invalidateApi();
    checkFeeds();
  }

  if (supportsSidebar && changes.sidebar && changes.sidebar.oldValue !== changes.sidebar.newValue) {
    if (changes.sidebar.newValue) {
      chrome.contextMenus.remove(MenuItem.OpenSidebar);
      createOpenPageMenu();
    } else {
      chrome.contextMenus.remove(MenuItem.OpenPage);
      createOpenSidebarMenu();
    }
  }
};
