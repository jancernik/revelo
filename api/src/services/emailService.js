import { config } from "#src/config/environment.js"
import nodemailer from "nodemailer"

let transporter = null

const sendEmail = async (transporter, mailOptions, verificationUrl) => {
  if (config.NODE_ENV === "test") return
  if (
    [
      !config.SMTP_HOST,
      !config.SMTP_PORT,
      !config.SMTP_USER,
      !config.SMTP_PASS,
      !config.SMTP_EMAIL
    ].some(Boolean)
  ) {
    if (verificationUrl) {
      console.log(`Missing SMTP configuration. Skipping email send.`)
      console.log(`Verification URL for ${mailOptions.to}: ${verificationUrl}`)
    }
    return
  }
  try {
    const info = await transporter.sendMail(mailOptions)
    return info
  } catch (error) {
    console.error("Failed to send email:", error)
  }
}

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
    })
  }
  return transporter
}

export const sendVerificationEmail = async (email, token, username) => {
  const transporter = initializeTransporter()
  const verificationUrl = `${config.CLIENT_BASE_URL}/verify-email?token=${token}`

  const mailOptions = {
    from: `"Revelo" <${config.SMTP_EMAIL}>`,
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
  }

  await sendEmail(transporter, mailOptions, verificationUrl)
}

export const sendWelcomeEmail = async (email, username) => {
  const transporter = initializeTransporter()

  const mailOptions = {
    from: config.SMTP_EMAIL,
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
  }

  await sendEmail(transporter, mailOptions)
}

export const testEmailConnection = async () => {
  try {
    const transporter = initializeTransporter()
    await transporter.verify()
    return true
  } catch (error) {
    console.error("Email service connection failed:", error)
    return false
  }
}
