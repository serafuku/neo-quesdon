export default function CollapseMenu({ text, id, children }: { text: string; id: string; children: React.ReactNode }) {
  return (
    <div className="w-full">
      <div className="collapse collapse-arrow bg-gray-50/70 dark:bg-slate-800/70 drop-shadow-md">
        <input type="checkbox" id={id} />
        <div className="collapse-title cursor-pointer font-thin dark:font-normal">{text}</div>
        <div className="collapse-content">{children}</div>
      </div>
    </div>
  );
}
