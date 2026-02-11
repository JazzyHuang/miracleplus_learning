import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-background border-t border-border pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-foreground font-bold text-lg">
                M
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground">
                Miracle Learning
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              Empowering the next generation of AI founders and creators. 
              Join the community, master the tools, and navigate the future.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-6">Platform</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/dashboard/courses" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Courses
                </Link>
              </li>
              <li>
                <Link href="/dashboard/workshop" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Workshops
                </Link>
              </li>
              <li>
                <Link href="/dashboard/ai-tools" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  AI Tools
                </Link>
              </li>
              <li>
                <Link href="/dashboard/discussions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Community
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-6">Company</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/manifesto" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Manifesto
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-foreground/30">
            © {new Date().getFullYear()} Miracle Learning. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-foreground/40 hover:text-foreground transition-colors">
              <Twitter size={18} />
            </Link>
            <Link href="#" className="text-foreground/40 hover:text-foreground transition-colors">
              <Github size={18} />
            </Link>
            <Link href="#" className="text-foreground/40 hover:text-foreground transition-colors">
              <Linkedin size={18} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
