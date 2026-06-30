import { commands } from "vscode"
import { State } from "../state"
import { ViewportPanel } from "../viewportPanel"

export function openViewport(state: State) {
  return commands.registerCommand("argon.openViewport", () => {
    new ViewportPanel(state.context)
  })
}
