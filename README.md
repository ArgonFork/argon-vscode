<div align='center'>
  <img alt='Argon' src='assets/banner.png'>
  <b>Full featured tool for Roblox development</b>
</div>

# Argon VS Code

Argon Visual Studio Code extension is just a wrapper of the [Argon CLI](https://github.com/argon-rbx/argon) with a user-friendly UI.

## Visit [argon.wiki](https://argon.wiki/) to learn more!

Or follow one of these direct links to:

- [Install](https://argon.wiki/docs/installation) Argon
- [Get Started](https://argon.wiki/docs/category/getting-started) with Argon
- Learn about Argon [Commands](https://argon.wiki/docs/category/commands)
- Explore the Argon [API](https://argon.wiki/api/project)
- Follow the latest [Changes](https://argon.wiki/changelog/argon)

---

## Development

See [`../README.md`](../README.md) for full monorepo dev guide and `../dev-build.sh`.

### Quick setup

```bash
# From argon/ root (one-time)
./dev-build.sh setup    # symlinks this dir into ~/.vscode/extensions/argon-dev
./dev-build.sh cli      # builds + installs argon CLI to ~/.local/bin/argon
./dev-build.sh vscode   # builds webview + extension, reload VS Code when done
```

### Hot reload

```bash
# Terminal 1
cd argon-vscode && node_modules/.bin/webpack --watch --mode development

# Terminal 2
cd argon-vscode/webview-ui && node_modules/.bin/vite build --watch
```

- Extension TS change → `Ctrl+Shift+P` → **Developer: Reload Window**
- Webview TSX change → `Ctrl+Shift+P` → **Developer: Reload Webviews**

### Source layout

```
src/
  extension.ts        Activation, wires all providers + commands
  instanceTree.ts     Explorer tree view (reads argon.srcFolder on disk)
  propertiesView.ts   Properties webview sidebar (reads/writes meta.json)
  state.ts            Session manager + status bar
  argon.ts            CLI wrapper
  commands/           Command handlers (serve, stop, exec, …)
  menu/               QuickPick menu system

webview-ui/src/
  App.tsx             Root component, handles extension ↔ webview messages
  components/         Header, CategorySection, PropertyRow, input widgets
  utils/categorize.ts Groups properties by category using reflection catalog
  utils/math.ts       CFrame/Vector math helpers
```

### Configuration

| Key | Default | Description |
|---|---|---|
| `argon.srcFolder` | `src` | Source folder shown in Explorer view |
| `argon.autoUpdate` | `true` | Auto-update CLI on launch |
| `argon.autoRun` | `true` | Auto-serve last project on launch |

### Reflection catalog

The Properties panel shows typed inputs (color picker, number, enum dropdown, etc.) when a reflection catalog is present at `.argon/reflection.json` in the workspace root. Without it, all properties fall back to plain text inputs.
