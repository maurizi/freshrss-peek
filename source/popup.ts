import DOMPurify from 'dompurify';
import type { Article, ArticlesResponse, Options } from './constants';
import { MessageType } from './constants';

const sendMessage = <T>(type: MessageType, payload?: unknown): Promise<T> =>
  chrome.runtime.sendMessage({ type, payload });

const elements = {
  container: document.getElementById('articles-container') as HTMLElement,
  loading: document.getElementById('loading') as HTMLElement,
  emptyState: document.getElementById('empty-state') as HTMLElement,
  unreadCount: document.getElementById('unread-count') as HTMLElement,
  refreshBtn: document.getElementById('refresh-btn') as HTMLElement,
  instanceLink: document.getElementById('instance-link') as HTMLAnchorElement,
  template: document.getElementById('article-template') as HTMLTemplateElement,
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const markAsRead = async (article: Article, card: HTMLElement) => {
  if (article.isRead) return;

  try {
    await sendMessage(MessageType.ToggleRead, {
      itemId: article.id,
      currentlyRead: false,
    });
    card.dataset.read = 'true';
    article.isRead = true;

    const current = Number.parseInt(elements.unreadCount.textContent || '0', 10);
    elements.unreadCount.textContent = String(Math.max(0, current - 1));
  } catch (err) {
    console.error('Failed to mark as read:', err);
  }
};

const renderArticle = (article: Article): HTMLElement => {
  const fragment = elements.template.content.cloneNode(true) as DocumentFragment;
  const card = fragment.querySelector('.article-card') as HTMLElement;

  card.dataset.id = article.id;
  card.dataset.read = String(article.isRead);

  const title = card.querySelector('.article-title') as HTMLAnchorElement;
  title.textContent = article.title;
  title.href = article.link;
  title.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ active: true, url: article.link });
    markAsRead(article, card);
  });

  const contentEl = card.querySelector('.article-content') as HTMLElement;
  const sanitized = DOMPurify.sanitize(article.content);
  contentEl.innerHTML = sanitized;

  // Intercept links inside article content
  contentEl.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('a');
    if (target) {
      e.preventDefault();
      chrome.tabs.create({ active: false, url: (target as HTMLAnchorElement).href });
    }
  });

  // Toggle content visibility
  const toggleContentBtn = card.querySelector('.toggle-content-btn') as HTMLElement;
  toggleContentBtn.addEventListener('click', () => {
    const hidden = contentEl.hasAttribute('hidden');
    if (hidden) {
      contentEl.removeAttribute('hidden');
    } else {
      contentEl.setAttribute('hidden', '');
    }
    toggleContentBtn.classList.toggle('expanded', hidden);
  });

  // Toggle read state
  const toggleReadBtn = card.querySelector('.toggle-read-btn') as HTMLElement;
  toggleReadBtn.addEventListener('click', async () => {
    const currentlyRead = card.dataset.read === 'true';
    toggleReadBtn.classList.add('loading');

    try {
      await sendMessage(MessageType.ToggleRead, {
        itemId: article.id,
        currentlyRead,
      });
      card.dataset.read = String(!currentlyRead);
      article.isRead = !currentlyRead;

      const current = Number.parseInt(elements.unreadCount.textContent || '0', 10);
      const newCount = current + (currentlyRead ? 1 : -1);
      elements.unreadCount.textContent = String(newCount);
    } catch (err) {
      console.error('Failed to toggle read state:', err);
    } finally {
      toggleReadBtn.classList.remove('loading');
    }
  });

  const feedEl = card.querySelector('.article-feed') as HTMLElement;
  feedEl.textContent = article.feedTitle;

  const timeEl = card.querySelector('.article-time') as HTMLElement;
  timeEl.textContent = formatTime(article.timestamp);

  return card;
};

const loadArticles = async () => {
  elements.loading.hidden = false;
  elements.emptyState.hidden = true;
  for (const el of elements.container.querySelectorAll('.article-card')) {
    el.remove();
  }

  try {
    const { articles, unreadCount } = await sendMessage<ArticlesResponse>(MessageType.GetArticles);
    elements.unreadCount.textContent = String(unreadCount);

    if (articles.length === 0) {
      elements.emptyState.hidden = false;
    } else {
      for (const article of articles) {
        elements.container.appendChild(renderArticle(article));
      }
    }
  } catch (err) {
    console.error(err);
    elements.emptyState.textContent = 'Error loading articles';
    elements.emptyState.hidden = false;
  } finally {
    elements.loading.hidden = true;
  }
};

const showSetupPrompt = () => {
  elements.loading.hidden = true;
  elements.emptyState.hidden = true;

  const setup = document.getElementById('setup-prompt') as HTMLElement;
  setup.hidden = false;
  setup.querySelector('a')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const opts = await sendMessage<Options>(MessageType.GetOptions);

    if (!opts.url || !opts.username || !opts.password) {
      showSetupPrompt();
      return;
    }

    elements.instanceLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ active: true, url: opts.url });
    });
  } catch (err) {
    console.error('Failed to get options:', err);
  }

  elements.refreshBtn.addEventListener('click', loadArticles);

  await loadArticles();
});
