# Base64-To-Url

本项目主要是通过利用CloudFlare 的Pages 以及 R2储存库，实现Base64到Url的转换。
<br>

------

## 🚀Cloudflare R2 安全图像上传服务 ##

一个轻量、安全、高性能的 Cloudflare Worker 服务，用于接收 Base64 编码的图片数据，将其存储到 Cloudflare R2 存储桶，并返回公开访问的 URL。

该服务利用 Cloudflare 的全球网络，实现零出口费用（Zero Egress Fee）的图片存储和高速分发。  
  
  
### ✨主要特性

安全认证 (Secret Key)：所有上传请求必须在 Header 中携带预设的密钥（X-Auth-Key），确保只有授权用户才能上传。

零出口费用 (R2)：利用 Cloudflare R2 存储桶的优势，无需担心图片流量分发的成本。

自动文件命名：使用 crypto.randomUUID() 自动生成全球唯一的文件名，防止文件冲突和被猜测。

自动文件类型识别：根据 Base64 前缀自动识别图片类型（如 png, jpeg, gif 等），并设置正确的 Content-Type。

高速分发：图片通过 Cloudflare 全球 CDN 分发，实现极低延迟。  
  
  

### 🛠️ 部署步骤（Cloudflare Dashboard 部署）

您无需安装任何本地工具，即可通过 Cloudflare 控制台快速部署此服务。

1. 创建 R2 存储桶

登录 Cloudflare Dashboard。

导航到 R2，点击 Create bucket。

存储桶名称： 命名为 image-base-to-url（此名称必须精确匹配代码中的绑定变量）。

2. 创建 Worker 服务并部署代码

导航到 Workers & Pages，点击 Create application -> Create Worker。

服务名称： 命名一个您喜欢的名称，例如 r2-image-uploader。

点击 Edit code，将项目中的完整 Worker.js 代码粘贴进去。

点击 Save and Deploy。

3. 配置 R2 绑定

将 Worker 连接到您创建的 R2 存储桶。

在 Worker 编辑器界面，进入 Settings 选项卡。

在左侧菜单中，选择 Variables。

在 R2 Bucket Bindings 部分，点击 Add binding：

Variable name (变量名): `image-base-to-url`

R2 Bucket (R2 存储桶): 从下拉菜单中选择您创建的 R2 存储桶。

点击 Save。

4. 配置秘密密钥

设置用于认证上传的密钥。

在同一个 Variables 页面，找到 Secrets 部分。

点击 Add secret：

Secret name (密钥名称): `AUTH-SECRET-KEY`

Value (值): 输入一个高强度的密钥字符串（这是您的上传密码）。

点击 Add。  
  

### 💻 API 使用说明

您的 Worker 部署成功后，将提供两个 API 接口：

1. 图片上传接口 (Upload Image)

用于上传 Base64 编码的图片并返回 URL。

属性值描述URL[Your_Worker_URL]/upload方法POSTHeaderContent-Type: application/json必须HeaderX-Auth-Key: YOUR_SECRET_KEY必需。 您在配置步骤中设置的密钥，用于身份验证。Body (JSON){"base64": "data:image/png;base64,..."}Base64 字符串必须包含 data:image/...;base64, 前缀。

成功响应 (200 OK):

```JSON 
  { "success": true, "url": "https://[Your_Worker_URL]/[unique_file_id].png" } 
```

错误响应 (401 Unauthorized):

身份验证失败。 

2. 图片访问接口 (Serve Image)

用于通过 URL 访问已上传的图片。

属性值描述URL[Your_Worker_URL]/[unique_file_id].[ext]

例如：`https://example.workers.dev/a1b2c3d4-e5f6-7890-abcd-ef0123456789.png`

方法GET响应返回图片文件本身。允许公开访问。

⚠️ 安全与注意事项

保护密钥： AUTH-SECRET-KEY 是您服务的最高安全保障，请务必使用强密钥，并确保其安全。

请求限制： 由于此服务不包含 IP 限制，上传接口理论上可能受到恶意请求的滥用。如果您发现请求量异常，可以考虑在 Worker 代码中添加速率限制或 IP 白名单功能。

配置同步： 如果更改了代码中的 R2 绑定名称（image-base-to-url）或密钥变量名称（AUTH-SECRET-KEY），请务必同步更新 Cloudflare Dashboard 中的对应配置。
