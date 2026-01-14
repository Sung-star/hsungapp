# MyApp2 - Ứng dụng Thương mại điện tử

Đây là một ứng dụng di động thương mại điện tử được xây dựng bằng React Native (Expo) và Firebase. Ứng dụng được thiết kế để phục vụ cả **Khách hàng** và **Người bán** (Quản trị viên) với một bộ tính năng phong phú và giao diện người dùng hiện đại.

## Tính năng chính

### Dành cho Khách hàng

-   **Trang chủ và Sản phẩm:** Lướt xem các sản phẩm mới, sản phẩm nổi bật và tìm kiếm sản phẩm.
-   **Giỏ hàng:** Thêm, xóa, và cập nhật số lượng sản phẩm trong giỏ hàng.
-   **Thanh toán:** Quy trình thanh toán đơn giản với nhiều lựa chọn.
-   **Quản lý đơn hàng:** Theo dõi trạng thái các đơn hàng đã đặt.
-   **Tài khoản cá nhân:** Quản lý thông tin cá nhân, địa chỉ, và các cài đặt khác.
-   **Thông báo:** Nhận thông báo về đơn hàng, khuyến mãi và các cập nhật khác.
-   **Tương tác:** Đánh giá sản phẩm, trò chuyện trực tiếp với người bán.

### Dành cho Người bán / Quản trị viên

-   **Bảng điều khiển (Dashboard):** Xem tổng quan về doanh thu, đơn hàng mới và các số liệu thống kê quan trọng.
-   **Quản lý Sản phẩm:** Thêm, sửa, xóa sản phẩm và quản lý tồn kho.
-   **Quản lý Đơn hàng:** Xem và xử lý các đơn hàng từ khách hàng.
-   **Quản lý Vouchers/Khuyến mãi:** Tạo và quản lý các mã giảm giá.
-   **Trò chuyện (Chat):** Tương tác và hỗ trợ khách hàng trực tiếp qua tin nhắn.
-   **Quản lý tài khoản:** Cập nhật thông tin cửa hàng và các cài đặt liên quan.

## Công nghệ sử dụng

-   **Framework:** React Native với Expo (SDK 54)
-   **Ngôn ngữ:** TypeScript
-   **Routing (Điều hướng):** Expo Router v6
-   **Backend:** Firebase (Authentication, Firestore, Cloud Functions, Storage)
-   **Quản lý trạng thái:** React Context
-   **UI:** Các component tùy chỉnh xây dựng trên React Native.

## Hướng dẫn cài đặt và sử dụng

### 1. Điều kiện cần có

-   Node.js (phiên bản 18 trở lên)
-   npm hoặc yarn
-   Expo CLI (cài đặt bằng `npm install -g expo-cli`)

### 2. Cài đặt

1.  **Clone repository về máy:**
    ```bash
    git clone <your-repository-url>
    cd MyApp2
    ```

2.  **Cài đặt các dependencies:**
    ```bash
    npm install
    ```

### 3. Cấu hình Firebase

1.  Tạo một dự án mới trên [Firebase Console](https://console.firebase.google.com/).
2.  Đi đến phần **Project settings** và lấy thông tin cấu hình Firebase cho ứng dụng web.
3.  Tạo file `config/firebase.ts` và sao chép cấu hình của bạn vào đó.
4.  Kích hoạt các dịch vụ **Authentication**, **Firestore**, và **Storage** trên Firebase Console.

### 4. Khởi chạy ứng dụng

-   **Chạy server development:**
    ```bash
    npm start
    ```
    hoặc
    ```bash
    npx expo start
    ```

-   **Chạy trên thiết bị Android:**
    ```bash
    npm run android
    ```

-   **Chạy trên mô phỏng iOS:**
    ```bash
    npm run ios
    ```

-   **Chạy trên trình duyệt Web:**
    ```bash
    npm run web
    ```

## Các lệnh (Scripts) có sẵn

-   `npm start`: Khởi động Expo development server.
-   `npm run android`: Chạy ứng dụng trên thiết-bị/máy-ảo Android.
-   `npm run ios`: Chạy ứng dụng trên máy ảo iOS.
-   `npm run web`: Chạy ứng dụng trên trình duyệt web.
-   `npm run lint`: Kiểm tra lỗi và định dạng code.

## Cấu trúc thư mục

Dự án có cấu trúc thư mục được tổ chức theo chức năng:

```
.
├── app/              # Nơi chứa toàn bộ mã nguồn của các màn hình
│   ├── (tabs)/       # Các màn hình trong thanh điều hướng của Người bán
│   ├── auth/         # Các màn hình xác thực (đăng nhập, đăng ký...)
│   ├── client/       # Các màn hình trong thanh điều hướng của Khách hàng
│   ├── components/   # Các component tái sử dụng cho từng màn hình cụ thể
│   ├── hooks/        # Các custom React hooks
│   └── ...
├── assets/           # Chứa các tài sản tĩnh như hình ảnh, fonts...
├── components/       # Các component UI chung, có thể dùng ở mọi nơi
├── config/           # Các file cấu hình (ví dụ: firebase.ts)
├── constants/        # Chứa các hằng số như màu sắc, theme...
├── contexts/         # Các React Context Provider để quản lý trạng thái
├── firebase/         # Các services để tương tác với Firebase
├── functions/        # Mã nguồn cho Firebase Cloud Functions
├── services/         # Các service chung của ứng dụng
└── ...
```
