"use client";

import Link from "next/link";
import { ArrowRight, Shield, Zap, Users, Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--background)] text-[var(--foreground)] dark:text-[var(--foreground)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 dark:bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            <span className="text-2xl font-bold">
              PhishGuard
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#security"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Security
            </Link>
          </nav>

          {/* CTA Button */}
          <button className="text-[var(--primary-foreground)] font-medium px-6 py-2.5 rounded-full transition-all duration-200 hover:scale-105 hover:shadow-lg" style={{ backgroundColor: 'var(--primary)' }}>
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
        {/* Grid Pattern Background */}
        <div className="absolute inset-0 grid-pattern opacity-20"></div>

        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }}></span>
              AI-Powered Security Education
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              Learn Email Security Through{" "}
              <span style={{ color: 'var(--primary)' }}>
                Phishing Simulation
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl leading-relaxed mb-10 max-w-2xl text-[var(--muted-foreground)]">
              Understand phishing threats with our AI-driven educational platform.
              Create, analyze, and learn how to identify attacks in a safe,
              controlled environment.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/app">
                <button className="group flex items-center justify-center gap-2 text-[var(--primary-foreground)] font-semibold px-8 py-4 rounded-full transition-all duration-200 hover:scale-105 hover:shadow-lg" style={{ backgroundColor: 'var(--primary)' }}>
                  Start Learning Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <button className="flex items-center justify-center gap-2 border-2 font-semibold px-8 py-4 rounded-full transition-all duration-200" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                Learn More
              </button>
            </div>

            {/* Social Proof */}
            <div className="mt-14 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Trusted by security professionals and educators worldwide
              </p>
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    10K+
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Active Users
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    500+
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Organizations
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    99.9%
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Uptime
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32" style={{ backgroundColor: 'var(--card)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful Features for Modern Security
            </h2>
            <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
              Everything you need to teach and learn about email security threats
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="rounded-lg p-8 border hover:shadow-lg transition-shadow" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                AI-Powered Email Generation
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Generate realistic phishing emails using advanced AI. Learn what
                makes emails look legitimate and how to identify red flags.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg p-8 border hover:shadow-lg transition-shadow" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                Safe Learning Environment
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Practice identifying phishing attacks without any risk. Our
                isolated environment ensures complete safety and control.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg p-8 border hover:shadow-lg transition-shadow" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                Advanced Analytics
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Track your progress with detailed analytics. Understand patterns
                and improve your ability to spot threats over time.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-lg p-8 border hover:shadow-lg transition-shadow" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                Team Collaboration
              </h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Organize training sessions for your team. Share templates and
                track organizational security awareness growth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 md:py-32" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6" style={{ backgroundColor: 'var(--primary)' }}>
                  1
                </div>
                <h3 className="text-xl font-bold mb-3">
                  Create a Campaign
                </h3>
                <p className="text-[var(--muted-foreground)]">
                  Set up your phishing simulation campaign with customizable
                  templates or generate emails with AI.
                </p>
              </div>
              <div className="hidden md:block absolute top-20 right-0 w-12 h-1 bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, var(--primary), transparent)` }}></div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6" style={{ backgroundColor: 'var(--primary)' }}>
                  2
                </div>
                <h3 className="text-xl font-bold mb-3">
                  Analyze Results
                </h3>
                <p className="text-[var(--muted-foreground)]">
                  Get detailed insights into how users interact with emails and
                  identify vulnerable areas.
                </p>
              </div>
              <div className="hidden md:block absolute top-20 right-0 w-12 h-1 bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, var(--primary), transparent)` }}></div>
            </div>

            {/* Step 3 */}
            <div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6" style={{ backgroundColor: 'var(--primary)' }}>
                  3
                </div>
                <h3 className="text-xl font-bold mb-3">
                  Train & Improve
                </h3>
                <p className="text-[var(--muted-foreground)]">
                  Use insights to create targeted training and improve your
                  organization's security awareness.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24 md:py-32" style={{ backgroundColor: 'var(--card)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Enterprise-Grade Security
              </h2>
              <p className="text-lg text-[var(--muted-foreground)] mb-8 leading-relaxed">
                Your security is our priority. All simulations run in isolated
                environments with end-to-end encryption and strict compliance with
                industry standards.
              </p>

              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Shield className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: 'var(--primary)' }} />
                  <div>
                    <h4 className="font-semibold">
                      ISO 27001 Certified
                    </h4>
                    <p className="text-[var(--muted-foreground)] text-sm">
                      Industry-standard security practices
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Lock className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: 'var(--primary)' }} />
                  <div>
                    <h4 className="font-semibold">
                      End-to-End Encryption
                    </h4>
                    <p className="text-[var(--muted-foreground)] text-sm">
                      All data protected with military-grade encryption
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: 'var(--primary)' }} />
                  <div>
                    <h4 className="font-semibold">
                      GDPR Compliant
                    </h4>
                    <p className="text-[var(--muted-foreground)] text-sm">
                      Fully compliant with data protection regulations
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="rounded-lg p-8 border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="aspect-square rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
                <Lock className="w-24 h-24" style={{ color: 'var(--accent-foreground)', opacity: 0.5 }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32" style={{ backgroundColor: 'var(--primary)' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--primary-foreground)] mb-6">
            Ready to Strengthen Your Security?
          </h2>
          <p className="text-xl text-[var(--primary-foreground)] mb-10 max-w-2xl mx-auto" style={{ opacity: 0.9 }}>
            Join thousands of organizations already using PhishGuard to train their
            teams and reduce security risks.
          </p>
          <button className="inline-flex items-center gap-2 text-[var(--primary)] font-bold px-8 py-4 rounded-full transition-all duration-200 hover:scale-105 hover:shadow-lg" style={{ backgroundColor: 'var(--primary-foreground)' }}>
            Get Started For Free
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-[var(--muted-foreground)] border-t" style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6" style={{ color: 'var(--secondary)' }} />
                <span className="font-bold text-lg">PhishGuard</span>
              </div>
              <p className="text-sm" style={{ opacity: 0.8 }}>
                AI-powered email security education platform.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                    Security
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--destructive-foreground)', opacity: 0.8 }}>
            <p>&copy; 2025 PhishGuard. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                Twitter
              </Link>
              <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                LinkedIn
              </Link>
              <Link href="#" className="hover:text-[var(--destructive-foreground)] transition-colors">
                GitHub
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
