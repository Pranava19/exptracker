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

const sendPasswordResetEmail = async (toEmail, token) => {
  const resend = getResendClient();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const resetLink = `${clientUrl}/reset-password?token=${token}`;

  return await resend.emails.send({
    from: process.env.EMAIL_FROM || 'ExpTracker <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Reset your ExpTracker Password',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 22px;">Exp<span style="color: #2563eb;">Tracker</span></h2>
          <p style="color: #475569; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
        </div>
        <div style="color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>Hello,</p>
          <p>We received a request to reset your ExpTracker account password. Click the button below to choose a new password:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; font-weight: 600; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #64748b;">Or copy and paste this link into your browser:<br/><a href="${resetLink}" style="color: #2563eb;">${resetLink}</a></p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">This password reset link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
        </div>
      </div>
    `,
  });
};

const sendMonthlySummaryReportEmail = async (user, summaryData) => {
  const resend = getResendClient();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const { monthName, totalIncome, totalExpenses, netSavings, topTransactions = [] } = summaryData;

  const topRowsHtml = topTransactions.slice(0, 5).map(tx => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155;">${tx.date?.slice(0, 10) || ''}</td>
      <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a; font-weight: 500;">${tx.payee || tx.description || 'Merchant'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #dc2626; font-weight: 600; text-align: right;">₹${Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return await resend.emails.send({
    from: process.env.EMAIL_FROM || 'ExpTracker <onboarding@resend.dev>',
    to: user.email,
    subject: `📊 Your ExpTracker Financial Summary - ${monthName}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">Exp<span style="color: #2563eb;">Tracker</span></h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Monthly Financial Report: <strong>${monthName}</strong></p>
        </div>

        <div style="margin-bottom: 24px;">
          <p style="color: #1e293b; font-size: 15px; margin: 0 0 16px 0;">Hello <strong>${user.name || 'User'}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0;">Here is your automated monthly financial breakdown for <strong>${monthName}</strong>:</p>
        </div>

        <!-- 3 Metric Cards -->
        <div style="display: table; width: 100%; margin-bottom: 24px; border-collapse: separate; border-spacing: 8px 0;">
          <div style="display: table-cell; width: 33%; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase;">Income</div>
            <div style="font-size: 18px; font-weight: 800; color: #15803d; margin-top: 4px;">₹${Number(totalIncome || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>
          <div style="display: table-cell; width: 33%; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase;">Expenses</div>
            <div style="font-size: 18px; font-weight: 800; color: #dc2626; margin-top: 4px;">₹${Number(totalExpenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>
          <div style="display: table-cell; width: 33%; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase;">Net Savings</div>
            <div style="font-size: 18px; font-weight: 800; color: #2563eb; margin-top: 4px;">₹${Number(netSavings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        <!-- Top Expenses Table -->
        ${topTransactions.length > 0 ? `
          <div style="margin-bottom: 24px;">
            <h3 style="font-size: 14px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Top 5 Expenses in ${monthName}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 8px 10px; font-size: 11px; color: #64748b; text-align: left; text-transform: uppercase;">Date</th>
                  <th style="padding: 8px 10px; font-size: 11px; color: #64748b; text-align: left; text-transform: uppercase;">Payee</th>
                  <th style="padding: 8px 10px; font-size: 11px; color: #64748b; text-align: right; text-transform: uppercase;">Amount</th>
                </tr>
              </thead>
              <tbody>${topRowsHtml}</tbody>
            </table>
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
          <a href="${clientUrl}/analysis" style="background-color: #2563eb; color: #ffffff; font-weight: 600; padding: 12px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 14px;">View Full Financial Analysis</a>
        </div>

        <div style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px;">
          ExpTracker Personal Finance · Automated Monthly Digest
        </div>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendMonthlySummaryReportEmail };
