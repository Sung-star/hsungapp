// config/bankConfig.ts - VietQR Bank Configuration

/**
 * Danh sách mã ngân hàng VietQR
 * Tham khảo: https://api.vietqr.io/v2/banks
 */
export const VIETQR_BANKS = {
  VIETCOMBANK: { bin: '970436', name: 'Vietcombank', shortName: 'VCB' },
  TECHCOMBANK: { bin: '970407', name: 'Techcombank', shortName: 'TCB' },
  MBBANK: { bin: '970422', name: 'MB Bank', shortName: 'MB' },
  VPBANK: { bin: '970432', name: 'VPBank', shortName: 'VPB' },
  ACBBANK: { bin: '970416', name: 'ACB', shortName: 'ACB' },
  TPBANK: { bin: '970423', name: 'TPBank', shortName: 'TPB' },
  SACOMBANK: { bin: '970403', name: 'Sacombank', shortName: 'STB' },
  HDBANK: { bin: '970437', name: 'HDBank', shortName: 'HDB' },
  VIETINBANK: { bin: '970415', name: 'VietinBank', shortName: 'CTG' },
  BIDV: { bin: '970418', name: 'BIDV', shortName: 'BIDV' },
  AGRIBANK: { bin: '970405', name: 'Agribank', shortName: 'VBA' },
  OCEANBANK: { bin: '970414', name: 'OceanBank', shortName: 'OCB' },
  SHBVN: { bin: '970443', name: 'SHB', shortName: 'SHB' },
  EXIMBANK: { bin: '970431', name: 'Eximbank', shortName: 'EIB' },
  MSBANK: { bin: '970426', name: 'MSB', shortName: 'MSB' },
  NAMABANK: { bin: '970428', name: 'NamABank', shortName: 'NAB' },
  VIETTINBANK: { bin: '970415', name: 'VietinBank', shortName: 'ICB' },
  VIETABANK: { bin: '970427', name: 'VietABank', shortName: 'VAB' },
  BAOVIETBANK: { bin: '970438', name: 'BaoVietBank', shortName: 'BVB' },
  SEABANK: { bin: '970440', name: 'SeABank', shortName: 'SSB' },
} as const;

/**
 * Thông tin tài khoản ngân hàng của shop
 * ⚠️ CẬP NHẬT THÔNG TIN THẬT CỦA BẠN Ở ĐÂY
 */
export const SHOP_BANK_ACCOUNT = {
  bankId: 'VIETCOMBANK',
  bankBin: '970436', // Mã BIN của Vietcombank
  bankName: 'Vietcombank',
  bankShortName: 'VCB',
  accountNumber: '01042005',
  accountName: 'TA VAN HOAI SUNG',
  branch: 'Chi nhánh Hồ Chí Minh',
};

/**
 * VietQR Template Types
 * - compact: QR nhỏ gọn
 * - compact2: QR nhỏ gọn v2
 * - qr_only: Chỉ QR code
 * - print: QR để in
 */
export type VietQRTemplate = 'compact' | 'compact2' | 'qr_only' | 'print';

/**
 * Generate VietQR URL
 * Tham khảo: https://www.vietqr.io/
 * 
 * @param amount - Số tiền cần thanh toán
 * @param description - Nội dung chuyển khoản
 * @param template - Template QR (mặc định: compact2)
 * @returns URL hình ảnh QR code
 */
export const generateVietQRUrl = (
  amount: number,
  description: string,
  template: VietQRTemplate = 'compact2'
): string => {
  const { bankBin, accountNumber, accountName } = SHOP_BANK_ACCOUNT;
  
  // Chuẩn hóa nội dung chuyển khoản (không dấu, không ký tự đặc biệt)
  const cleanDescription = removeVietnameseTones(description)
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .substring(0, 50); // Giới hạn 50 ký tự
  
  // VietQR API URL
  const baseUrl = 'https://img.vietqr.io/image';
  
  // Format: https://img.vietqr.io/image/BANK_BIN-ACCOUNT_NO-TEMPLATE.png?amount=X&addInfo=Y&accountName=Z
  const url = `${baseUrl}/${bankBin}-${accountNumber}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(cleanDescription)}&accountName=${encodeURIComponent(accountName)}`;
  
  return url;
};

/**
 * Generate VietQR URL cho các ví điện tử (MoMo, ZaloPay, VNPay)
 * Note: Đây là mock URL, thực tế cần tích hợp SDK của từng ví
 */
export const generateEWalletQRUrl = (
  method: 'momo' | 'vnpay' | 'zalopay',
  amount: number,
  transactionId: string
): string => {
  // Mock QR cho demo - thực tế cần tích hợp SDK
  const content = encodeURIComponent(
    JSON.stringify({
      method,
      amount,
      transactionId,
      timestamp: Date.now(),
    })
  );
  
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${content}`;
};

/**
 * Helper: Xóa dấu tiếng Việt
 */
export const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

/**
 * Format số tiền theo định dạng Việt Nam
 */
export const formatCurrencyVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

/**
 * Kiểm tra xem ngân hàng có hỗ trợ VietQR không
 */
export const isBankSupportVietQR = (bankId: string): boolean => {
  return bankId in VIETQR_BANKS;
};