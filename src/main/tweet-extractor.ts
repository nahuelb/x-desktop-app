import type { WebContentsView } from "electron";
import type { TweetContext } from "../shared/types";

const EXTRACT_SCRIPT = `
(function() {
  function getText(el) {
    if (!el) return '';
    return el.innerText.trim();
  }

  // On a tweet detail page, the main tweet is the first article
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  if (!articles.length) return null;

  // Find the tweet closest to viewport center (works on timeline and detail)
  const viewportCenter = window.innerHeight / 2;
  let closest = articles[0];
  let closestDist = Infinity;
  for (const article of articles) {
    const rect = article.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const dist = Math.abs(center - viewportCenter);
    if (dist < closestDist) {
      closestDist = dist;
      closest = article;
    }
  }

  const textEl = closest.querySelector('[data-testid="tweetText"]');
  const userEl = closest.querySelector('[data-testid="User-Name"]');
  const timeEl = closest.querySelector('time');

  const text = getText(textEl);
  const author = userEl ? getText(userEl).split('\\n')[0] : 'Unknown';
  const timestamp = timeEl ? timeEl.getAttribute('datetime') || '' : '';

  // Grab thread context (up to 3 parent tweets on detail pages)
  const thread = [];
  const allArticles = Array.from(articles);
  const mainIdx = allArticles.indexOf(closest);
  const parents = allArticles.slice(Math.max(0, mainIdx - 3), mainIdx);
  for (const parent of parents) {
    const pText = getText(parent.querySelector('[data-testid="tweetText"]'));
    const pUser = parent.querySelector('[data-testid="User-Name"]');
    const pAuthor = pUser ? getText(pUser).split('\\n')[0] : 'Unknown';
    if (pText) thread.push({ author: pAuthor, text: pText });
  }

  return { text, author, timestamp, thread: thread.length ? thread : undefined };
})()
`;

const FOCUS_AND_SELECT_SCRIPT = `
(function() {
  const box = document.querySelector('[data-testid="tweetTextarea_0"]')
    || document.querySelector('[role="textbox"][contenteditable="true"]');
  if (!box) return false;
  box.focus();
  const range = document.createRange();
  range.selectNodeContents(box);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
})()
`;

const EXTRACT_COMPOSE_SCRIPT = `
(function() {
  const box = document.querySelector('[data-testid="tweetTextarea_0"]')
    || document.querySelector('[role="textbox"][contenteditable="true"]');
  if (!box) return '';
  return box.innerText.trim();
})()
`;

export async function extractComposeText(
  twitterView: WebContentsView
): Promise<string> {
  try {
    return (
      (await twitterView.webContents.executeJavaScript(
        EXTRACT_COMPOSE_SCRIPT
      )) || ""
    );
  } catch {
    return "";
  }
}

export async function extractTweetContext(
  twitterView: WebContentsView
): Promise<TweetContext | null> {
  try {
    return await twitterView.webContents.executeJavaScript(EXTRACT_SCRIPT);
  } catch {
    return null;
  }
}

export async function pasteIntoCompose(
  twitterView: WebContentsView,
  text: string
): Promise<boolean> {
  try {
    const selected = await twitterView.webContents.executeJavaScript(
      FOCUS_AND_SELECT_SCRIPT
    );
    if (!selected) {
      return false;
    }

    await twitterView.webContents.insertText(text);
    return true;
  } catch {
    return false;
  }
}
