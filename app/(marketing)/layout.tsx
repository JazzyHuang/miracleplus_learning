import { Navbar } from "@/components/marketing/landing/navbar";
import { Footer } from "@/components/marketing/landing/footer";
import { UserProvider } from "@/contexts/user-context";
import { getAuthUser, getUserProfileByAuthUser } from "@/lib/supabase/auth";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 服务端获取用户信息，避免客户端重复查询
  const authUser = await getAuthUser();
  const user = authUser ? await getUserProfileByAuthUser(authUser) : null;

  return (
    <UserProvider initialUser={user}>
      <div className="min-h-screen bg-black text-white selection:bg-white/30 selection:text-white font-sans">
        <Navbar />
        <main className="relative overflow-hidden">{children}</main>
        <Footer />
      </div>
    </UserProvider>
  );
}
