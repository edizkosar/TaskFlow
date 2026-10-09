import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    // Frosted bar: content scrolling underneath shows through, blurred.
    <header className="sticky top-0 z-20 flex h-13 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="transition-colors duration-200" />
      <Separator orientation="vertical" className="mr-1 opacity-60 data-vertical:h-4" />
      <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </header>
  );
}
