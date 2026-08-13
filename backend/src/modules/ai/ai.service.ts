import { prisma } from '../../config/database.config.js';
import { DashboardRepository } from '../dashboard/dashboard.repository.js';
import { ReportRepository } from '../report/report.repository.js';

export class AiService {
  constructor(
    private dashboardRepo = new DashboardRepository(),
    private reportRepo = new ReportRepository()
  ) {}

  async getAiInsights(companyId: string) {
    const metrics = await this.dashboardRepo.getMetricsSummary(companyId);
    const salesReport = await this.reportRepo.getSalesReport(companyId);

    let healthScore = 85;
    if (metrics.lowStockCount > 5) healthScore -= 10;
    if (salesReport.summary.totalOrders > 10) healthScore += 5;
    healthScore = Math.min(100, Math.max(40, healthScore));

    const forecast = salesReport.summary.totalRevenue * 1.14;

    return {
      businessScore: healthScore,
      healthChange: '+5%',
      revenueForecast: Number(forecast.toFixed(2)),
      forecastChange: '+14%',
      inventoryRiskCount: metrics.lowStockCount,
      aiRecommendationsCount: 5 + metrics.lowStockCount,
      insights: [
        `Sales are performing solid with ${salesReport.summary.totalOrders} completed orders.`,
        metrics.lowStockCount > 0
          ? `Alert: ${metrics.lowStockCount} products are running low on stock and need restock.`
          : 'Stock levels are optimal across all categories.',
        `Estimated revenue for next month is projected at $${forecast.toFixed(2)}.`,
      ],
    };
  }

  async getStockPredictions(companyId: string) {
    const inventoryReport = await this.reportRepo.getInventoryReport(companyId);
    const lowStockItems = inventoryReport.items.filter((i) => i.isLowStock);

    const predictions = lowStockItems.map((item) => ({
      productId: item.id,
      productName: item.name,
      sku: item.sku,
      currentStock: item.stock,
      minimumStock: item.minimumStock,
      estimatedDaysRemaining: Math.max(1, Math.floor(item.stock * 1.5)),
      suggestedRestockQuantity: item.minimumStock * 3,
      urgency: item.stock === 0 ? 'CRITICAL' : 'HIGH',
    }));

    return {
      totalPredictedLowStock: predictions.length,
      predictions,
    };
  }

  async processChatQuery(companyId: string, prompt: string) {
    const metrics = await this.dashboardRepo.getMetricsSummary(companyId);
    const salesReport = await this.reportRepo.getSalesReport(companyId);
    const inventoryReport = await this.reportRepo.getInventoryReport(companyId);

    const apiKey = process.env.GEMINI_API_KEY;
    let answer = '';

    if (apiKey) {
      try {
        const systemInstruction = `Anda adalah FlowERP AI, asisten bisnis cerdas enterprise ERP untuk UMKM.
Berikut adalah konteks data real-time bisnis pengguna saat ini dari database dashboard:
- Total Omzet/Revenue: $${metrics.totalRevenue.toLocaleString()}
- Total Pesanan/Orders: ${metrics.totalOrders}
- Total Produk di Katalog: ${metrics.totalProducts}
- Jumlah Produk Stok Menipis (Low Stock Alert): ${metrics.lowStockCount}
- Total Pelanggan Terdaftar: ${metrics.totalCustomers}
- Ringkasan Produk Low Stock: ${inventoryReport.items.filter(i => i.isLowStock).map(i => `${i.name} (Sisa: ${i.stock})`).join(', ') || 'Semua stok cukup'}

Tugas Anda: Jawab pertanyaan pengguna secara sopan, profesional, berbasis data nyata di atas, serta berikan rekomendasi bisnis atau analisa yang konkret dan bermanfaat. Jawab dalam bahasa Indonesia (atau sesuai bahasa pengguna).`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: `${systemInstruction}\n\nPertanyaan Pengguna: ${prompt}` }
                ]
              }
            ]
          })
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          console.error("Gemini API Error Status:", res.status, await res.text());
        }
      } catch (err) {
        console.error("Gemini API connection error:", err);
      }
    }

    // Fallback if API response is empty or fails
    if (!answer) {
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes('omzet') || lowerPrompt.includes('revenue') || lowerPrompt.includes('sales')) {
        answer = `Total omzet bisnis Anda saat ini mencatatkan $${metrics.totalRevenue.toLocaleString()} dari ${metrics.totalOrders} transaksi penjualan.`;
      } else if (lowerPrompt.includes('stok') || lowerPrompt.includes('stock') || lowerPrompt.includes('inventory')) {
        answer = `Saat ini terdapat ${metrics.totalProducts} produk di katalog dengan ${metrics.lowStockCount} produk dalam status stok menipis (low stock).`;
      } else if (lowerPrompt.includes('customer') || lowerPrompt.includes('pelanggan')) {
        answer = `Jumlah pelanggan terdaftar di sistem FlowERP AI saat ini adalah ${metrics.totalCustomers} pelanggan.`;
      } else {
        answer = `Berdasarkan analisis data bisnis FlowERP AI Anda: Total Revenue $${metrics.totalRevenue.toLocaleString()}, Total Transaksi ${metrics.totalOrders}, dan Total Katalog ${metrics.totalProducts} produk. Kesehatan bisnis dalam kondisi optimal.`;
      }
    }

    try {
      await prisma.aiLog.create({
        data: {
          companyId,
          prompt,
          response: answer,
          tokensUsed: Math.floor(prompt.length / 4) + 20,
        },
      });
    } catch {
      // Ignore log error
    }

    return {
      prompt,
      response: answer,
    };
  }
}

