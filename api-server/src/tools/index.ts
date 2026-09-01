import { checkThreatIntelTool } from "./check-threat-intel.js";
import { decodeQrTool } from "./decode-qr.js";
import { inspectEmailTool } from "./inspect-email.js";
import { inspectPageTool } from "./inspect-page.js";
import { inspectUrlTool } from "./inspect-url.js";
import { lookupCryptoAddressTool } from "./lookup-crypto-address.js";
import { lookupDomainTool } from "./lookup-domain.js";
import { lookupPhoneTool } from "./lookup-phone.js";
import { scanFileTool } from "./scan-file.js";
import { traceRedirectsTool } from "./trace-redirects.js";
import { verifyBrandIdentityTool } from "./verify-brand-identity.js";
import { verifyEvidenceTool } from "./verify-evidence.js";
import { parallelSearchTool } from "./web-verify.js";

export function createScannerTools() {
  return {
    inspect_url: inspectUrlTool,
    lookup_domain: lookupDomainTool,
    check_threat_intel: checkThreatIntelTool,
    verify_brand_identity: verifyBrandIdentityTool,
    inspect_page: inspectPageTool,
    trace_redirects: traceRedirectsTool,
    inspect_email: inspectEmailTool,
    scan_file: scanFileTool,
    decode_qr: decodeQrTool,
    lookup_phone: lookupPhoneTool,
    lookup_crypto_address: lookupCryptoAddressTool,
    parallel_search: parallelSearchTool,
  };
}

export function createReviewerTools() {
  return {
    verify_evidence: verifyEvidenceTool,
    inspect_url: inspectUrlTool,
    lookup_domain: lookupDomainTool,
    check_threat_intel: checkThreatIntelTool,
    verify_brand_identity: verifyBrandIdentityTool,
    inspect_email: inspectEmailTool,
    parallel_search: parallelSearchTool,
  };
}

export {
  checkThreatIntel,
  checkThreatIntelTool,
} from "./check-threat-intel.js";
export { decodeQr, decodeQrTool } from "./decode-qr.js";
export { inspectEmail, inspectEmailTool } from "./inspect-email.js";
export { inspectPage, inspectPageTool } from "./inspect-page.js";
export { inspectUrl, inspectUrlTool } from "./inspect-url.js";
export {
  lookupCryptoAddress,
  lookupCryptoAddressTool,
} from "./lookup-crypto-address.js";
export { lookupDomain, lookupDomainTool } from "./lookup-domain.js";
export { lookupPhone, lookupPhoneTool } from "./lookup-phone.js";
export { scanFile, scanFileTool } from "./scan-file.js";
export {
  traceRedirectsTool_impl,
  traceRedirectsTool,
} from "./trace-redirects.js";
export {
  verifyBrandIdentity,
  verifyBrandIdentityTool,
} from "./verify-brand-identity.js";
export { verifyEvidence, verifyEvidenceTool } from "./verify-evidence.js";
export { parallelSearchTool, webVerify } from "./web-verify.js";
