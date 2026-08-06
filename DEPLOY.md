# Hướng dẫn triển khai thật (dùng tài khoản Supabase + Google của khách hàng)

Tài liệu này dùng khi chuyển từ môi trường phát triển/test (đang dùng tài khoản Supabase và Google
của bên làm dev) sang môi trường thật, chạy trên tài khoản Supabase và Google Cloud **của khách hàng**.

---

## 0. Chuẩn bị

Cần khách hàng cung cấp hoặc tự thao tác trên:
- 1 tài khoản Supabase (supabase.com) — miễn phí là đủ dùng cho quy mô ~20 tài xế.
- 1 tài khoản Google (để tạo Google Cloud Project cấp OAuth Client ID cho đăng nhập).
- Domain/địa chỉ sẽ deploy web (Vercel, hoặc nơi khác).

---

## 1. Tạo Supabase project mới (thuộc tài khoản khách hàng)

1. Đăng nhập [supabase.com](https://supabase.com) bằng tài khoản khách hàng → **New Project**.
2. Đặt tên project, chọn vùng (Region) gần Việt Nam nhất (Singapore) để tốc độ tốt hơn.
3. Đợi project khởi tạo xong → vào **Project Settings → API**, lưu lại 2 giá trị:
   - **Project URL** (dạng `https://xxxxxxxx.supabase.co`)
   - **anon / publishable key**

## 2. Chạy migration để tạo schema (bảng dữ liệu)

Vào **SQL Editor** trong Supabase Dashboard, chạy **lần lượt theo đúng thứ tự** 6 file trong
thư mục `supabase/migrations/` của repo:

1. `0001_init.sql` — tạo toàn bộ bảng gốc (tài khoản, chấm công, danh mục...)
2. `0002_seed.sql` — chèn dữ liệu mẫu (danh mục size/hãng tàu/tác nghiệp + **3 tài khoản demo + dữ
   liệu chấm công giả**)
3. `0003_reports_and_shift.sql` — bổ sung ca làm việc, phân loại đảo chuyển, ghi chú, bảng đối soát
4. `0004_auth_email.sql` — thêm cột `email` để đăng nhập Google
5. `0005_equipment_types.sql` — thêm danh mục "Thiết Bị Sử Dụng" (loại xe tài xế điều khiển, vd
   R39/RC54) và cột `equipment_code` trên bảng chấm công
6. `0006_container_types.sql` — thêm danh mục "Loại Container" (Lạnh/Khô/Hở mái) và cột
   `container_type_code` trên bảng chấm công

> ⚠️ **Quan trọng về `0002_seed.sql`**: file này có 2 phần khác nhau:
> - Phần **danh mục** (size, loại tác nghiệp, hãng tàu) — **nên giữ lại**, dùng làm điểm khởi đầu,
>   khách hàng có thể sửa/thêm sau qua màn hình Thiết Lập Hệ Thống.
> - Phần **tài khoản demo + dữ liệu chấm công mẫu** (Vũ Xuân Tuyên, Nguyễn Văn Mạnh, Trần Quốc Bảo,
>   `ketoan`, `admin`, cùng ~20 dòng chấm công giả) — đây là **dữ liệu test, không phải của khách
>   hàng thật**. Sau khi chạy xong 4 migration, dọn phần này bằng SQL Editor:
>   ```sql
>   delete from job_entries;
>   delete from report_reconciliations;
>   delete from profiles where username in ('tuyen.vx','manh.nv','bao.tq','ketoan','admin');
>   ```
>   (Nếu trong lúc test bạn đã tạo thêm tài khoản/dữ liệu khác qua giao diện, dọn luôn cho sạch
>   trước khi bàn giao.)

## 3. Tạo tài khoản thật cho khách hàng

Vẫn tạm dùng **chế độ dev** (xem mục 6) để đăng nhập lần đầu bằng 1 tài khoản admin, việc đơn giản
nhất là chèn thẳng 1 dòng admin qua SQL Editor để có tài khoản vào được hệ thống lần đầu:

```sql
insert into profiles (username, full_name, role, email)
values ('admin', 'Tên quản trị viên thật', 'admin', 'email-that-cua-khach@gmail.com');
```

Sau đó **toàn bộ tài khoản còn lại** (tài xế, kế toán) tạo qua giao diện web:
**Thiết Lập Hệ Thống → Người Dùng → Thêm**, nhớ điền đúng **Email Gmail** cho từng người (bắt buộc
để đăng nhập Google) — hoặc gán/sửa sau bằng icon bút chì ở cột Email Gmail.

## 4. Tạo Google Cloud Project mới (thuộc tài khoản Google của khách hàng)

1. Đăng nhập [console.cloud.google.com](https://console.cloud.google.com) bằng tài khoản Google
   của khách hàng → tạo **New Project**.
2. Vào **APIs & Services → OAuth consent screen**:
   - User Type: **External**
   - Điền App name, support email, developer contact (email của khách hàng)
   - Lưu qua các bước, **không cần** thêm scope đặc biệt
3. Vào **Audience** → mục **Test users** → **Add users** → thêm **Gmail của tất cả tài khoản** sẽ
   dùng hệ thống (đúng các email đã gán ở bước 3). App ở trạng thái "Testing" chỉ những email trong
   danh sách này mới đăng nhập được — với quy mô nội bộ ~20 người, **không cần Publish App**, cứ để
   Testing và thêm đủ test users là dùng lâu dài được.
4. Vào **Clients → Create client**:
   - Application type: **Web application**
   - **Authorized redirect URIs** → thêm: `https://<PROJECT_URL_SUPABASE_MOI>.supabase.co/auth/v1/callback`
     (lấy đúng Project URL đã lưu ở bước 1)
   - Tạo xong → lưu lại **Client ID** và **Client Secret**

## 5. Bật đăng nhập Google trong Supabase (project mới)

1. Supabase Dashboard → **Authentication → Sign In / Providers** → tìm **Google** → bật **Enable**.
2. Dán **Client ID** và **Client Secret** từ bước 4 → **Save**.
3. Vào **Authentication → URL Configuration**:
   - **Site URL**: domain thật sẽ deploy (VD: `https://cham-cong.vercel.app` hoặc domain riêng)
   - **Redirect URLs**: thêm domain thật + `/login` (VD: `https://cham-cong.vercel.app/login`)
     (thêm cả `http://localhost:3000/login` nếu vẫn cần test local sau này)

## 6. Cấu hình biến môi trường khi deploy

Trên nơi deploy (Vercel → Project Settings → Environment Variables), đặt:

| Tên biến | Giá trị |
|---|---|
| `VITE_SUPABASE_URL` | Project URL Supabase mới (bước 1) |
| `VITE_SUPABASE_ANON_KEY` | anon/publishable key mới (bước 1) |
| `VITE_AUTH_MODE` | `real` |

Đặt `VITE_AUTH_MODE=real` sẽ **khoá hẳn về đăng nhập Google**, ẩn luôn màn hình chọn chế độ và lối
vào chế độ dev — đúng như yêu cầu "sau này sẽ xóa chức năng dev": không cần sửa code, chỉ cần biến
môi trường này.

File `.env` ở máy dev hiện tại (đang trỏ vào Supabase/Google của bạn) **không dùng cho bản deploy
thật** — chỉ dùng để bạn tiếp tục test cục bộ. Trên Vercel phải khai báo lại 3 biến ở trên trỏ đúng
vào project Supabase/Google **của khách hàng**.

## 7. Deploy

Repo đã có sẵn `vercel.json` (rewrite cho SPA), chỉ cần:
1. Kết nối repo GitHub với Vercel (hoặc deploy thủ công `vercel --prod`).
2. Đảm bảo 3 biến môi trường ở bước 6 đã khai báo trên Vercel **trước khi build**.
3. Deploy.

## 8. Kiểm tra sau khi deploy

- [ ] Vào domain thật → phải vào thẳng màn hình "Đăng nhập bằng Google" (không thấy màn hình chọn
      chế độ hay danh sách tài khoản mock)
- [ ] Đăng nhập bằng đúng 1 email đã gán cho admin → vào đúng Bảng Điều Khiển
- [ ] Thử đăng nhập bằng 1 Gmail **chưa** được gán → phải bị từ chối với thông báo rõ ràng
- [ ] Tạo thử 1 tài xế mới qua Thiết Lập Hệ Thống, gán email, đăng nhập thử bằng Gmail đó → vào
      đúng màn hình DriverView
- [ ] Kiểm tra dữ liệu demo đã được dọn sạch (mục 2) — Bảng Điều Khiển không còn dữ liệu test

---

## Ghi chú bảo mật còn tồn đọng (đã trao đổi trước đó, chưa xử lý)

Việc chuyển sang đăng nhập Google giải quyết vấn đề **"đăng nhập giả, ai cũng vào được"**, nhưng
**chưa** giải quyết việc Row Level Security (RLS) trên Supabase đang mở hoàn toàn (bất kỳ ai cầm
được `anon key` — vốn luôn lộ trong mã nguồn frontend — vẫn gọi thẳng API Supabase để đọc/sửa/xoá
mọi dữ liệu, không qua đăng nhập). Nên làm tiếp trước khi chính thức vận hành dữ liệu thật quan
trọng: viết lại RLS policy theo vai trò (tài xế chỉ đọc/ghi được dữ liệu của mình, chỉ admin ghi
được bảng tài khoản/danh mục), dựa trên `auth.uid()` giờ đã có sẵn qua đăng nhập Google thật.
