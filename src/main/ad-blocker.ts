import type { WebContentsView } from "electron";

const AD_BLOCK_CSS = `
  article[data-testid="tweet"]:has([data-testid="placementTracking"]) {
    display: none !important;
  }
`;

const AD_BLOCK_SCRIPT = `
(function() {
  if (window.__adBlockerInjected) return;
  window.__adBlockerInjected = true;

  function isAdTweet(article) {
    return !!article.querySelector('[data-testid="placementTracking"]');
  }

  function hideAd(article) {
    article.style.display = 'none';
  }

  for (const article of document.querySelectorAll('article[data-testid="tweet"]')) {
    if (isAdTweet(article)) hideAd(article);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.('article[data-testid="tweet"]') && isAdTweet(node)) {
          hideAd(node);
          continue;
        }
        const articles = node.querySelectorAll?.('article[data-testid="tweet"]');
        if (articles) {
          for (const article of articles) {
            if (isAdTweet(article)) hideAd(article);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})()
`;

export async function injectAdBlocker(
  twitterView: WebContentsView
): Promise<void> {
  try {
    await twitterView.webContents.insertCSS(AD_BLOCK_CSS);
    await twitterView.webContents.executeJavaScript(AD_BLOCK_SCRIPT);
  } catch {
    // Page may not be ready yet
  }
}
