# Star Cinema

Chạy với Java 21, SQL Server đã có schema và profile `integrated`:

```powershell
. ./cenima/.local/env.ps1
./cenima/mvnw.cmd -B -f cenima/pom.xml verify
Set-Location cenima
java -jar target/cenima-0.0.1-SNAPSHOT.jar --spring.profiles.active=integrated --server.address=127.0.0.1
```

Chạy lại nhanh từ thư mục Cinema: `./tools/Start-Portal.ps1` (thêm `-Build` khi đổi code).
Dừng tiến trình đang chạy trước khi build lại file JAR trên Windows.

Trang chủ `/` (hoặc `/demo/index.html`), `/login.html`, `/register.html`, `/admin.html`, `/check-in.html`.
CSS và JavaScript mới nằm trong `cenima/src/main/resources/static/assets/`.
Giao diện tham khảo cách tổ chức danh mục/lịch chiếu của https://chieuphimquocgia.com.vn/;
thương hiệu hiện tại là Star Cinema; nền đen và điểm nhấn vàng giữ theo ảnh người dùng cung cấp.

Tài khoản admin local hiện có: `admin123@`. Nếu dùng cấu hình local đã khôi phục,
chạy hai lệnh dưới đây để sao chép mật khẩu vào clipboard rồi dán vào form đăng nhập:

```powershell
. ./cenima/.local/admin-auth.ps1
Set-Clipboard $env:CINEMA_ADMIN_PASSWORD
```

Không commit file `.local` hoặc mật khẩu. Người dùng mới có thể đăng ký trực tiếp trên giao diện.
Form đăng nhập nhận email hoặc tên tài khoản (tối đa 100 ký tự); đăng ký vẫn kiểm tra email hợp lệ. Tài khoản admin được đổi trực tiếp trong database local, không đặt mật khẩu mặc định trong mã nguồn hoặc tự ghi đè khi khởi động.

## Quyền

- Khách xem phim và lịch chiếu, không đặt vé hoặc xem vé cá nhân.
- Đăng ký chỉ tạo `CUSTOMER` trong DB, hiển thị là `USER` / Người dùng trên giao diện. Không nhận quyền từ client.
- `USER` đặt vé, xem danh sách vé của chính mình, phát hành QR theo chính sách vé hiện có.
- `ADMIN` xem thống kê, quản lý phim (tạo/sửa/ngừng chiếu), xem danh sách tài khoản và khóa/mở khóa tài khoản không phải admin.
- `/api/admin/**` được Spring Security kiểm tra `ROLE_ADMIN`; ẩn nút không phải cơ chế bảo vệ.
- Giữ `STAFF` và chính sách check-in hiện có. Không đổi tên role trong DB hoặc thay thuật toán ký JWT.
- Tài khoản admin không thể tự đăng ký công khai. Admin hiện có vẫn dùng được; màn hình này không cấp quyền admin cho tài khoản mới.
- Khóa tài khoản làm access token hiện tại bị từ chối vì filter kiểm tra lại người dùng trong DB.

API mới: POST `/api/auth/register`, GET `/api/account/me`, GET `/api/account/tickets`,
GET `/api/admin/stats`, GET `/api/admin/users`, PATCH `/api/admin/users/{id}/active`,
GET/POST `/api/admin/movies`, PUT `/api/admin/movies/{id}`.

Token được giữ trong `sessionStorage` của tab để dùng khi chuyển trang. Không lưu mật khẩu.
Refresh tự động khi access token hết hạn; logout thu hồi refresh token và xóa phiên trên tab.
Access token đã phát hành vẫn có thể dùng đến hết hạn (15 phút), theo auth hiện tại.
CSP chỉ cho phép script/style/ảnh cùng nguồn, ảnh QR dùng data URL; không dùng inline handler hoặc HTML từ dữ liệu chưa escape.

