import { BookOpen, CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Select } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

const HIGHLIGHTS = ['Student Management', 'Academic Excellence', 'Simplified Administration', 'Secure & Scalable'];

/** Book mark with the product line, shared by the public authentication screens. */
export function BrandMark({ brandName, inverted = false }: { brandName: string; inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BookOpen className={cn('size-8 shrink-0', inverted ? 'text-white' : 'text-primary')} aria-hidden />
      <div className="leading-tight">
        <p className={cn('text-lg font-bold', inverted ? 'text-white' : 'text-foreground')}>{brandName}</p>
        <p
          className={cn(
            'text-[0.625rem] font-semibold tracking-[0.12em] uppercase',
            inverted ? 'text-white/75' : 'text-muted-foreground',
          )}
        >
          School &amp; College ERP
        </p>
      </div>
    </div>
  );
}

/** Split layout for public authentication screens: campus brand panel (desktop) and the form. */
export function AuthLayout({ brandName, children }: { brandName: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-card">
      <aside className="bg-auth-campus relative hidden w-[42%] max-w-2xl overflow-hidden lg:block">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-navy/85 via-navy/70 to-navy/90" />
        <div className="relative flex h-full flex-col p-10 text-white xl:p-12">
          <BrandMark brandName={brandName} inverted />
          <div className="mt-auto mb-auto space-y-8">
            <p className="max-w-sm text-4xl leading-tight font-bold">Empowering Schools for a Brighter Tomorrow</p>
            <ul className="space-y-4 text-base font-medium">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CircleCheck className="size-5 shrink-0 text-white" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 p-6 sm:px-10">
          <div className="lg:invisible">
            <BrandMark brandName={brandName} />
          </div>
          <label className="sr-only" htmlFor="auth-language">
            Language
          </label>
          <Select id="auth-language" defaultValue="en" className="h-9 w-32">
            <option value="en">English</option>
          </Select>
        </header>
        <main id="main-content" className="flex flex-1 items-center justify-center px-6 pb-10 sm:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
