export default function QuestionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex">
      <main className="w-full flex justify-center">{children}</main>
    </div>
  );
}
