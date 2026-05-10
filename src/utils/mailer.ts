import nodemailer from "nodemailer";

type VerificationEmailInput = {
  to: string;
  username: string;
  verifyUrl: string;
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
  verifyUrl,
}: VerificationEmailInput) => {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@example.com";

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your email",
    text: `Hi ${username},\n\nPlease verify your email by visiting this link:\n${verifyUrl}\n\nIf you did not create this account, you can ignore this email.`,
  });
};
