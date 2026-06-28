"use client";

import { useState } from "react";

interface LandingPageProps {
  theme: "light" | "dracula";
  toggleTheme: () => void;
  onShowAuthModal: () => void;
}

export default function LandingPage({ theme, toggleTheme, onShowAuthModal }: LandingPageProps) {
  const [ghostSubs, setGhostSubs] = useState(2);
  const [avgCost, setAvgCost] = useState(15);
  
  const annualSavings = ghostSubs * avgCost * 12;

  return (
    <div className="min-h-screen bg-base-200">
      {/* Navbar for Landing */}
      <div className="navbar bg-base-100 shadow-sm fixed top-0 w-full z-50 px-4 md:px-8">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl gap-2 tracking-tight">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" className="w-8 h-8 rounded-lg" alt="logo" />
            SubScrapping
          </a>
        </div>
        <div className="flex-none gap-2">
          <button onClick={toggleTheme} className="btn btn-ghost btn-circle">
            {theme === "dracula" ? "☀️" : "🌙"}
          </button>
          <button onClick={onShowAuthModal} className="btn btn-primary btn-sm px-6 rounded-full shadow-sm">
            Sign In
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center py-20 mt-12">
          <div className="max-w-3xl">
            <div className="badge badge-primary badge-outline mb-4">v2.0 Beta Live</div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              Slice through your <span className="text-error">ghost</span> expenses.
            </h1>
            <p className="py-4 text-lg md:text-xl text-base-content/80 mb-8 max-w-2xl mx-auto">
              You subscribe, you forget, they feast on your wallet. Take back control with an automated tracker that uncovers every hidden subscription draining your accounts.
            </p>
            
            <button onClick={onShowAuthModal} className="btn btn-primary btn-lg rounded-full shadow-lg hover:scale-105 transition-transform px-12">
              Get Started Free
            </button>
            <p className="text-xs text-base-content/50 mt-4">No credit card required.</p>
          </div>
        </div>
      </div>

      {/* Calculator Section */}
      <div className="py-20 bg-base-100 border-t border-base-300">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">🧮 Calculate Your Hidden Savings</h2>
            <p className="text-base-content/70">Find out how much money you could be saving every year.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center bg-base-200 p-8 rounded-3xl shadow-sm border border-base-300">
            <div className="space-y-8">
              <div>
                <label className="flex justify-between mb-2 font-medium">
                  <span>Hidden subscriptions</span>
                  <span className="text-primary font-bold">{ghostSubs}</span>
                </label>
                <input type="range" min="1" max="10" value={ghostSubs} onChange={(e) => setGhostSubs(parseInt(e.target.value))} className="range range-primary" />
                <div className="w-full flex justify-between text-xs px-2 mt-1 text-base-content/50">
                  <span>1</span><span>10</span>
                </div>
              </div>
              <div>
                <label className="flex justify-between mb-2 font-medium">
                  <span>Average monthly cost</span>
                  <span className="text-primary font-bold">${avgCost}</span>
                </label>
                <input type="range" min="5" max="50" step="1" value={avgCost} onChange={(e) => setAvgCost(parseInt(e.target.value))} className="range range-primary" />
                <div className="w-full flex justify-between text-xs px-2 mt-1 text-base-content/50">
                  <span>$5</span><span>$50</span>
                </div>
              </div>
            </div>
            
            <div className="bg-base-100 rounded-2xl p-8 text-center shadow-sm border border-base-300 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
              <p className="text-base-content/60 font-medium uppercase tracking-widest text-sm mb-2">Potential Annual Savings</p>
              <h3 className="text-5xl md:text-6xl font-extrabold text-primary mb-4">${annualSavings}</h3>
              <p className="text-sm text-base-content/80">That's money going straight back into your pocket.</p>
            </div>
          </div>
        </div>
      </div>



      {/* Features / How it works */}
      <div className="py-24 bg-base-200">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-16 tracking-tight">⚙️ How SubScrapping works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md transition-shadow">
              <div className="card-body items-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-3xl mb-4 text-primary">📧</div>
                <h3 className="card-title text-xl">1. Connect Forwarding</h3>
                <p className="text-base-content/70">Forward your email receipts to our secure webhook, or add manually.</p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md transition-shadow">
              <div className="card-body items-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center text-3xl mb-4 text-secondary">🧠</div>
                <h3 className="card-title text-xl">2. AI Parsing</h3>
                <p className="text-base-content/70">Our engine extracts the service, price, and currency instantly.</p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md transition-shadow">
              <div className="card-body items-center">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-3xl mb-4 text-accent">📊</div>
                <h3 className="card-title text-xl">3. Unify Currency</h3>
                <p className="text-base-content/70">View all your global subscriptions converted accurately into USD.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trusted By Carousel */}
      <div className="py-20 bg-base-100 border-y border-base-300 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-base-100 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-base-100 to-transparent z-10 pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-6 text-center mb-12 relative z-20">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">🤝 Trusted by smart spenders</h2>
        </div>
        
        <div className="flex w-full overflow-hidden">
          <div className="flex animate-marquee opacity-50 grayscale hover:grayscale-0 transition-all duration-500 items-center gap-16 px-8">
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">FORBES</div>
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">TECHCRUNCH</div>
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">WIRED</div>
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">FAST COMPANY</div>
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">BLOOMBERG</div>
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">THE VERGE</div>
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">FORBES</div>
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">TECHCRUNCH</div>
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">WIRED</div>
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">FAST COMPANY</div>
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">BLOOMBERG</div>
            <div className="font-bold text-2xl tracking-widest whitespace-nowrap">THE VERGE</div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-24 bg-base-100">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-16">❤️ Loved by thousands</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card bg-base-200 border border-base-300 text-left">
              <div className="card-body">
                <div className="text-warning text-xl mb-4">★★★★★</div>
                <p className="italic text-base-content/80 mb-6">"I had no idea I was still paying for a gym membership from 2 years ago. SubScrapping found it immediately. Unbelievable app."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary">S</div>
                  <div>
                    <h4 className="font-bold text-sm">Sarah Jenkins</h4>
                    <p className="text-xs text-base-content/50">Saved $420/yr</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card bg-base-200 border border-base-300 text-left">
              <div className="card-body">
                <div className="text-warning text-xl mb-4">★★★★★</div>
                <p className="italic text-base-content/80 mb-6">"The currency conversion is a game changer. I buy software all over the world and finally have one dashboard that makes sense."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center font-bold text-secondary">M</div>
                  <div>
                    <h4 className="font-bold text-sm">Mark T.</h4>
                    <p className="text-xs text-base-content/50">Freelance Designer</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card bg-base-200 border border-base-300 text-left">
              <div className="card-body">
                <div className="text-warning text-xl mb-4">★★★★★</div>
                <p className="italic text-base-content/80 mb-6">"I just forward my emails and it does the rest. It's so effortless compared to manually entering everything in a spreadsheet."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center font-bold text-accent">J</div>
                  <div>
                    <h4 className="font-bold text-sm">Jessica L.</h4>
                    <p className="text-xs text-base-content/50">Saved $180/yr</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Privacy */}
      <div className="py-20 bg-base-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6 text-success text-4xl">
            🛡️
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-4">Bank-Level Security & Privacy</h2>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto mb-8">
            Your trust is our top priority. We built SubScrapping with privacy by design.
          </p>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="flex gap-4 items-start p-6 bg-base-100 rounded-2xl border border-base-300 shadow-sm">
              <div className="text-2xl mt-1">🔒</div>
              <div>
                <h4 className="font-bold mb-1">Receipts Only</h4>
                <p className="text-sm text-base-content/70">We never read your personal emails. You only forward us the specific receipts you want tracked.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-6 bg-base-100 rounded-2xl border border-base-300 shadow-sm">
              <div className="text-2xl mt-1">🔑</div>
              <div>
                <h4 className="font-bold mb-1">Encrypted Data</h4>
                <p className="text-sm text-base-content/70">All your financial data is encrypted at rest and in transit using industry-standard AES-256 encryption.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-24 bg-base-100">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-12 text-center tracking-tight">❓ Common Questions</h2>
          <div className="space-y-4">
            <div className="collapse collapse-arrow bg-base-200 border border-base-300">
              <input type="radio" name="my-accordion-2" defaultChecked /> 
              <div className="collapse-title text-lg font-medium">How does email forwarding work?</div>
              <div className="collapse-content text-base-content/80"> 
                <p>You can set up an auto-forwarding rule in Gmail or Outlook to send all receipts to a unique webhook URL we provide. We only process the receipts, never your personal emails.</p>
              </div>
            </div>
            <div className="collapse collapse-arrow bg-base-200 border border-base-300">
              <input type="radio" name="my-accordion-2" /> 
              <div className="collapse-title text-lg font-medium">Which currencies are supported?</div>
              <div className="collapse-content text-base-content/80"> 
                <p>We support over 160 global currencies. Exchange rates are updated daily so your unified dashboard is always perfectly accurate.</p>
              </div>
            </div>
            <div className="collapse collapse-arrow bg-base-200 border border-base-300">
              <input type="radio" name="my-accordion-2" /> 
              <div className="collapse-title text-lg font-medium">Is SubScrapping free?</div>
              <div className="collapse-content text-base-content/80"> 
                <p>Yes, tracking up to 10 subscriptions is completely free. We will introduce premium features for power users in the future.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer footer-center p-10 bg-base-300 text-base-content">
        <aside>
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" className="w-12 h-12 rounded-xl grayscale opacity-70 inline-block" alt="logo" />
          </div>
          <p className="font-bold">
            SubScrapping <br/>Killing ghost expenses since 2026
          </p> 
          <p>Copyright © 2026 - All right reserved</p>
        </aside> 
      </footer>
    </div>
  );
}
