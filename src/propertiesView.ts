import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"

interface PropertyMap {
  [key: string]: unknown
}

interface PropDescriptor {
  type: string
  enumType?: string | null
  category?: string | null
  deprecated?: string | null
  writable?: boolean
  contentType?: string | null
  permits?: Record<string, string | null>
}

interface ReflectionCatalog {
  enums: Record<string, string[]>
  properties: Record<string, PropDescriptor>
  overrides: Record<string, Record<string, PropDescriptor>>
  classes: Record<string, string[]>
  superclasses: Record<string, string>
}

const ICON_PNG_SET = new Set([
  "Accoutrement","Actor","AdGui","AdPortal","AlignOrientation","AlignPosition",
  "AngularVelocity","Animation","ArcHandles","Atmosphere","Attachment",
  "Backpack","BallSocketConstraint","Beam","BillboardGui","BindableEvent",
  "BindableFunction","BloomEffect","BlurEffect","Bone","BoolValue",
  "BoxHandleAdornment","BrickColorValue","Camera","CFrameValue","Chat",
  "ChatInputBarConfiguration","ChatWindowConfiguration","ChorusSoundEffect",
  "ClickDetector","Color3Value","ColorCorrectionEffect","CompressorSoundEffect",
  "ConeHandleAdornment","Configuration","CornerWedgePart","CylinderHandleAdornment",
  "CylindricalConstraint","Debris","Decal","DepthOfFieldEffect","Dialog",
  "DialogChoice","DisabledBoneMesh","DistortionSoundEffect","EchoSoundEffect",
  "EqualizerSoundEffect","Explosion","Ext_BoneWithMesh","Ext_BoneWithPart",
  "Ext_DisabledBone","Ext_DisabledBonePart","Ext_Hinge","Ext_Windows",
  "FaceControls","Fire","Flag","FlagStand","FlangeSoundEffect","Folder",
  "ForceField","Frame","Handles","Hat","Highlight","HingeConstraint",
  "HopperBin","Humanoid","HumanoidDescription","ImageButton","ImageHandleAdornment",
  "ImageLabel","IntConstrainedValue","IntValue","Lighting","LinearVelocity",
  "LineForce","LineHandleAdornment","LocalizationService","LocalizationTable",
  "LocalScript","MaterialService","MaterialVariant","MeshPart","Model",
  "ModuleScript","Motor6D","NegateOperation","NetworkClient","NetworkReplicator",
  "NetworkServer","NoCollisionConstraint","NumberValue","ObjectValue","PackageLink",
  "Pants","Part","ParticleEmitter","PathfindingLink","PathfindingModifier",
  "PitchShiftSoundEffect","PlaneConstraint","Player","PlayerGui","Players",
  "PlayerScripts","PrismaticConstraint","ProximityPrompt","RayValue","RemoteEvent",
  "RemoteFunction","RenderingTest","ReplicatedFirst","ReplicatedStorage",
  "ReverbSoundEffect","RigidConstraint","RocketPropulsion","RodConstraint",
  "RopeConstraint","ScreenGui","Script","ScrollingFrame","Seat","SelectionBox",
  "SelectionPartLasso","ServerScriptService","ServerStorage","Shirt","ShirtGraphic",
  "Sky","Smoke","Sound","SoundGroup","SoundService","Sparkles","SpawnLocation",
  "SpecialMesh","SphereHandleAdornment","SpringConstraint","StandalonePluginScripts",
  "StarterCharacterScripts","StarterGear","StarterGui","StarterPack","StarterPlayer",
  "StarterPlayerScripts","StringValue","SunRaysEffect","SurfaceAppearance",
  "SurfaceGui","SurfaceSelection","Team","Teams","Terrain","TerrainDetail",
  "TestService","TextBox","TextButton","TextChannel","TextChatCommand",
  "TextChatService","TextLabel","TextSource","Texture","Tool","Torque",
  "TorsionSpringConstraint","Trail","TremoloSoundEffect","TrussPart",
  "UIAspectRatioConstraint","UICorner","UIGradient","UIGridLayout","UIListLayout",
  "UIPadding","UIPageLayout","UIScale","UISizeConstraint","UIStroke",
  "UITableLayout","UITextSizeConstraint","UnionOperation","UniversalConstraint",
  "Unknown","Vector3Value","VectorForce","VideoFrame","ViewportFrame",
  "VoiceChatService","WedgePart","Weld","WeldConstraint","WireframeHandleAdornment",
  "Workspace","WrapLayer","WrapLayerExt","WrapTarget","WrapTargetExt",
])

