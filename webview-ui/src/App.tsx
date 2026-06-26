import { useEffect, useRef, useState } from "react";
import { postMessage } from "./vscodeApi";
import { EmptyState } from "./components/EmptyState";
import { Header } from "./components/Header";
import { CategorySection } from "./components/CategorySection";
import { AttributesSection } from "./components/AttributesSection";
import { TagsSection } from "./components/TagsSection";
import { categorizeProps } from "./utils/categorize";
import type { ExtensionMessage, PropertyMap, ReflectionCatalog } from "./types";

type ViewState =
  | { empty: true }
  | {
      empty: false;
      instanceName: string;
      className: string;
      props: PropertyMap;
      iconUri: string | null;
      catalog: ReflectionCatalog | undefined;
    };

export function App() {
  const [view, setView] = useState<ViewState>({ empty: true });
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data as ExtensionMessage;
      if (msg.type === "update") {
        setView({
          empty: false,
          instanceName: msg.instanceName,
          className: msg.className,
          props: msg.props,
          iconUri: msg.iconUri,
          catalog: msg.catalog,
        });
      } else if (msg.type === "clear") {
        setView({ empty: true });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleChange = (key: string, value: unknown) => {
    if (view.empty) return;
    const newProps = { ...view.props, [key]: value };
    setView({ ...view, props: newProps });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () => postMessage({ type: "save", props: newProps }),
      400
    );
  };

  if (view.empty) return <EmptyState />;

  const { instanceName, className, props, iconUri, catalog } = view;
  const categories = categorizeProps(className, props, catalog);

  const allTags = Array.isArray(props.Tags) ? (props.Tags as string[]) : [];
  const roplicaId = (() => {
    const tag = allTags.find((t) => typeof t === "string" && t.startsWith("roplica_id@"));
    return tag ? tag.slice("roplica_id@".length) : "";
  })();
  const attrs = (props.Attributes && typeof props.Attributes === "object")
    ? (props.Attributes as Record<string, unknown>)
    : {};

  return (
    <div className="container" key={instanceName}>
      <Header
        instanceName={instanceName}
        className={className}
        iconUri={iconUri}
        roplicaId={roplicaId}
      />
      <div className="scroll">
        {categories.map(({ name, entries }) => (
          <CategorySection
            key={name}
            name={name}
            entries={entries}
            className={className}
            catalog={catalog}
            onChange={handleChange}
          />
        ))}
        <AttributesSection
          value={attrs}
          className={className}
          catalog={catalog}
          onChange={(v) => handleChange("Attributes", v)}
        />
        <TagsSection
          value={allTags}
          onChange={(v) => handleChange("Tags", v)}
        />
      </div>
    </div>
  );
}
