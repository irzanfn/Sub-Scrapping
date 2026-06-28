"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Calendar } from "lucide-react";
import { updateSubscription, Subscription } from "../app/api";
import { CURRENCIES } from "../app/currencies";

interface EditSubModalProps {
  show: boolean;
  sub: Subscription | null;
  userCategories: string[];
  onClose: () => void;
  onEdit: (sub: Subscription) => void;
}

export default function EditSubModal({ show, sub, userCategories, onClose, onEdit }: EditSubModalProps) {
  const [editSub, setEditSub] = useState({
    merchant: "",
    amount: "",
    currency: "USD",
    cycle: "monthly",
    category: "",
    next_payment: "",
    start_date: "",
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [displayAmount, setDisplayAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const calendarRef = useRef<HTMLElement>(null);
  const startCalendarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    import("cally").catch(console.error);
    
    const cal = calendarRef.current;
    if (cal) {
      const handleChange = (e: any) => {
        setEditSub(prev => ({ ...prev, next_payment: e.target.value }));
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      };
      cal.addEventListener("change", handleChange);
      return () => cal.removeEventListener("change", handleChange);
    }
  }, [calendarRef.current]);

  useEffect(() => {
    const cal = startCalendarRef.current;
    if (cal) {
      const handleChange = (e: any) => {
        setEditSub(prev => ({ ...prev, start_date: e.target.value }));
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      };
      cal.addEventListener("change", handleChange);
      return () => cal.removeEventListener("change", handleChange);
    }
  }, [startCalendarRef.current]);

  useEffect(() => {
    import("cally").catch(console.error);
    if (sub) {
      setEditSub({
        merchant: sub.merchant,
        amount: sub.amount.toString(),
        currency: sub.currency,
        cycle: sub.cycle,
        category: sub.category || "",
        next_payment: sub.next_payment ? new Date(sub.next_payment).toISOString().split('T')[0] : "",
        start_date: sub.start_date || "",
      });
      setIsCustomCategory(false);
      const parts = sub.amount.toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setDisplayAmount(parts.join('.'));
    }
  }, [sub]);

  const handleEditSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sub) return;

    // Validation
    const newErrors: Record<string, string> = {};
    if (!editSub.merchant.trim()) newErrors.merchant = "Service Name is required.";
    if (!editSub.amount) newErrors.amount = "Amount is required.";
    if (!editSub.next_payment) newErrors.next_payment = "Next Payment Date is required.";
    if (!editSub.currency) newErrors.currency = "Currency is required.";
    if (!editSub.cycle) newErrors.cycle = "Billing Cycle is required.";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});

    try {
      await updateSubscription(sub.id, {
        merchant: editSub.merchant,
        amount: parseFloat(editSub.amount),
        currency: editSub.currency,
        cycle: editSub.cycle,
        category: editSub.category || "Other",
        next_payment: editSub.next_payment,
        start_date: editSub.start_date || undefined,
      });
      onEdit({
        ...sub,
        merchant: editSub.merchant,
        amount: parseFloat(editSub.amount),
        currency: editSub.currency,
        cycle: editSub.cycle,
        category: editSub.category || "Other",
        next_payment: editSub.next_payment,
        start_date: editSub.start_date || undefined,
      });
      onClose();
    } catch (err) {
      console.error("Failed to edit sub:", err);
      alert("Failed to edit subscription.");
    }
  };

  if (!show || !sub) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <form method="dialog">
          <button 
            type="button"
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={onClose}
          >✕</button>
        </form>
        <h3 className="font-bold text-lg mb-6 tracking-tight">Edit Subscription</h3>
        
        <form onSubmit={handleEditSub} className="space-y-4">
          <div className="form-control w-full">
            <label className="label"><span className="label-text font-medium">Service Name <span className="text-error">*</span></span></label>
            <input 
              type="text" 
              className={`input input-bordered w-full bg-base-100 ${errors.merchant ? 'border-error' : ''}`} 
              value={editSub.merchant}
              onChange={(e) => {
                setEditSub({ ...editSub, merchant: e.target.value });
                if (errors.merchant) setErrors({ ...errors, merchant: "" });
              }}
            />
            {errors.merchant && <span className="text-error text-sm mt-1">{errors.merchant}</span>}
          </div>
          
          <div className="form-control w-full">
            <label className="label"><span className="label-text font-medium">Category</span></label>
            {isCustomCategory ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input 
                    type="text"
                    className="input input-bordered w-full bg-base-100"
                    placeholder="Type new category..."
                    value={editSub.category}
                    onChange={(e) => setEditSub({ ...editSub, category: e.target.value })}
                    autoFocus
                  />
                  <button 
                    type="button"
                    className="btn btn-ghost border border-base-300"
                    onClick={() => {
                      setIsCustomCategory(false);
                      setEditSub({ ...editSub, category: sub?.category || "" });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <select
                className="select select-bordered w-full bg-base-100"
                value={editSub.category}
                onChange={(e) => {
                  if (e.target.value === "__NEW__") {
                    setIsCustomCategory(true);
                    setEditSub({ ...editSub, category: "" });
                  } else {
                    setEditSub({ ...editSub, category: e.target.value });
                  }
                }}
              >
                <option value="" disabled>Select category...</option>
                {Array.from(new Set(["Entertainment", "Software", "Utilities", "Other", ...userCategories, editSub.category])).filter(Boolean).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option disabled>──────────</option>
                <option value="__NEW__" className="font-bold text-primary">+ Add New Category...</option>
              </select>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Amount <span className="text-error">*</span></span></label>
              <input 
                type="text"
                placeholder="1,000.00" 
                className={`input input-bordered w-full bg-base-100 ${errors.amount ? 'border-error' : ''}`} 
                value={displayAmount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '');
                  if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                    setEditSub({ ...editSub, amount: raw });
                    const parts = raw.split('.');
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    setDisplayAmount(parts.join('.'));
                    if (errors.amount) setErrors({ ...errors, amount: "" });
                  }
                }}
              />
              {errors.amount && <span className="text-error text-sm mt-1">{errors.amount}</span>}
            </div>
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Currency <span className="text-error">*</span></span></label>
              <select 
                className={`select select-bordered w-full bg-base-100 ${errors.currency ? 'border-error' : ''}`}
                value={editSub.currency}
                onChange={(e) => {
                  setEditSub({ ...editSub, currency: e.target.value });
                  if (errors.currency) setErrors({ ...errors, currency: "" });
                }}
              >
                {CURRENCIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {errors.currency && <span className="text-error text-sm mt-1">{errors.currency}</span>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Start Date</span></label>
              <div className="dropdown dropdown-top w-full">
                <div tabIndex={0} role="button" className="input input-bordered w-full flex items-center justify-between bg-base-100">
                  <span>{editSub.start_date || "Select a date"}</span>
                  <Calendar className="w-4 h-4 opacity-50" />
                </div>
                <div tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box border border-base-200 mb-2">
                  {/* @ts-expect-error custom web component */}
                  <calendar-date 
                    ref={startCalendarRef}
                    className="cally" 
                    value={editSub.start_date}
                  >
                    <svg aria-label="Previous" className="fill-current w-4 h-4" slot="previous" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.75 19.5 8.25 12l7.5-7.5"></path></svg>
                    <svg aria-label="Next" className="fill-current w-4 h-4" slot="next" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m8.25 4.5 7.5 7.5-7.5 7.5"></path></svg>
                    {/* @ts-expect-error custom web component */}
                    <calendar-month></calendar-month>
                  {/* @ts-expect-error custom web component */}
                  </calendar-date>
                </div>
              </div>
            </div>
            
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-medium">Next Payment Date <span className="text-error">*</span></span></label>
              <div className="dropdown dropdown-top dropdown-end w-full">
                <div tabIndex={0} role="button" className={`input input-bordered w-full flex items-center justify-between bg-base-100 ${errors.next_payment ? 'border-error' : ''}`}>
                  <span>{editSub.next_payment || "Select a date"}</span>
                  <Calendar className="w-4 h-4 opacity-50" />
                </div>
                <div tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box border border-base-200 mb-2">
                  {/* @ts-expect-error custom web component */}
                  <calendar-date 
                    ref={calendarRef}
                    className="cally" 
                    value={editSub.next_payment}
                  >
                    <svg aria-label="Previous" className="fill-current w-4 h-4" slot="previous" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.75 19.5 8.25 12l7.5-7.5"></path></svg>
                    <svg aria-label="Next" className="fill-current w-4 h-4" slot="next" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m8.25 4.5 7.5 7.5-7.5 7.5"></path></svg>
                    {/* @ts-expect-error custom web component */}
                    <calendar-month></calendar-month>
                  {/* @ts-expect-error custom web component */}
                  </calendar-date>
                </div>
              </div>
              {errors.next_payment && <span className="text-error text-sm mt-1">{errors.next_payment}</span>}
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label"><span className="label-text font-medium">Billing Cycle <span className="text-error">*</span></span></label>
            <select 
              className={`select select-bordered w-full bg-base-100 ${errors.cycle ? 'border-error' : ''}`}
              value={editSub.cycle}
              onChange={(e) => {
                setEditSub({ ...editSub, cycle: e.target.value });
                if (errors.cycle) setErrors({ ...errors, cycle: "" });
              }}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="weekly">Weekly</option>
            </select>
            {errors.cycle && <span className="text-error text-sm mt-1">{errors.cycle}</span>}
          </div>
          
          <div className="modal-action mt-6">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary px-8 rounded-full">Save Changes</button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
