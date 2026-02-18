import { useEffect, useState } from "react";
import type { PageNavigation, PageType } from "../../shared/types";

interface PageState {
  pageType: PageType;
  url: string;
}

export function usePageType(): PageState {
  const [state, setState] = useState<PageState>({
    pageType: "other",
    url: "",
  });

  useEffect(() => {
    return window.electronAPI.onPageTypeChanged((nav: PageNavigation) => {
      setState({ pageType: nav.pageType, url: nav.url });
    });
  }, []);

  return state;
}
