-- Razorpay can accept a refund while it is still pending with the payment
-- network. Keep that distinct from an ambiguous request timeout.
ALTER TYPE "PaymentReconciliationStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
