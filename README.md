# Đêm Làng 8.9.3

Chế độ **Bàn chơi** giữ cách chơi một máy. Chế độ **Chơi nhiều máy** dành cho một quản trò và 5–24 người chơi, mỗi người dùng trình duyệt của mình. Người chơi họp mặt trực tiếp và cần kết nối Internet tới phòng.

## Chạy và triển khai trên Cloudflare

Cài Node.js 22 trở lên. Giải nén ZIP, mở terminal ở thư mục có `wrangler.jsonc` và chạy:

```sh
node check.mjs
npx wrangler dev
```

Mở địa chỉ Wrangler in ra để thử trên máy. Khi triển khai:

```sh
npx wrangler login
npx wrangler deploy
```

Gửi cho nhóm địa chỉ Worker sau khi triển khai. Nếu dùng GitHub, đưa toàn bộ thư mục đã giải nén lên repo và kết nối repo với Cloudflare Workers Builds. Đặt thư mục gốc nơi chứa `wrangler.jsonc` và dùng lệnh triển khai `npx wrangler deploy`. GitHub Pages chỉ phục vụ được thư mục `public/` cho chế độ một máy. Để chơi nhiều máy, mở địa chỉ Worker.

## Điều hành ván

1. Quản trò vào **Chơi nhiều máy → Tạo phòng**, rồi sao chép link hoặc hiển thị QR để cả nhóm quét. Người chơi vào bằng link hoặc nhập mã phòng 3 chữ số và tên.
2. Quản trò chọn bộ vai gợi ý hoặc tìm và chọn từng vai. Khi đủ vai, bấm **Chia vai**. Máy chủ xáo vai. Mỗi người xác nhận riêng tư để mở thẻ và có thể đọc luật chi tiết.
3. Kiểm tra từng người đã mở thẻ, rồi mở bảng quản trò. Dùng mục **Thông báo và bỏ phiếu trên điện thoại** để mở lượt, xem ai đã gửi, nhập hộ, khóa và công bố kết quả. Quản trò quyết định người bị loại. Kỹ năng vẫn thực hiện trực tiếp tại bàn.
4. Nếu đóng tab, mở **Chơi nhiều máy → Khôi phục phiên** từ cùng trình duyệt. Để đổi điện thoại, quản trò mở **Phòng → Chuyển máy** cạnh tên người chơi và gửi link riêng. Link dùng một lần, hết hạn sau 5 phút và thay thế quyền truy cập của máy cũ. Nhật ký chi tiết của quản trò được lưu trong trình duyệt quản trò.
5. Phòng hết hạn sau 24 giờ. Mã ba số chỉ dùng để tìm phòng. Quyền quản trò và quyền xem thẻ dùng khóa riêng. Phiên phòng tạo trên bản mã 12 ký tự không mở được bằng giao diện mới.

## Thử phòng với bot

Trong phòng chờ, quản trò mở **Người chơi → Thêm bot**. Mỗi lần bấm thêm một chỗ, tính vào giới hạn 24 chỗ. Bot được chia vai và tự đánh dấu đã mở thẻ. Dùng **Nhập hộ** để bỏ phiếu cho bot.

## Chờ ván sau

Người đến khi đã chia vai có thể nhập mã phòng 3 số hoặc mở link mời để giữ chỗ. Họ tự vào danh sách khi quản trò chọn **Chơi ván tiếp theo** và được chia vai cùng cả nhóm. Người chờ có thể rời phòng chờ, quản trò có thể bỏ chỗ chờ. Phòng có tối đa 24 chỗ tính cả người chơi và người chờ.

## Bảng xếp hạng trong phòng

Khi công bố kết quả, chọn tất cả người thắng. Mỗi người được cộng một trận thắng, kể cả người đã bị loại nhưng thắng cùng phe. Với ván hòa, đánh dấu **Ván hòa**. Người có cùng số trận thắng đồng hạng, và bảng hiển thị số ván đã tham gia. Quản trò chọn **Chơi ván tiếp theo** để giữ phòng, chỗ ngồi và bảng điểm. Các thẻ được chia lại cho ván mới. Bảng điểm kết thúc khi phòng hết hạn.

## Chơi trên một máy

Mở `public/Ma-Soi-Dem-Lang-Offline.html` trực tiếp, hoặc vào mục **Bàn chơi** trên bản đã triển khai. Bản tải offline chạy trong một file; phòng nhiều máy cần máy chủ Cloudflare riêng.


### Nâng cấp 8.9.1

- Trong **Bộ vai**, nút **Bổ sung** thêm các vai Sói và Dân làng theo số chỗ thiếu, đồng thời giữ các vai đã chọn.
- Dùng **Chuyển quản trò** ở phòng chờ hoặc bảng điều hành. Máy mới mở link trong 5 phút, nhận bộ vai đang chỉnh và trạng thái ván nếu đang chơi. Máy cũ mất quyền điều hành sau khi chuyển. Tạm dừng thao tác trước khi gửi link. Nếu nhật ký vượt giới hạn kích thước, giao diện báo lỗi và quyền vẫn ở máy cũ.
- Dùng **Tải bảng điểm CSV** trong bảng xếp hạng sau khi có kết quả. Thời điểm phòng hết hạn hiện cạnh thông tin phòng.
