import type { ApplyPageAnnotationsMessage } from "../../shared/messages.ts";
import { applyAnnotations } from "./decorate.ts";

const INSTALLED_FLAG = "__scamhelpAnnotationsInstalled";

type AnnotationWindow = Window & {
  [INSTALLED_FLAG]?: boolean;
};

const annotationWindow = window as AnnotationWindow;
if (!annotationWindow[INSTALLED_FLAG]) {
  annotationWindow[INSTALLED_FLAG] = true;

  chrome.runtime.onMessage.addListener(
    (message: ApplyPageAnnotationsMessage, _sender, sendResponse) => {
      if (message?.type !== "applyPageAnnotations") return false;

      try {
        applyAnnotations(message.decision, message.riskyParts, document);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not apply annotations.",
        });
      }

      return false;
    },
  );
}
