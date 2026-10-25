import {
  EFFECTIVE_DATE,
  OPERATOR_NAME,
  PRIVACY_CONTACT_EMAIL,
  PRODUCT_NAME,
} from "./constants.ts";
import { LegalDocument, LegalList, LegalSection } from "./LegalDocument.tsx";

type PrivacyPolicyProps = {
  onBack: () => void;
};

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <LegalDocument
      title="Privacy Policy"
      effectiveDate={EFFECTIVE_DATE}
      onBack={onBack}
    >
      <p>
        This Privacy Policy explains how {OPERATOR_NAME} (“we,” “us,” or “our”)
        collects, uses, stores, shares, and protects information when you use
        the {PRODUCT_NAME} browser extension, related APIs, and services
        (collectively, the “Service”).
      </p>
      <p>
        By installing or using the Service, you acknowledge the practices
        described here. If you do not agree, do not use the Service.
      </p>

      <LegalSection title="1. Who we are">
        <p>
          {PRODUCT_NAME} helps you assess whether web pages, links, messages,
          and related content may show scam or phishing signals. The Service is
          operated by {OPERATOR_NAME}. For privacy questions, contact{" "}
          <a
            className="text-trust underline underline-offset-2"
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Scope">
        <p>This policy covers:</p>
        <LegalList
          items={[
            "The browser extension (including the popup, options/settings page, background worker, and content scripts)",
            "Our analysis and URL-check API endpoints that the extension calls",
            "Optional uploads you submit for analysis (such as images, PDFs, audio, or email content) when those features are used",
          ]}
        />
        <p>
          It does not cover third-party websites you visit, or third-party
          services that process data on our behalf under their own terms (see
          Section 7).
        </p>
      </LegalSection>

      <LegalSection title="3. Information we collect">
        <p>
          We do not require you to create an account. We do not intentionally
          collect names, passwords, payment card numbers, or government IDs as
          profile data. Content you ask us to analyze may incidentally include
          personal information that appears on a page or in a file you submit.
        </p>

        <h3 className="font-heading text-lg font-bold">
          3.1 Information you choose to send for analysis
        </h3>
        <p>
          When you use “Scan this page” or similar features, we may receive:
        </p>
        <LegalList
          items={[
            "Extracted page text or cleaned HTML (currently capped at about 20,000 characters per scan)",
            "The page URL and optional referrer or locale context",
            "URLs from pages when “Scan links on pages” is enabled",
            "Text, URLs, email content, or file uploads (images, PDFs, audio) you submit through supported API inputs",
          ]}
        />

        <h3 className="font-heading text-lg font-bold">
          3.2 Information stored in your browser
        </h3>
        <p>
          The extension stores preferences in Chrome sync storage on your
          devices, including whether link scanning is enabled and the analyzer
          API base URL you configure. That data stays in your browser profile
          unless you clear extension storage or sync it via your browser
          account.
        </p>

        <h3 className="font-heading text-lg font-bold">
          3.3 Technical and security information
        </h3>
        <p>Our servers may process:</p>
        <LegalList
          items={[
            "IP address (used for rate limiting and abuse prevention)",
            "Standard request metadata (timestamps, user-agent, status codes)",
            "Analysis identifiers, risk scores, summaries, evidence records, and model/tool run metadata needed to provide results",
            "Cached URL and domain check results (hashed or raw URLs/hostnames, status, score, reasons, hit counts, expiry times)",
            "Uploaded asset metadata (content type, size, storage object key, status)",
          ]}
        />

        <h3 className="font-heading text-lg font-bold">
          3.4 Permissions the extension uses
        </h3>
        <LegalList
          items={[
            "storage — save your settings",
            "activeTab and scripting — read the active page when you start a scan, and inject helpers as needed",
            "Host access to http/https pages — power optional on-page link scanning and communicate with the analyzer you configure",
          ]}
        />
        <p>
          Link scanning only sends link URLs for checking when you have enabled
          that setting. Page-content analysis runs when you explicitly start a
          scan.
        </p>
      </LegalSection>

      <LegalSection title="4. How we use information">
        <p>We use information to:</p>
        <LegalList
          items={[
            "Provide scam and phishing risk assessments and link safety checks",
            "Cache URL/domain check results so repeated lookups are faster and less costly",
            "Operate, secure, and rate-limit the Service; detect abuse and debug failures",
            "Improve analysis quality (for example by reviewing aggregated patterns, tool outcomes, and optional feedback you submit)",
            "Comply with law and enforce our Terms of Service",
          ]}
        />
        <p>
          We do not sell your personal information. We do not use analyzed page
          content to build advertising profiles or to show third-party ads.
        </p>
      </LegalSection>

      <LegalSection title="5. AI processing">
        <p>
          Analysis may be performed by automated systems, including large
          language models and decision models hosted by our AI providers.
          Content you submit for analysis (and derived evidence) may be sent to
          those providers solely to generate the risk assessment you requested.
        </p>
        <p>
          Model outputs can be incomplete or incorrect. The Service is a
          decision aid, not a guarantee that content is safe or malicious.
        </p>
      </LegalSection>

      <LegalSection title="6. Retention">
        <p>
          We retain information only as long as needed for the purposes above:
        </p>
        <LegalList
          items={[
            "URL check cache (database): typically about 1–7 days depending on risk status; domain cache typically up to about 14 days",
            "URL/domain check cache (in-memory / Redis): typically minutes to about 48 hours, scaled by popularity",
            "Full analyses, inputs, evidence, agent/tool runs, and uploaded assets: retained while needed to return results, support support requests, improve safety, and meet legal obligations; we may delete or anonymize earlier when no longer needed",
            "Browser settings: until you change or clear them",
            "Rate-limit counters: short windows (about one minute) and rolling daily windows",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. How we share information">
        <p>We may share information with:</p>
        <LegalList
          items={[
            "AI providers (currently OpenAI or compatible gateways) to run analysis models",
            "Threat-intelligence and lookup providers when tools are enabled, which may include VirusTotal, PhishTank, AbuseIPDB, URLhaus, Chainabuse, and Etherscan — typically receiving URLs, domains, IPs, file hashes, or crypto addresses extracted from your submission",
            "Infrastructure providers (hosting, database, Redis, object storage) that process data under our instructions",
            "Professional advisors or authorities when required by law, to protect rights and safety, or in connection with a merger, acquisition, or asset sale",
          ]}
        />
        <p>
          Shared data is limited to what is reasonably necessary for that
          purpose. Third parties may have their own privacy policies for their
          services.
        </p>
      </LegalSection>

      <LegalSection title="8. International transfers">
        <p>
          We may process and store information in the United States and other
          countries where we or our providers operate. Those locations may have
          different data-protection laws than your home country. Where required,
          we use appropriate safeguards for cross-border transfers.
        </p>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>
          We use administrative, technical, and organizational measures designed
          to protect information, including access controls and transmitting
          user data over HTTPS when you use a production analyzer endpoint. No
          method of transmission or storage is 100% secure. You are responsible
          for securing devices that have the extension installed and for any
          self-hosted analyzer you configure.
        </p>
      </LegalSection>

      <LegalSection title="10. Your choices and rights">
        <LegalList
          items={[
            "Turn off “Scan links on pages” in Settings to stop automatic link checks",
            "Avoid starting page scans if you do not want page content sent to the analyzer",
            "Clear extension storage or uninstall the extension to remove local settings",
            "Point the extension only at analyzers you trust",
          ]}
        />
        <p>
          Depending on where you live (for example under GDPR, UK GDPR, or the
          CCPA/CPRA), you may have rights to access, correct, delete, or export
          personal information, to object to or restrict certain processing, or
          to opt out of “sale”/“sharing” as those terms are defined by law. We
          do not sell personal information as commonly understood. To exercise
          rights, email {PRIVACY_CONTACT_EMAIL}. We may need to verify your
          request. You may also lodge a complaint with your local supervisory
          authority.
        </p>
      </LegalSection>

      <LegalSection title="11. Children’s privacy">
        <p>
          The Service is not directed to children under 13 (or the equivalent
          minimum age in your jurisdiction). We do not knowingly collect
          personal information from children. If you believe a child has
          provided personal information, contact us and we will take appropriate
          steps to delete it.
        </p>
      </LegalSection>

      <LegalSection title="12. Incognito and sensitive browsing">
        <p>
          By default, Chrome extensions do not run in Incognito unless you allow
          it. If you enable the extension in Incognito, scans you start and link
          checks you enable may still send data to the analyzer according to
          this policy. Do not submit content you are not permitted to share.
        </p>
      </LegalSection>

      <LegalSection title="13. Do Not Track">
        <p>
          There is no consistent industry standard for Do Not Track browser
          signals. The Service does not currently respond to DNT signals in a
          special way beyond the controls described in this policy.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes">
        <p>
          We may update this Privacy Policy from time to time. We will revise
          the effective date above and, when changes are material, provide
          additional notice in the Service or Chrome Web Store listing where
          appropriate. Continued use after an update means you accept the
          revised policy.
        </p>
      </LegalSection>

      <LegalSection title="15. Contact">
        <p>
          Privacy requests:{" "}
          <a
            className="text-trust underline underline-offset-2"
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
        </p>
        <p>
          You can also open this policy anytime from {PRODUCT_NAME} Settings.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
