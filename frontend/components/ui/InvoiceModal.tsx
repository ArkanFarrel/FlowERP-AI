"use client";

import React from "react";
import { Printer, X, CheckCircle2, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/currency";

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InvoiceData {
  orderNumber: string;
  date: string;
  type: "SALES" | "PURCHASE";
  partyName: string; // Customer or Supplier name
  partyCompany?: string;
  partyEmail?: string;
  paymentStatus: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  companyName?: string;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export default function InvoiceModal({
  isOpen,
  onClose,
  invoice,
}: InvoiceModalProps) {
  if (!invoice) return null;

  const handlePrint = () => {
    import("@/lib/pdf-generator").then(({ generateStructuredInvoicePDF }) => {
      generateStructuredInvoicePDF({
        invoiceNumber: invoice.orderNumber,
        date: formattedDate,
        status: invoice.paymentStatus,
        companyName: invoice.companyName || "FlowERP AI",
        customerName: invoice.partyName,
        customerEmail: invoice.partyEmail,
        items: invoice.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.subtotal,
        })),
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
      });
    });
  };

  const formattedDate = invoice.date || new Date().toLocaleDateString("en-GB");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0 shadow-2xl">
        {/* Top Control Bar (Hidden when printing) */}
        <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 print:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {invoice.type === "SALES" ? "Sales Invoice" : "Purchase Order Invoice"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* PRINTABLE INVOICE BODY */}
        <div id="printable-invoice" className="p-8 sm:p-10 space-y-8 bg-white text-slate-900">
          {/* Invoice Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm">
                  F
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  {invoice.companyName || "FlowERP Store"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Enterprise Operations & Management
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
                {invoice.type === "SALES" ? "OFFICIAL INVOICE" : "PURCHASE ORDER"}
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 mt-2">
                {invoice.orderNumber}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Date: {formattedDate}</p>
            </div>
          </div>

          {/* Party Details */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div>
              <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">
                Billed To ({invoice.type === "SALES" ? "Customer" : "Supplier"})
              </p>
              <p className="text-sm font-bold text-slate-900">{invoice.partyName}</p>
              {invoice.partyCompany && (
                <p className="text-slate-600 mt-0.5">{invoice.partyCompany}</p>
              )}
              {invoice.partyEmail && (
                <p className="text-slate-500 mt-0.5">{invoice.partyEmail}</p>
              )}
            </div>

            <div className="text-right">
              <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">
                Payment Information
              </p>
              <div className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {invoice.paymentStatus}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-medium text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="p-3 text-right">{item.quantity}</td>
                      <td className="p-3 text-right">{formatPrice(item.unitPrice)}</td>
                      <td className="p-3 text-right font-semibold">{formatPrice(item.subtotal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-3 font-medium text-slate-400">1</td>
                    <td className="p-3 font-semibold text-slate-900">{invoice.type === "SALES" ? "Sales Order Items" : "Procurement Items"}</td>
                    <td className="p-3 text-right">1</td>
                    <td className="p-3 text-right">{formatPrice(invoice.subtotal || invoice.total)}</td>
                    <td className="p-3 text-right font-semibold">{formatPrice(invoice.subtotal || invoice.total)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Calculation */}
          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-2 border-t border-slate-200 pt-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatPrice(invoice.subtotal || invoice.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax (10%):</span>
                <span>{formatPrice(invoice.tax || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total Amount:</span>
                <span className="text-sky-600">{formatPrice(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-900">Thank you for your business!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Generated via FlowERP AI Platform</p>
            </div>
            <div className="text-center w-40">
              <div className="border-b border-slate-300 h-10 mb-1"></div>
              <p className="text-[11px] font-medium text-slate-600">Authorized Signature</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
