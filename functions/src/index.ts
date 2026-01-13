import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

// Config email (Gmail example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password', // Tạo App Password từ Google
  },
});

// Trigger khi có OTP mới
export const sendOTPEmail = functions.firestore
  .document('otpRequests/{otpId}')
  .onCreate(async (snap, context) => {
    const otpData = snap.data();
    
    const mailOptions = {
      from: 'Siêu Thị Mini <noreply@superthi.com>',
      to: otpData.email,
      subject: 'Mã OTP đặt lại mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #667eea;">Mã OTP của bạn</h2>
          <p>Mã OTP để đặt lại mật khẩu:</p>
          <h1 style="color: #667eea; font-size: 36px; letter-spacing: 8px;">
            ${otpData.otp}
          </h1>
          <p style="color: #999;">Mã này sẽ hết hạn sau 5 phút.</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent to:', otpData.email);
    } catch (error) {
      console.error('❌ Error sending email:', error);
    }
  });