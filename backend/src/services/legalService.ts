import { Request } from 'express';
import { query, queryOne } from '../db/connection';
import { getEffectiveBaseUrl } from '../utils/security';

let cachedLegalVersion: string | null = null;

export function invalidateLegalCache() {
  cachedLegalVersion = null;
}

export async function getCurrentLegalVersion(): Promise<string> {
  if (cachedLegalVersion) {
    return cachedLegalVersion;
  }
  try {
    const row = await queryOne<{ value: string }>('SELECT value FROM system_settings WHERE key = "legal_version"');
    const ver = (row?.value || '1.0').trim() || '1.0';
    cachedLegalVersion = ver;
    return ver;
  } catch {
    return '1.0';
  }
}

export interface LegalSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  version: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export interface LegalDocumentsResponse {
  version: string;
  effectiveDate: string;
  instance: {
    appName: string;
    logoUrl: string;
    siteUrl: string;
    operatorName: string;
    contactEmail: string;
    jurisdiction: string;
    minAge: number;
    activeIntegrations: string[];
  };
  terms: LegalDocument;
  privacy: LegalDocument;
}

export async function getLegalDocuments(req?: Request): Promise<LegalDocumentsResponse> {
  const keys = [
    'app_name',
    'logo_url',
    'site_url',
    'legal_version',
    'legal_effective_date',
    'legal_operator_name',
    'legal_contact_email',
    'legal_jurisdiction',
    'legal_min_age',
    'legal_custom_terms_addendum',
    'legal_custom_privacy_addendum',
    'smtp_host',
    'smtp_from',
    'steam_api_key',
    'spotify_client_id',
    'spotify_client_secret',
    'apple_music_token',
    'tmdb_api_key',
    'auto_backup_enabled',
    'backup_retention_count'
  ];

  const settings: Record<string, string> = {};
  try {
    const placeholders = keys.map(() => '?').join(',');
    const rows = await query<{ key: string; value: string }>(
      `SELECT key, value FROM system_settings WHERE key IN (${placeholders})`,
      keys
    );
    rows.forEach(r => {
      settings[r.key] = r.value;
    });
  } catch {
    // Fallback to defaults if system_settings isn't populated yet
  }

  const appName = (settings.app_name || 'WebNook').trim() || 'WebNook';
  const logoUrl = (settings.logo_url || '/branding/logo.png').trim() || '/branding/logo.png';
  const siteUrl = await getEffectiveBaseUrl(req);
  const version = (settings.legal_version || '1.0').trim() || '1.0';
  cachedLegalVersion = version;

  const effectiveDate = (settings.legal_effective_date || new Date().toISOString().slice(0, 10)).trim();
  const operatorName = (settings.legal_operator_name || '').trim() || `${appName} Instance Administrator`;
  const contactEmail = (settings.legal_contact_email || settings.smtp_from || '').trim();
  const jurisdiction = (settings.legal_jurisdiction || '').trim();
  const parsedAge = parseInt(settings.legal_min_age || '13', 10);
  const minAge = Number.isFinite(parsedAge) && parsedAge >= 13 && parsedAge <= 21 ? parsedAge : 13;

  const customTermsAddendum = (settings.legal_custom_terms_addendum || '').trim();
  const customPrivacyAddendum = (settings.legal_custom_privacy_addendum || '').trim();

  const smtpConfigured = !!(settings.smtp_host || '').trim();
  const steamConfigured = !!(settings.steam_api_key || '').trim();
  const spotifyConfigured = !!((settings.spotify_client_id || '').trim() && (settings.spotify_client_secret || '').trim());
  const appleMusicConfigured = !!(settings.apple_music_token || '').trim();
  const tmdbConfigured = !!(settings.tmdb_api_key || '').trim();
  const autoBackupsEnabled = settings.auto_backup_enabled === 'true';
  const backupRetentionCount = parseInt(settings.backup_retention_count || '10', 10);

  const activeIntegrations: string[] = [];
  if (smtpConfigured) activeIntegrations.push('SMTP Email Delivery');
  if (steamConfigured) activeIntegrations.push('Steam Web API');
  if (spotifyConfigured) activeIntegrations.push('Spotify Catalog & Embeds');
  if (appleMusicConfigured) activeIntegrations.push('Apple Music Kit');
  if (tmdbConfigured) activeIntegrations.push('TMDB Movies & TV');
  activeIntegrations.push('Open Library Books');

  const contactSentence = contactEmail
    ? `You may reach ${operatorName} regarding these policies at ${contactEmail}.`
    : `You may reach ${operatorName} through the Bug Reports & Support channel in Messages or directly via your server host.`;

  const termsSections: LegalSection[] = [
    {
      heading: '1. Acceptance & Eligibility',
      body: [
        `Welcome to ${appName} (hosted at ${siteUrl}), an independent self-hosted social platform powered by WebNook and operated by ${operatorName}. By creating an account, logging in, or using any authenticated feature of ${appName}, you agree to be bound by these Terms & Conditions and our Privacy Policy.`,
        `You must be at least ${minAge} years old (or the minimum legal age in your country of residence) to register and maintain an account on ${appName}. If you do not agree to these terms, you must decline and refrain from using account features.`
      ]
    },
    {
      heading: '2. Self-Hosted Instance & Account Responsibility',
      body: [
        `${appName} is operated as a private/community self-hosted instance. Account approvals, moderation decisions, uptime, and data retention are managed locally by ${operatorName}, not by a centralized third-party corporation.`,
        `You are responsible for safeguarding your login credentials, authenticator codes (TOTP), and Passkey devices, and for all activity performed under your account.`
      ],
      bullets: [
        'Provide accurate account registration information (including a valid email address for verification and recovery).',
        'Do not attempt to access another user\'s private Nook, private media, or direct messages without authorization.',
        'Do not attempt to bypass rate limits, authentication gates, HTML/CSS sanitization, or server security boundaries.'
      ]
    },
    {
      heading: '3. User Content & Acceptable Use',
      body: [
        `You retain ownership of the bios, profile customizations, uploaded images, audio tracks, stickers, guestbook entries, and messages you submit to ${appName}. By posting content, you grant ${appName} and ${operatorName} a limited license to store, process (including image/audio transcoding), back up, and display that content to users you permit under your privacy settings.`
      ],
      bullets: [
        'Do not upload unlawful, abusive, harassing, defamatory, or sexually explicit illegal material.',
        'Do not upload malware, executable payloads, or malicious HTML/CSS designed to exploit other users or the host server.',
        'Only upload audio tracks, artwork, or images that you own or have permission to share within your friend group.',
        'Respect other members\' privacy and do not redistribute private Nook content or private messages without consent.'
      ]
    },
    {
      heading: '4. Nook Privacy Controls & Social Interactions',
      body: [
        `${appName} provides visibility controls allowing you to set your Nook profile to "Public" or "Private (Friends Only)". When set to Private, your profile, widgets, guestbook, and private uploaded media are restricted to you, your accepted friends, and site administrators acting for moderation or support.`,
        `Direct messages are restricted to accepted friends, while group chats allow members invited by an accepted friend to participate. Messages in the Bug Reports & Feature Requests channel are visible to instance administrators.`
      ]
    },
    {
      heading: '5. Optional Third-Party Integrations & Embeds',
      body: [
        `${appName} allows users to embed or display content from supported external platforms. Use of external links, embeds, or widgets is subject to those providers' own terms of service and privacy policies.`
      ],
      bullets: [
        steamConfigured
          ? 'Steam Showcase (API Active): Connects to Steam Web API / Steam Community using the Steam ID or handle you choose to display.'
          : 'Steam Showcase (Public Profile Mode): Optionally resolves public Steam profile XML/HTML when you enter a Steam ID or handle.',
        spotifyConfigured
          ? 'Spotify Search & Embeds (API Active): Queries Spotify search API and renders official Spotify embedded players when added to your playlist.'
          : 'Spotify Embeds: Renders official Spotify embedded players for Spotify URLs you manually add to your playlist.',
        appleMusicConfigured
          ? 'Apple Music Integration (Configured): Supports Apple Music catalog embeds for tracks you choose to share.'
          : 'Apple Music Embeds: Supports official Apple Music embed players for Apple Music URLs you add.',
        tmdbConfigured
          ? 'Movies & TV Showcase (TMDB Active): Queries The Movie Database (TMDB) when searching films or series in the customizer.'
          : 'Movies & TV Showcase: Uses local showcase metadata and optional external title lookups.',
        'Books & Reading Nook: Queries Open Library (Internet Archive) on search and optionally parses StoryGraph CSV exports you upload.'
      ]
    },
    {
      heading: '6. Account Suspension, Termination & Deletion',
      body: [
        `${operatorName} reserves the right to disable or remove accounts or content that violate these Terms & Conditions or threaten the security or stability of ${appName}.`,
        `You may permanently delete your account at any time from Account Settings → Danger Zone. Deleting your account removes your Nook profile, widgets, stickers, friends list, and security credentials, and anonymizes your user identity ("Deleted User").`
      ]
    },
    {
      heading: '7. Disclaimers & Limitation of Liability',
      body: [
        `${appName} is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied. Because this instance is self-hosted by ${operatorName}, availability, backups, and uninterrupted operation cannot be guaranteed.`,
        `To the maximum extent permitted by applicable law, ${operatorName} and the WebNook software contributors shall not be liable for any indirect, incidental, special, consequential, or data-loss damages arising out of your use of ${appName}.`
      ]
    },
    {
      heading: '8. Changes to These Terms & Contact',
      body: [
        `${operatorName} may update these Terms & Conditions from time to time (including updating the active policy version). When a new version is published, you will be prompted upon your next visit or login to review and accept the updated terms before continuing to use ${appName}.`,
        jurisdiction
          ? `These Terms are governed by the laws applicable in ${jurisdiction}. ${contactSentence}`
          : contactSentence
      ]
    }
  ];

  if (customTermsAddendum) {
    termsSections.push({
      heading: `9. Instance-Specific Addendum (${appName})`,
      body: customTermsAddendum.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    });
  }

  const privacySections: LegalSection[] = [
    {
      heading: '1. Overview & Zero-Tracking Commitment',
      body: [
        `This Privacy Policy explains how ${appName} (hosted at ${siteUrl} and operated by ${operatorName}) collects, stores, and protects your information. ${appName} is a self-hosted social space built with zero third-party advertising networks, zero behavioral tracking pixels, and zero algorithmic data brokering.`
      ]
    },
    {
      heading: '2. Information We Collect & Store Locally',
      body: [
        `All core user data on ${appName} is stored locally on the instance server inside its SQLite database and persistent media directories.`
      ],
      bullets: [
        'Account & Authentication Data: Username, email address, display name, hashed password (bcrypt), optional TOTP 2FA secret, WebAuthn Passkey public keys/credential IDs, and policy acceptance version/timestamp.',
        'Nook Profile & Customization Data: Bio, status message, avatar/banner images, uploaded audio files, custom stickers, theme selection, color/style overrides, card layout, custom Markdown/HTML cards, and custom CSS.',
        'Social & Messaging Content: Friendships and Top Friends selections, guestbook entries and emoji reactions, direct messages, group chats, message reactions, and bug report submissions.',
        'Operational Server Logs: Standard HTTP/application logs and IP rate-limit counters used strictly to operate and protect the server.'
      ]
    },
    {
      heading: '3. How Your Information Is Used',
      body: [
        `Your information is used solely to provide ${appName}'s social, customization, messaging, and account security features.`
      ],
      bullets: [
        'Authenticating your sessions and protecting accounts with optional 2FA / Passkeys.',
        'Rendering your customized Nook profile, widgets, audio playlist, and stickers according to your chosen privacy level.',
        'Delivering real-time direct messages, group chats, guestbook notes, and in-app notifications.',
        smtpConfigured
          ? `Sending transactional emails (email verification, password resets, and notifications you opt into) via the instance's configured SMTP mail server${settings.smtp_from ? ` (${settings.smtp_from})` : ''}.`
          : 'Transactional SMTP email is currently not configured on this instance; account notifications stay in-app.'
      ]
    },
    {
      heading: '4. Cookies & Browser Storage',
      body: [
        `${appName} uses strictly functional storage — no advertising or analytics cookies are used.`
      ],
      bullets: [
        'Authentication Token (localStorage "webnook_token" & functional "token" cookie): Keeps you signed in and authorizes access to private Nook media and group avatars.',
        'PWA Prompt State (localStorage): Remembers whether you dismissed the app installation banner.'
      ]
    },
    {
      heading: '5. Third-Party Services & External Connections',
      body: [
        `Your personal account records are never sold. External requests occur only when loading embedded players or querying optional showcase integrations configured on ${appName}:`
      ],
      bullets: [
        ...(steamConfigured
          ? ['Steam Web API: Server-side queries to api.steampowered.com / steamcommunity.com for any Steam ID or vanity handle you place on your Nook.']
          : ['Steam Public Profiles: Optional server-side lookup of public steamcommunity.com profile feeds when you configure a Steam handle.']),
        'Spotify / Apple Music Embeds: When a Nook displays a Spotify or Apple Music track, your browser loads the embedded player iframe directly from open.spotify.com or embed.music.apple.com, subject to their privacy policies.',
        ...(spotifyConfigured ? ['Spotify API Search: Server-side search requests to Spotify when adding songs in the Nook Customizer.'] : []),
        ...(tmdbConfigured ? ['TMDB Search: Server-side search requests to api.themoviedb.org when searching movies/TV shows in the Nook Customizer.'] : []),
        'Open Library: Server-side search requests to openlibrary.org when searching books in the Nook Customizer.',
        'Google Fonts: The web client loads display fonts from fonts.googleapis.com / fonts.gstatic.com to render Nook themes.'
      ]
    },
    {
      heading: '6. Data Storage, Security & Backups',
      body: [
        `${appName} secures passwords with salted bcrypt hashing, signs sessions with an instance-unique JWT secret, sanitizes custom HTML/CSS, and restricts private Nook uploads and group chat icons to authorized members.`,
        autoBackupsEnabled
          ? `This instance has automated compressed backups enabled (keeping up to ${backupRetentionCount > 0 ? backupRetentionCount : 'unlimited'} archive(s)), which include the database, uploaded media, and branding assets for disaster recovery.`
          : 'Administrators may create manual compressed server backups containing the database and uploaded media for disaster recovery.'
      ]
    },
    {
      heading: '7. Your Privacy Choices & Account Deletion',
      body: [
        `You can update your Nook visibility (Public vs. Private Friends-Only), email notification toggles, and profile details anytime in Account Settings.`,
        `You can permanently delete your account from Account Settings → Danger Zone, which deletes your Nook, widgets, stickers, friendships, and credentials and anonymizes your account identity. ${contactSentence}`
      ]
    },
    {
      heading: '8. Policy Updates',
      body: [
        `If ${operatorName} updates this Privacy Policy and increments the active policy version (currently v${version}, effective ${effectiveDate}), you will be asked to review and accept the updated policy before continuing to use ${appName}.`
      ]
    }
  ];

  if (customPrivacyAddendum) {
    privacySections.push({
      heading: `9. Instance-Specific Privacy Addendum (${appName})`,
      body: customPrivacyAddendum.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    });
  }

  return {
    version,
    effectiveDate,
    instance: {
      appName,
      logoUrl,
      siteUrl,
      operatorName,
      contactEmail,
      jurisdiction,
      minAge,
      activeIntegrations
    },
    terms: {
      title: `${appName} Terms & Conditions`,
      subtitle: `Instance Policy v${version} • Effective ${effectiveDate}`,
      version,
      effectiveDate,
      sections: termsSections
    },
    privacy: {
      title: `${appName} Privacy Policy`,
      subtitle: `Instance Policy v${version} • Effective ${effectiveDate}`,
      version,
      effectiveDate,
      sections: privacySections
    }
  };
}

