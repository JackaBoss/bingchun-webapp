const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM || 'Bing Chun <noreply@bingchunmalaysia.com>';

async function sendOTP(toEmail, otp) {
  const { data, error } = await resend.emails.send({
    from:    FROM,
    to:      toEmail,
    subject: `${otp} — Your Bing Chun verification code`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;font-size:22px">冰纯 Bing Chun</h2>
        <p style="color:#555;margin:0 0 24px">Your verification code:</p>
        <div style="background:#f4f4f4;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:36px;font-weight:800;color:#1a1a2e">
          ${otp}
        </div>
        <p style="color:#888;font-size:13px;margin-top:20px">
          This code expires in 10 minutes. Do not share it with anyone.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Resend send failed:', error);
    throw new Error(`Email send failed: ${error.message || error.name}`);
  }
  console.log('Resend sent OK, id:', data?.id);
  return data;
}

module.exports = { sendOTP };