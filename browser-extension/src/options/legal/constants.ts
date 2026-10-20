/** Product / operator labels used across legal documents. */
export const PRODUCT_NAME = "ScamHelp AI";
export const OPERATOR_NAME = "ScamHelp AI";
export const PRIVACY_CONTACT_EMAIL = "privacy@scamhelp.ai";
export const SUPPORT_CONTACT_EMAIL = "support@scamhelp.ai";
export const EFFECTIVE_DATE = "October 19, 2026";
export const GOVERNING_LAW = "the State of California, United States";

export type LegalView = "settings" | "privacy" | "terms";

export function legalViewFromHash(hash: string): LegalView {
  const value = hash.replace(/^#/, "").toLowerCase();
  if (value === "privacy") return "privacy";
  if (value === "terms") return "terms";
  return "settings";
}

export function hashForLegalView(view: LegalView): string {
  switch (view) {
    case "privacy":
      return "#privacy";
    case "terms":
      return "#terms";
    case "settings":
      return "";
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