let catalogCache: { key: string; catalog: ReflectionCatalog } | undefined

function findReflectionCatalog(startDir: string): string | undefined {
  let dir = startDir
  for (;;) {
    const candidate = path.join(dir, ".argon", "reflection.json")
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

function loadReflectionCatalog(metaJsonPath?: string): ReflectionCatalog | undefined {
  const start = metaJsonPath
    ? path.dirname(metaJsonPath)
    : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!start) return undefined

  const catalogPath = findReflectionCatalog(start)
  if (!catalogPath) return undefined

  try {
    const mtime = fs.statSync(catalogPath).mtimeMs
    const key = `${catalogPath}:${mtime}`
    if (catalogCache?.key === key) return catalogCache.catalog
    const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as ReflectionCatalog
    catalogCache = { key, catalog }
    return catalog
  } catch {
    return undefined
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let nonce = ""
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return nonce
}

export class PropertiesViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "argon.propertiesView"

  private _view?: vscode.WebviewView
  private currentMetaPath: string | undefined
  private saveDebounce?: ReturnType<typeof setTimeout>
  private pendingShow?: { instanceName: string; className: string; metaJsonPath: string | undefined }

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "assets"),
        vscode.Uri.joinPath(this._extensionUri, "out", "webview"),
      ],
    }

    webviewView.webview.html = this.getWebviewContent(webviewView.webview)

    if (this.pendingShow) {
      const { instanceName, className, metaJsonPath } = this.pendingShow
      this.pendingShow = undefined
      this.show(instanceName, className, metaJsonPath)
    }

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.type === "save") {
        if (!this.currentMetaPath) return
        const metaPath = this.currentMetaPath
        clearTimeout(this.saveDebounce)
        this.saveDebounce = setTimeout(() => {
          try {
            fs.mkdirSync(path.dirname(metaPath), { recursive: true })
            // preserve top-level fields (className, keepUnknowns, etc.) and
            // only overwrite the properties sub-key
            let existing: Record<string, unknown> = {}
            if (fs.existsSync(metaPath)) {
              try { existing = JSON.parse(fs.readFileSync(metaPath, "utf8")) } catch {}
            }
            const merged = { ...existing, properties: msg.props }
            fs.writeFileSync(metaPath, JSON.stringify(merged, null, 2))
          } catch (e) {
            vscode.window.showErrorMessage(`argon: could not save meta.json - ${e}`)
          }
        }, 400)
      }
    })
  }

  show(instanceName: string, className: string, metaJsonPath: string | undefined): void {
    this.currentMetaPath = metaJsonPath

    const props: PropertyMap = (() => {
      if (!metaJsonPath || !fs.existsSync(metaJsonPath)) return {}
      try {
        const raw = JSON.parse(fs.readFileSync(metaJsonPath, "utf8"))
        return (raw.properties && typeof raw.properties === "object")
          ? (raw.properties as PropertyMap)
          : raw
      } catch {
        return {}
      }
    })()

    const iconUri =
      this._view && ICON_PNG_SET.has(className)
        ? this._view.webview
            .asWebviewUri(
              vscode.Uri.joinPath(
                this._extensionUri,
                "assets",
                "editor-icons",
                `${className}.png`
              )
            )
            .toString()
        : null

    const catalog = loadReflectionCatalog(metaJsonPath)

    if (this._view) {
      this._view.webview.postMessage({ type: "update", instanceName, className, props, iconUri, catalog })
      this._view.show(true)
    } else {
      this.pendingShow = { instanceName, className, metaJsonPath }
    }
  }

  clear(): void {
    this.currentMetaPath = undefined
    this._view?.webview.postMessage({ type: "clear" })
  }

  private getWebviewContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "index.js")
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "index.css")
    )
    const nonce = getNonce()
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${styleUri}">
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
  }
}
