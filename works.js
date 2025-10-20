// 这是 Worker 的入口点
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 路由：根据请求路径和方法，执行不同操作
    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    } else if (request.method === 'GET' && url.pathname.startsWith('/')) {
      return handleServeImage(request, env);
    }

    return new Response('请求的路径或方法不正确。', { status: 404 });
  },
};

/**
 * 处理图片上传 (新版本：带身份验证和自动命名)
 * @param {Request} request - 传入的请求
 * @param {object} env - Worker 的环境变量，包含了我们的 R2 绑定和机密
 */
async function handleUpload(request, env) {
  try {
    // --- 新增：身份验证检查 ---
    const clientKey = request.headers.get('X-Auth-Key');
    // 和我们设置的机密变量进行比对 (已更正为 AUTH-SECRET-KEY)
    if (clientKey !== env['AUTH-SECRET-KEY']) {
      return new Response('身份验证失败。', { status: 401 });
    }
    // --- 验证结束 ---

    // 1. 解析传入的 JSON 数据
    const { base64 } = await request.json();
    if (!base64 || !base64.startsWith('data:image')) {
      return new Response('请求体中必须包含有效的 base64 图像数据。', { status: 400 });
    }

    // 2. 从 Base64 前缀中提取文件后缀
    const extension = getExtensionFromBase64(base64);
    if (!extension) {
        return new Response('无法从 Base64 数据中识别图片类型。', { status: 400 });
    }

    // 3. 自动生成一个唯一的文件名
    const uniqueFilename = `${crypto.randomUUID()}.${extension}`;

    // 4. 将 Base64 解码为二进制数据
    const imageBuffer = base64ToArrayBuffer(base64);
    if (!imageBuffer) {
        return new Response('无效的 Base64 编码。', { status: 400 });
    }
    
    // 5. 将二进制数据存入 R2
    await env['image-base-to-url'].put(uniqueFilename, imageBuffer, {
        httpMetadata: { contentType: `image/${extension}` },
    });

    // 6. 构建并返回公开访问的 URL
    const publicUrl = new URL(request.url).origin + '/' + uniqueFilename;
    
    return new Response(JSON.stringify({ 
        success: true, 
        url: publicUrl 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(`上传失败: ${error.message}`, { status: 500 });
  }
}

// ... handleServeImage 和辅助函数部分保持不变 ...

async function handleServeImage(request, env) {
  const url = new URL(request.url);
  const objectKey = url.pathname.slice(1);
  if (objectKey === '') {
    return new Response('Success', { status: 200 });
  }
  const object = await env['image-base-to-url'].get(objectKey);
  if (object === null) {
    return new Response('找不到指定的图片。', { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  return new Response(object.body, { headers });
}

function getExtensionFromBase64(base64String) {
    const match = base64String.match(/^data:image\/([a-zA-Z+]+);base64,/);
    return match ? match[1] : null;
}

function base64ToArrayBuffer(base64) {
    if (base64.includes(',')) {
        base64 = base64.split(',')[1];
    }
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
