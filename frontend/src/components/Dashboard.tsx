"use client";

import { useState, useEffect, useMemo } from "react";
import { User, Subscription, ExchangeRates, getSubscriptions, getExchangeRates, deleteSubscription, convertAmount, formatCurrency } from "../app/api";
import AddSubModal from "./AddSubModal";
import EditSubModal from "./EditSubModal";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle, Plus, LogOut, Calendar, Activity, ArrowUpDown, Filter, Edit2, Trash2, Mail, Copy, BookOpen } from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";
import TutorialModal from "./TutorialModal";

interface DashboardProps {
  user: User;
  theme: "light" | "dracula";
  toggleTheme: () => void;
  onLogout: () => void;
}

export default function Dashboard({ user, theme, toggleTheme, onLogout }: DashboardProps) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [subToEdit, setSubToEdit] = useState<Subscription | null>(null);
  const [subToDelete, setSubToDelete] = useState<Subscription | null>(null);
  
  const [sortField, setSortField] = useState<"merchant" | "amount" | "next_payment">("amount");
  const [sortDesc, setSortDesc] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  const BASE_CURRENCY = "USD";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedSubs, fetchedRates] = await Promise.all([
          getSubscriptions(),
          getExchangeRates(),
        ]);
        setSubs(fetchedSubs);
        setRates(fetchedRates);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = (sub: Subscription) => {
    setSubToDelete(sub);
  };

  const confirmDelete = async () => {
    if (!subToDelete) return;
    const id = subToDelete.id;
    setSubToDelete(null);
    try {
      await deleteSubscription(id);
      setSubs(subs.filter((s) => s.id !== id));
      // Optional: native toast could be added here, for now it just silently succeeds beautifully
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete subscription.");
    }
  };

  const handleEditCompleted = (updatedSub: Subscription) => {
    setSubs(subs.map(s => s.id === updatedSub.id ? updatedSub : s));
  };

  const getCategory = (merchant: string) => {
    const name = merchant.toLowerCase();
    if (name.includes("netflix") || name.includes("spotify") || name.includes("hulu") || name.includes("disney") || name.includes("youtube") || name.includes("hbo")) {
      return "Entertainment";
    }
    if (name.includes("adobe") || name.includes("github") || name.includes("aws") || name.includes("figma") || name.includes("openai") || name.includes("notion") || name.includes("google")) {
      return "Software";
    }
    if (name.includes("gym") || name.includes("internet") || name.includes("phone") || name.includes("verizon") || name.includes("att")) {
      return "Utilities";
    }
    return "Other";
  };

  const getCategoryForSub = (sub: Subscription) => {
    if (sub.category) return sub.category;
    return getCategory(sub.merchant);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "Entertainment": return "badge-secondary badge-outline";
      case "Software": return "badge-primary badge-outline";
      case "Utilities": return "badge-accent badge-outline";
      default: 
        // Generate a pseudo-random but consistent hue for custom categories
        let hash = 0;
        for (let i = 0; i < category.length; i++) {
          hash = category.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        // In tailwind/daisyUI it's hard to use dynamic arbitrary colors for standard badge classes.
        // We will just return a ghost badge, but inject a style below.
        return "badge-ghost border-base-300";
    }
  };

  const getCustomBadgeStyle = (category: string) => {
    if (["Entertainment", "Software", "Utilities"].includes(category)) return {};
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return { borderColor: `hsl(${hue}, 70%, 50%)`, color: `hsl(${hue}, 70%, 50%)` };
  };

  const userCategories = useMemo(() => {
    const cats = new Set<string>();
    subs.forEach(s => {
      const cat = getCategoryForSub(s);
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [subs]);

  const calculateTotalMonthlySpend = () => {
    if (!rates) return 0;
    let total = 0;
    subs.forEach((s) => {
      let amount = convertAmount(s.amount, s.currency, BASE_CURRENCY, rates);
      if (s.cycle === "yearly") amount = amount / 12;
      total += amount;
    });
    return total;
  };

  const getDuplicateAlerts = () => {
    const nameCount: Record<string, number> = {};
    subs.forEach(s => {
      const normalized = s.merchant.toLowerCase().trim();
      nameCount[normalized] = (nameCount[normalized] || 0) + 1;
    });
    const duplicates = Object.keys(nameCount).filter(k => nameCount[k] > 1);
    if (duplicates.length > 0) {
      return `Ghost Alert: You have ${duplicates.length} duplicate subscription(s) for: ${duplicates.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}. Do you need both?`;
    }
    return null;
  };

  const calculateLifetimeSpend = (sub: Subscription): number | null => {
    if (!sub.start_date) return null;
    const start = new Date(sub.start_date);
    const now = new Date();
    
    if (start > now) return 0; // If start date is in the future
  
    let cycles = 0;
    if (sub.cycle === "yearly") {
      cycles = now.getFullYear() - start.getFullYear();
      if (now.getMonth() < start.getMonth() || (now.getMonth() === start.getMonth() && now.getDate() < start.getDate())) {
        cycles--;
      }
      cycles = Math.max(0, cycles) + 1; 
    } else if (sub.cycle === "monthly") {
      cycles = (now.getFullYear() - start.getFullYear()) * 12;
      cycles -= start.getMonth();
      cycles += now.getMonth();
      if (now.getDate() < start.getDate()) {
        cycles--;
      }
      cycles = Math.max(0, cycles) + 1; 
    } else if (sub.cycle === "weekly") {
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
      cycles = Math.floor(diffDays / 7) + 1;
    }
    
    return cycles * sub.amount;
  };

  const getChartData = () => {
    if (!rates) return [];
    const aggregated: Record<string, number> = {};
    subs.forEach(s => {
      let amount = convertAmount(s.amount, s.currency, BASE_CURRENCY, rates);
      if (s.cycle === "yearly") amount = amount / 12;
      const key = getCategoryForSub(s);
      aggregated[key] = (aggregated[key] || 0) + amount;
    });
    return Object.keys(aggregated).map(key => ({
      name: key,
      value: parseFloat(aggregated[key].toFixed(2))
    })).sort((a, b) => b.value - a.value);
  };

  const chartData = getChartData();
  const COLORS = ['#FF6B6B', '#4ECDC4', '#F9D56E', '#45B7D1'];

  const upcomingBills = [...subs]
    .filter(s => s.next_payment)
    .sort((a, b) => new Date(a.next_payment!).getTime() - new Date(b.next_payment!).getTime())
    .slice(0, 4);

  const ghostAlertMessage = getDuplicateAlerts();

  // Filter and Sort Logic
  const filteredAndSortedSubs = useMemo(() => {
    let result = [...subs];
    
    // Filter
    if (filterCategory !== "All") {
      result = result.filter(s => getCategoryForSub(s) === filterCategory);
    }

    // Sort
    result.sort((a, b) => {
      let valA, valB;
      
      if (sortField === "merchant") {
        valA = a.merchant.toLowerCase();
        valB = b.merchant.toLowerCase();
      } else if (sortField === "amount") {
        valA = convertAmount(a.amount, a.currency, BASE_CURRENCY, rates || {} as any);
        valB = convertAmount(b.amount, b.currency, BASE_CURRENCY, rates || {} as any);
      } else {
        valA = a.next_payment ? new Date(a.next_payment).getTime() : 0;
        valB = b.next_payment ? new Date(b.next_payment).getTime() : 0;
      }

      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });

    return result;
  }, [subs, filterCategory, sortField, sortDesc, rates]);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-sm sticky top-0 z-40 px-4 md:px-8">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl gap-2 tracking-tight">
            <img src="/icon-192.png" className="w-8 h-8 rounded-lg" alt="logo" />
            <span className="hidden sm:inline">SubScrapping</span>
          </a>
        </div>
        <div className="flex-none gap-2">
          <button onClick={toggleTheme} className="btn btn-ghost btn-circle">
            {theme === "dracula" ? "☀️" : "🌙"}
          </button>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar border border-base-300">
              <div className="w-9 rounded-full">
                <img alt="Profile picture" src={user.picture} referrerPolicy="no-referrer" />
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-200">
              <li className="menu-title px-4 py-2">
                <span>Signed in as <strong>{user.name}</strong></span>
              </li>
              <li><button onClick={onLogout} className="text-error font-semibold"><LogOut className="w-4 h-4 mr-1"/>Sign out</button></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        
        {/* Ghost Alert */}
        {ghostAlertMessage && (
          <div className="alert alert-warning shadow-sm rounded-2xl mb-8 flex items-start text-warning-content border border-warning/20">
            <AlertTriangle className="mt-1" />
            <div>
              <h3 className="font-bold">Optimization Opportunity</h3>
              <div className="text-sm">{ghostAlertMessage}</div>
            </div>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-base-content/70">Overview of your active subscriptions</p>
          </div>
          <button className="btn btn-primary shadow-sm rounded-full px-6" onClick={() => setShowAddModal(true)}>
            <Plus className="w-5 h-5 mr-1" /> Add Manual Sub
          </button>
        </div>

        {/* Grid Layout for Stats, Charts and Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Column 1: Stats */}
          <div className="lg:col-span-1 space-y-6 flex flex-col">
            <div className="stats stats-vertical shadow-sm bg-base-100 w-full border border-base-200 rounded-2xl flex-1">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <Activity className="w-8 h-8 opacity-50" />
                </div>
                <div className="stat-title uppercase tracking-widest font-semibold text-xs">Monthly Spend</div>
                <div className="stat-value text-primary mt-1 text-4xl">
                  {loading || !rates ? (
                    <span className="loading loading-dots loading-sm"></span>
                  ) : (
                    formatCurrency(calculateTotalMonthlySpend(), BASE_CURRENCY)
                  )}
                </div>
                <div className="stat-desc mt-1">Converted to {BASE_CURRENCY}</div>
              </div>
              
              <div className="stat border-t border-base-200">
                <div className="stat-figure text-secondary">
                  <Calendar className="w-8 h-8 opacity-50" />
                </div>
                <div className="stat-title uppercase tracking-widest font-semibold text-xs">Active Services</div>
                <div className="stat-value text-secondary mt-1 text-4xl">
                  {loading ? <span className="loading loading-dots loading-sm"></span> : subs.length}
                </div>
                <div className="stat-desc mt-1">Across all tracked emails</div>
              </div>
            </div>
          </div>

          {/* Column 2: Chart */}
          <div className="lg:col-span-1 bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6 flex flex-col items-center justify-center min-h-[300px]">
            <h3 className="font-bold text-lg mb-2 w-full text-left tracking-tight">Spend by Category</h3>
            {loading ? (
              <span className="loading loading-spinner text-primary loading-lg"></span>
            ) : chartData.length > 0 ? (
              <div className="w-full h-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(Number(value) || 0, BASE_CURRENCY)}
                      contentStyle={{ backgroundColor: 'var(--fallback-b1,oklch(var(--b1)))', color: 'var(--fallback-bc,oklch(var(--bc)))', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: 'var(--fallback-bc,oklch(var(--bc)))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-base-content/50 text-sm flex flex-col items-center py-8">
                <Activity className="w-8 h-8 mb-2 opacity-30"/>
                No data to chart
              </div>
            )}
          </div>

          {/* Column 3: Timeline */}
          <div className="lg:col-span-1 bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6">
            <h3 className="font-bold text-lg mb-4 tracking-tight">Upcoming Bills</h3>
            {loading ? (
               <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary"></span></div>
            ) : upcomingBills.length > 0 ? (
              <ul className="steps steps-vertical h-full w-full">
                {upcomingBills.map((sub, idx) => {
                  const daysUntil = Math.ceil((new Date(sub.next_payment!).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                  const isSoon = daysUntil <= 3 && daysUntil >= 0;
                  return (
                    <li key={idx} className={`step ${isSoon ? 'step-error' : 'step-primary'} text-left text-sm`}>
                      <div className="flex flex-col items-start ml-2 w-full">
                        <span className="font-bold">{sub.merchant}</span>
                        <span className="text-base-content/70">{new Date(sub.next_payment!).toLocaleDateString()} &middot; {formatCurrency(sub.amount, sub.currency)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="text-base-content/50 text-sm flex flex-col items-center justify-center h-full min-h-[150px]">
                <Calendar className="w-8 h-8 mb-2 opacity-30"/>
                No upcoming dates set
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="card bg-base-100 shadow-sm border border-base-200 rounded-2xl">
          <div className="card-body p-0 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-base-200/50 p-4 border-b border-base-200 gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 opacity-70" />
                <select className="select select-sm select-bordered" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="All">All Categories</option>
                  {userCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {!userCategories.includes("Other") && <option value="Other">Other</option>}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 opacity-70" />
                <select className="select select-sm select-bordered" value={`${sortField}-${sortDesc}`} onChange={(e) => {
                  const [field, desc] = e.target.value.split('-');
                  setSortField(field as any);
                  setSortDesc(desc === 'true');
                }}>
                  <option value="amount-true">Highest Cost First</option>
                  <option value="amount-false">Lowest Cost First</option>
                  <option value="next_payment-true">Payment Date (Furthest)</option>
                  <option value="next_payment-false">Payment Date (Soonest)</option>
                  <option value="merchant-false">Name (A-Z)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto w-full p-4">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Category</th>
                    <th>Cost</th>
                    <th>Frequency</th>
                    <th>Next Payment</th>
                    <th>Lifetime Spend</th>
                    <th>Source</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <span className="loading loading-spinner loading-md text-primary"></span>
                      </td>
                    </tr>
                  ) : filteredAndSortedSubs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-base-content/60">
                        <div className="text-4xl mb-2 opacity-50">📭</div>
                        <p className="font-semibold">No subscriptions found</p>
                        <p className="text-sm">Adjust your filters or add a new one.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedSubs.map((sub) => {
                      const category = getCategoryForSub(sub);
                      return (
                        <tr key={sub.id} className="hover">
                          <td className="font-bold">{sub.merchant}</td>
                          <td>
                            <div 
                              className={`badge badge-sm font-semibold ${getCategoryBadgeClass(category)}`}
                              style={getCustomBadgeStyle(category)}
                            >
                              {category}
                            </div>
                          </td>
                          <td className="font-medium">{formatCurrency(sub.amount, sub.currency)}</td>
                          <td className="capitalize">{sub.cycle}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              {sub.next_payment ? new Date(sub.next_payment).toLocaleDateString() : '-'}
                              {sub.next_payment && (() => {
                                const daysDiff = Math.ceil((new Date(sub.next_payment).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                if (daysDiff >= 0 && daysDiff <= 3) {
                                  return (
                                    <div className="tooltip tooltip-right tooltip-warning" data-tip={`Payment due in ${daysDiff} day${daysDiff !== 1 ? 's' : ''}!`}>
                                      <AlertTriangle className="w-4 h-4 text-warning" />
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                          <td>
                            {sub.start_date ? (
                              <div className="tooltip" data-tip={`Since ${new Date(sub.start_date).toLocaleDateString()}`}>
                                <span className="font-semibold text-primary">{formatCurrency(calculateLifetimeSpend(sub) || 0, sub.currency)}</span>
                              </div>
                            ) : (
                              <span className="text-base-content/40 text-sm italic">Unknown</span>
                            )}
                          </td>
                          <td>
                            <div className={`badge badge-sm ${sub.source === 'auto' ? 'badge-primary badge-outline' : 'badge-secondary badge-outline'}`}>
                              {sub.source}
                            </div>
                          </td>
                          <td className="text-right space-x-2">
                            <button 
                              className="btn btn-ghost btn-xs text-base-content/70 hover:text-primary"
                              onClick={() => setSubToEdit(sub)}
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setSubToDelete(sub)}
                              className="btn btn-ghost btn-sm text-error"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Email Automation Settings */}
        <div className="bg-base-100 rounded-xl shadow-sm border border-base-200 overflow-hidden p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Automated Email Tracking</h2>
              <p className="text-sm text-base-content/70">Forward your email receipts to automatically track subscriptions</p>
            </div>
          </div>
          
          <div className="bg-base-200 p-4 rounded-lg border border-base-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm mb-1">Your Unique Tracking Email</p>
              <div className="flex items-center gap-2">
                <code className="text-primary font-mono text-sm sm:text-base bg-base-100 px-3 py-1 rounded select-all">
                  {user.unique_email || "Not generated yet. Please log out and back in."}
                </code>
                <button 
                  className="btn btn-ghost btn-sm btn-square" 
                  title="Copy"
                  onClick={() => {
                    if (user.unique_email) {
                      navigator.clipboard.writeText(user.unique_email);
                      setShowCopyModal(true);
                    }
                  }}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="text-sm text-base-content/70 md:w-1/2 flex flex-col items-start gap-3">
              <p>
                <strong>How it works:</strong> Create an auto-forwarding rule in your Gmail or Outlook to forward any email containing the word "receipt" or "Tagihan Rutin" to this exact address. SubScrapping's AI will parse it and magically add it to your dashboard.
              </p>
              <button 
                className="btn btn-primary btn-outline btn-sm"
                onClick={() => setShowTutorialModal(true)}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                How to setup auto-forwarding
              </button>
            </div>
          </div>
        </div>
      </main>

      <AddSubModal 
        show={showAddModal} 
        userCategories={userCategories}
        onClose={() => setShowAddModal(false)}
        onAdd={(sub) => setSubs([...subs, sub])}
      />

      <EditSubModal
        show={subToEdit !== null}
        sub={subToEdit}
        userCategories={userCategories}
        onClose={() => setSubToEdit(null)}
        onEdit={handleEditCompleted}
      />

      <ConfirmationModal
        show={subToDelete !== null}
        title="Are you sure?"
        message={
          <>
            Do you really want to delete the subscription for <span className="font-bold">{subToDelete?.merchant}</span>?
            <br />
            This action cannot be undone.
          </>
        }
        confirmText="Yes, delete it!"
        confirmBtnClass="btn-error text-white"
        onClose={() => setSubToDelete(null)}
        onConfirm={confirmDelete}
      />
      <ConfirmationModal
        show={showCopyModal}
        title="Copied!"
        message="Your unique tracking email has been copied to your clipboard."
        confirmText="Awesome"
        confirmBtnClass="btn-primary text-white"
        hideCancel={true}
        onClose={() => setShowCopyModal(false)}
        onConfirm={() => setShowCopyModal(false)}
      />
      <TutorialModal 
        show={showTutorialModal}
        uniqueEmail={user.unique_email || ""}
        onClose={() => setShowTutorialModal(false)}
      />
    </div>
  );
}
