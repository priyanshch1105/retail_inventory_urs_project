"use client";

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Adjustment, api, money, Product, Sale, User } from "@/lib/api";

type Tab = "Overview" | "Products" | "Low stock" | "Inventory" | "Sales" | "Reports" | "Team" | "Settings";
type SalesReport = { totalSales: number; grossSales: number; discounts: number; taxesCollected: number; netSales: number; transactionCount: number; topProducts: { productId: string; name: string; quantity: number }[]; lowStock: Product[] };
type ProfitReport = { revenue: number; costOfGoods: number; grossProfit: number; margin: number };
const today = () => new Date().toISOString().slice(0, 10);
const blankProduct = { sku: "", name: "", category: "", purchasePrice: "", sellingPrice: "", stock: "", reorderLevel: "" };
const emptySalesReport: SalesReport = { totalSales: 0, grossSales: 0, discounts: 0, taxesCollected: 0, netSales: 0, transactionCount: 0, topProducts: [], lowStock: [] };

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<Adjustment[]>([]);
  const [stockRequests, setStockRequests] = useState<Adjustment[]>([]);
  const [report, setReport] = useState<SalesReport>(emptySalesReport);
  const [profit, setProfit] = useState<ProfitReport>({ revenue: 0, costOfGoods: 0, grossProfit: 0, margin: 0 });
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<Tab>("Overview");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState(0);
  const [productForm, setProductForm] = useState(blankProduct);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjustment, setAdjustment] = useState({ productId: "", type: "Received", quantity: "", reason: "" });
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [me, productData, saleData, reportData, movementData, requestData] = await Promise.all([
      api<{ user: User }>("/api/auth/me"), api<{ products: Product[] }>("/api/products"),
      api<{ sales: Sale[] }>("/api/sales"), api<SalesReport>(`/api/reports/sales?from=${from}&to=${to}`),
      api<{ adjustments: Adjustment[] }>("/api/inventory/movements"), api<{ requests: Adjustment[] }>("/api/inventory/requests"),
    ]);
    setUser(me.user); setProducts(productData.products); setSales(saleData.sales);
    setReport(reportData); setMovements(movementData.adjustments); setStockRequests(requestData.requests); setLoading(false);
  }, [from, to]);

  useEffect(() => { refresh().catch(() => { localStorage.removeItem("retailstock_token"); router.replace("/login"); }); }, [refresh, router]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 3200); return () => window.clearTimeout(timer); }, [message]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map(p => p.category))).sort()], [products]);
  const filtered = useMemo(() => products.filter(p =>
    (!search || `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase())) &&
    (category === "All" || p.category === category) &&
    (status === "All" || (status === "Low" ? p.stock <= p.reorderLevel : status === "Out" ? p.stock === 0 : p.stock > 0))
  ), [products, search, category, status]);
  const lowStock = useMemo(() => products.filter(p => p.stock <= p.reorderLevel), [products]);
  const availableProducts = useMemo(() => filtered.filter(p => p.stock > 0), [filtered]);
  const cartLines = Object.entries(cart).map(([id, quantity]) => {
    const product = products.find(p => p.id === id); return product ? { product, quantity } : null;
  }).filter((line): line is { product: Product; quantity: number } => Boolean(line));
  const cartSubtotal = cartLines.reduce((sum, line) => sum + line.product.sellingPrice * line.quantity, 0);

  function notify(text: string) { setError(""); setMessage(text); }
  async function action(run: () => Promise<void>, success: string) {
    if (busy) return; setBusy(true); setError("");
    try { await run(); notify(success); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The request could not be completed."); }
    finally { setBusy(false); }
  }
  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    const data = { sku: productForm.sku.trim(), name: productForm.name.trim(), category: productForm.category.trim(), purchasePrice: Number(productForm.purchasePrice), sellingPrice: Number(productForm.sellingPrice), reorderLevel: Number(productForm.reorderLevel), ...(!editing ? { stock: Number(productForm.stock) } : {}) };
    await action(async () => {
      await api(editing ? `/api/products/${editing.id}` : "/api/products", { method: editing ? "PUT" : "POST", body: JSON.stringify(data) });
      setProductForm(blankProduct); setEditing(null);
    }, editing ? "Product updated." : "Product created.");
  }
  function startEdit(product: Product) { setEditing(product); setProductForm({ sku: product.sku, name: product.name, category: product.category, purchasePrice: String(product.purchasePrice), sellingPrice: String(product.sellingPrice), stock: String(product.stock), reorderLevel: String(product.reorderLevel) }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function deactivate(product: Product) {
    if (!window.confirm(`Deactivate ${product.name}? It will remain in historical invoices.`)) return;
    await action(async () => { await api(`/api/products/${product.id}/deactivate`, { method: "PATCH" }); }, "Product deactivated.");
  }
  async function adjustStock(event: FormEvent) {
    event.preventDefault();
    await action(async () => {
      const staffRequest = user?.role === "Staff";
      await api(staffRequest ? "/api/inventory/requests" : "/api/inventory/adjustments", { method: "POST", body: JSON.stringify({ ...adjustment, quantity: Number(adjustment.quantity) }) });
      setAdjustment(current => ({ ...current, quantity: "", reason: "" }));
    }, user?.role === "Staff" ? "Stock adjustment request sent to Admin." : "Inventory movement recorded.");
  }
  async function decideStockRequest(request: Adjustment, decision: "Approved" | "Rejected") { await action(async () => { await api(`/api/inventory/requests/${request._id || request.id}`, { method: "PATCH", body: JSON.stringify({ decision }) }); }, `Stock request ${decision.toLowerCase()}.`); }
  function changeQuantity(id: string, amount: number) { setCart(current => { const next = { ...current }; const quantity = Math.max(0, (next[id] || 0) + amount); if (quantity) next[id] = quantity; else delete next[id]; return next; }); }
  async function completeSale() {
    if (!cartLines.length) { setError("Add at least one product to the cart."); return; }
    await action(async () => {
      const result = await api<{ sale: Sale }>("/api/sales", { method: "POST", body: JSON.stringify({ discount: Number(discount) || 0, items: cartLines.map(line => ({ productId: line.product.id, quantity: line.quantity })) }) });
      setCart({}); setDiscount(0); setSelectedSale(result.sale);
    }, "Sale recorded. Stock was deducted after the invoice was saved.");
  }
  async function loadReports(event?: FormEvent) {
    event?.preventDefault(); setBusy(true); setError("");
    try {
      const range = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const salesData = await api<SalesReport>(`/api/reports/sales?${range}`);
      setReport(salesData);
      if (user?.role === "Admin") setProfit(await api<ProfitReport>(`/api/reports/profit?${range}`));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load reports."); }
    finally { setBusy(false); }
  }
  function logout() { localStorage.removeItem("retailstock_token"); localStorage.removeItem("retailstock_user"); router.replace("/login"); }
  if (loading) return <main className="login-page"><div><span className="eyebrow">Loading stockroom</span><h1>Getting your workspace ready…</h1></div></main>;

  const tabs: Tab[] = user?.role === "Admin" ? ["Overview", "Products", "Low stock", "Inventory", "Sales", "Reports", "Team", "Settings"] : ["Overview", "Products", "Low stock", "Inventory", "Sales"];
  const descriptions: Record<Tab, string> = { Overview: "Sales, stock pressure, and the next useful action.", Products: "Search, filter, create and maintain your active catalog.", "Low stock": "Products at or below their configured reorder level.", Inventory: "Record stock changes and review the movement audit trail.", Sales: "Build a multi-product cart and review invoices.", Reports: "Sales totals, top products, tax collected and gross profit by date.", Team: "Provision Staff access and review assigned roles.", Settings: "Manage tax, discount limits and business identity." };
  return <div className="app-shell">
    <aside className="rail" aria-label="Store sidebar"><div className="rail-brand"><span className="brand-mark">RS</span><div><strong>Stockroom</strong><small>retail operations</small></div></div>
      <nav className="nav" aria-label="Main navigation">{tabs.map(item => <button key={item} className={tab === item ? "active" : ""} aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}>{item}{item === "Low stock" && lowStock.length > 0 && <span className="nav-count">{lowStock.length}</span>}</button>)}</nav>
      <div className="rail-footer"><div className="user-line"><b>{user?.name}</b><span>{user?.role}</span></div><button className="logout" onClick={logout}>Sign out →</button></div>
    </aside>
    <main className="workspace">
      <header className="topline"><div><span className="eyebrow">Stockroom / {tab}</span><h1>{tab === "Overview" ? "Inventory you can trust." : tab}</h1><p>{descriptions[tab]}</p></div><div className="date-chip">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div></header>
      {error && <div className="alert error page-alert" role="alert">{error}</div>}
      {tab === "Overview" && <Overview report={report} products={products} sales={sales} from={from} to={to} setFrom={setFrom} setTo={setTo} apply={loadReports} openTab={setTab} />}
      {tab === "Products" && <section className="content-grid"><div className="panel"><div className="panel-head"><div><h2>Product catalog</h2><p>{filtered.length} matching active products</p></div></div><div className="toolbar"><input aria-label="Search products" placeholder="Search product name or SKU" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filter category" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select><select aria-label="Filter stock status" value={status} onChange={e => setStatus(e.target.value)}><option value="All">All stock</option><option value="Low">At/below reorder</option><option value="Out">Out of stock</option><option value="Healthy">In stock</option></select></div>
        {filtered.length ? <PaginatedList items={filtered} pageSize={8} label="Products" render={items => <div className="product-grid">{items.map(p => <ProductCard key={p.id} product={p} admin={user?.role === "Admin"} onEdit={() => startEdit(p)} onDeactivate={() => deactivate(p)} />)}</div>} /> : <div className="empty">No products match these filters.</div>}</div>
        <div className="panel">{user?.role === "Admin" ? <><div className="panel-head"><div><h2>{editing ? "Edit product" : "Add product"}</h2><p>Stock is managed through inventory movements.</p></div>{editing && <button className="ghost-button" onClick={() => { setEditing(null); setProductForm(blankProduct); }}>Cancel</button>}</div><ProductForm value={productForm} setValue={setProductForm} onSubmit={saveProduct} busy={busy} editing={Boolean(editing)} /></> : <div className="empty">Catalog changes are available to Admin users only.</div>}</div>
      </section>}
      {tab === "Low stock" && <section className="panel"><div className="panel-head"><div><h2>Reorder watch</h2><p>Stock at or below each product’s reorder level.</p></div><span className="tag low">{lowStock.length} items</span></div>{lowStock.length ? <PaginatedList items={lowStock} pageSize={8} label="Low stock products" render={items => <div className="product-grid">{items.map(p => <ProductCard key={p.id} product={p} admin={user?.role === "Admin"} onEdit={() => startEdit(p)} onDeactivate={() => deactivate(p)} />)}</div>} /> : <div className="empty">No low-stock products right now.</div>}</section>}
      {tab === "Inventory" && <section className="content-grid"><div className="panel"><div className="panel-head"><div><h2>{user?.role === "Admin" ? "Record stock movement" : "Request stock adjustment"}</h2><p>{user?.role === "Admin" ? "Approved changes are recorded in the movement history." : "An Admin reviews your request before stock changes."}</p></div></div><form className="form-grid" onSubmit={adjustStock}><label className="wide">Product<select value={adjustment.productId} onChange={e => setAdjustment({ ...adjustment, productId: e.target.value })} required><option value="">Select a product</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} ({p.stock} available)</option>)}</select></label><label>Request type<select value={adjustment.type} onChange={e => setAdjustment({ ...adjustment, type: e.target.value })}><option>Received</option><option>Added</option><option>Removed</option></select></label><label>Quantity<input type="number" min="1" step="1" value={adjustment.quantity} onChange={e => setAdjustment({ ...adjustment, quantity: e.target.value })} required /></label><label className="wide">Reason or reference<input minLength={user?.role === "Staff" ? 3 : undefined} maxLength={200} placeholder="e.g. Supplier delivery or damaged goods" value={adjustment.reason} onChange={e => setAdjustment({ ...adjustment, reason: e.target.value })} required={user?.role === "Staff"} /></label><button className="primary-button wide" disabled={busy}>{busy ? "Saving…" : user?.role === "Admin" ? "Record movement" : "Send request"}</button></form></div>
        <div className="panel"><div className="panel-head"><div><h2>{user?.role === "Admin" ? "Pending staff requests" : "Your stock requests"}</h2><p>Stock changes only after Admin approval.</p></div><span className="tag low">{user?.role === "Admin" ? `${stockRequests.length} pending` : `${stockRequests.filter(r => r.status === "Pending").length} pending`}</span></div>{stockRequests.length ? <PaginatedList items={stockRequests} pageSize={6} label="Stock requests" render={items => <>{items.map(request => <div className="compact-row" key={request._id || request.id}><span><strong>{request.productName} / {request.type} {request.quantity}</strong><small>{request.userName} / {request.reason}</small></span>{user?.role === "Admin" ? <span className="button-row"><button className="primary-button" disabled={busy} onClick={() => decideStockRequest(request, "Approved")}>Approve</button><button className="danger-button" disabled={busy} onClick={() => decideStockRequest(request, "Rejected")}>Reject</button></span> : <span className={`tag ${request.status === "Rejected" ? "low" : "healthy"}`}>{request.status}</span>}</div>)}</>} /> : <div className="empty">No stock requests to show.</div>}</div>
        <div className="panel sales-history"><div className="panel-head"><div><h2>Movement history</h2><p>{user?.role === "Admin" ? "Store-wide audit history." : "Your stock requests and movements."}</p></div></div><MovementTable rows={movements} /></div></section>}
      {tab === "Sales" && <section className="content-grid"><div className="panel"><div className="panel-head"><div><h2>Point of sale</h2><p>Prices and availability are rechecked by the server.</p></div></div><div className="toolbar"><input aria-label="Search POS products" placeholder="Find product by name or SKU" value={search} onChange={e => setSearch(e.target.value)} /></div>{availableProducts.length ? <PaginatedList items={availableProducts} pageSize={8} label="POS products" render={items => <div className="product-grid">{items.map(p => <button className="product product-button" key={p.id} onClick={() => changeQuantity(p.id, 1)}><div className="product-top"><strong>{p.name}</strong><span className={`tag ${p.stock <= p.reorderLevel ? "low" : "healthy"}`}>{p.stock} available</span></div><div className="product-bottom"><span className="sku">{p.sku}</span><span className="price">{money(p.sellingPrice)}</span></div></button>)}</div>} /> : <div className="empty">No available products match this search.</div>}</div>
        <div className="panel"><div className="panel-head"><div><h2>Current invoice</h2><p>{cartLines.length} product lines · tax calculated by server</p></div></div>{cartLines.length ? <><div className="cart-lines">{cartLines.map(line => <div className="cart-line" key={line.product.id}><span>{line.product.name}<small>{line.quantity} × {money(line.product.sellingPrice)}</small></span><strong>{money(line.quantity * line.product.sellingPrice)}</strong><span className="button-row"><button aria-label={`Remove one ${line.product.name}`} className="ghost-button qty-button" onClick={() => changeQuantity(line.product.id, -1)}>−</button><button aria-label={`Add one ${line.product.name}`} className="ghost-button qty-button" onClick={() => changeQuantity(line.product.id, 1)}>+</button></span></div>)}</div><div className="sale-foot"><span>Subtotal preview</span><strong>{money(cartSubtotal)}</strong></div><label className="discount-field">Discount<input className="input" type="number" min="0" max={cartSubtotal} step="0.01" value={discount || ""} onChange={e => setDiscount(Number(e.target.value))} /></label><button className="primary-button full" disabled={busy} onClick={completeSale}>{busy ? "Recording…" : "Complete sale"}</button></> : <div className="empty">Add products to start an invoice.</div>}</div>
        <div className="panel sales-history"><div className="panel-head"><div><h2>Sales history</h2><p>Recent invoices; select one to inspect its details.</p></div></div>{sales.length ? <PaginatedList items={sales} pageSize={8} label="Sales history" render={items => <>{items.map(sale => <button className="history-row" key={sale.id} onClick={() => setSelectedSale(sale)}><span><strong className="invoice">{sale.invoiceNumber}</strong><small>{new Date(sale.createdAt).toLocaleString()}</small></span><strong>{money(sale.total)}</strong></button>)}</>} /> : <div className="empty">No sales recorded yet.</div>}</div></section>}
      {tab === "Reports" && user?.role === "Admin" && <Reports report={report} profit={profit} from={from} to={to} setFrom={setFrom} setTo={setTo} onSubmit={loadReports} busy={busy} />}
      {tab === "Team" && user?.role === "Admin" && <AdminTeam onChanged={refresh} />}
      {tab === "Settings" && user?.role === "Admin" && <AdminSettings />}
      {message && <div className="toast" role="status">{message}</div>}
      {selectedSale && <InvoiceDialog sale={selectedSale} onClose={() => setSelectedSale(null)} />}
    </main>
  </div>;
}

function Overview({ report, products, sales, from, to, setFrom, setTo, apply, openTab }: any) { return <>
  <section className="metric-grid"><Metric label="Net sales" value={money(report.netSales ?? report.totalSales)} hint="after discounts, before tax" /><Metric label="Transactions" value={report.transactionCount} hint="in selected date range" /><Metric label="Low-stock products" value={report.lowStock?.length ?? 0} hint="at or below reorder level" /><Metric label="Active products" value={products.length} hint="available in catalog" /></section>
  <form className="panel range-panel" onSubmit={apply}><div className="panel-head"><div><h2>Dashboard date range</h2><p>Totals and best sellers use this range.</p></div><button className="primary-button">Apply range</button></div><DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} /></form>
  <section className="content-grid"><div className="panel"><div className="panel-head"><div><h2>Low-stock alerts</h2><p>Restock before products run out.</p></div><button className="ghost-button" onClick={() => openTab("Low stock")}>Open low stock</button></div>{report.lowStock?.length ? report.lowStock.map((p: Product) => <div key={p.id} className="compact-row"><span><strong>{p.name}</strong><small>{p.sku} · reorder at {p.reorderLevel}</small></span><span className="tag low">{p.stock} left</span></div>) : <div className="empty">No low-stock products.</div>}</div>
    <div className="panel"><div className="panel-head"><div><h2>Top sellers</h2><p>Units sold in the selected range.</p></div></div>{report.topProducts?.length ? report.topProducts.map((p: SalesReport["topProducts"][number], index: number) => <div className="compact-row" key={p.productId}><span><strong>{index + 1}. {p.name}</strong></span><strong>{p.quantity} units</strong></div>) : <div className="empty">No sales in this date range.</div>}</div></section>
    <section className="panel recent-panel"><div className="panel-head"><div><h2>Recent sales</h2><p>Latest recorded invoices.</p></div><button className="ghost-button" onClick={() => openTab("Sales")}>Open sales</button></div>{sales.slice(0, 5).map((sale: Sale) => <div key={sale.id} className="history-row static-row"><span><strong className="invoice">{sale.invoiceNumber}</strong><small>{sale.lines.map(line => `${line.name} ×${line.quantity}`).join(", ")}</small></span><strong>{money(sale.total)}</strong></div>)}{!sales.length && <div className="empty">No sales recorded yet.</div>}</section>
  <div className="sr-only" aria-hidden="true">{products.length}</div>
</>; }

function PaginatedList<T>({ items, pageSize, label, render }: { items: T[]; pageSize: number; label: string; render: (items: T[]) => ReactNode }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => setPage(1), [items, pageSize]);
  return <div className="paginated-list">{render(visibleItems)}{items.length > pageSize && <nav className="pagination" aria-label={`${label} pagination`}><span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, items.length)} of {items.length}</span><div className="pagination-controls"><button type="button" className="ghost-button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>Previous</button><span aria-live="polite">Page {currentPage} of {pageCount}</span><button type="button" className="ghost-button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount}>Next</button></div></nav>}</div>;
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) { return <div className="metric"><span className="label">{label}</span><strong>{value}</strong><span className="trend">{hint}</span></div>; }
function DateRange({ from, to, setFrom, setTo }: any) { return <div className="date-range"><label>From<input className="input" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} /></label><label>To<input className="input" type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></label></div>; }
function ProductCard({ product, admin, onEdit, onDeactivate }: { product: Product; admin: boolean; onEdit: () => void; onDeactivate: () => void }) { const low = product.stock <= product.reorderLevel; return <article className="product"><div className="product-top"><div><strong>{product.name}</strong><div className="sku">{product.sku} · {product.category}</div></div><span className={`tag ${low ? "low" : "healthy"}`}>{product.stock === 0 ? "out of stock" : low ? "low stock" : "in stock"}</span></div><div className="product-bottom"><span className={low ? "stock low" : "stock"}>{product.stock} units / reorder at {product.reorderLevel}</span><span className="price">{money(product.sellingPrice)}</span></div>{admin && <div className="button-row product-actions"><button className="ghost-button" onClick={onEdit}>Edit product</button><button className="danger-button" onClick={onDeactivate}>Deactivate</button></div>}</article>; }
function ProductForm({ value, setValue, onSubmit, busy, editing }: any) { const set = (key: string, next: string) => setValue((current: typeof blankProduct) => ({ ...current, [key]: next })); return <form className="form-grid" onSubmit={onSubmit}><label>SKU<input value={value.sku} onChange={e => set("sku", e.target.value)} minLength={2} maxLength={30} required /></label><label>Product name<input value={value.name} onChange={e => set("name", e.target.value)} minLength={2} maxLength={80} required /></label><label>Category<input value={value.category} onChange={e => set("category", e.target.value)} minLength={2} maxLength={40} required /></label><label>Purchase price<input type="number" min="0" step="0.01" value={value.purchasePrice} onChange={e => set("purchasePrice", e.target.value)} required /></label><label>Selling price<input type="number" min="0" step="0.01" value={value.sellingPrice} onChange={e => set("sellingPrice", e.target.value)} required /></label>{!editing && <label>Opening stock<input type="number" min="0" step="1" value={value.stock} onChange={e => set("stock", e.target.value)} required /></label>}<label>Reorder level<input type="number" min="0" step="1" value={value.reorderLevel} onChange={e => set("reorderLevel", e.target.value)} required /></label><button className="primary-button wide" disabled={busy}>{busy ? "Saving…" : editing ? "Save product" : "Create product"}</button></form>; }
function MovementTable({ rows }: { rows: Adjustment[] }) {
  if (!rows.length) return <div className="empty">No inventory movements recorded yet.</div>;
  return <PaginatedList items={rows} pageSize={10} label="Inventory movements" render={items => <div className="movement-list">{items.map(row => <div className="movement-row" key={row._id || row.id}><span className="movement-indicator">{row.delta > 0 ? "+" : "−"}</span><span className="movement-main"><strong>{row.productName}</strong><small>{row.type}{row.reason ? " · " + row.reason : ""}</small></span><span className="movement-quantity">{row.delta > 0 ? "+" : ""}{row.delta}</span><span className="movement-meta">{row.userName}<small>{new Date(row.createdAt).toLocaleString()}</small></span></div>)}</div>} />;
}

function Reports({ report, profit, from, to, setFrom, setTo, onSubmit, busy }: any) { return <><form className="panel range-panel" onSubmit={onSubmit}><div className="panel-head"><div><h2>Report period</h2><p>Inclusive calendar dates; figures use server-side calculations.</p></div><button className="primary-button" disabled={busy}>{busy ? "Loading…" : "Run reports"}</button></div><DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} /></form><section className="metric-grid report-metrics"><Metric label="Gross sales" value={money(report.grossSales || 0)} hint="before discounts and tax" /><Metric label="Discounts" value={money(report.discounts || 0)} hint="deducted from sales" /><Metric label="Tax collected" value={money(report.taxesCollected || 0)} hint="excluded from revenue" /><Metric label="Net sales" value={money(profit.revenue || report.netSales || 0)} hint="revenue after discounts" /></section><section className="content-grid"><div className="panel"><div className="panel-head"><div><h2>Profit summary</h2><p>Uses historical cost snapshots from invoices.</p></div></div><div className="report-line"><span>Cost of goods sold</span><strong>{money(profit.costOfGoods || 0)}</strong></div><div className="report-line"><span>Gross profit</span><strong>{money(profit.grossProfit || 0)}</strong></div><div className="report-line"><span>Gross margin</span><strong>{(profit.margin || 0).toFixed(2)}%</strong></div><div className="report-line"><span>Transactions</span><strong>{report.transactionCount || 0}</strong></div></div><div className="panel"><div className="panel-head"><div><h2>Top-selling products</h2><p>Quantity sold during this period.</p></div></div>{report.topProducts?.length ? report.topProducts.map((p: SalesReport["topProducts"][number]) => <div className="compact-row" key={p.productId}><strong>{p.name}</strong><strong>{p.quantity} units</strong></div>) : <div className="empty">No sales in this date range.</div>}</div></section></>; }
function InvoiceDialog({ sale, onClose }: { sale: Sale; onClose: () => void }) { return <div className="dialog-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="invoice-dialog" role="dialog" aria-modal="true" aria-labelledby="invoice-title"><div className="panel-head"><div><span className="eyebrow">Invoice</span><h2 id="invoice-title">{sale.invoiceNumber}</h2></div><button className="ghost-button" onClick={onClose}>Close</button></div><p className="muted">{new Date(sale.createdAt).toLocaleString()} · {sale.userName}</p><div className="invoice-lines">{sale.lines.map((line, i) => <div className="report-line" key={`${line.productId}-${i}`}><span>{line.name} × {line.quantity}<small>{line.sku} · {money(line.price)} each</small></span><strong>{money(line.lineTotal)}</strong></div>)}</div><div className="report-line"><span>Subtotal</span><strong>{money(sale.subtotal)}</strong></div><div className="report-line"><span>Discount</span><strong>−{money(sale.discount)}</strong></div><div className="report-line"><span>Tax</span><strong>{money(sale.tax)}</strong></div><div className="report-line invoice-total"><span>Total</span><strong>{money(sale.total)}</strong></div></section></div>; }

type TeamMember = { id: string; name: string; email: string; role: "Admin" | "Staff"; active: boolean };
function AdminTeam({ onChanged }: { onChanged: () => Promise<void> }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => { const result = await api<{ users: TeamMember[] }>("/api/users"); setMembers(result.users); }, []);
  useEffect(() => { load().catch(e => setError(e instanceof Error ? e.message : "Could not load team.")); }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(""); setNotice("");
    try {
      await api("/api/users/staff", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", email: "", password: "" }); setNotice("Staff account created. Share the temporary password securely.");
      await Promise.all([load(), onChanged()]);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create Staff account."); }
    finally { setBusy(false); }
  }
  async function changeStatus(member: TeamMember) { try { await api(`/api/users/${member.id}/status`, { method: "PATCH", body: JSON.stringify({ active: !member.active }) }); await load(); setNotice(`Staff account ${member.active ? "deactivated" : "activated"}.`); } catch (e) { setError(e instanceof Error ? e.message : "Could not update account."); } }
  return <section className="content-grid"><div className="panel"><div className="panel-head"><div><h2>Create Staff account</h2><p>Only Admins can provision Staff. Passwords must be at least 12 characters.</p></div></div><form className="form-grid" onSubmit={submit}><label className="wide">Full name<input autoComplete="name" minLength={2} maxLength={80} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label><label className="wide">Email<input type="email" autoComplete="email" maxLength={254} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label><label className="wide">Temporary password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label><p className="wide muted">Give the temporary password to the Staff member through a private channel. Never send it in a shared chat.</p><button className="primary-button wide" disabled={busy}>{busy ? "Creating account…" : "Create Staff account"}</button></form>{error && <p className="alert error" role="alert">{error}</p>}{notice && <p className="alert success" role="status">{notice}</p>}</div><div className="panel"><div className="panel-head"><div><h2>Team access</h2><p>{members.length} account{members.length === 1 ? "" : "s"}</p></div></div>{members.length ? <PaginatedList items={members} pageSize={8} label="Team accounts" render={items => <>{items.map(member => <div className="compact-row" key={member.id}><span><strong>{member.name}</strong><small>{member.email} · {member.active ? "Active" : "Deactivated"}</small></span><span className="button-row"><span className={`tag ${member.role === "Admin" ? "healthy" : member.active ? "healthy" : "low"}`}>{member.role}</span>{member.role === "Staff" && <button className="ghost-button" onClick={() => changeStatus(member)}>{member.active ? "Deactivate" : "Reactivate"}</button>}</span></div>)}</>} /> : <div className="empty">No team members found.</div>}</div></section>;
}

function AdminSettings() {
  const [settings, setSettings] = useState({ businessName: "", taxRate: 0, maxDiscountPercent: 100 });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  useEffect(() => { api<{ settings: typeof settings }>("/api/settings").then(result => setSettings(result.settings)).catch(e => setError(e instanceof Error ? e.message : "Could not load settings.")); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); setNotice(""); try { const result = await api<{ settings: typeof settings }>("/api/settings", { method: "PUT", body: JSON.stringify(settings) }); setSettings(result.settings); setNotice("Business settings saved."); } catch (e) { setError(e instanceof Error ? e.message : "Could not save settings."); } finally { setBusy(false); } }
  return <section className="panel"><div className="panel-head"><div><h2>Business configuration</h2><p>These rules are applied by the server to new invoices. Past invoices keep their original tax snapshot.</p></div></div><form className="form-grid" onSubmit={submit}><label className="wide">Business name<input minLength={2} maxLength={100} value={settings.businessName} onChange={e => setSettings({ ...settings, businessName: e.target.value })} required /></label><label>Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={settings.taxRate} onChange={e => setSettings({ ...settings, taxRate: Number(e.target.value) })} required /></label><label>Maximum discount (%)<input type="number" min="0" max="100" step="0.01" value={settings.maxDiscountPercent} onChange={e => setSettings({ ...settings, maxDiscountPercent: Number(e.target.value) })} required /></label><p className="wide muted">Discounts entered at checkout are fixed amounts, capped at this percentage of the invoice subtotal. Tax is calculated after discount.</p><button className="primary-button wide" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button></form>{error && <p className="alert error" role="alert">{error}</p>}{notice && <p className="alert success" role="status">{notice}</p>}</section>;
}
