/** Public company identity — override via environment variables. */
export function getCompanyInfo() {
  return {
    legalName: process.env.COMPANY_LEGAL_NAME ?? "Libraix",
    tradingName: "Libraix",
    companyNumber: process.env.COMPANY_NUMBER ?? "",
    registeredAddress: process.env.COMPANY_ADDRESS ?? "United Kingdom",
    country: process.env.COMPANY_COUNTRY ?? "United Kingdom",
    supportEmail: process.env.SUPPORT_EMAIL ?? "hello@libraix.ai",
    privacyEmail: process.env.PRIVACY_EMAIL ?? "privacy@libraix.ai",
    billingEmail: process.env.BILLING_EMAIL ?? "hello@libraix.ai",
    dpoEmail: process.env.DPO_EMAIL ?? "privacy@libraix.ai",
  };
}
