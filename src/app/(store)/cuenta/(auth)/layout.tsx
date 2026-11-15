import { Container } from "@/components/ui/misc";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute -right-24 top-0 h-full w-48 skew-x-[-20deg] bg-acma/10" aria-hidden />
      <div className="absolute -right-4 top-0 h-full w-1.5 skew-x-[-20deg] bg-acma/60" aria-hidden />
      <Container className="relative flex justify-center py-14 sm:py-20">
        <div className="w-full max-w-md rounded-2xl border border-line bg-carbon p-6 shadow-2xl sm:p-8">{children}</div>
      </Container>
    </div>
  );
}
