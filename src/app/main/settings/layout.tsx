export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full flex">
      <main className="w-full flex justify-center">{children}</main>
    </div>
  );
}
