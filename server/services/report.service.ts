import { listProducts, listSales } from "../repositories/inventory.repository";

function inRange(createdAt: string, from?: string, to?: string) {
  const date = new Date(createdAt).getTime();
  const start = from ? new Date(`${from}T00:00:00.000Z`).getTime() : new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`).getTime();
  const end = to ? new Date(`${to}T23:59:59.999Z`).getTime() : new Date(`${new Date().toISOString().slice(0, 10)}T23:59:59.999Z`).getTime();
  return date >= start && date <= end;
}

async function rangedSales(from?: string, to?: string, userId?: string) { return (await listSales(userId)).filter(sale => inRange(sale.createdAt, from, to)); }

export async function getSalesReport(from?: string, to?: string, userId?: string) {
  const sales = await rangedSales(from, to, userId);
  const tally = new Map<string, { productId: string; name: string; quantity: number }>();
  sales.forEach(sale => sale.lines.forEach(line => { const current = tally.get(line.productId) || { productId: line.productId, name: line.name, quantity: 0 }; current.quantity += line.quantity; tally.set(line.productId, current); }));
  const grossSales = sales.reduce((sum, sale) => sum + sale.subtotal, 0);
  const discounts = sales.reduce((sum, sale) => sum + sale.discount, 0);
  const taxesCollected = sales.reduce((sum, sale) => sum + sale.tax, 0);
  const netSales = grossSales - discounts;
  return { from: from || new Date().toISOString().slice(0, 10), to: to || new Date().toISOString().slice(0, 10), totalSales: Number(netSales.toFixed(2)), grossSales: Number(grossSales.toFixed(2)), discounts: Number(discounts.toFixed(2)), taxesCollected: Number(taxesCollected.toFixed(2)), netSales: Number(netSales.toFixed(2)), transactionCount: sales.length, topProducts: [...tally.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5), lowStock: (await listProducts({ status: "Low" })).slice(0, 8) };
}

export async function getProfitReport(from?: string, to?: string) {
  const sales = await rangedSales(from, to);
  const revenue = sales.reduce((sum, sale) => sum + sale.subtotal - sale.discount, 0);
  const costOfGoods = sales.reduce((sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + (line.costPrice || 0) * line.quantity, 0), 0);
  const grossProfit = revenue - costOfGoods;
  return { from: from || new Date().toISOString().slice(0, 10), to: to || new Date().toISOString().slice(0, 10), revenue: Number(revenue.toFixed(2)), costOfGoods: Number(costOfGoods.toFixed(2)), grossProfit: Number(grossProfit.toFixed(2)), margin: revenue ? Number(((grossProfit / revenue) * 100).toFixed(2)) : 0 };
}
