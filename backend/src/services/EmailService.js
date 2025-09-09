const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  init() {
    if (this.transporter) return;

    // Prefer Gmail OAuth2 when credentials available
    const oauthUser = process.env.GMAIL_OAUTH_USER || process.env.SMTP_USER;
    const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN;

    if (oauthUser && clientId && clientSecret && refreshToken) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: oauthUser,
          clientId,
          clientSecret,
          refreshToken
        }
      });
      console.log('EmailService: Using Gmail OAuth2 transporter');
      return;
    }

    // Fallback to basic SMTP user/pass
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = port === 465; // true for 465, false for other ports
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn('EmailService: SMTP credentials not configured. Will rely on test fallback if enabled.');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined
    });
  }

  async sendMail({ to, subject, text, html }) {
    try {
      this.init();
      // Gmail thường yêu cầu From cùng tài khoản đăng nhập
  const from = process.env.EMAIL_FROM || process.env.GMAIL_OAUTH_USER || process.env.SMTP_USER || `VMU Quiz <no-reply@vmu.local>`;
      if (!this.transporter) throw new Error('Email transporter is not initialized');
      const allowFallback = (process.env.EMAIL_FALLBACK_TEST || 'true').toLowerCase() === 'true';
      const hasAuth = !!(this.transporter.options && this.transporter.options.auth && this.transporter.options.auth.user);

      // If no SMTP auth configured and fallback allowed -> use Ethereal immediately
      if (!hasAuth && allowFallback) {
        const testAccount = await nodemailer.createTestAccount();
        const testTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass }
        });
        const info = await testTransporter.sendMail({
          from: `VMU Quiz Test <${testAccount.user}>`,
          to,
          subject,
          text,
          html
        });
        const previewUrl = nodemailer.getTestMessageUrl(info);
        return { success: true, messageId: info.messageId, previewUrl, note: 'Sent via Ethereal test SMTP (no SMTP auth configured)' };
      }

      try {
        const info = await this.transporter.sendMail({ from, to, subject, text, html });
        return { success: true, messageId: info.messageId };
      } catch (primaryErr) {
        if (allowFallback) {
          const testAccount = await nodemailer.createTestAccount();
          const testTransporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
          });
          const info = await testTransporter.sendMail({
            from: `VMU Quiz Test <${testAccount.user}>`,
            to,
            subject,
            text,
            html
          });
          const previewUrl = nodemailer.getTestMessageUrl(info);
          return { success: true, messageId: info.messageId, previewUrl, note: 'Sent via Ethereal test SMTP due to primary SMTP failure' };
        }
        throw primaryErr;
      }
    } catch (err) {
      console.error('EmailService sendMail error:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new EmailService();
