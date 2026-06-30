import * as childProcess from "child_process"
import * as crypto from "crypto"

const STREAM_PORT = 7286

export class StreamDaemon {
  private process: childProcess.ChildProcess | null = null
  public readonly token = crypto.randomUUID()
  public port = STREAM_PORT

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.process = childProcess.spawn("argon-ex", [
        "stream",
        "--stream-token",
        this.token,
        "--port",
        String(STREAM_PORT),
      ])

      let resolved = false
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          this.stop()
          reject(new Error("Stream daemon did not start within 10s"))
        }
      }, 10_000)

      const onData = (data: Buffer) => {
        if (resolved) return
        const match = data.toString().match(/stream_port:(\d+)/)
        if (match) {
          resolved = true
          clearTimeout(timeout)
          this.port = parseInt(match[1], 10)
          resolve(this.port)
        }
      }

      this.process.stdout?.on("data", onData)
      this.process.stderr?.on("data", onData)

      this.process.on("error", (err) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          reject(err)
        }
      })

      this.process.on("close", (code) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          reject(new Error(`Stream daemon exited with code ${code ?? "null"}`))
        }
      })
    })
  }

  stop() {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }

  get isRunning() {
    return this.process !== null
  }
}
