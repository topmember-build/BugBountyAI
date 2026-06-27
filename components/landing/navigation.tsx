"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { LogoMark } from "./logo";

const navLinks = [
  { name: "Agents", href: "#agents" },
  { name: "How it works", href: "#how-it-works" },
  { name: "Rewards", href: "#rewards" },
  { name: "Leaderboard", href: "#leaderboard" },
  { name: "Marketplace", href: "/agents" },
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    let mounted = true;

    const refreshUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!mounted) return;

        if (error) {
          console.warn('Supabase auth lookup failed:', error.message);
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!data.user);
        }
      } catch (error) {
        if (!mounted) return;
        console.warn('Supabase auth lookup skipped due to a transient error:', error instanceof Error ? error.message : error);
        setIsAuthenticated(false);
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    };

    refreshUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (!mounted) return;
      setIsAuthenticated(!!session?.user);
      setIsAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed z-50 transition-all duration-500 ${
        isScrolled 
          ? "top-4 left-4 right-4" 
          : "top-0 left-0 right-0"
      }`}
    >
      <nav 
        className={`mx-auto transition-all duration-500 ${
          isScrolled || isMobileMenuOpen
            ? "bg-background/80 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-lg max-w-[1200px]"
            : "bg-transparent max-w-[1400px]"
        }`}
      >
        <div 
          className={`flex items-center justify-between transition-all duration-500 px-6 lg:px-8 ${
            isScrolled ? "h-14" : "h-20"
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <LogoMark
              className={`transition-all duration-500 ${isScrolled ? "w-8 h-8" : "w-10 h-10"}`}
            />
            <span className={`font-display tracking-tight transition-all duration-500 ${isScrolled ? "text-xl" : "text-2xl"}`}>
              BugBounty<span className="text-primary">AI</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-12">
            {navLinks.map((link) => {
            const commonClass =
              "text-sm text-foreground/70 hover:text-foreground transition-colors duration-300 relative group"
            return link.href.startsWith("/") ? (
              <Link key={link.name} href={link.href} className={commonClass}>
                {link.name}
              </Link>
            ) : (
              <a
                key={link.name}
                href={link.href}
                className={commonClass}
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
              </a>
            )
          })}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {!isAuthLoading && (
              <Link
                href={isAuthenticated ? "/dashboard" : "/auth/login"}
                className={`text-foreground/70 hover:text-foreground transition-all duration-500 ${isScrolled ? "text-xs" : "text-sm"}`}
              >
                {isAuthenticated ? "Dashboard" : "Sign in"}
              </Link>
            )}
            <Button
              asChild
              size="sm"
              className={`bg-primary hover:bg-primary/90 text-primary-foreground rounded-full transition-all duration-500 ${isScrolled ? "px-4 h-8 text-xs" : "px-6"}`}
            >
              <Link href="/dashboard">Launch Audit</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

      </nav>
      
      {/* Mobile Menu - Full Screen Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-background z-40 transition-all duration-500 ${
          isMobileMenuOpen 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        }`}
        style={{ top: 0 }}
      >
        <div className="flex flex-col h-full px-8 pt-28 pb-8">
          {/* Navigation Links */}
          <div className="flex-1 flex flex-col justify-center gap-8">
            {navLinks.map((link, i) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-5xl font-display text-foreground hover:text-muted-foreground transition-all duration-500 ${
                  isMobileMenuOpen 
                    ? "opacity-100 translate-y-0" 
                    : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: isMobileMenuOpen ? `${i * 75}ms` : "0ms" }}
              >
                {link.name}
              </a>
            ))}
          </div>
          
          {/* Bottom CTAs */}
          <div className={`flex gap-4 pt-8 border-t border-foreground/10 transition-all duration-500 ${
            isMobileMenuOpen 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: isMobileMenuOpen ? "300ms" : "0ms" }}
          >
            <Button 
              asChild
              variant="outline" 
              className="flex-1 rounded-full h-14 text-base"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Link href={isAuthenticated ? "/dashboard" : "/auth/login"}>
                {isAuthenticated ? "Dashboard" : "Sign in"}
              </Link>
            </Button>
            <Button 
              asChild
              className="flex-1 bg-primary text-primary-foreground rounded-full h-14 text-base"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Link href="/dashboard">Launch Audit</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
