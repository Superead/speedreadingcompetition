// Transactional email via Mailjet's Send API (v3.1). No SDK — a single fetch call.
// If MAILJET_API_KEY / MAILJET_SECRET_KEY are not set, sending is a logged no-op so
// the app never crashes because of email config.

const MAILJET_API_KEY = process.env.MAILJET_API_KEY || "";
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || "";
const MAIL_FROM = process.env.MAIL_FROM || "noreply@superead.com";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Test My Reading Speed";

export const emailConfigured = Boolean(MAILJET_API_KEY && MAILJET_SECRET_KEY);

export interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  sent: boolean;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!emailConfigured) {
    console.warn(`[email] not configured — would have sent "${input.subject}" to ${input.to}`);
    return { sent: false, error: "Email not configured" };
  }
  try {
    const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString("base64");
    const res = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: MAIL_FROM, Name: MAIL_FROM_NAME },
            To: [{ Email: input.to, Name: input.toName || input.to }],
            Subject: input.subject,
            HTMLPart: input.html,
            TextPart: input.text || input.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
          },
        ],
      }),
    });
    const body: any = await res.json().catch(() => ({}));
    const status = body?.Messages?.[0]?.Status;
    if (!res.ok || status !== "success") {
      const err = body?.Messages?.[0]?.Errors?.[0]?.ErrorMessage || body?.ErrorMessage || `HTTP ${res.status}`;
      console.error(`[email] failed to ${input.to}: ${err}`);
      return { sent: false, error: err };
    }
    return { sent: true };
  } catch (e: any) {
    console.error(`[email] exception sending to ${input.to}: ${e?.message || e}`);
    return { sent: false, error: e?.message || "send failed" };
  }
}

// Send to many recipients sequentially with a small delay (stays well under
// Mailjet free-tier rate limits). Returns per-recipient results.
export async function sendEmailBatch(
  inputs: SendEmailInput[],
  delayMs = 150,
): Promise<{ sent: number; failed: number; failures: { to: string; error?: string }[] }> {
  let sent = 0, failed = 0;
  const failures: { to: string; error?: string }[] = [];
  for (const input of inputs) {
    const r = await sendEmail(input);
    if (r.sent) sent++; else { failed++; failures.push({ to: input.to, error: r.error }); }
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));
  }
  return { sent, failed, failures };
}

// ─── Templates ───────────────────────────────────────────────────────────────

const wrap = (title: string, bodyHtml: string) => `<!doctype html>
<html><body style="margin:0;background:#f3f4f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15161c">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f8;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
        <tr><td style="background:#0f1018;padding:20px 28px;color:#ffffff;font-weight:800;font-size:18px">⚡ Test My Reading Speed</td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25">${title}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;color:#6c6f80;font-size:12px;border-top:1px solid #e3e5ee">
          You're receiving this because you have an account at app.testmyreadingspeed.com.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const button = (href: string, label: string) =>
  `<p style="margin:22px 0"><a href="${href}" style="display:inline-block;background:#4a46f5;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 24px;border-radius:100px">${label}</a></p>
   <p style="margin:0;color:#6c6f80;font-size:13px">Or copy this link: <a href="${href}" style="color:#3a36e0">${href}</a></p>`;

export function passwordResetEmail(name: string, resetUrl: string) {
  return {
    subject: "Reset your password",
    html: wrap(
      "Reset your password",
      `<p style="margin:0 0 6px;line-height:1.55">Hi ${name},</p>
       <p style="margin:0;line-height:1.55">We received a request to reset your password. Click the button below to choose a new one. This link is valid for <strong>1 hour</strong>.</p>
       ${button(resetUrl, "Reset my password")}
       <p style="margin:18px 0 0;color:#6c6f80;font-size:13px;line-height:1.5">If you didn't ask for this, you can safely ignore this email — your password won't change.</p>`,
    ),
  };
}

export function competitionReminderEmail(opts: {
  name: string;
  competitionTitle: string;
  startsAtText: string;
  loginUrl: string;
  customMessage?: string;
}) {
  const { name, competitionTitle, startsAtText, loginUrl, customMessage } = opts;
  return {
    subject: `${competitionTitle} starts ${startsAtText}`,
    html: wrap(
      `Your competition starts ${startsAtText} 🏁`,
      `<p style="margin:0 0 6px;line-height:1.55">Hi ${name},</p>
       <p style="margin:0;line-height:1.55">You're registered for <strong>${competitionTitle}</strong>. It starts <strong>${startsAtText}</strong>.</p>
       ${customMessage ? `<p style="margin:14px 0 0;line-height:1.55;white-space:pre-line">${customMessage}</p>` : ""}
       <p style="margin:14px 0 0;line-height:1.55">Be logged in a few minutes early, pick your competition language, and press <strong>Start Reading</strong> when it opens. Good luck!</p>
       ${button(loginUrl, "Go to my dashboard")}`,
    ),
  };
}
