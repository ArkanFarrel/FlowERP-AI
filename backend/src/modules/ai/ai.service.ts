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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [products, sales30Days] = await Promise.all([
      prisma.product.findMany({
        where: { companyId },
        include: { supplier: true },
      }),
      prisma.salesItem.groupBy({
        by: ['productId'],
        where: {
          salesOrder: {
            companyId,
            createdAt: { gte: thirtyDaysAgo },
          },
        },
        _sum: { quantity: true },
      }),
    ]);

    const velocityMap = new Map<string, number>();
    sales30Days.forEach((item) => {
      velocityMap.set(item.productId, item._sum.quantity || 0);
    });

    const predictions = products.map((item) => {
      const sold30Days = velocityMap.get(item.id) || 0;
      const dailyVelocity = sold30Days / 30;
      const estimatedDaysRemaining = dailyVelocity > 0 ? Math.max(1, Math.round(item.stock / dailyVelocity)) : (item.stock === 0 ? 0 : 999);
      const suggestedRestockQuantity = Math.max((item.minimumStock || 10) * 2, Math.round(dailyVelocity * 30 || 50));
      const supplierName = item.supplier ? (item.supplier.companyName || item.supplier.name) : "Supplier Utama";

      let urgency = "OPTIMAL";
      let recommendationText = "";

      if (item.stock === 0 || (dailyVelocity > 0 && estimatedDaysRemaining <= 3)) {
        urgency = "CRITICAL";
        recommendationText = `Stok ${item.name} diperkirakan habis dalam ${estimatedDaysRemaining <= 0 ? 1 : estimatedDaysRemaining} hari. Disarankan buat PO sebanyak ${suggestedRestockQuantity} unit ke ${supplierName} hari ini.`;
      } else if (item.stock <= item.minimumStock || (dailyVelocity > 0 && estimatedDaysRemaining <= 7)) {
        urgency = "HIGH";
        recommendationText = `Stok ${item.name} (sisa ${item.stock} unit) diperkirakan habis dalam ${estimatedDaysRemaining} hari. Disarankan buat PO sebanyak ${suggestedRestockQuantity} unit ke ${supplierName} hari ini.`;
      } else if (sold30Days === 0 && item.stock > 5) {
        urgency = "DEAD_STOCK";
        recommendationText = `Stok Mati (Dead Stock): ${item.name} tidak ada penjualan 30 hari terakhir (${item.stock} unit terendap). Disarankan diskon clearance.`;
      } else {
        urgency = "OPTIMAL";
        recommendationText = `Stok ${item.name} aman (${item.stock} unit).`;
      }

      return {
        productId: item.id,
        productName: item.name,
        sku: item.sku,
        currentStock: item.stock,
        minimumStock: item.minimumStock,
        salesVelocity30Days: sold30Days,
        dailyVelocity: Number(dailyVelocity.toFixed(2)),
        estimatedDaysRemaining,
        suggestedRestockQuantity,
        supplierId: item.supplierId,
        supplierName,
        urgency,
        recommendationText,
      };
    });

    const activePredictions = predictions.filter((p) => p.urgency !== "OPTIMAL");

    return {
      totalPredictedLowStock: activePredictions.length,
      predictions: activePredictions.length > 0 ? activePredictions : predictions,
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

