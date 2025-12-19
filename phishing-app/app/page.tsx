"use client";

import Link from "next/link";
import { ArrowRight, Shield, Zap, Users, Lock} from "lucide-react";
import { LinkedinLogo } from "@phosphor-icons/react";
import { GithubLogoIcon } from "@phosphor-icons/react";

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
              href="#home"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Home
            </Link>
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
              href="#about"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Meet The Devs
            </Link>
          </nav>

          {/* CTA Button */}
          <Link href="/app">
            <button className="text-[var(--primary-foreground)] cursor-pointer font-medium px-6 py-2.5 rounded-full transition-all duration-200 hover:scale-105 hover:shadow-lg" style={{ backgroundColor: 'var(--primary)' }}>
              Get Started
            </button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
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
              Create, analyze, and learn how phishing attacks can be formulated in a safe,
              controlled environment.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/app">
                <button className="group flex items-center justify-center gap-2 text-[var(--primary-foreground)] font-semibold px-8 py-4 rounded-full transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg" style={{ backgroundColor: 'var(--primary)' }}>
                  Try It Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>

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
            <p className="text-xl text-[var(--muted-foreground)] max-w-3xl mx-auto">
              Everything you need to understand and learn about email security threats
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
                  Input a Domain
                </h3>
                <p className="text-[var(--muted-foreground)]">
                  Find a domain to test and input its address.
                  This will be the target for the phishing simulation.
                </p>
              </div>
              <div className="hidden md:block absolute top-20 right-0 w-12 h-1 bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, transparent, var(--primary))` }}></div>
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
              <div className="hidden md:block absolute top-20 right-0 w-12 h-1 bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, transparent, var(--primary))` }}></div>
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

      {/* About Us Section */}
      <section id="about" className="py-24 md:py-32" style={{ backgroundColor: 'var(--card)' }}>
        <div className="max-w-6xl mx-auto px-6">

          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Meet The Devs
            </h2>
            <p className="text-xl text-[var(--muted-foreground)] max-w-3xl mx-auto">
              Learn a bit about the team behind PhishGuard and their different backgrounds.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Nikolas Vittorio
              </h2>
              <p className="text-lg text-[var(--muted-foreground)] mb-8 leading-relaxed">
                  Nikolas has just wrapped up his final year as a Computer Science student at RMIT University majoring in Cybersecurity, with a strong interest in offensive security and red teaming.
                  <br></br>
                  <br></br>
                  He holds the Practical Junior Penetration Tester (PJPT) certification from TCM Security and is currently pursuing the Certified Penetration Testing Specialist (CPTS)
                  <br></br>
                  <br></br>
                  With his background in Cybersecurity and a real passion for ethical hacking and cybersecurity education, he co-created PhishGuard alongside Kristijan.
              </p>
              <div className="flex gap-2 justify-start">
                <a
                  href="https://www.linkedin.com/in/nikolas-vittorio/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[var(--accent-foreground)] hover:text-[var(--accent)] transition-colors"
                  >
                  <LinkedinLogo size={28} weight="fill" />
                </a>
                <a
                  href="https://github.com/NikolasVittorio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[var(--accent-foreground)] hover:text-[var(--accent)] transition-colors"
                  >
                  <GithubLogoIcon size={28} weight="fill" />
                </a>
              </div>
            </div>


            <div className="rounded-lg p-2 border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="aspect-square rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
                <img 
                
                  src="https://media.licdn.com/dms/image/v2/D5603AQFaFiAHGH0S1w/profile-displayphoto-shrink_800_800/B56ZdTf2RoG0Ac-/0/1749452547793?e=1767830400&v=beta&t=fPREcxPcvvw2QQKCO5dGCzVeN-anfsg2i9sqqmx5nHI"
                  className="w-max h-max" 
                  style={{ color: 'var(--accent-foreground)' }} />
              </div>
            </div>

            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Kristijan Popordanoski
              </h2>
              <p className="text-lg text-[var(--muted-foreground)] mb-8 leading-relaxed">
                  Kristijan is a passionate full-stack developer skilled in building smooth and reliable end-to-end web
                  applications using modern frameworks like Node.js, React and .NET. 
                  <br></br>
                  <br></br>
                  The idea of being able to fashion a website capable of 
                  spreading awareness about how easily phishing attacks can be executed is what inspired him to partner up with Nikolas and create PhishGuard.
                  <br></br>
                  <br></br>
                  He has just completed his Bachelor's degree in Computer Science at RMIT University and is eager to work on more innovative projects like this one.      
              </p>
              <div className="flex gap-2 justify-start">
                <a
                  href="https://www.linkedin.com/in/kristijanpopordanoski/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[var(--accent-foreground)] hover:text-[var(--accent)] transition-colors"
                  >
                  <LinkedinLogo size={28} weight="fill" />
                </a>
                <a
                  href="https://github.com/KrisP-Kreme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[var(--accent-foreground)] hover:text-[var(--accent)] transition-colors"
                  >
                  <GithubLogoIcon size={28} weight="fill" />
                </a>
              </div>
            </div>

            <div className="rounded-lg p-2 border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="aspect-square rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
                <img 
                  src="https://media.licdn.com/dms/image/v2/D5603AQHgvXs3z9ctCA/profile-displayphoto-shrink_800_800/B56Zb3NGs4GoAc-/0/1747904130971?e=1767830400&v=beta&t=5YLtiwpVRPY-751QRlasSMIKyJ9iPCwV92TeVJmJWyo" 
                  className="w-max h-max" 
                  style={{ color: 'var(--accent-foreground)' }} />
              </div>
            </div>
            
          </div>
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
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--destructive-foreground)', opacity: 0.8 }}>
            <p>&copy; 2025 PhishGuard. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/app">                
                 Get Started
              </Link>
              <a href="https://github.com/KrisP-Kreme/phishing-for-fun" className="hover:text-[var(--destructive-foreground)] transition-colors">
                Project Repo
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
