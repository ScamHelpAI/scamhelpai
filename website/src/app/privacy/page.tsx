import type { Metadata } from "next";

import { PrivacyPolicy } from "@/components/legal/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy Policy | Scam Help.AI",
  description: "How Scam Help.AI collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
