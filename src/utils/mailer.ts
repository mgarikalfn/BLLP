import nodemailer from "nodemailer";

type VerificationEmailInput = {
  to: string;
  username: string;
  code: string;
};

type ModerationEmailInput = {
  to: string;
  username: string;
  action: "WARN" | "BAN_USER";
  reason?: string;
  warningCount?: number;
};

const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Missing EMAIL_USER or EMAIL_APP_PASSWORD");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
};

export const sendVerificationEmail = async ({
  to,
  username,
  code,
}: VerificationEmailInput) => {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@example.com";

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your email",
    text: `Hi ${username},\n\nYour verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not create this account, you can ignore this email.`,
  });
};

export const sendPasswordResetEmail = async ({
  to,
  username,
  code,
}: VerificationEmailInput) => {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@example.com";

  await transporter.sendMail({
    from,
    to,
    subject: "Reset your password",
    text: `Hi ${username},\n\nWe received a request to reset your password. Your password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not request a password reset, you can safely ignore this email.`,
  });
};

const buildModerationHtml = (input: ModerationEmailInput) => {
  const guidelinesUrl =
    process.env.COMMUNITY_GUIDELINES_URL || "https://example.com/community-guidelines";
  const reasonText = input.reason ? `<p style="margin:0 0 16px;">Reason: ${input.reason}</p>` : "";

  const warningSection =
    input.action === "WARN"
      ? `<p style="margin:0 0 16px;">Current warning count: ${input.warningCount ?? "N/A"}</p>
         <p style="margin:0 0 16px;">Further violations may result in a permanent ban.</p>`
      : `<p style="margin:0 0 16px;">Your account has been permanently suspended.</p>
         <p style="margin:0 0 16px;">Please review our <a href="${guidelinesUrl}">Community Guidelines</a>.</p>`;

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Account Notice</title>
    </head>
    <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial, sans-serif;color:#1f2937;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border-radius:12px;padding:24px;">
              <tr>
                <td>
                  <h2 style="margin:0 0 12px;">Account Notice</h2>
                  <p style="margin:0 0 16px;">Hi ${input.username},</p>
                  <p style="margin:0 0 16px;">We took action on your account based on a report review.</p>
                  ${reasonText}
                  ${warningSection}
                  <p style="margin:24px 0 0;font-size:12px;color:#6b7280;">If you believe this is a mistake, contact support.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

export const sendModerationEmail = async ({
  to,
  username,
  action,
  reason,
  warningCount,
}: ModerationEmailInput) => {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@example.com";
  const subject = action === "BAN_USER" ? "Security Alert" : "Account Notice";
  const guidelineLine =
    process.env.COMMUNITY_GUIDELINES_URL || "https://example.com/community-guidelines";
  const reasonLine = reason ? `Reason: ${reason}\n\n` : "";

  const textBody =
    action === "BAN_USER"
      ? `Hi ${username},\n\nYour account has been permanently suspended.\n\n${reasonLine}Please review our Community Guidelines: ${guidelineLine}\n\nIf you believe this is a mistake, contact support.`
      : `Hi ${username},\n\nWe issued a formal warning to your account.\n\n${reasonLine}Current warning count: ${warningCount ?? "N/A"}\n\nFurther violations may result in a permanent ban.\n\nIf you believe this is a mistake, contact support.`;

  await transporter.sendMail({
    from,
    to,
    subject,
    text: textBody,
    html: buildModerationHtml({ to, username, action, reason, warningCount }),
  });
};
