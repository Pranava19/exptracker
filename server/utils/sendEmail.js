// Email feature disabled: lightweight stubs to eliminate external email services (Resend/Nodemailer)

const sendVerificationEmail = async () => ({
  id: 'email-disabled',
  message: 'Email service has been removed',
});

const sendPasswordResetEmail = async () => ({
  id: 'email-disabled',
  message: 'Email service has been removed',
});

const sendMonthlySummaryReportEmail = async () => ({
  id: 'email-disabled',
  message: 'Email service has been removed',
});

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendMonthlySummaryReportEmail,
};
