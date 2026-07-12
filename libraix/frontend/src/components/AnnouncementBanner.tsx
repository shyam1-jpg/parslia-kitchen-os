import { useEffect, useState } from "react";

interface SiteConfig {
  announcement?: { active: boolean; message: string };
  maintenance?: { enabled: boolean; message: string };
}

export function AnnouncementBanner() {
  const [site, setSite] = useState<SiteConfig | null>(null);

  useEffect(() => {
    fetch("/api/site")
      .then((r) => r.json())
      .then(setSite)
      .catch(() => {});
  }, []);

  if (!site) return null;

  if (site.maintenance?.enabled) {
    return (
      <div className="info-banner site-banner maintenance-banner" role="alert">
        {site.maintenance.message || "Libraix is undergoing maintenance. Please try again shortly."}
      </div>
    );
  }

  if (site.announcement?.active && site.announcement.message) {
    return (
      <div className="info-banner site-banner" role="status">
        {site.announcement.message}
      </div>
    );
  }

  return null;
}
