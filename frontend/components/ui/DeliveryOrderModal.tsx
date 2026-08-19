"use client";

import React from "react";
import { Printer, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import type { DeliveryOrderData } from "@/app/actions/sales";

interface DeliveryOrderModalProps {
  open: boolean;
  onClose: () => void;
  doData: DeliveryOrderData | null;
}

export default function DeliveryOrderModal({ open, onClose, doData }: DeliveryOrderModalProps) {
  if (!doData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 p-0 shadow-2xl rounded-2xl print:border-none print:shadow-none print:m-0 print:p-0 print:w-full print:h-auto">
        {/* Header bar */}
        <DialogHeader className="p-4 border-b border-slate-700 bg-slate-800 flex flex-row items-center justify-between print:hidden">
          <h3 className="font-bold text-white text-base">Surat Jalan / Delivery Order</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Printable Document Area */}
        <div id="do-print-area" className="p-8 sm:p-10 space-y-6 text-slate-900 bg-white print:p-4">
          <div className="text-center pb-4 border-b-2 border-slate-800">
            <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900 mb-1">FLOWERP STORE</h1>
            <h2 className="text-xl font-bold text-slate-700 uppercase">Surat Jalan / Delivery Order</h2>
          </div>

          <div className="flex justify-between text-sm">
            <div className="space-y-1">
              <p><span className="font-semibold w-28 inline-block">DO Number</span>: {doData.doNumber}</p>
              <p><span className="font-semibold w-28 inline-block">Order Number</span>: {doData.orderNumber}</p>
              <p><span className="font-semibold w-28 inline-block">Date</span>: {doData.issueDate}</p>
            </div>
            <div className="space-y-1 text-right max-w-xs">
              <p className="font-semibold uppercase text-slate-500 mb-1 text-xs">Penerima:</p>
              <p className="font-bold">{doData.customerName}</p>
              <p className="text-slate-600">{doData.customerAddress}</p>
            </div>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-800 font-semibold uppercase text-xs">
                <tr>
                  <th className="p-3 border-r border-slate-800 w-12 text-center">No</th>
                  <th className="p-3 border-r border-slate-800">Nama Barang</th>
                  <th className="p-3 border-r border-slate-800">SKU</th>
                  <th className="p-3 border-r border-slate-800 text-center w-24">Jumlah</th>
                  <th className="p-3 border-r border-slate-800 text-center w-24">Satuan</th>
                  <th className="p-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {doData.items && doData.items.length > 0 ? (
                  doData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 border-r border-slate-800 text-center">{idx + 1}</td>
                      <td className="p-3 border-r border-slate-800 font-medium">{item.productName}</td>
                      <td className="p-3 border-r border-slate-800 text-slate-600">{item.sku}</td>
                      <td className="p-3 border-r border-slate-800 text-center font-bold">{item.quantity}</td>
                      <td className="p-3 border-r border-slate-800 text-center">{item.unit}</td>
                      <td className="p-3"></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">No items available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-12 pb-4 text-center text-sm">
            <div className="flex flex-col items-center">
              <p className="mb-16 font-semibold">Dibuat Oleh,</p>
              <div className="border-t border-slate-800 w-40 pt-1">(Admin / Gudang)</div>
            </div>
            <div className="flex flex-col items-center">
              <p className="mb-16 font-semibold">Pengirim / Driver,</p>
              <div className="border-t border-slate-800 w-40 pt-1">(Nama Terang & TTD)</div>
            </div>
            <div className="flex flex-col items-center">
              <p className="mb-16 font-semibold">Diterima Oleh,</p>
              <div className="border-t border-slate-800 w-40 pt-1">(Stempel & TTD)</div>
            </div>
          </div>

          <div className="text-right text-[10px] text-slate-400 mt-8 pt-4 border-t border-slate-200">
            Printed on: {new Date().toLocaleString('id-ID')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
