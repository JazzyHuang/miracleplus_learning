import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                M
              </div>
              <span className="font-bold text-xl tracking-tight text-white">
                Miracle Learning
              </span>
            </Link>
            <p className="text-white/50 max-w-sm text-sm leading-relaxed">
              Empowering the next generation of AI founders and creators. 
              Join the community, master the tools, and navigate the future.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-6">Platform</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/dashboard/courses" className="text-sm text-white/50 hover:text-white transition-colors">
                  Courses
                </Link>
              </li>
              <li>
                <Link href="/dashboard/workshop" className="text-sm text-white/50 hover:text-white transition-colors">
                  Workshops
                </Link>
              </li>
              <li>
                <Link href="/dashboard/ai-tools" className="text-sm text-white/50 hover:text-white transition-colors">
                  AI Tools
                </Link>
              </li>
              <li>
                <Link href="/dashboard/discussions" className="text-sm text-white/50 hover:text-white transition-colors">
                  Community
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-6">Company</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/about" className="text-sm text-white/50 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/manifesto" className="text-sm text-white/50 hover:text-white transition-colors">
                  Manifesto
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-white/50 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-white/50 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Miracle Learning. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-white/40 hover:text-white transition-colors">
              <Twitter size={18} />
            </Link>
            <Link href="#" className="text-white/40 hover:text-white transition-colors">
              <Github size={18} />
            </Link>
            <Link href="#" className="text-white/40 hover:text-white transition-colors">
              <Linkedin size={18} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
