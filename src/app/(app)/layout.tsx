import { requireSession } from "@/server/access";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSession();
  return children;
}
