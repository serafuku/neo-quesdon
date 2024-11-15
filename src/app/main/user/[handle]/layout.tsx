export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="w-full flex justify-center">{children}</main>;
}
