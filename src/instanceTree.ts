import * as vscode from "vscode"
import * as path from "path"

// ─── Class -> icon ────────────────────────────────────────────────────────────

const ICON_FILES = new Set([
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

const FALLBACK_ICONS: Record<string, string> = {
  HumanoidRootPart: "person",
}

export function iconForClass(
  className: string,
  extensionUri: vscode.Uri
): vscode.Uri | vscode.ThemeIcon {
  if (ICON_FILES.has(className)) {
    return vscode.Uri.joinPath(extensionUri, "assets", "editor-icons", `${className}.png`)
  }
  return new vscode.ThemeIcon(FALLBACK_ICONS[className] ?? "symbol-namespace")
}

// ─── Tree item ────────────────────────────────────────────────────────────────

export class InstanceTreeItem extends vscode.TreeItem {
  metaJsonPath?: string

  constructor(
    label: string,
    public readonly className: string,
    extensionUri: vscode.Uri,
    public readonly fsPath?: string,
    public readonly isFolder?: boolean,
    dedupeId?: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed)
    this.iconPath = iconForClass(className, extensionUri)
    this.contextValue = isFolder ? "folderInstance" : "scriptInstance"
    this.description = dedupeId ? `${className} | ID: ${dedupeId}` : className

    if (fsPath) {
      this.resourceUri = vscode.Uri.file(fsPath)
      if (isFolder) {
        this.metaJsonPath = path.join(fsPath, "init.meta.json")
        this.command = {
          command: "argon.showProperties",
          title: "Show Properties",
          arguments: [this],
        }
      } else {
        this.command = {
          command: "vscode.open",
          title: "Open",
          arguments: [this.resourceUri],
        }
      }
    }
  }
}

// ─── Instance tree provider ──────────────────────────────────────────────────

export class InstanceTreeProvider
  implements vscode.TreeDataProvider<InstanceTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<InstanceTreeItem | undefined>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  constructor(private readonly extensionUri: vscode.Uri) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined)
  }

  private srcPath(): string | undefined {
    const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    if (!wsRoot) return undefined

    const configured = vscode.workspace
      .getConfiguration("argon")
      .get<string>("srcFolder", "src")
    return path.isAbsolute(configured)
      ? configured
      : path.join(wsRoot, configured)
  }

  private readInitMeta(dirPath: string): { className: string; originalName?: string; roplicaId?: string } {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs")
    const metaPath = path.join(dirPath, "init.meta.json")
    try {
      const raw = JSON.parse(fs.readFileSync(metaPath, "utf8"))
      const className = typeof raw.className === "string" ? raw.className : "Folder"
      const originalName = typeof raw.originalName === "string" ? raw.originalName : undefined
      const tags: unknown[] = Array.isArray(raw.properties?.Tags) ? raw.properties.Tags : []
      const roplicaTag = tags.find((t): t is string => typeof t === "string" && t.startsWith("roplica_id@"))
      const roplicaId = roplicaTag ? roplicaTag.slice("roplica_id@".length) : undefined
      return { className, originalName, roplicaId }
    } catch {
      return { className: "Folder" }
    }
  }

  private dirHasInstanceChildren(dirPath: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs")
    let entries: import("fs").Dirent[]
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true })
    } catch {
      return false
    }
    return entries.some((entry) => {
      if (entry.name.endsWith(".meta.json") || entry.name.startsWith("$.")) return false
      if (entry.isDirectory()) return true
      if (entry.name.startsWith("init.")) return false
      return entry.name.endsWith(".luau") || entry.name.endsWith(".lua")
    })
  }

  private readDir(dirPath: string): InstanceTreeItem[] {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs")
    let entries: import("fs").Dirent[]
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true })
    } catch {
      return []
    }

    return entries.flatMap((entry) => {
      const fullPath = path.join(dirPath, entry.name)

      // skip argon metadata and internal files
      if (entry.name.endsWith(".meta.json")) return []
      if (entry.name.startsWith("$.")) return []

      if (entry.isDirectory()) {
        const { className, originalName, roplicaId } = this.readInitMeta(fullPath)
        const displayName = originalName ?? entry.name
        const item = new InstanceTreeItem(displayName, className, this.extensionUri, fullPath, true)
        if (roplicaId) item.description = `#${roplicaId.slice(0, 8)}`
        item.collapsibleState = this.dirHasInstanceChildren(fullPath)
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
        return [item]
      }

      if (
        entry.name === "init.luau" ||
        entry.name === "init.server.luau" ||
        entry.name === "init.client.luau"
      ) {
        return []
      }

      if (entry.name.endsWith(".luau") || entry.name.endsWith(".lua")) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs") as typeof import("fs")
        const stem = entry.name
          .replace(/\.server\.luau$/, "")
          .replace(/\.client\.luau$/, "")
          .replace(/\.luau$/, "")
          .replace(/\.lua$/, "")

        const className = entry.name.includes(".server.")
          ? "Script"
          : entry.name.includes(".client.")
          ? "LocalScript"
          : "ModuleScript"

        let displayName = stem
        const sidecar = path.join(dirPath, `${stem}.meta.json`)
        try {
          const raw = JSON.parse(fs.readFileSync(sidecar, "utf8"))
          if (typeof raw.originalName === "string") displayName = raw.originalName
        } catch { /* no sidecar or no originalName — use stem */ }

        const item = new InstanceTreeItem(displayName, className, this.extensionUri, fullPath, false)
        item.collapsibleState = vscode.TreeItemCollapsibleState.None
        return [item]
      }

      return []
    })
  }

  getTreeItem(element: InstanceTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(
    element?: InstanceTreeItem
  ): vscode.ProviderResult<InstanceTreeItem[]> {
    const dirPath = element ? element.fsPath : this.srcPath()
    if (!dirPath) return []
    return this.readDir(dirPath)
  }
}
