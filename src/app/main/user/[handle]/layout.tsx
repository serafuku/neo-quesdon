export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-[60%] flex">
      <main className="flex justify-center">{children}</main>
    </div>
  );
}
