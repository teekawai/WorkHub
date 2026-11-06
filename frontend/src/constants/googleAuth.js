//Client ID công khai của ứng dụng (OAuth 2.0 Client), lấy từ Google Cloud Console
//Đây không phải secret — Client ID luôn lộ ra ở phía FE theo thiết kế của Google, an toàn khi hardcode
//Phải khớp với "Google_clientID" trong backend/appsettings.json (BE dùng để validate token)
export const GOOGLE_CLIENT_ID = "443707054149-ckqq6ql5klb6sourc5f7l5fved8c2kml.apps.googleusercontent.com"
