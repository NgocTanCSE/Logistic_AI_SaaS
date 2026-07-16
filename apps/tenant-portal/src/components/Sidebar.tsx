'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from './ui/Button';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const role = user?.role || 'TENANT_USER';

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isTenantAdmin = role === 'TENANT_ADMIN';
  const isWarehouseManager = role === 'WAREHOUSE_MANAGER';
  const isWarehouseStaff = role === 'WAREHOUSE_STAFF';
  const isLogisticsManager = role === 'LOGISTICS_MANAGER';
  const isDriver = role === 'DRIVER';
  const isClient = role === 'CLIENT_USER' || role === 'CUSTOMER';
  const isTenantUser = role === 'TENANT_USER';

  const canAccessWarehouse = isSuperAdmin || isTenantAdmin || isWarehouseManager || isWarehouseStaff;
  const canAccessLogistics = isSuperAdmin || isTenantAdmin || isLogisticsManager;
  const canAccessTenantAdmin = isSuperAdmin || isTenantAdmin;

  const NavLink = ({ href, children, exact }: { href: string, children: React.ReactNode, exact?: boolean }) => {
    const isActive = exact ? pathname === href : (pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/')));
    return (
      <Link 
        href={href} 
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
          isActive 
            ? 'bg-primary text-white shadow-soft shadow-primary/20' 
            : 'text-inkSoft hover:text-ink hover:bg-slate-100'
        }`}
      >
        {children}
      </Link>
    );
  };

  return (
    <aside className="w-72 h-screen fixed top-0 left-0 bg-white/80 backdrop-blur-2xl border-r border-slate-200/60 flex flex-col z-20">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45"></div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink">SmartLogi</h1>
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] ml-11">Systems</p>
      </div>

      <nav className="flex-1 px-6 space-y-8 mt-4 overflow-y-auto custom-scrollbar">
        {/* Overview Section */}
        {!isDriver && !isClient && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 px-4">Overview</div>
            <div className="space-y-1">
              <NavLink href="/dashboard">Control Center</NavLink>
            </div>
          </div>
        )}

        {/* Warehouse Section */}
        {canAccessWarehouse && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 px-4">Warehouse Ops</div>
            <div className="space-y-1">
              {!isWarehouseStaff && (
                <>
                  <NavLink href="/orders">Orders Management</NavLink>
                  <NavLink href="/inventory" exact>Inventory Ledger</NavLink>
                  <NavLink href="/inventory/cycle-count">Cycle Counting</NavLink>
                  <NavLink href="/inventory/adjustments">Stock Adjustments</NavLink>
                  <NavLink href="/warehouses">Warehouse Setup</NavLink>
                  <NavLink href="/wms/equipment">Equipment Checkout</NavLink>
                  <NavLink href="/wms/products">Products</NavLink>
                </>
              )}
              <NavLink href="/wms/waves">Wave Picking</NavLink>
              <NavLink href="/wms/packing">Pack Station</NavLink>
              {isWarehouseStaff && (
                <NavLink href="/wms/tasks">My Tasks</NavLink>
              )}
            </div>
          </div>
        )}

        {/* Logistics Section */}
        {canAccessLogistics && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 px-4">Logistics & Fleet</div>
            <div className="space-y-1">
              <NavLink href="/logistics/dispatch">Dispatch Tower</NavLink>
              <NavLink href="/logistics/vehicles">Fleet Management</NavLink>
              <NavLink href="/drivers">Driver Workforce</NavLink>
              <NavLink href="/logistics/expenses">Expense Approval</NavLink>
              <NavLink href="/logistics/reports">Transport Reports</NavLink>
              <NavLink href="/logistics/geofences">Geofences</NavLink>
              <NavLink href="/logistics/sos">SOS Control Center</NavLink>
              <NavLink href="/logistics/returns">Return Management</NavLink>
              <NavLink href="/finance/cod">COD Remittance</NavLink>
            </div>
          </div>
        )}

        {/* Admin Section */}
        {canAccessTenantAdmin && (
          <div className="pt-4 border-t border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 px-4">Administration</div>
            <div className="space-y-1">
              {isSuperAdmin && (
                <>
                  <NavLink href="/branches">Branch Registry</NavLink>
                  <NavLink href="/admin/ai-insights">AI Insights & Training</NavLink>
                </>
              )}
              <NavLink href="/admin/clients">Client Accounts</NavLink>
              <NavLink href="/admin/billing">Billing</NavLink>
              <NavLink href="/admin/api-keys">API Keys</NavLink>
              <NavLink href="/admin/audit-logs">Audit Logs</NavLink>
              <NavLink href="/users">User Management</NavLink>
              <NavLink href="/roles">Permissions Matrix</NavLink>
              <NavLink href="/settings">System Settings</NavLink>
            </div>
          </div>
        )}

        {/* Client Portal */}
        {isClient && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 px-4">Client Portal</div>
            <div className="space-y-1">
              <NavLink href="/orders">My Orders</NavLink>
              <NavLink href="/inventory">My Inventory</NavLink>
              <NavLink href="/logistics/reports">Tracking</NavLink>
            </div>
          </div>
        )}

        {/* Tenant User Basic Access */}
        {isTenantUser && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 px-4">Workspace</div>
            <div className="space-y-1">
              <NavLink href="/orders">Orders</NavLink>
              <NavLink href="/inventory">Inventory View</NavLink>
            </div>
          </div>
        )}

        {/* Driver Portal */}
        {isDriver && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 px-4">Driver Portal</div>
            <div className="space-y-1">
              <NavLink href="/drivers/my-trips">My Trips</NavLink>
              <NavLink href="/orders">Deliveries</NavLink>
            </div>
          </div>
        )}
      </nav>

      <div className="p-6 mt-auto">
        <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-5 backdrop-blur-sm">
          <Link href="/profile" className="flex items-center space-x-3 mb-3 hover:opacity-80 transition-opacity">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-teal-400 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20">
                {user?.fullName?.split(' ').map((n) => n[0]).join('') || 'TU'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-moss border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink truncate text-sm">{user?.fullName || 'Tenant User'}</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                {String(role).replace('_', ' ')}
              </p>
            </div>
          </Link>
          <div className="flex gap-2">
            <Link href="/profile" className="flex-1">
              <Button variant="outline" size="sm" className="w-full rounded-xl text-[10px] font-bold tracking-widest uppercase border-slate-200 hover:bg-white">
                Profile
              </Button>
            </Link>
            <Button 
              onClick={logout} 
              variant="outline" 
              size="sm" 
              className="flex-1 rounded-xl text-[10px] font-bold tracking-widest uppercase border-slate-200 hover:bg-white"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
