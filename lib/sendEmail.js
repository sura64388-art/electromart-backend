import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

/**
 * Sends an email using Nodemailer with Gmail SMTP
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} otp - The 6-digit OTP
 */
const sendEmail = async (to, subject, otp) => {
	try {
		// Create a transporter using Gmail SMTP
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.MAIL_USER,
				pass: process.env.MAIL_PASS, // This should be a Google App Password
			},
		});

		// Email message configuration
		const mailOptions = {
			from: {
				name: "Sree Saravana Electricals",
				address: process.env.MAIL_USER,
			},
			to,
			subject,
			text: `Hello, We received a request to reset your password. Use the verification code below to complete the process: ${otp}. This code will expire in 15 minutes.`,
			html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; }
                .header { padding: 30px; text-align: center; border-bottom: 1px solid #f1f5f9; }
                .logo-text { font-size: 24px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 5px; }
                .logo-sub { font-size: 14px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 2px; }
                .content { padding: 40px 30px; text-align: center; }
                .greeting { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 20px; text-align: left; }
                .message { font-size: 16px; color: #64748b; margin-bottom: 30px; text-align: left; }
                .otp-box { background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 25px; margin: 30px 0; }
                .otp-code { font-size: 36px; font-weight: 800; color: #10b981; letter-spacing: 12px; margin: 0; }
                .warning-box { background-color: #fffbeb; border-radius: 12px; padding: 20px; margin-top: 30px; text-align: left; border-left: 4px solid #f59e0b; }
                .warning-text { font-size: 14px; color: #92400e; margin: 0; }
                .footer { padding: 30px; text-align: center; background-color: #f8fafc; border-top: 1px solid #f1f5f9; }
                .footer-text { font-size: 12px; color: #94a3b8; margin: 5px 0; }
                .footer-brand { font-weight: 700; color: #475569; font-size: 13px; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo-text">Sree Saravana</div>
                    <div class="logo-sub">Electricals</div>
                    <div style="margin-top: 15px; font-size: 14px; color: #64748b; font-weight: 600;">Password Reset Request</div>
                </div>
                <div class="content">
                    <div class="greeting">Hello User,</div>
                    <p class="message">
                        We received a request to reset your password. Use the verification code below to complete the process:
                    </p>
                    <div class="otp-box">
                        <h1 class="otp-code">${otp}</h1>
                    </div>
                    <div class="warning-box">
                        <p class="warning-text">
                            <strong>⚠️ Important:</strong> This code will expire in 15 minutes. If you didn't request this, please ignore this email and your password will remain unchanged.
                        </p>
                    </div>
                </div>
                <div class="footer">
                    <div class="footer-brand">© ${new Date().getFullYear()} Sree Saravana Electricals</div>
                    <div class="footer-text">Tamil Nadu - 638701</div>
                    <div class="footer-text">📞 +91 95781 68616</div>
                </div>
            </div>
        </body>
        </html>
        `,
		};

		// Send the email
		const info = await transporter.sendMail(mailOptions);
		console.log("✅ OTP Email sent successfully:", info.messageId);
		return info;
	} catch (error) {
		console.error("❌ Nodemailer sendEmail error:", error);
		throw new Error(error.message);
	}
};

export default sendEmail;
