const { Resend } = require('resend');
require('dotenv').config();

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PASS;
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set in environment variables');
  }
  return new Resend(apiKey);
};

const sendVerificationEmail = async (toEmail, token) => {
  const resend = getResendClient();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const verifyLink = `${clientUrl}/verify-email?token=${token}`;

  return await resend.emails.send({
    from: process.env.EMAIL_FROM || 'ExpTracker <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Verify your ExpTracker Account',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 22px;">Exp<span style="color: #2563eb;">Tracker</span></h2>
          <p style="color: #475569; font-size: 14px; margin-top: 4px;">Confirm your email address</p>
        </div>
        <div style="color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>Hello,</p>
          <p>Thank you for signing up for ExpTracker. Please click the button below to verify your email address and activate your account:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verifyLink}" style="background-color: #2563eb; color: #ffffff; font-weight: 600; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">Verify Email Address</a>
          </div>
          <p style="font-size: 12px; color: #64748b;">Or copy and paste this link into your browser:<br/><a href="${verifyLink}" style="color: #2563eb;">${verifyLink}</a></p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">This verification link will expire in 24 hours. If you did not create an ExpTracker account, please ignore this email.</p>
        </div>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail };
