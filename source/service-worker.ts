import type { Message } from './constants';
import { MenuItem } from './constants';
import {
  checkFeeds,
  handleMessage,
  onInstalled,
  onStorageChanged,
  openFreshRssInSidebar,
  openFreshRssPage,
  setupAlarm,
} from './service-worker-functions';
import { getOptions } from './storage';

chrome.runtime.onInstalled.addListener(onInstalled);
chrome.runtime.onStartup.addListener(checkFeeds);
chrome.alarms.onAlarm.addListener(checkFeeds);

chrome.contextMenus.onClicked.addListener(({ menuItemId }) => {
  switch (menuItemId) {
    case MenuItem.CheckNow: {
      checkFeeds();
      break;
    }
    case MenuItem.OpenSidebar: {
      openFreshRssInSidebar();
      break;
    }
    case MenuItem.OpenPage: {
      openFreshRssPage();
      break;
    }
    default: {
      break;
    }
  }
});

chrome.storage.local.onChanged.addListener(onStorageChanged);

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch((error) => {
    console.error('Message handler error:', error);
    sendResponse({ error: String(error) });
  });
  return true;
});

getOptions().then(({ username, password, url, interval }) => {
  if (username !== '' && password !== '' && url !== '') {
    setupAlarm(interval);
  }
});
