/** Public company identity — override via environment variables. */
export function getCompanyInfo() {
  return {
    legalName: process.env.COMPANY_LEGAL_NAME ?? "Libraix (trading name — legal entity to be confirmed)",
    tradingName: "Libraix",
    companyNumber: process.env.COMPANY_NUMBER ?? "",
    registeredAddress: process.env.COMPANY_ADDRESS ?? "23 Lincoln Road, Branston, Lincoln LN4 1PE, United Kingdom",
    country: process.env.COMPANY_COUNTRY ?? "United Kingdom",
    supportEmail: process.env.SUPPORT_EMAIL ?? "hello@libraix.ai",
    privacyEmail: process.env.PRIVACY_EMAIL ?? "privacy@libraix.ai",
    billingEmail: process.env.BILLING_EMAIL ?? "hello@libraix.ai",
    dpoEmail: process.env.DPO_EMAIL ?? "privacy@libraix.ai",
  };
}
