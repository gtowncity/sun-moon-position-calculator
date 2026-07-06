interface RetroStatusBarProps {
  items: string[];
}

export function RetroStatusBar({ items }: RetroStatusBarProps) {
  return (
    <footer className="retro-statusbar">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </footer>
  );
}
