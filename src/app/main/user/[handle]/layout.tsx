export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full flex justify-center">
      <main className="flex">{children}</main>
    </div>
  );
}
