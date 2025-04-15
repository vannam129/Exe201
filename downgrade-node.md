# Cách Downgrade Node.js để chạy Expo

Bạn hiện đang sử dụng Node.js v23.0.0, quá mới và không tương thích với Expo. Expo hoạt động tốt nhất với Node.js 18.x hoặc 20.x.

## Sử dụng NVM cho Windows

### 1. Cài đặt NVM cho Windows

1. Tải NVM cho Windows từ: https://github.com/coreybutler/nvm-windows/releases
2. Tải file `nvm-setup.exe` từ phiên bản mới nhất
3. Cài đặt với quyền admin

### 2. Cài đặt Node.js phiên bản tương thích

Mở PowerShell hoặc Command Prompt với quyền admin và chạy:

```bash
# Kiểm tra phiên bản NVM
nvm --version

# Cài đặt Node.js 18.x (LTS)
nvm install 18.19.1

# Sử dụng phiên bản vừa cài đặt
nvm use 18.19.1

# Kiểm tra lại phiên bản Node.js
node --version
```

### 3. Cài lại các phụ thuộc

```bash
cd C:\Users\TGC\Desktop\EXE\FoodOrderApp
npm run clean
```

### 4. Chạy ứng dụng

```bash
# Chạy với cấu hình đơn giản
npm run start

# Hoặc chạy cụ thể cho Android
npm run android
```

## Cách Thay Thế: Sử dụng npx với Node.js phiên bản cụ thể

Nếu không muốn cài đặt NVM, bạn có thể thử:

```bash
npx --node-arg="--max-old-space-size=2048" expo start --android
```

hoặc

```bash
set NODE_OPTIONS=--max_old_space_size=2048
npx expo start --android
```

## Lưu ý

- Expo 52.x (phiên bản bạn đang dùng) có thể chưa hỗ trợ đầy đủ cho Node.js v23.0.0
- Node.js 18.x LTS là phiên bản được khuyến nghị nhất cho React Native/Expo
- Nếu tiếp tục gặp vấn đề với bộ nhớ, hãy thử giảm dung lượng bộ nhớ được cấp phát xuống 1024MB 