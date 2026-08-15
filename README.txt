揪愛買冷凍現貨｜線上連線版 V2

這一版已直接連接你的 Supabase 專案：
- 客人端會即時讀取 public.products
- 只讀取 listing_status = listed 的商品
- stock_status = in_stock 顯示「尚有庫存」
- stock_status = sold_out 顯示「庫存已售完」
- 已下架商品不會顯示
- 手機優先，一排 2 個商品卡片
- 搜尋與分類篩選

這個版本只使用 Supabase Publishable key，不包含 Secret key。

目前尚未啟用店家網頁後台寫入功能。
在管理後台正式開放前，需要先完成：
1. Supabase Auth 管理員登入
2. authenticated 寫入 RLS policy
3. 商品圖片 Storage bucket 與上傳 policy

現在可以先部署這個客人端，確認 QR Code 開啟與資料同步。
