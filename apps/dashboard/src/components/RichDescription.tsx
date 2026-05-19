"use client";

interface RichDescriptionProps {
  text: string;
  style?: React.CSSProperties;
  className?: string;
}

export function RichDescription({ text, style, className }: RichDescriptionProps) {
  return (
    <div className={className} style={style}>
      <p style={{ margin: 0 }}>{text}</p>
    </div>
  );
}
