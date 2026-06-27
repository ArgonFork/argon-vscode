interface Props {
  instanceName: string;
  className: string;
  iconUri: string | null;
  uniqueId: string;
}

const EMOJI_MAP: Record<string, string> = {
  Script: "📜", LocalScript: "📜", ModuleScript: "📦",
  RemoteEvent: "📡", RemoteFunction: "🔁",
  BindableEvent: "⚡", BindableFunction: "🔁",
  Part: "🧱", Model: "📁", Folder: "📂",
  TextBox: "✏️", ScrollingFrame: "📜",
  Sound: "🔊", Animation: "▶️",
  Players: "👤", Teams: "👥",
  HumanoidRootPart: "🧍",
};

function classEmoji(className: string): string {
  return EMOJI_MAP[className] ?? "⬛";
}

export function Header({ instanceName, className, iconUri, uniqueId }: Props) {
  return (
    <div className="header">
      {iconUri ? (
        <img className="cls-icon" src={iconUri} alt="" />
      ) : (
        <span className="cls-icon cls-emoji">{classEmoji(className)}</span>
      )}
      <span className="inst-name" title={instanceName}>{instanceName}</span>
      <span className="cls-name">{className}</span>
      {uniqueId && (
        <span className="inst-id" title={uniqueId}>
          #{uniqueId.slice(0, 8)}
        </span>
      )}
    </div>
  );
}
