import type { ReactNode } from "react";

interface WithChildren {
  children: ReactNode;
  className?: string;
}

export function Win98Window({ children, className = "" }: WithChildren) {
  return <section className={`win98-window ${className}`.trim()}>{children}</section>;
}

export function Win98TitleBar({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="win98-titlebar">
      <span className="win98-title-icon">▣</span>
      <strong>{title}</strong>
      <div className="win98-title-actions">
        {children}
        <span aria-hidden="true" className="win98-window-buttons">_ □ ×</span>
      </div>
    </header>
  );
}

export function Win98MenuBar({ items }: { items: string[] }) {
  return <nav className="win98-menubar">{items.map((item) => <span key={item}>{item}</span>)}</nav>;
}

export function Win98Toolbar({ items }: { items: string[] }) {
  return <div className="win98-toolbar-row">{items.map((item) => <button key={item} type="button"><i />{item}</button>)}</div>;
}

export function Win98GroupBox({ title, children, className = "" }: WithChildren & { title: string }) {
  return (
    <fieldset className={`win98-group ${className}`.trim()}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

export function Win98StatusBar({ items }: { items: string[] }) {
  return <footer className="win98-statusbar">{items.map((item) => <span key={item}>{item}</span>)}</footer>;
}
