import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="transition-premium hover:opacity-80">
          <Logo size="md" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link 
            to="/recursos" 
            className="text-body-sm text-muted-foreground hover:text-foreground transition-premium animate-underline"
          >
            Recursos
          </Link>
          <Link 
            to="/precos" 
            className="text-body-sm text-muted-foreground hover:text-foreground transition-premium animate-underline"
          >
            Preços
          </Link>
          <Link 
            to="/sobre" 
            className="text-body-sm text-muted-foreground hover:text-foreground transition-premium animate-underline"
          >
            Sobre
          </Link>
          <Link 
            to="/contato" 
            className="text-body-sm text-muted-foreground hover:text-foreground transition-premium animate-underline"
          >
            Contato
          </Link>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/entrar">Entrar</Link>
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link to="/precos">Começar agora</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu size={20} />
        </Button>
      </div>

      {/* Mobile Menu */}
      <div className={cn(
        "md:hidden glass border-t border-border/50 overflow-hidden transition-all duration-300",
        mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
      )}>
        <nav className="container py-4 flex flex-col gap-4">
          <Link 
            to="/recursos" 
            className="text-body-md text-muted-foreground hover:text-foreground transition-premium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Recursos
          </Link>
          <Link 
            to="/precos" 
            className="text-body-md text-muted-foreground hover:text-foreground transition-premium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Preços
          </Link>
          <Link 
            to="/sobre" 
            className="text-body-md text-muted-foreground hover:text-foreground transition-premium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Sobre
          </Link>
          <Link 
            to="/contato" 
            className="text-body-md text-muted-foreground hover:text-foreground transition-premium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Contato
          </Link>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link to="/entrar">Entrar</Link>
            </Button>
            <Button variant="default" size="sm" className="flex-1" asChild>
              <Link to="/precos">Começar agora</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
