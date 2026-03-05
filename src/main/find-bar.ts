import { type BaseWindow, nativeTheme, WebContentsView } from "electron";

const FIND_PREFIX = "__FIND__:";
const DEBOUNCE_MS = 150;
const BAR_WIDTH = 368;
const BAR_HEIGHT = 42;

function buildFindBarURL(isDark: boolean): string {
  const bg = isDark ? "#16181c" : "#ffffff";
  const border = isDark ? "#2f3336" : "#e1e8ed";
  const text = isDark ? "#e7e9ea" : "#0f1419";
  const muted = isDark ? "#71767b" : "#536471";
  const inputBg = isDark ? "#202327" : "#eff3f4";
  const btnHover = isDark ? "rgba(239,243,244,0.08)" : "rgba(15,20,25,0.06)";
  const shadow = isDark
    ? "0 4px 20px rgba(0,0,0,0.45)"
    : "0 4px 20px rgba(0,0,0,0.1)";

  /* eslint-disable -- inline HTML template, not application code */
  const html = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:transparent;height:100%;overflow:hidden;-webkit-user-select:none}
@keyframes barIn{from{opacity:0;transform:translateY(-6px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
body{display:flex;align-items:center;padding:0 1px}
.bar{display:flex;align-items:center;gap:3px;padding:0 4px 0 11px;
background:${bg};border:1px solid ${border};border-radius:12px;
box-shadow:${shadow};
font:13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
color:${text};width:100%;height:100%;animation:barIn .18s cubic-bezier(.2,.9,.3,1)}
.icon{color:${muted};display:flex;align-items:center;flex-shrink:0;margin-right:2px}
input{flex:1;min-width:0;padding:5px 8px;background:${inputBg};
border:1.5px solid transparent;border-radius:8px;color:${text};
font:inherit;outline:none;-webkit-user-select:text;transition:border-color .15s,background .15s}
input:focus{border-color:#1d9bf0;background:${isDark ? "rgba(29,155,240,0.06)" : "rgba(29,155,240,0.04)"}}
input::placeholder{color:${muted}}
.count{color:${muted};font-size:11px;white-space:nowrap;min-width:40px;
text-align:center;font-variant-numeric:tabular-nums;letter-spacing:-0.01em}
.sep{width:1px;height:16px;background:${border};flex-shrink:0;margin:0 1px}
button{background:none;border:none;color:${muted};cursor:pointer;
width:28px;height:28px;border-radius:8px;
display:flex;align-items:center;justify-content:center;
transition:color .12s,background .12s,transform .1s;outline:none;flex-shrink:0}
button:hover{color:${text};background:${btnHover}}
button:active{transform:scale(0.9)}
</style></head><body><div class="bar">
<div class="icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7.5"/><path d="m20 20-4-4"/></svg></div>
<input id="fi" type="text" placeholder="Find on page\u2026" autofocus/>
<span id="fc" class="count"></span>
<div class="sep"></div>
<button id="pb" title="Previous (Shift+Enter)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg></button>
<button id="nb" title="Next (Enter)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
<button id="cb" title="Close (Esc)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
</div><script>
var fi=document.getElementById("fi"),P="${FIND_PREFIX}";
fi.addEventListener("input",function(){console.log(P+"query:"+fi.value)});
document.addEventListener("keydown",function(e){
if(e.key==="Escape"){e.preventDefault();console.log(P+"close")}
if(e.key==="Enter"){e.preventDefault();console.log(P+(e.shiftKey?"prev":"next"))}
});
document.getElementById("pb").addEventListener("click",function(){console.log(P+"prev");fi.focus()});
document.getElementById("nb").addEventListener("click",function(){console.log(P+"next");fi.focus()});
document.getElementById("cb").addEventListener("click",function(){console.log(P+"close")});
fi.focus();
</script></body></html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export function setupFindBar(win: BaseWindow, twitterView: WebContentsView) {
  let view: WebContentsView | null = null;
  let active = false;
  let lastQuery = "";
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const focusInput = () => {
    if (!view) {
      return;
    }
    view.webContents.focus();
    view.webContents.executeJavaScript(
      'var e=document.getElementById("fi");if(e){e.focus();e.select()}'
    );
  };

  const position = () => {
    if (!(view && active)) {
      return;
    }
    const { x, y, width } = twitterView.getBounds();
    view.setBounds({
      x: x + width - BAR_WIDTH - 12,
      y: y + 8,
      width: BAR_WIDTH,
      height: BAR_HEIGHT,
    });
  };

  const updateCount = (text: string) => {
    view?.webContents.executeJavaScript(
      `document.getElementById("fc").textContent=${JSON.stringify(text)};`
    );
  };

  const findNext = (forward: boolean) => {
    if (!lastQuery) {
      return;
    }
    twitterView.webContents.findInPage(lastQuery, {
      forward,
      findNext: true,
    });
  };

  const hide = () => {
    if (!(active && view)) {
      return;
    }
    active = false;
    lastQuery = "";
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    twitterView.webContents.stopFindInPage("clearSelection");
    win.contentView.removeChildView(view);
    view.webContents.executeJavaScript(
      'document.getElementById("fi").value="";' +
        'document.getElementById("fc").textContent="";'
    );
  };

  const createView = () => {
    view = new WebContentsView({ webPreferences: { sandbox: true } });
    view.setBackgroundColor("#00000000");
    view.webContents.loadURL(buildFindBarURL(nativeTheme.shouldUseDarkColors));

    view.webContents.on("console-message", (_e, _level, msg) => {
      if (!msg.startsWith(FIND_PREFIX)) {
        return;
      }
      const payload = msg.slice(FIND_PREFIX.length);

      if (payload === "close") {
        hide();
        return;
      }
      if (payload === "next") {
        findNext(true);
        return;
      }
      if (payload === "prev") {
        findNext(false);
        return;
      }

      if (payload.startsWith("query:")) {
        const query = payload.slice(6);
        lastQuery = query;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          if (query) {
            twitterView.webContents.findInPage(query);
          } else {
            twitterView.webContents.stopFindInPage("clearSelection");
            updateCount("");
          }
        }, DEBOUNCE_MS);
      }
    });
  };

  const show = () => {
    if (active && view) {
      focusInput();
      return;
    }
    const isNew = !view;
    if (isNew) {
      createView();
    }
    if (!view) {
      return;
    }
    active = true;
    position();
    win.contentView.addChildView(view);

    if (isNew && view.webContents.isLoading()) {
      view.webContents.once("did-finish-load", focusInput);
    } else {
      focusInput();
    }
  };

  twitterView.webContents.on("found-in-page", (_e, result) => {
    if (result.finalUpdate) {
      updateCount(
        result.matches > 0
          ? `${result.activeMatchOrdinal} of ${result.matches}`
          : "No results"
      );
    }
  });

  twitterView.webContents.on("did-navigate-in-page", () => {
    if (active) {
      hide();
    }
  });

  twitterView.webContents.on("did-navigate", () => {
    if (active) {
      hide();
    }
  });

  win.on("resize", position);

  nativeTheme.on("updated", () => {
    if (!view) {
      return;
    }
    if (active) {
      hide();
    }
    view.webContents.loadURL(buildFindBarURL(nativeTheme.shouldUseDarkColors));
  });

  return { show };
}
