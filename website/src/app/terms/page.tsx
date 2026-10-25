import type { Metadata } from "next";

import { TermsOfService } from "@/components/legal/terms-of-service";

export const metadata: Metadata = {
  title: "Terms of Service | Scam Help.AI",
  description: "Terms for using Scam Help.AI on the web and in the extension.",
};

export default function TermsPage() {
  return <TermsOfService />;
}
