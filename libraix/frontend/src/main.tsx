import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { AdminAuthProvider } from "./lib/adminAuth";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { AdminProtectedRoute, AdminPublicRoute } from "./components/AdminProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage, PricingPage, ForgotPasswordPage, ResetPasswordPage } from "./pages/AuthPages";
import { CookieBanner } from "./components/CookieBanner";
import { AnnouncementBanner } from "./components/AnnouncementBanner";
import { AppPage } from "./pages/AppPage";
import { SettingsPage, PrivacyPage, TermsPage } from "./pages/AccountPages";
import { BillingPage } from "./pages/BillingPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { SupportPage } from "./pages/SupportPage";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AnnouncementBanner />
          <CookieBanner />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<Navigate to="/login?mode=signup" replace />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppPage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
              <Route path="/app/billing" element={<BillingPage />} />
              <Route path="/account" element={<Navigate to="/app/billing" replace />} />
              <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
            </Route>

            <Route element={<AdminPublicRoute />}>
              <Route path="/admin/login" element={<AdminLoginPage />} />
            </Route>
            <Route element={<AdminProtectedRoute />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </AuthProvider>
  </StrictMode>
);
