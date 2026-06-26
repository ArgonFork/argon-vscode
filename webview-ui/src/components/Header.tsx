interface Props {
  instanceName: string;
  className: string;
  iconUri: string | null;
  roplicaId: string;
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

export function Header({ instanceName, className, iconUri, roplicaId }: Props) {
  return (
    <div className="header">
      {iconUri ? (
        <img className="cls-icon" src={iconUri} alt="" />
      ) : (
        <span className="cls-icon cls-emoji">{classEmoji(className)}</span>
      )}
      <span className="inst-name" title={instanceName}>{instanceName}</span>
      <span className="cls-name">{className}</span>
      {roplicaId && (
        <span className="inst-id" title={`roplica id: ${roplicaId}`}>
          roplica id: {roplicaId}
        </span>
      )}
    </div>
  );
}
