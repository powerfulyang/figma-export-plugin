# figma-export-plugin

一个为 Vite 开发服务器提供自动保存 SVG 图标功能的插件。它通常与 Figma 导出工具配合使用，允许用户通过 API 直接将导出的 SVG 内容写入到本地项目中。

## ✨ 特性

- 🚀 **无缝集成**：作为 Vite 开发服务器的中间件运行。
- 📦 **自动保存**：接收 SVG 内容并自动生成文件保存到指定目录。
- 🔍 **内容去重**：使用 SHA-256 哈希算法校验文件内容，避免生成重复的图标。
- 🛡️ **冲突处理**：自动处理文件名冲突，确保每次写入都是安全的。
- 🌐 **跨域友好**：原生支持 CORS，方便从不同的域（如 Figma 插件环境）发起请求。
- 🛠️ **高度可配置**：支持自定义存储路径、图标前缀和 API 路径。

## 📦 安装

```bash
# 使用 pnpm
pnpm add figma-export-plugin -D

# 使用 npm
npm install figma-export-plugin --save-dev

# 使用 yarn
yarn add figma-export-plugin -D
```

## 🚀 使用方法

在 `vite.config.ts` 中引入并配置插件：

```typescript
import { defineConfig } from 'vite'
import { AutoIconServerPlugin } from 'figma-export-plugin'

export default defineConfig({
  plugins: [
    AutoIconServerPlugin({
      // 图标存储目录，相对于项目根目录，默认为 'icons'
      iconPath: 'src/assets/icons',
      // 图标名称前缀，默认为 'i-custom-'
      prefix: 'i-custom-',
      // 接口路径，默认为 '/api/auto-icon'
      apiPath: '/api/auto-icon'
    })
  ]
})
```

## 🛠️ 配置选项

| 参数 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `iconPath` | `string` | `'icons'` | 图标存储的相对路径。如果目录不存在，插件会自动创建。 |
| `prefix` | `string` | `'i-custom-'` | 返回给前端的图标名称前缀，常用于配合 UnoCSS 或 Iconify 使用。 |
| `apiPath` | `string` | `'/api/auto-icon'` | 插件拦截的 API 接口地址。 |

## 📡 API 规范

### POST `/api/auto-icon`

**请求体 (JSON):**

```json
{
  "content": "<svg>...</svg>"
}
```

**响应 (JSON):**

- **写入成功 / 已存在相同内容:**

```json
{
  "success": true,
  "fileName": "random-name.svg",
  "icon": "i-custom-random-name",
  "message": "写入成功",
  "isDuplicate": true // 仅当检测到内容重复时返回
}
```

- **错误响应:**

```json
{
  "success": false,
  "message": "错误信息描述"
}
```

## 📄 开源协议

本项目基于 [ISC License](LICENSE) 协议开源。
