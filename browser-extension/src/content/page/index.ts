import { readPageContents } from "./read-page.ts";

const INSTALLED_FLAG = "__scamhelpPageReaderInstalled";

type PageWindow = Window & {
  [INSTALLED_FLAG]?: boolean;
};

export type ReadPageMessage = {
  type: "readPageContents";
};

export type ReadPageResponse =
  | { ok: true; url: string; title: string; html: string }
  | { ok: false; error: string };

const pageWindow = window as PageWindow;
if (!pageWindow[INSTALLED_FLAG]) {
  pageWindow[INSTALLED_FLAG] = true;

  chrome.runtime.onMessage.addListener(
    (message: ReadPageMessage, _sender, sendResponse) => {
      if (message?.type !== "readPageContents") return false;

      try {
        const page = readPageContents(document);
        const response: ReadPageResponse = {
          ok: true,
          url: page.url,
          title: page.title,
          html: page.html,
        };
        sendResponse(response);
      } catch (error) {
        const response: ReadPageResponse = {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not read this page.",
        };
        sendResponse(response);
      }

      return false;
    },
  );
}
