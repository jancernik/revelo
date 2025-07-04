import nodemailer from "nodemailer";

import { config } from "../config.js";

let transporter = null;

const initializeTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      auth: {
        pass: config.SMTP_PASS,
        user: config.SMTP_USER
      },
      host: config.SMTP_HOST,
      port: parseInt(config.SMTP_PORT),
      secure: false
    });
  }
  return transporter;
};

export const sendVerificationEmail = async (email, token, username) => {
  const transporter = initializeTransporter();
  const verificationUrl = `${config.CLIENT_BASE_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Revelo" <${config.FROM_EMAIL}>`,
    html: `
      <p>Hi ${username},</p>
      <p>Please verify your email by clicking this link:</p>
      <p><a href="${verificationUrl}">Verify Email</a></p>
      <p>Link expires in 24 hours.</p>
    `,
    subject: "Verify Your Email",
    text: `
      Hi ${username},
      
      Please verify your email by visiting: ${verificationUrl}
      
      Link expires in 24 hours.
    `,
    to: email
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new Error("Failed to send verification email.");
  }
};

export const sendWelcomeEmail = async (email, username) => {
  const transporter = initializeTransporter();

  const mailOptions = {
    from: config.FROM_EMAIL,
    html: `
      <p>Welcome ${username}!</p>
      <p>Your email is verified and your account is active.</p>
    `,
    subject: "Welcome! Email Verified",
    text: `
      Welcome ${username}!
      
      Your email is verified and your account is active.
    `,
    to: email
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return null;
  }
};

export const testEmailConnection = async () => {
  try {
    const transporter = initializeTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("Email service connection failed:", error);
    return false;
  }
};