Đặt vé vẫn là nghiệp vụ demo: backend đánh dấu PAID, chưa có thanh toán tiền thật.
Giao diện dùng dữ liệu thật từ SQL Server; không thêm phim giả hoặc tự đổi thời gian các suất chiếu đã có.
Sơ đồ ghế chỉ hiện khi có suất chiếu trong tương lai. Giá VIP x1.5, COUPLE x2; tổng cuối cùng do server tính.
Quản lý suất chiếu và thanh toán không nằm trong trang quản trị phiên bản này.

## Ảnh

Ảnh lưu local để không cần tải từ bên thứ ba khi mở trang:

- `assets/earth.jpg`: https://images.unsplash.com/photo-1446776811953-b23d57bd21aa
- `assets/galaxy.jpg`: https://images.unsplash.com/photo-1462331940025-496dfbfc7564
- `assets/stars.jpg`: https://images.unsplash.com/photo-1419242902214-272b3f66ee7a
- `assets/poster-1.jpg`: poster Đào, phở và piano, Wikimedia / Wikipedia tiếng Việt.
- `assets/poster-2.jpg`: poster Mắt biếc, Wikimedia / Wikipedia tiếng Việt.
- `assets/poster-3.jpg`: poster Lật mặt (2015), Wikimedia / Wikipedia tiếng Việt.

Poster dùng cho dự án học tập để nhận diện các phim có trong database. Khi triển khai công khai cần nguồn ảnh được cấp phép phù hợp.
Phim chưa có poster dùng ảnh vũ trụ kèm tiêu đề, không giả làm poster chính thức.

## Cập nhật giao diện Star Cinema

- Trang chủ chỉ có carousel poster, hai nút “Xem tất cả phim”/“Lịch chiếu” và danh mục Đang chiếu/Sắp chiếu; bỏ slogan và phần giới thiệu/trải nghiệm.
- Carousel bắt đầu bằng CLAYFACE-T18 theo lựa chọn của người dùng, tiếp theo Án mạng karaoke và Kamen Rider. Có nút chuyển, vuốt/kéo, bàn phím và tạm dừng tự động; tôn trọng cài đặt giảm chuyển động.
- Đây là lựa chọn poster nổi bật, không phải thống kê doanh thu. Danh sách phim và lịch chiếu đặt vé vẫn lấy từ database của dự án.
- Vé cá nhân chỉ hiện khi bấm “Vé của tôi” hoặc sau khi đặt vé.
- Font tựa lớn/nhận diện: Sugo bản gốc (classic) của Zetafonts, nguồn `https://www.dafont.com/sugo.font`, file nguồn `SugoTrial.ttf`, lưu là `assets/fonts/SugoClassic.ttf`. Giấy phép phi thương mại kèm tại `assets/fonts/Sugo-license.txt` và `Sugo-license.pdf`, phù hợp bản học tập local này.
- Nội dung, tựa nhỏ, biểu mẫu: Be Vietnam Pro 400/500/600/700 từ Google Fonts, giấy phép OFL kèm font. Font được lưu local. Be Vietnam Pro đã được kiểm tra đủ glyph tiếng Việt của website. Bản Sugo công khai thiếu một số glyph tiếng Việt; các tựa chứa chữ không được Sugo hỗ trợ sẽ chuyển cả dòng sang Be Vietnam Pro (dựa trên cmap của file font), tránh trộn font từng chữ.
- Poster carousel được tải nguyên ảnh từ website tham khảo và lưu tại `assets/ncc-*.jpg`:
  - CLAYFACE: https://res.anvui.vn/dwi5f2bje/image/upload/v1792394262/attachments_ncc/admin/vn_clayface_alt-9-1792394260851.jpg
  - Án mạng karaoke: https://res.anvui.vn/dwi5f2bje/image/upload/v1785981275/attachments_ncc/admin/_n_m_ng_karaoke_-_dkkc_02102026-_kthuoc_chu_n-1785981273935.jpg
  - Kamen Rider: https://res.anvui.vn/dwi5f2bje/image/upload/v1793072362/attachments_ncc/admin/kamen_rider_zeztz_gavan_localized_main_adaptation_web_470_x_700--1793072360897.jpg
