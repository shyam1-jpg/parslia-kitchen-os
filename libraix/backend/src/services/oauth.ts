import { v4 as uuid } from "uuid";
import { findOrCreateOAuthUser } from "./users.js";

export type OAuthProvider = "google" | "apple" | "microsoft";

export interface OAuthProfile {
  providerUserId: string;
  email: string;
  displayName?: string;
}

function apiBaseUrl(): string {
  const base = process.env.FRONTEND_URL ?? "http://localhost:5173";
  return base.replace(/\/$/, "");
}

function redirectUri(provider: OAuthProvider): string {
  return `${apiBaseUrl()}/api/auth/oauth/${provider}/callback`;
}

export function createOAuthState(): string {
  return uuid();
}

export function isOAuthProviderConfigured(provider: OAuthProvider): boolean {
  if (provider === "google") {
    return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
  }
  if (provider === "microsoft") {
    return Boolean(process.env.MICROSOFT_CLIENT_ID?.trim() && process.env.MICROSOFT_CLIENT_SECRET?.trim());
  }
  if (provider === "apple") {
    return Boolean(
      process.env.APPLE_CLIENT_ID?.trim() &&
        process.env.APPLE_TEAM_ID?.trim() &&
        process.env.APPLE_KEY_ID?.trim() &&
        process.env.APPLE_PRIVATE_KEY?.trim()
    );
  }
  return false;
}

export function getOAuthStartUrl(provider: OAuthProvider, state: string): string | null {
  if (!isOAuthProviderConfigured(provider)) return null;

  const redirect = encodeURIComponent(redirectUri(provider));

  if (provider === "google" && process.env.GOOGLE_CLIENT_ID) {
    const clientId = encodeURIComponent(process.env.GOOGLE_CLIENT_ID);
    const scope = encodeURIComponent("openid email profile");
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}&access_type=online&prompt=select_account&state=${encodeURIComponent(state)}`;
  }

  if (provider === "microsoft" && process.env.MICROSOFT_CLIENT_ID) {
    const tenant = encodeURIComponent(process.env.MICROSOFT_TENANT_ID ?? "common");
    const clientId = encodeURIComponent(process.env.MICROSOFT_CLIENT_ID);
    const scope = encodeURIComponent("openid email profile User.Read");
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}&state=${encodeURIComponent(state)}`;
  }

  if (provider === "apple" && process.env.APPLE_CLIENT_ID) {
    const clientId = encodeURIComponent(process.env.APPLE_CLIENT_ID);
    const scope = encodeURIComponent("name email");
    return `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}&response_mode=form_post&state=${encodeURIComponent(state)}`;
  }

  return null;
}

async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirect = redirectUri("google");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`GOOGLE_TOKEN_FAILED:${err.slice(0, 120)}`);
  }

  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error("GOOGLE_NO_TOKEN");

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) throw new Error("GOOGLE_PROFILE_FAILED");

  const profile = (await profileRes.json()) as { id?: string; email?: string; name?: string };
  if (!profile.id || !profile.email) throw new Error("GOOGLE_PROFILE_INCOMPLETE");

  return {
    providerUserId: profile.id,
    email: profile.email,
    displayName: profile.name,
  };
}

async function exchangeMicrosoftCode(code: string): Promise<OAuthProfile> {
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const tenant = process.env.MICROSOFT_TENANT_ID ?? "common";
  const redirect = redirectUri("microsoft");

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) throw new Error("MICROSOFT_TOKEN_FAILED");

  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error("MICROSOFT_NO_TOKEN");

  const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) throw new Error("MICROSOFT_PROFILE_FAILED");

  const profile = (await profileRes.json()) as { id?: string; mail?: string; userPrincipalName?: string; displayName?: string };
  const email = profile.mail ?? profile.userPrincipalName;
  if (!profile.id || !email) throw new Error("MICROSOFT_PROFILE_INCOMPLETE");

  return {
    providerUserId: profile.id,
    email,
    displayName: profile.displayName,
  };
}

export async function completeOAuthLogin(provider: OAuthProvider, code: string) {
  let profile: OAuthProfile;
  if (provider === "google") {
    profile = await exchangeGoogleCode(code);
  } else if (provider === "microsoft") {
    profile = await exchangeMicrosoftCode(code);
  } else {
    throw new Error("APPLE_NOT_IMPLEMENTED");
  }

  return findOrCreateOAuthUser(provider, profile.providerUserId, profile.email, profile.displayName);
}

export function getOAuthPublicConfig() {
  return {
    google: isOAuthProviderConfigured("google"),
    apple: isOAuthProviderConfigured("apple"),
    microsoft: isOAuthProviderConfigured("microsoft"),
  };
}
