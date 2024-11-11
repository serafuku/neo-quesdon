export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-[60%] flex">
      <main className="w-full flex justify-center">{children}</main>
    </div>
  );
}