- Trang chi tiết tham khảo: https://chieuphimquocgia.com.vn/movies/11248.

## Giao diện đen–tím và danh mục NCC

- Banner hiện phủ toàn chiều ngang và chiều cao viewport trừ header, dùng `object-fit: cover`; ảnh không còn hiển thị thành poster nhỏ bên phải. Ảnh dọc có thể được cắt theo tỉ lệ màn hình.
- Bấm banner, poster, tên phim hoặc “Xem chi tiết” để mở mô tả đầy đủ, thể loại, quốc gia, thời lượng, đạo diễn, diễn viên, ngày khởi chiếu, phân loại tuổi và nguồn dữ liệu; trailer mở ở YouTube nếu nguồn có.
- Logo SVG mới tại `assets/star-mark.svg` và favicon được vẽ bằng vector theo tham khảo ngôi sao nhiều tia/quỹ đạo người dùng gửi.
- Bảng màu đổi từ vàng sang tím galaxy. Nội dung/tựa nhỏ và nút dùng Montserrat 400/500/600/700 lưu local, có đủ các glyph tiếng Việt của giao diện và dữ liệu phim. Giấy phép OFL nằm cùng font. Người dùng đã đồng ý dùng font thay thế dễ sử dụng cho Montaser Arabic.
- Sugo vẫn dùng cho tên rạp/tựa lớn hỗ trợ glyph; cả dòng tựa có chữ thiếu glyph chuyển sang Montserrat.
- `assets/ncc-catalog.json` là bản chụp dữ liệu công khai có ngày thu thập và URL nguồn cho từng phim. Đã nhập 9 phim có đủ poster/mô tả, gồm CLAYFACE và TRÁI TIM QUÁI THÚ từ https://chieuphimquocgia.com.vn/movies/11279.
- Tab phim dùng danh mục NCC local khi có; API phim SQL Server làm nguồn dự phòng nếu file danh mục không đọc được. Trạng thái snapshot phân theo ngày khởi chiếu so với ngày thu thập; không tự tạo phim sắp chiếu khi nguồn chưa có dữ liệu.
- Đây là dữ liệu tham khảo, không phải tích hợp đặt vé của NCC. Phim từ NCC chưa có suất chiếu trong database Star Cinema sẽ dẫn sang trang lịch chiếu nguồn. Các ID `ncc-*` không được gửi vào API booking của Star Cinema.
- Cập nhật dữ liệu bằng `./tools/Sync-NccCatalog.ps1`, cần Python và kết nối mạng. Script tải HTML public, dùng `Build-NccCatalog.py` trích dữ liệu, lưu poster local; không sửa database hoặc tài khoản. Build/chạy lại để đưa dữ liệu mới vào JAR.
- Giá trị ngày/nguồn là metadata của snapshot, không cam kết đồng bộ tự động theo thời gian thực.

## Ba poster nổi bật trên trang chủ

- Thứ tự theo yêu cầu: Chị chị em em 3, Clayface, Án mạng karaoke. Không hiển thị số trang hoặc cụm điều khiển góc phải; chỉ có nút trước/sau ở hai cạnh, vuốt và phím trái/phải. Chuyển phim thủ công.
- Banner Chị chị em em 3 (1640×720): https://apiv2.chieuphimquocgia.com.vn/Content/Images/Banner/0020434.jpg
- Banner Clayface (1920×1080): https://whentostream.com/wp-content/uploads/2026/04/Clayface-Horizontal.jpeg — bản quốc tế nên ngày phát hành in trên ảnh khác lịch Việt Nam trong phần chi tiết.
- Poster Án mạng karaoke (2000×2500): https://f35story.com/wp-content/uploads/2026/09/poster-an-mang-karaoke.jpeg — bản quảng bá có ngày chiếu dự kiến trên ảnh; ngày trong thông tin chi tiết theo NCC.
- `hero-karaoke.jpg` là bản chuyển sang khung ngang từ ảnh nguồn, giữ toàn bộ chữ/tên phim, mở rộng hai bên bằng nền mờ cùng ảnh. Không kéo giãn poster hoặc tự viết lại tên phim lên ảnh.
- Ảnh ngang dùng cho desktop, poster dọc cho điện thoại; `object-fit: contain` bảo toàn tên phim và bố cục gốc thay vì cắt mất chữ.

