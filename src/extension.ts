import * as vscode from "vscode"
import * as path from "path"
import * as commands from "./commands"
import * as installer from "./installer"
import * as config from "./config"
import * as argon from "./argon"
import * as menu from "./menu"
import * as completion from "./completion"
import { updatePathVariable, getVersion } from "./util"
import { State } from "./state"
import { RestorableSession } from "./session"
import { openMenuError } from "./commands/openMenu"
import { InstanceTreeProvider, InstanceTreeItem } from "./instanceTree"
import { PropertiesViewProvider } from "./propertiesView"

const ERROR_MESSAGE =
  "Try running VS Code as an administrator or restarting your computer.\
 If the issue persists make sure your PATH variable is valid and points to the Argon CLI binary!"

let state: State

export async function activate(context: vscode.ExtensionContext) {
  console.log("Argon activated")

  updatePathVariable()

  let version = undefined
  try {
    version = getVersion()
  } catch {}

  if (version && config.autoUpdate()) {
    argon.update("all", true)
  } else if (!version) {
    try {
      await installer.install()
      version = getVersion()
    } catch (err) {
      return openMenuError(
        context,
        `Failed to install: ${err}. ${ERROR_MESSAGE}`,
      )
    }
  }

  state = new State(context, version)

  Object.values(commands).forEach((command) => {
    context.subscriptions.push(command(state))
  })

  state.show()

  if (config.autoRun()) {
    const lastSessions = context.workspaceState.get("lastSessions")

    if (Array.isArray(lastSessions)) {
      for (const lastSession of lastSessions) {
        const session = new RestorableSession(lastSession)

        if (session.isRestorable()) {
          menu.restoreSession(session, state)

          if (session.needsStudio() && config.autoLaunchStudio()) {
            argon.studio(true)
          }
        }
      }
    }
  }

  completion.start()
  config.loadGlobalConfig()

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("argon.globalConfig")) {
      config.saveGlobalConfig()
    }
  })

  // ─── Explorer + Properties ────────────────────────────────────────────────

  const instanceTree = new InstanceTreeProvider(context.extensionUri)
  const propertiesView = new PropertiesViewProvider(context.extensionUri)

  const instanceView = vscode.window.createTreeView("argon.instanceTree", {
    treeDataProvider: instanceTree,
    showCollapseAll: true,
  })

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PropertiesViewProvider.viewId,
      propertiesView,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  )

  instanceView.onDidChangeSelection((e) => {
    const item = e.selection[0]
    if (item instanceof InstanceTreeItem && item.isFolder) {
      propertiesView.show(item.label as string, item.className, item.metaJsonPath)
    } else if (item instanceof InstanceTreeItem && !item.isFolder) {
      propertiesView.clear()
      if (item.fsPath) {
        vscode.workspace
          .openTextDocument(item.fsPath)
          .then((doc) => vscode.window.showTextDocument(doc, vscode.ViewColumn.One, false))
      }
    }
  })

  context.subscriptions.push(
    vscode.commands.registerCommand("argon.showProperties", (item: InstanceTreeItem) => {
      if (item?.isFolder) {
        propertiesView.show(item.label as string, item.className, item.metaJsonPath)
      }
    }),
    vscode.commands.registerCommand("argon.refreshTree", () => {
      instanceTree.refresh()
    }),
    vscode.commands.registerCommand("argon.pickSrcFolder", async () => {
      const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri
      const picked = await vscode.window.showOpenDialog({
        defaultUri: wsRoot,
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Set as source folder",
      })
      if (!picked?.[0]) return
      const chosen = picked[0].fsPath
      const rel = wsRoot ? path.relative(wsRoot.fsPath, chosen) : chosen
      await vscode.workspace
        .getConfiguration("argon")
        .update("srcFolder", rel, vscode.ConfigurationTarget.Workspace)
      instanceTree.refresh()
      vscode.window.showInformationMessage(`Argon source folder: ${rel}`)
    }),
    instanceView,
  )

  const srcFolderRaw = vscode.workspace
    .getConfiguration("argon")
    .get<string>("srcFolder", "src")
  const srcFolderAbs = path.isAbsolute(srcFolderRaw)
    ? srcFolderRaw
    : path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "", srcFolderRaw)
  const srcWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.Uri.file(srcFolderAbs), "**")
  )
  srcWatcher.onDidCreate(() => instanceTree.refresh())
  srcWatcher.onDidDelete(() => instanceTree.refresh())
  srcWatcher.onDidChange(() => instanceTree.refresh())
  context.subscriptions.push(srcWatcher)
}

export function deactivate() {
  console.log("Argon deactivating")

  if (state) {
    state.cleanup()
  }
}
