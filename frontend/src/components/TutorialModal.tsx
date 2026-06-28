"use client";

import React, { useState } from "react";
import { Copy, Check, Mail, ExternalLink } from "lucide-react";

interface TutorialModalProps {
  show: boolean;
  uniqueEmail: string;
  onClose: () => void;
}

type Provider = "gmail" | "outlook" | "yahoo";

export default function TutorialModal({ show, uniqueEmail, onClose }: TutorialModalProps) {
  const [copied, setCopied] = useState(false);
  const [provider, setProvider] = useState<Provider>("gmail");

  if (!show) return null;

  const searchCriteria = `subject:("receipt" OR "invoice" OR "pembayaran" OR "tagihan" OR "recibo" OR "factura" OR "reçu" OR "facture" OR "rechnung")`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(searchCriteria);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-2xl">Setup Auto-Forwarding</h3>
        </div>

        <div className="space-y-6">
          <div className="alert alert-info shadow-sm text-sm">
            <span>By setting up an auto-forwarding rule, any new subscription receipt you receive will instantly and automatically appear on your SubScrapping dashboard!</span>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-2">1. The Search Criteria (Copy this)</h4>
            <p className="text-sm text-base-content/80 mb-3">Paste this exact text into the search bar in your email provider to find all your receipts:</p>
            
            <div className="flex items-center gap-2 bg-base-200 p-3 rounded-lg border border-base-300">
              <code className="text-primary font-mono flex-1 select-all">{searchCriteria}</code>
              <button 
                className="btn btn-ghost btn-sm btn-square"
                onClick={copyToClipboard}
                title="Copy Criteria"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-lg">2. How to create the rule</h4>
              <div className="tabs tabs-boxed bg-base-200">
                <button 
                  className={`tab tab-sm ${provider === "gmail" ? "tab-active" : ""}`}
                  onClick={() => setProvider("gmail")}
                >Gmail</button>
                <button 
                  className={`tab tab-sm ${provider === "outlook" ? "tab-active" : ""}`}
                  onClick={() => setProvider("outlook")}
                >Outlook</button>
                <button 
                  className={`tab tab-sm ${provider === "yahoo" ? "tab-active" : ""}`}
                  onClick={() => setProvider("yahoo")}
                >Yahoo</button>
              </div>
            </div>

            <div className="bg-base-200/50 p-4 rounded-lg border border-base-200">
              {provider === "gmail" && (
                <ol className="list-decimal pl-5 space-y-3 text-sm text-base-content/80">
                  <li>Paste the search criteria above into the Gmail search bar and hit Enter.</li>
                  <li>Click the <strong>Show search options</strong> icon (the sliders on the right side of the search bar).</li>
                  <li>Click <strong>Create filter</strong> at the bottom of the dropdown.</li>
                  <li>Check the box for <strong>Forward it to:</strong></li>
                  <li>Add your unique tracking email: <span className="text-primary font-mono font-bold bg-base-200 px-1 py-0.5 rounded select-all">{uniqueEmail}</span></li>
                  <li>Click <strong>Create filter</strong>!</li>
                </ol>
              )}
              {provider === "outlook" && (
                <ol className="list-decimal pl-5 space-y-3 text-sm text-base-content/80">
                  <li>Click the <strong>Settings (Gear) icon</strong> at the top right of Outlook.</li>
                  <li>Go to <strong>Mail &gt; Rules</strong> and click <strong>Add new rule</strong>.</li>
                  <li>Name it "SubScrapping Receipts".</li>
                  <li>Under "Add a condition", select <strong>Subject includes</strong> and paste the criteria keywords.</li>
                  <li>Under "Add an action", select <strong>Forward to</strong>.</li>
                  <li>Enter your unique tracking email: <span className="text-primary font-mono font-bold bg-base-200 px-1 py-0.5 rounded select-all">{uniqueEmail}</span></li>
                  <li>Click <strong>Save</strong>!</li>
                </ol>
              )}
              {provider === "yahoo" && (
                <ol className="list-decimal pl-5 space-y-3 text-sm text-base-content/80">
                  <li>Click the <strong>Settings (Gear) icon</strong> and select <strong>More Settings</strong>.</li>
                  <li>Click on <strong>Filters</strong> on the left side, then <strong>Add new filters</strong>.</li>
                  <li>Set the rule name to "SubScrapping Receipts".</li>
                  <li>Under "Subject", select "contains" and paste the keywords from the search criteria.</li>
                  <li>Unfortunately, Yahoo's free tier does not natively support auto-forwarding per-filter anymore. You must forward ALL email or manually forward receipts to: <span className="text-primary font-mono font-bold bg-base-200 px-1 py-0.5 rounded select-all">{uniqueEmail}</span></li>
                </ol>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-4">
            {provider === "gmail" && (
              <a href="https://support.google.com/mail/answer/10957" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm text-primary">
                Official Gmail Guide <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
            {provider === "outlook" && (
              <a href="https://support.microsoft.com/en-us/office/use-inbox-rules-in-outlook-com-4b094371-a5d7-49bd-8b1b-4e4896a7cc5d" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm text-primary">
                Official Outlook Guide <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
          </div>

        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}
