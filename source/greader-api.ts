import type { Article } from './constants';

interface Subscription {
  id: string;
  title: string;
  htmlUrl?: string;
  url?: string;
}

interface StreamItem {
  id: string;
  title: string;
  alternate: { href: string }[];
  summary: { content: string };
  origin: { streamId: string; title: string; htmlUrl?: string };
  published: number;
  categories: { id: string }[];
}

export class FreshRSSApi {
  private authToken: string | null = null;
  private subscriptionCache: Record<string, Subscription> | null = null;

  private static readonly ENDPOINT = 'api/greader.php';
  private static readonly LOGIN = '/accounts/ClientLogin';
  private static readonly UNREAD_COUNT = '/reader/api/0/unread-count?output=json';
  private static readonly STREAM_CONTENTS = '/reader/api/0/stream/contents/reading-list';
  private static readonly TOKEN = '/reader/api/0/token';
  private static readonly EDIT_TAG = '/reader/api/0/edit-tag';
  private static readonly SUBSCRIPTIONS = '/reader/api/0/subscription/list?output=json';
  private static readonly TAG_READ = 'user/-/state/com.google/read';

  constructor(
    private baseUrl: string,
    private username: string,
    private password: string,
  ) {}

  private get apiBase(): string {
    return `${this.baseUrl}${FreshRSSApi.ENDPOINT}`;
  }

  private get authHeaders(): HeadersInit {
    return { Authorization: `GoogleLogin auth=${this.authToken}` };
  }

  async connect(): Promise<void> {
    const params = new URLSearchParams({
      Email: this.username,
      Passwd: this.password,
    });

    const response = await fetch(`${this.apiBase}${FreshRSSApi.LOGIN}?${params}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const authLine = text.split('\n').find((line) => line.startsWith('Auth='));

    if (!authLine) {
      throw new Error(`Auth token not found in response:\n${text}`);
    }

    this.authToken = authLine.substring(5);
  }

  private async ensureAuth(): Promise<void> {
    if (!this.authToken) {
      await this.connect();
    }
  }

  private async fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
    await this.ensureAuth();

    const response = await fetch(url, {
      ...init,
      headers: { ...this.authHeaders, ...init?.headers },
    });

    // Re-authenticate on 401 and retry once
    if (response.status === 401) {
      this.authToken = null;
      await this.connect();
      return fetch(url, {
        ...init,
        headers: { ...this.authHeaders, ...init?.headers },
      });
    }

    return response;
  }

  async getUnreadCount(): Promise<number> {
    const response = await this.fetchWithAuth(`${this.apiBase}${FreshRSSApi.UNREAD_COUNT}`);
    const data = await response.json();
    return data.max;
  }

  private async getSubscriptions(): Promise<Record<string, Subscription>> {
    if (this.subscriptionCache) {
      return this.subscriptionCache;
    }

    const response = await this.fetchWithAuth(`${this.apiBase}${FreshRSSApi.SUBSCRIPTIONS}`);
    const data = await response.json();

    this.subscriptionCache = {};
    for (const sub of data.subscriptions) {
      this.subscriptionCache[sub.id] = sub;
    }

    return this.subscriptionCache;
  }

  async getArticles(count: number): Promise<Article[]> {
    if (count === 0) return [];

    const params = new URLSearchParams({
      output: 'json',
      r: 'n',
      n: String(count),
      xt: FreshRSSApi.TAG_READ,
    });

    const [response, subscriptions] = await Promise.all([
      this.fetchWithAuth(`${this.apiBase}${FreshRSSApi.STREAM_CONTENTS}?${params}`),
      this.getSubscriptions(),
    ]);

    const data = await response.json();
    const items: StreamItem[] = data.items ?? [];

    return items.map((item) => {
      const sub = subscriptions[item.origin.streamId];
      return {
        id: item.id,
        title: item.title,
        link: item.alternate?.[0]?.href ?? '',
        content: item.summary?.content ?? '',
        feedTitle: sub?.title ?? item.origin.title ?? '',
        feedUrl: sub?.htmlUrl ?? sub?.url ?? '',
        isRead: item.categories?.some((c) => c.id?.endsWith('/state/com.google/read')) ?? false,
        timestamp: item.published,
      };
    });
  }

  private async getToken(): Promise<string> {
    const response = await this.fetchWithAuth(`${this.apiBase}${FreshRSSApi.TOKEN}`);
    const text = await response.text();
    return text.trim();
  }

  async toggleReadState(itemId: string, currentlyRead: boolean): Promise<void> {
    const token = await this.getToken();

    const params = new URLSearchParams();
    params.append('i', itemId);
    params.append('T', token);
    params.append(currentlyRead ? 'r' : 'a', FreshRSSApi.TAG_READ);

    await this.fetchWithAuth(`${this.apiBase}${FreshRSSApi.EDIT_TAG}`, {
      method: 'POST',
      body: params,
    });
  }
}
