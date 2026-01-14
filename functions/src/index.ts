// functions/src/index.ts - Firebase Cloud Functions (Fixed v2)

import * as admin from 'firebase-admin';
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
admin.initializeApp();

// ==========================================
// CẤU HÌNH EMAIL (Dùng Gmail)
// ==========================================
const EMAIL_CONFIG = {
  user: 'xuanta142005@gmail.com',      // ← Email Gmail của bạn
  pass: 'dade qqeq uwnp gfbq',       // ← App Password (16 ký tự)
  appName: 'Siêu Thị Mini',          // ← Tên app của bạn
};



// ==========================================
// FUNCTION: Gửi OTP Email khi có document mới
// ==========================================
export const sendOTPEmail = functions
  .region('asia-southeast1')
  .firestore
  .document('otpRequests/{otpId}')
  .onCreate(async (snap: any, context: any) => {
    const otpData = snap.data();

    if (!otpData || !otpData.email || !otpData.otp) {
      console.error('❌ Invalid OTP data:', otpData);
      return null;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.pass,
      },
    });

    const mailOptions = {
      from: `${EMAIL_CONFIG.appName} <${EMAIL_CONFIG.user}>`,
      to: otpData.email,
      subject: `Mã OTP đặt lại mật khẩu - ${EMAIL_CONFIG.appName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #3B82F6; margin: 0;">🔐 Mã OTP của bạn</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Xin chào,</p>
          
          <p style="color: #374151; font-size: 16px;">
            Bạn đã yêu cầu đặt lại mật khẩu. Đây là mã OTP của bạn:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #F3F4F6; border-radius: 12px; padding: 20px; display: inline-block;">
              <span style="color: #3B82F6; font-size: 36px; font-weight: bold; letter-spacing: 8px;">
                ${otpData.otp}
              </span>
            </div>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">
            ⏰ Mã này sẽ hết hạn sau <strong>5 phút</strong>.
          </p>
          
          <p style="color: #6B7280; font-size: 14px;">
            Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
          </p>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            Email này được gửi tự động từ ${EMAIL_CONFIG.appName}.<br>
            Vui lòng không trả lời email này.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent to:', otpData.email);
      await snap.ref.update({ emailSent: true });
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending OTP email:', error);
      return { success: false, error };
    }
  });

// ==========================================
// FUNCTION: Gửi thông báo đơn hàng
// ==========================================
export const sendOrderNotification = functions
  .region('asia-southeast1')
  .firestore
  .document('orders/{orderId}')
  .onUpdate(async (change: any, context: any) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (beforeData.status === afterData.status) {
      return null;
    }

    const statusMessages: Record<string, string> = {
      confirmed: 'Đơn hàng đã được xác nhận',
      processing: 'Đơn hàng đang được chuẩn bị',
      shipping: 'Đơn hàng đang được giao',
      delivered: 'Đơn hàng đã được giao thành công',
      cancelled: 'Đơn hàng đã bị hủy',
    };

    const message = statusMessages[afterData.status];
    if (!message) return null;

    try {
      await admin.firestore().collection('notifications').add({
        userId: afterData.customerId,
        title: 'Cập nhật đơn hàng',
        body: message,
        type: 'order',
        orderId: context.params.orderId,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Order notification created for:', afterData.customerId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      return { success: false, error };
    }
  });