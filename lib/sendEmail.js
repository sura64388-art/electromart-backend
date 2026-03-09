import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, otp) => {
	const msg = {
		to,
		from: {
			email: process.env.SENDGRID_FROM_EMAIL,
			name: "E-Commerce App"
		},
		replyTo: process.env.EMAIL_REPLY_TO,
		subject,

		
		text: `Your OTP is ${otp}. It is valid for 10 minutes.`,

		
		html: `
			<div style="font-family: Arial, sans-serif; padding: 20px;">
				<h2>E-Commerce App</h2>
				<p>Your One-Time Password (OTP) is:</p>
				<h1 style="letter-spacing: 4px; color: #2c3e50;">${otp}</h1>
				<p>This OTP is valid for <b>10 minutes</b>.</p>
				<p>If you did not request this, please ignore this email.</p>
			</div>
		`
	};

	await sgMail.send(msg);
};

export default sendEmail;



