'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface TenantActionMenuProps {
  tenantId: string;
  tenantName: string;
  status: string;
  onAction?: (action: string, tenantId: string) => void;
}

export function TenantActionMenu({ tenantId, tenantName, status, onAction }: TenantActionMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: string) => {
    setIsOpen(false);
    if (onAction) {
      onAction(action, tenantId);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-inkSoft hover:bg-surface hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface/90 backdrop-blur-md border border-border/50 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1">
            <button 
              onClick={() => router.push(`/admin/tenants/${tenantId}`)}
              className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surfaceMuted transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-inkSoft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Details
            </button>
            <button 
              onClick={() => handleAction('edit_plan')}
              className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surfaceMuted transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-inkSoft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Plan
            </button>
            <button 
              onClick={() => handleAction('view_invoices')}
              className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surfaceMuted transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-inkSoft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Invoices
            </button>
            <div className="h-px bg-border/50 my-1"></div>
            {status === 'ACTIVE' ? (
              <button 
                onClick={() => handleAction('suspend')}
                className="w-full text-left px-4 py-2.5 text-sm text-ember hover:bg-ember/10 transition-colors flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Suspend Account
              </button>
            ) : (
              <button 
                onClick={() => handleAction('activate')}
                className="w-full text-left px-4 py-2.5 text-sm text-moss hover:bg-moss/10 transition-colors flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4 text-moss" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Reactivate Account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
