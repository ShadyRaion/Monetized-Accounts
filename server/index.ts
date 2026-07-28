import dotenv from 'dotenv'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(rootDir, '.env.local'), override: false, quiet: true })
dotenv.config({ path: path.join(rootDir, '.env'), override: false, quiet: true })

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = Number.parseInt(process.env.PORT || '3000', 10)
const nextModule = await import('next')
const nextCreateServer = (nextModule.default as unknown as (opts: any) => any)
const nextApp = nextCreateServer({ dev, hostname, port })
const handle = nextApp.getRequestHandler()

await nextApp.prepare()

const { default: apiApp } = await import('./api/index.ts')
const app = express()
app.use('/api', apiApp)
app.use((req, res) => handle(req, res))

app.listen(port, hostname, () => {
  console.log(`Full-stack server is running at http://${hostname}:${port}`)
})