import type { Options } from './constants';

export const defaults: Options = Object.freeze({
  url: '',
  username: '',
  password: '',
  interval: 5,
  sidebar: false,
  maxArticles: 10,
});

export const getOptions: () => Promise<Options> = async () => chrome.storage.local.get(defaults) as Promise<Options>;
