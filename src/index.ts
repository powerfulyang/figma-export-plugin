import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

interface Options {
  /** 图标存储目录，相对于项目根目录，默认为 'icons' */
  iconPath?: string
  /** 图标名称前缀，默认为 'i-custom-' */
  prefix?: string
  /** 接口路径，默认为 '/api/auto-icon' */
  apiPath?: string
}

export function AutoIconServerPlugin(options: Options = {}): Plugin {
  const iconDir = options.iconPath || 'icons'
  const prefix = options.prefix || 'i-custom-'
  const apiPath = options.apiPath || '/api/auto-icon'

  const getIconName = (name: string) => {
    return `${prefix}${name}`
  }

  // 辅助函数：计算内容哈希
  const getContentHash = (content: string): string => {
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  return {
    name: 'vite-plugin-auto-icon-server',
    configureServer(server: ViteDevServer) {
      const handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const requestUrl = req.url
        // 只拦截目标 API
        if (requestUrl !== apiPath) {
          return next()
        }

        // --- 1. 跨域处理 ---
        const origin = req.headers.origin || '*'
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
        res.setHeader('Access-Control-Allow-Credentials', 'true')

        // 处理预检请求 (Preflight)
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          return res.end()
        }

        // 辅助响应函数
        const sendJson = (data: Record<string, any>, code = 200) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        }

        // --- 2. 业务处理 ---
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })

          req.on('end', () => {
            try {
              if (!body) {
                return sendJson({ success: false, message: '请求体为空' }, 400)
              }

              const { content } = JSON.parse(body)
              // 随机 6 个字符
              const name = Math.random().toString(36).substring(2, 8)
              if (!content) {
                return sendJson({ success: false, message: 'name 和 content 不能为空' })
              }

              const targetDir = path.resolve(process.cwd(), iconDir)

              // 确保目录存在
              if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true })
              }

              // A. 计算当前上传内容的 Hash
              const currentHash = getContentHash(content)

              // B. 遍历现有文件检查内容（Hash 比对）
              const files = fs.readdirSync(targetDir)
              for (const file of files) {
                if (file.endsWith('.svg')) {
                  const filePath = path.join(targetDir, file)
                  const existingContent = fs.readFileSync(filePath, 'utf-8')
                  if (getContentHash(existingContent) === currentHash) {
                    // 内容完全一致，直接告知前端已存在，并返回已有文件名
                    return sendJson({
                      success: true,
                      message: '检测到相同内容文件，跳过写入',
                      fileName: file,
                      icon: getIconName(file.replace('.svg', '')),
                      isDuplicate: true,
                    })
                  }
                }
              }

              // C. 内容不同，检查文件名是否冲突
              let retryCount = 0
              let finalName = name
              let finalFileName = `${finalName}.svg`
              let finalFullPath = path.join(targetDir, finalFileName)

              while (fs.existsSync(finalFullPath) && retryCount < 10) {
                retryCount++
                finalName = Math.random().toString(36).substring(2, 8)
                finalFileName = `${finalName}.svg`
                finalFullPath = path.join(targetDir, finalFileName)
              }

              if (fs.existsSync(finalFullPath)) {
                return sendJson({
                  success: false,
                  message: `文件名 ${finalFileName} 已被占用，但内容不同，重试 10 次后仍然冲突。`,
                })
              }

              // D. 写入文件
              fs.writeFileSync(finalFullPath, content, 'utf-8')
              return sendJson({
                success: true,
                fileName: finalFileName,
                icon: getIconName(finalName),
                message: '写入成功',
              })
            }
            catch (e: any) {
              return sendJson({ success: false, message: e.message || '服务器内部错误' }, 500)
            }
          })
          return
        }

        // 非目标请求放行
        next()
      }

      // 使用 use 挂载中间件
      server.middlewares.stack.unshift({
        handle: handler,
        route: '',
      })
    },
  }
}
