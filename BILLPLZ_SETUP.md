# Billplz 支付集成 — 部署清单

代码已经写完，现在按下面 7 步把它跑起来。预计 15–20 分钟。

> **重要：你之前发给我的 3 个 key 不会进 git，也不会进任何代码文件。**
> 它们只会贴在 **Supabase Secrets** 里（加密，只有你的项目能读）。

---

## 第 1 步：在 Supabase 跑 SQL（给订单表加 3 列）

1. 打开 https://supabase.com/dashboard/project/gzuvbielelaefaelaxwt
2. 左边菜单 → **SQL Editor** → **+ New query**
3. 把根目录文件 **`billplz-schema.sql`** 的全部内容粘进去 → 点右下角 **Run**
4. 成功后回到 **Table Editor** → 点 `orders` 表 → 应该能看到右边多了 3 列：
   - `billplz_bill_id`
   - `payment_status`
   - `paid_at`

---

## 第 2 步：设 4 个 Secret（让 Edge Function 能读到 Billplz key）

1. Supabase 后台 → 左下角 **Project Settings** → **Edge Functions** → **Secrets**
2. 点 **+ Add new secret**，**一个一个**加这 4 个：

| Name | Value |
|---|---|
| `BILLPLZ_API_KEY` | `db1f8ad9-661b-43be-8530-4c5d5e2fc985` |
| `BILLPLZ_COLLECTION_ID` | `y5yllxx0` |
| `BILLPLZ_X_SIGNATURE_KEY` | `16d4f85650ab1d1b46e3f91eb36602749c3162e4054dd330321e5644133ace895341f3c5c0d914a5e49b80019f35e784f94f8b8e8e72a442c75578cf3ccbaa21` |
| `BILLPLZ_SANDBOX` | `true` |

> 以后切真账号时，只要把上面 4 个 secret 换成正式 Billplz 后台拿到的 key，再把 `BILLPLZ_SANDBOX` 改成 `false` 就行——代码一行都不用动。

---

## 第 3 步：部署 Edge Function ①「create-billplz-bill」

这个函数负责"开账单"——客人点付款时，前端调它，它去 Billplz 开账单，返回付款链接。

1. Supabase 后台 → 左边 **Edge Functions** → 右上 **Deploy a new function**
2. 选 **"Via Editor"**（在浏览器里直接写）
3. Function name: **`create-billplz-bill`**（**一字不差**，全小写，有横杠）
4. **Verify JWT with legacy secret**: ✅ **保持勾上**（默认）
5. 把根目录文件 **`supabase/functions/create-billplz-bill/index.ts`** 的全部内容粘进编辑器
6. 点 **Deploy function**
7. 等几秒，看到绿色 ✓ 就部署完了

---

## 第 4 步：部署 Edge Function ②「billplz-webhook」⚠️ 关键

这个函数负责"收 Billplz 通知"——客人付完款，Billplz 会偷偷 ping 这个 URL 告诉我们"这单付了"，函数把订单标记为 paid。

1. 再点 **Deploy a new function**
2. Function name: **`billplz-webhook`**（**一字不差**）
3. **Verify JWT with legacy secret**: ❌ **取消勾选！！** （Billplz 不会带 Supabase JWT 来；勾着的话 Billplz 调用会被拒绝）
4. 把 **`supabase/functions/billplz-webhook/index.ts`** 全部内容粘进去
5. 点 **Deploy function**

> 第 4 步那个 ❌ 关掉 JWT 验证是这个集成的"最容易踩坑点"。安全性由代码里的 **HMAC-SHA256 签名验证** 保证——伪造的 webhook 请求会被代码自己拒掉。

---

## 第 5 步：把前端推到 GitHub（自动部署到 Vercel）

我改了 3 个前端文件 + 加了 1 个 SQL 文件 + 2 个 Edge Function 文件。在你电脑的项目目录下：

```bash
git add billplz-schema.sql supabase/functions/create-billplz-bill supabase/functions/billplz-webhook checkout.html success.html admin.html
git commit -m "Billplz: integrate sandbox payment gateway"
git push
```

等 1–2 分钟，Vercel 会自动重新部署 codeofficial.vercel.app。

> 如果不会用命令，跟我说"帮我推"，我就用 Bash 帮你 commit + push。

---

## 第 6 步：在后台切换支付方式

1. 浏览器打开 https://codeofficial.vercel.app/admin.html
2. 用 admin 邮箱登录
3. 左侧 **设置 / Settings**
4. 找到 **支付方式 / Payment Gateway** 卡片
5. 点 **Billplz**（新加的第 4 个选项）
6. 下面会显示一条蓝色提示："当前为 Billplz：结账时自动通过 Edge Function 开账单跳转付款..."
7. 拉到底点 **保存设置**

---

## 第 7 步：端到端测试 🎉

1. 打开 https://codeofficial.vercel.app
2. 加任意商品到购物车 → 进结账页
3. 填地址、电话、邮箱（**邮箱用你注册 Billplz Sandbox 那个：`code.officialco@gmail.com`** —— 因为 sandbox 模式只让你给注册邮箱发账单通知）
4. 点 **Proceed to payment — RM xxx**
5. 浏览器会跳到 **www.billplz-sandbox.com/bills/xxxxx**
6. 在 Billplz 假付款页面选 **Test Bank A** （或任何 dummy bank）
7. 选 **Successful Transaction** → 点继续
8. 跳回 codeofficial.vercel.app/success.html，看到 ✓「Order Confirmed」+ 订单号
9. 回 Supabase Dashboard → Table Editor → `orders` → 你那笔订单的 `payment_status` 应该是 **`paid`**，`paid_at` 有时间戳，`billplz_bill_id` 有 bill ID

如果是 paid → 全流程通了 ✅

如果还是 pending → 说明 webhook 没跑通，**99% 是第 4 步的 JWT 没关掉**。回去检查 billplz-webhook 函数的 settings，把 Verify JWT 取消勾选，再 redeploy。

---

## 测试"取消付款"

第 7 步那里，选 **Failed Transaction**（或直接关掉 Billplz 标签页），看会不会回到 success.html 显示「Payment incomplete / 支付未完成」+ 一个「返回结账」按钮。回结账页，购物车应该还在（没清空）。

---

## 出问题怎么 debug

- **Supabase Edge Function 日志**：Supabase Dashboard → Edge Functions → 点函数名 → **Logs** tab —— 每次调用都有记录，错了能看到具体 error message
- **Billplz Bills 日志**：Billplz Sandbox 后台 → Billing → Bills —— 看你开过哪些账单、付款状态
- **浏览器 Console**：F12 → Console —— 前端错误都在这

---

切真账号上线时只需要做的事：
1. 在 Billplz **正式后台**（不是 sandbox）拿一套新的 API Key / Collection ID / X-Signature
2. 改 Supabase 4 个 Secret：用新 key，`BILLPLZ_SANDBOX` 改成 `false`
3. 不需要重新部署 Edge Function、不需要改代码、不需要 git push