## Trang chủ chỉ có poster ngang — cập nhật mới nhất

- Trang chủ bỏ hai nút “Xem tất cả phim” và “Lịch chiếu”, chỉ hiển thị carousel. Menu “Phim” mở `/#movies`; “Lịch chiếu” cạnh đó mở `/#schedule`, chọn phim để xem lịch chiếu. Danh mục và vé cá nhân không nằm dưới poster trên trang chủ.
- Giữ Chị chị em em 3 và Clayface; thay Án mạng karaoke bằng ba phim Street Fighter, Người mẹ khác, Trại buôn người, tổng cộng năm poster. Chỉ có mũi tên ở hai cạnh, không số trang.
- Cả máy tính và điện thoại đều dùng ảnh ngang nguyên bản có tên phim; `object-fit: contain` giữ trọn chữ. Ba banner bổ sung đều 1640×720, tải từ NCC và lưu local:
  - `assets/hero-street-fighter.jpg`: https://apiv2.chieuphimquocgia.com.vn/Content/Images/Banner/0020432.jpg
  - `assets/hero-nguoi-me-khac.jpg`: https://apiv2.chieuphimquocgia.com.vn/Content/Images/Banner/0020424.jpg
  - `assets/hero-trai-buon-nguoi.jpg`: https://apiv2.chieuphimquocgia.com.vn/Content/Images/Banner/0020394.jpg
- Bấm poster vẫn mở mô tả phim. Lịch chiếu của phim NCC dẫn sang nguồn, không tự tạo suất chiếu trong database Star Cinema.

## Danh mục phim ở trang chủ và trang riêng

- Danh mục Đang chiếu/Sắp chiếu hiện dưới carousel khi cuộn trang chủ. Bỏ chấm trang trí sau “Đang chiếu”.
- Menu “Phim” mở trang riêng `/movies.html`, chỉ hiện danh mục phim. Trang này được phép truy cập công khai giống trang chủ.
- Bỏ mục Lịch chiếu trên menu và giao diện danh mục lịch chiếu riêng. Thông tin suất chiếu trong chi tiết phim vẫn phục vụ chức năng đặt vé hiện có.

## Đặt vé trong Vé của tôi — cập nhật mới nhất

- Đăng nhập rồi mở `/#my-tickets`. Mục “Đặt vé mới” lấy phim từ SQL Server, cho chọn suất chiếu, ghế và kiểm tra thông tin trước khi xác nhận. Hủy xác nhận không tạo đơn; trùng ghế sẽ tải lại sơ đồ.
- Đặt thành công tải lại danh sách vé ngay cả khi đang ở trang Vé của tôi. Mỗi vé có nút xem/tải QR JWT ký số RS256; backend hiện có tiếp tục kiểm tra chủ vé và chỉ cho check-in một lần. JWT ký số không giấu nội dung vé. Chưa có thanh toán trực tuyến.
- Nếu lịch seed đã cũ, chạy `./tools/Add-DemoShowtimes.ps1` để thêm tối đa ba phim vào ba ngày tới trong DB demo local, dùng phòng và ghế có sẵn; không thay hoặc xóa lịch/vé cũ. Script bỏ qua khung giờ trùng hoặc đè lên lịch hiện có.
- Máy clone mới làm theo README để khởi tạo DB trống, thiết lập tài khoản, thêm lịch demo và chạy ứng dụng. Không dùng database hoặc mật khẩu từ máy khác.
- Nhánh chứa toàn bộ cập nhật: `feat/ngoc-eticket`. Kiểm thử giao diện: `tools/test-ticket-ui.cjs`; kiểm thử SQL/JWT/check-in: `IntegratedSqlServerTest`.
