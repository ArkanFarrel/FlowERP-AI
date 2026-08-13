import { Router } from 'express';
import { FinanceController } from './finance.controller.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';

const router = Router();
const controller = new FinanceController();

router.use(authenticate);

// ─── Accounts Receivable ───────────────────────────────────────────────────────
// Get all AR (unpaid / partial sales orders)
router.get('/receivables', controller.getReceivables);
// Get aging report for AR
router.get('/receivables/aging', controller.getReceivablesAging);
// Record a payment installment for a sales order
router.post('/receivables/pay', controller.recordReceivablePayment);
// Get payment history for a specific sales order
router.get('/receivables/:salesOrderId/payments', controller.getSalesOrderPayments);

// ─── Accounts Payable ──────────────────────────────────────────────────────────
// Get all AP (unpaid / partial purchase orders)
router.get('/payables', controller.getPayables);
// Get aging report for AP
router.get('/payables/aging', controller.getPayablesAging);
// Record a payment installment for a purchase order
router.post('/payables/pay', controller.recordPayablePayment);
// Get payment history for a specific purchase order
router.get('/payables/:purchaseOrderId/payments', controller.getPurchaseOrderPayments);

// ─── Per-Party Balances ──────────────────────────────────────────────────────────────────
// Get outstanding AR balance grouped per customer
router.get('/receivables/customer-balances', controller.getCustomerBalances);
// Get outstanding AP balance grouped per supplier
router.get('/payables/supplier-balances', controller.getSupplierBalances);

// ─── Dashboard Summary ──────────────────────────────────────────────────────────────────
router.get('/summary', controller.getFinanceSummary);

export default router;
