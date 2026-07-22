# Parslia email setup — GoDaddy + everywhere else

**Domain:** parslia.app  
**Address to use:** hello@parslia.app  
**DNS host:** GoDaddy (`ns63.domaincontrol.com` / `ns64.domaincontrol.com`)  
**Website host:** GitHub Pages (A records already point there)

---

## Why email is not working (checked 22 Jul 2026)

| Check | Result |
|-------|--------|
| Website https://parslia.app | Works (GitHub Pages) |
| **MX records for parslia.app** | **Missing — mail cannot be delivered** |
| SPF TXT for mail | Missing |
| DMARC | Present (GoDaddy default) but useless without MX |
| www CNAME | Points to `hyam1-jpg.github.io` — **typo**, should be `shyam1-jpg.github.io` |

Until MX (and a mailbox) exist, messages to `hello@parslia.app` bounce or disappear.  
The Early Access form on the site only opens the visitor’s mail app (`mailto:`) — it does **not** send by itself.

**Cloud / Cursor cannot log into your GoDaddy account.** You (or someone with GoDaddy login) must do the steps below.

---

## Part A — Set up email in GoDaddy (do this first)

### A1. Buy / enable email for the domain

1. Sign in: https://account.godaddy.com  
2. Open **parslia.app** → **Email**  
3. Choose one:
   - **Microsoft 365** from GoDaddy (recommended), or  
   - **Professional Email** (classic GoDaddy)

4. Create mailbox: **hello@parslia.app**  
5. Set a strong password and save it in a password manager  
6. Optional aliases later: `support@`, `privacy@`

### A2. Confirm MX records (automatic for most GoDaddy plans)

After the mailbox is created, GoDaddy usually adds MX. Check in **DNS → Manage DNS**.

#### If you chose Microsoft 365 (typical)

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | `@` | `parslia-app.mail.protection.outlook.com` *(exact host shown in GoDaddy Email setup)* | 0 |
| TXT | `@` | `v=spf1 include:spf.protection.outlook.com -all` | — |
| CNAME | `autodiscover` | `autodiscover.outlook.com` | — |

Use the **exact** MX hostname GoDaddy shows for *your* tenant — do not invent it.

#### If you chose Professional Email (classic)

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | `@` | `smtp.secureserver.net` | 0 |
| MX | `@` | `mailstore1.secureserver.net` | 10 |
| TXT | `@` | `v=spf1 include:secureserver.net -all` | — |

**Do not delete** the GitHub Pages **A** records for `@` (they keep the website live):

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

MX and A can both exist on `@`. Email and website do not fight each other.

### A3. Fix www CNAME typo (while you are in DNS)

| Type | Name | Value |
|------|------|-------|
| CNAME | `www` | `shyam1-jpg.github.io` |

Current wrong value: `hyam1-jpg.github.io` (missing **s**).

### A4. Wait and test

1. Wait 15–60 minutes (sometimes up to 24–48 hours)  
2. From a phone or non-GoDaddy account, send a test to **hello@parslia.app**  
3. Open webmail:
   - Microsoft 365 → https://outlook.office.com  
   - Professional Email → https://email.godaddy.com  
4. Confirm the test arrives  
5. Public check: https://mxtoolbox.com/SuperTool.aspx?action=mx%3aparslia.app  

You should see **at least one MX** listed.

### A5. Forward to your personal inbox (optional)

In GoDaddy / Outlook settings, forward **hello@parslia.app** → `shyam_1@hotmail.co.uk` (or your preferred inbox) so you do not miss mail.

---

## Part B — Where else email must be set up

| Place | What to do | Status |
|-------|------------|--------|
| **GoDaddy mailbox + MX** | Create `hello@`, add MX/SPF | **Required now** |
| **Website form** | Today uses `mailto:` only | Works *after* mailbox works; better with Formspree later |
| **Apple App Store Connect** | Support URL + privacy URL; support email often required | Before submit |
| **Google Play Console** | Contact email + privacy policy URL | Before submit |
| **Legal pages** | Already use hello@parslia.app | OK once mailbox works |
| **Libraix product** (`libraix/`) | Separate product — uses Resend/SMTP env vars, not Parslia GoDaddy mail | Do not mix |
| **Kiteline** | Separate product/domain | Do not configure here |

### Better Early Access form (after hello@ works)

`mailto:` depends on the visitor having an email app. For automatic delivery:

1. Sign up at [Formspree](https://formspree.io) or [Web3Forms](https://web3forms.com)  
2. Set notification address to **hello@parslia.app**  
3. Paste the form endpoint into `script.js` / the form `action`  
4. Enable auto-reply template: “Thanks — we received your Parslia early access request.”

Ask Cloud to wire Formspree once `hello@` receives mail.

---

## Part C — Quick owner checklist

- [ ] GoDaddy: create **hello@parslia.app** mailbox  
- [ ] GoDaddy DNS: MX + SPF present (check mxtoolbox)  
- [ ] Fix **www** CNAME → `shyam1-jpg.github.io`  
- [ ] Send test email to hello@ from another account — it arrives  
- [ ] Optional: forward hello@ → personal inbox  
- [ ] Optional: Formspree/Web3Forms for the website form  
- [ ] App Store / Play: use hello@ as contact when submitting  

---

## What Cloud can vs cannot do

| Can | Cannot |
|-----|--------|
| Diagnose DNS (done) | Log into GoDaddy as you |
| Document exact records | Create the mailbox without your password |
| Wire Formspree after you add an API key | Receive mail on your behalf |
| Keep website pointing at hello@ | Pay for GoDaddy email |

After you finish Part A, reply with “MX is live” and we can connect a real form endpoint next.
