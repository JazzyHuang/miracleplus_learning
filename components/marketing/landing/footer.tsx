import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black py-12 md:py-16">
      <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-lg bg-white/10 p-1">
              <div className="h-full w-full rounded bg-white" />
            </div>
            <span className="font-bold text-white">MiraclePlus</span>
          </Link>
          <p className="mt-4 text-sm text-zinc-500 max-w-xs">
            致力于为创业者提供最优质的 AI 学习资源与实战平台。
          </p>
        </div>
        
        <div>
          <h4 className="font-medium text-white mb-4">平台</h4>
          <ul className="space-y-2 text-sm text-zinc-500">
            <li><Link href="/courses" className="hover:text-white transition-colors">课程</Link></li>
            <li><Link href="/ai-tools" className="hover:text-white transition-colors">AI 工具</Link></li>
            <li><Link href="/workshop" className="hover:text-white transition-colors">工作坊</Link></li>
            <li><Link href="/leaderboard" className="hover:text-white transition-colors">排行榜</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-white mb-4">关于</h4>
          <ul className="space-y-2 text-sm text-zinc-500">
            <li><Link href="#" className="hover:text-white transition-colors">关于我们</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">使用条款</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">隐私政策</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">联系我们</Link></li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-xs text-zinc-600">
        © 2026 MiraclePlus. All rights reserved.
      </div>
    </footer>
  );
}
