export default function CollapseMenu({ text, id, children }: { text: string; id: string; children: React.ReactNode }) {
  return (
    <div className="w-full">
      <div className="collapse collapse-arrow backdrop-brightness-105 drop-shadow-md dark:backdrop-brightness-75">
        <input type="checkbox" id={id} />
        <div className="collapse-title cursor-pointer font-thin dark:font-normal">{text}</div>
        <div className="collapse-content">{children}</div>
      </div>
    </div>
  );
}
