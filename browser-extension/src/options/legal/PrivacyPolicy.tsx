import {
  EFFECTIVE_DATE,
  OPERATOR_NAME,
  PRIVACY_CONTACT_EMAIL,
  PRODUCT_NAME,
  WEBSITE_PRIVACY_URL,
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
        the {PRODUCT_NAME} website, browser extension, related APIs, and
        services (collectively, the “Service”).
      </p>
      <p>
        By using the Service, you acknowledge the practices described here. If
        you do not agree, do not use the Service.
      </p>

      <LegalSection title="1. Who we are">
        <p>
          {PRODUCT_NAME} helps you assess whether web pages, links, messages,
          emails, files, and related content may show scam or phishing signals.
          The Service is operated by {OPERATOR_NAME}. For privacy questions,
          contact{" "}
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
            "This website, including the web analyzer and related pages",
            "The browser extension (popup, options/settings, background worker, and content scripts, including optional Gmail in-page scanning)",
            "Our analysis and URL-check API endpoints (including when the website proxies your request to those endpoints)",
            "Optional uploads you submit for analysis (such as images, PDFs, audio, plain text, or email files) when those features are used",
          ]}
        />
        <p>
          It does not cover third-party websites you visit, Gmail or other email
          providers themselves, or third-party services that process data on our
          behalf under their own terms (see Section 7).
        </p>
      </LegalSection>

      <LegalSection title="3. Information we collect">
        <p>
          We do not require you to create an account. We do not intentionally
          collect names, passwords, payment card numbers, or government IDs as
          profile data. Content you ask us to analyze may incidentally include
          personal information that appears on a page, in a message, or in a
          file you submit.
        </p>

        <h3 className="font-heading text-lg font-bold">
          3.1 Information you choose to send for analysis
        </h3>
        <p>Depending on the feature you use, we may receive:</p>
        <LegalList
          items={[
            "Website analyzer: text you paste, and files you upload (supported types include images, PDFs, audio, plain text, and email/.eml files; uploads are typically limited to about 25 MB)",
            "Extension “Scan this page”: extracted page text or cleaned HTML (currently capped at about 20,000 characters), plus the page URL and optional locale or similar context",
            "Extension Gmail scan (when you use the in-page control on mail.google.com): text from the open email (currently capped at about 20,000 characters) and the page URL",
            "Extension “Scan links on pages” (when enabled): link URLs found on pages you visit, sent for URL/domain safety checks",
            "Other supported API inputs (text, URLs, email content, or asset IDs) when submitted through the Service",
          ]}
        />
        <p>
          On this website, your submission is typically received by our website
          servers and then forwarded to our analyzer API. The extension may call
          the analyzer API directly using the endpoint configured in Settings
          (by default our production API).
        </p>

        <h3 className="font-heading text-lg font-bold">
          3.2 Information stored on your device
        </h3>
        <p>
          The browser extension stores preferences in Chrome sync storage on
          your devices, including whether link scanning is enabled and the
          analyzer API base URL you configure. That data stays in your browser
          profile unless you clear extension storage or sync it via your
          browser account.
        </p>
        <p>
          The website does not currently require login cookies for analysis. Your
          browser and hosting provider may still process ordinary technical
          request data as described below.
        </p>

        <h3 className="font-heading text-lg font-bold">
          3.3 Technical and security information
        </h3>
        <p>Our servers may process:</p>
        <LegalList
          items={[
            "IP address (used for rate limiting and abuse prevention)",
            "Standard request metadata (timestamps, user-agent, status codes)",
            "Analysis identifiers, risk scores, classifications, summaries, decisions, evidence records, and model/tool-run metadata needed to provide results",
            "Cached URL and domain check results in Redis (URLs or hostnames, status, score, reasons, hit counts, and expiry)",
            "Uploaded asset metadata (content type, size, storage object key, status) and the uploaded file while it is retained",
            "Durable aggregate counters (for example counts by risk level, scam type, source, or input type) that do not store the full submitted content",
          ]}
        />

        <h3 className="font-heading text-lg font-bold">
          3.4 Permissions the extension uses
        </h3>
        <LegalList
          items={[
            "storage — save your settings",
            "activeTab and scripting — read the active page when you start a scan, and inject helpers (such as risk highlights) as needed",
            "Host access to http/https pages — power optional on-page link scanning, communicate with the analyzer you configure, and run content scripts",
          ]}
        />
        <p>
          Content scripts may run on http/https pages for optional link
          scanning, and on mail.google.com for the optional Gmail scan button.
          Link scanning only sends link URLs for checking when you have enabled
          that setting. Page and Gmail content analysis runs when you explicitly
          start a scan.
        </p>
      </LegalSection>

      <LegalSection title="4. How we use information">
        <p>We use information to:</p>
        <LegalList
          items={[
            "Provide scam and phishing risk assessments and link safety checks",
            "Extract usable text from uploads when needed (for example OCR on images or transcription of audio)",
            "Cache URL/domain check results so repeated lookups are faster and less costly",
            "Operate, secure, and rate-limit the Service; detect abuse and debug failures",
            "Maintain durable aggregate operational metrics and improve analysis quality",
            "Respond to privacy or support requests you send us",
            "Comply with law and enforce our Terms of Service",
          ]}
        />
        <p>
          We do not sell your personal information. We do not use analyzed page
          or message content to build advertising profiles or to show
          third-party ads. We do not currently use third-party advertising or
          product-analytics cookies on the website.
        </p>
      </LegalSection>

      <LegalSection title="5. AI processing">
        <p>
          Analysis is performed by automated systems, including large language
          models and decision models hosted by our AI providers (currently
          OpenAI or compatible gateways). Content you submit—and derived
          evidence such as extracted text, URLs, or tool outputs—may be sent to
          those providers to generate the risk assessment you requested,
          including OCR, audio transcription, and web-search verification when
          those steps run.
        </p>
        <p>
          Model outputs can be incomplete or incorrect. The Service is a
          decision aid, not a guarantee that content is safe or malicious, and
          not legal, financial, or security advice.
        </p>
      </LegalSection>

      <LegalSection title="6. Retention">
        <p>
          We retain information only as long as needed for the purposes above.
          Current practices include:
        </p>
        <LegalList
          items={[
            "URL/domain check cache (Redis): typically about 1 hour to about 4 days for URL results, and up to about 8 days for safe-domain fallbacks, scaled by how often an entry is reused. We do not currently keep a separate long-lived database URL-check cache",
            "Low and medium risk analyses: after completion we delete stored submission inputs, evidence rows, uploaded files, and quoted risky snippets from agent results. We keep the analysis result needed to show you the verdict (such as score, classification, summary, and decision) and durable aggregate counters",
            "High and critical risk analyses: we retain inputs, evidence, uploads, and related records longer for safety follow-up, support, product improvement, and legal obligations; we may delete or anonymize earlier when no longer needed",
            "Browser extension settings: until you change or clear them",
            "Rate-limit counters: short windows (about one minute) and rolling daily (about 24-hour) windows",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. How we share information">
        <p>We may share or disclose information with:</p>
        <LegalList
          items={[
            "AI providers (currently OpenAI or compatible gateways) to run analysis, OCR, transcription, and web-search tools",
            "Threat-intelligence and lookup providers when those tools are enabled and keys are configured, which may include VirusTotal, PhishTank, AbuseIPDB, URLhaus, Chainabuse, and Etherscan — typically receiving URLs, domains, IPs, file hashes, or crypto addresses extracted from your submission",
            "Public internet infrastructure needed for analysis tools, such as DNS lookups, WHOIS queries, TLS/certificate checks, and fetches of publicly reachable pages or URLs referenced in a submission",
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
          user data over HTTPS when you use a production website or analyzer
          endpoint. No method of transmission or storage is 100% secure. You are
          responsible for securing devices that have the extension installed and
          for any self-hosted analyzer you configure.
        </p>
      </LegalSection>

      <LegalSection title="10. Your choices and rights">
        <LegalList
          items={[
            "On the website, simply avoid submitting text or files you do not want analyzed",
            "In the extension, turn off “Scan links on pages” in Settings to stop automatic link checks",
            "Avoid starting page or Gmail scans if you do not want that content sent to the analyzer",
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
          additional notice on the website, in the Service, or in the Chrome Web
          Store listing where appropriate. Continued use after an update means
          you accept the revised policy.
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
          You can also open this policy anytime from {PRODUCT_NAME} Settings, or
          on the web at{" "}
          <a
            className="text-trust underline underline-offset-2"
            href={WEBSITE_PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {WEBSITE_PRIVACY_URL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
