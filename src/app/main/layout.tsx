import MainHeader from './_header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="w-full h-full flex justify-center">
        <MainHeader />
      </header>
      <main className="flex justify-center">{children}</main>
    </div>
  );
}
