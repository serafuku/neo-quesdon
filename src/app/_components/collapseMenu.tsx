export default function CollapseMenu({ text, id, children }: { text: string; id: string; children: React.ReactNode }) {
  return (
    <div className="w-full">
      <div className="collapse collapse-arrow backdrop-brightness-105">
        <input type="checkbox" id={id} />
        <div className="collapse-title cursor-pointer font-thin">{text}</div>
        <div className="collapse-content">{children}</div>
      </div>
    </div>
  );
}
