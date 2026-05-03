/**
 * Test script: Generate test Invoice, Bulk Invoice & Shipping Label PDFs
 * Run: npx ts-node scripts/test-invoice.ts
 * Output: scripts/test-invoice.pdf, test-bulk-invoice.pdf, test-shipping-label.pdf
 */
import path from "path";
import fs from "fs";
import { generateInvoicePDF, generateBulkInvoicePDF } from "../src/services/invoiceGenerator";
import { generateShippingLabelPDF } from "../src/services/shippingLabelGenerator";

const outputDir = path.join(__dirname);

// Expected values that must appear in all generated PDFs
const EXPECTED = {
  companyName: "The Awla Company Pvt Ltd",
  gstin: "08AAMCT9879P1ZV",
  phone1: "96641 61773",
  phone2: "95539 04820",
  taxNote: "Inclusive of all taxes",
};

async function testRegularInvoice() {
  console.log("\n📄 Generating REGULAR Invoice ...");

  const mockOrder: any = {
    orderNumber: "TAC-TEST-001",
    invoiceNumber: "INV-2026-TEST-001",
    createdAt: new Date().toISOString(),
    paymentStatus: "VERIFIED",
    paymentTransactionId: "TXN_TEST_123456789",

    customerName: "Rahul Sharma",
    customerPhone: "+91 98765 43210",
    customerEmail: "rahul@example.com",
    addressLine1: "123, Green Park Colony",
    addressLine2: "Near City Mall",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    gstNumber: "08ABCDE1234F1Z5",

    products: [
      { name: "Pure Amla Powder", variant: "500g", quantity: 2, unitPrice: 349, totalPrice: 698 },
      { name: "Amla Candy", variant: "250g", quantity: 3, unitPrice: 199, totalPrice: 597 },
      { name: "Amla Hair Oil", variant: "200ml", quantity: 1, unitPrice: 449, totalPrice: 449 },
    ],

    subtotal: 1744,
    shippingAmount: 0,
    taxAmount: 0,
    discountAmount: 100,
    couponDiscount: 100,
    totalAmount: 1644,
    trackingId: "DTDC123456789",
    deliveryPartner: "DTDC",
    expectedDeliveryDate: "10 May 2026",
  };

  const pdfBuffer = await generateInvoicePDF(mockOrder);
  const outputPath = path.join(outputDir, "test-invoice.pdf");
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`   ✅ Saved: ${outputPath} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
  return pdfBuffer;
}

async function testBulkInvoice() {
  console.log("\n📄 Generating BULK Invoice ...");

  const mockBulkOrder: any = {
    orderNumber: "BULK-TEST-001",
    invoiceNumber: "BINV-2026-TEST-001",
    createdAt: new Date().toISOString(),
    orderStatus: "CONFIRMED",

    businessName: "ABC Enterprises",
    customerName: "Vikram Patel",
    customerPhone: "+91 87654 32100",
    customerEmail: "vikram@abcenterprises.com",
    addressLine1: "456, Industrial Area Phase-2",
    addressLine2: "Sector 22",
    city: "Udaipur",
    state: "Rajasthan",
    pincode: "313001",
    gstNumber: "08FGHIJ5678K1Z9",

    items: [
      { productName: "Amla Powder", variant: "1kg", quantity: 50, unitPrice: 599, totalPrice: 29950 },
      { productName: "Amla Candy", variant: "500g", quantity: 100, unitPrice: 349, totalPrice: 34900 },
    ],

    subtotal: 64850,
    discountAmount: 5000,
    discountType: "FIXED",
    taxAmount: 0,
    totalAmount: 59850,

    prepaidAmount: 30000,
    prepaidStatus: "PAID",
    creditAmount: 29850,
    creditStatus: "PENDING",

    trackingId: "BW1234567890",
    deliveryPartner: "Bluedart",
    expectedDeliveryDate: "15 May 2026",
  };

  const pdfBuffer = await generateBulkInvoicePDF(mockBulkOrder);
  const outputPath = path.join(outputDir, "test-bulk-invoice.pdf");
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`   ✅ Saved: ${outputPath} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
  return pdfBuffer;
}

async function testShippingLabel() {
  console.log("\n📄 Generating SHIPPING LABEL ...");

  const mockOrder: any = {
    orderNumber: "TAC-TEST-001",
    createdAt: new Date().toISOString(),
    paymentStatus: "VERIFIED",
    customerName: "Rahul Sharma",
    customerPhone: "+91 98765 43210",
    customerEmail: "rahul@example.com",
    addressLine1: "123, Green Park Colony",
    addressLine2: "Near City Mall",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    totalAmount: 1644,
    products: [
      { name: "Pure Amla Powder", variant: "500g", quantity: 2 },
      { name: "Amla Candy", variant: "250g", quantity: 3 },
    ],
  };

  const pdfBuffer = await generateShippingLabelPDF(mockOrder);
  const outputPath = path.join(outputDir, "test-shipping-label.pdf");
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`   ✅ Saved: ${outputPath} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
  return pdfBuffer;
}

/** Verify source code contains expected strings (simpler than parsing PDF binary) */
function verifySourceCode() {
  console.log("\n🔍 Verifying source code contains expected values ...\n");

  const invoiceSrc = fs.readFileSync(
    path.join(__dirname, "../src/services/invoiceGenerator.ts"),
    "utf8"
  );
  const labelSrc = fs.readFileSync(
    path.join(__dirname, "../src/services/shippingLabelGenerator.ts"),
    "utf8"
  );

  interface CheckItem {
    label: string;
    search: string;
    sources: { name: string; src: string }[];
  }

  const checks: CheckItem[] = [
    {
      label: "Company Name (The Awla Company Pvt Ltd)",
      search: "The Awla Company Pvt Ltd",
      sources: [
        { name: "invoiceGenerator", src: invoiceSrc },
        { name: "shippingLabel", src: labelSrc },
      ],
    },
    {
      label: "GSTIN (08AAMCT9879P1ZV)",
      search: "08AAMCT9879P1ZV",
      sources: [
        { name: "invoiceGenerator", src: invoiceSrc },
        { name: "shippingLabel", src: labelSrc },
      ],
    },
    {
      label: "Phone 1 (96641 61773)",
      search: "96641 61773",
      sources: [
        { name: "invoiceGenerator", src: invoiceSrc },
        { name: "shippingLabel", src: labelSrc },
      ],
    },
    {
      label: "Phone 2 (95539 04820)",
      search: "95539 04820",
      sources: [
        { name: "invoiceGenerator", src: invoiceSrc },
        { name: "shippingLabel", src: labelSrc },
      ],
    },
    {
      label: "Inclusive of all taxes (GST)",
      search: "Inclusive of all taxes",
      sources: [{ name: "invoiceGenerator", src: invoiceSrc }],
    },
  ];

  let allPass = true;

  for (const check of checks) {
    for (const { name, src } of check.sources) {
      const found = src.includes(check.search);
      const icon = found ? "✅" : "❌";
      console.log(`   ${icon} [${name}] ${check.label}`);
      if (!found) allPass = false;
    }
  }

  // Negative checks: ensure OLD wrong values are gone
  console.log("\n🔍 Verifying OLD values removed ...\n");

  const negativeChecks = [
    { label: "Old phone 93519 93519 removed from shipping label", search: "93519 93519", src: labelSrc },
    { label: "Old 'The Awla Company' without Pvt Ltd in shipping label", search: '"The Awla Company"', src: labelSrc },
  ];

  for (const check of negativeChecks) {
    // These should NOT be found
    const found = check.src.includes(check.search);
    const icon = !found ? "✅" : "❌";
    console.log(`   ${icon} ${check.label}`);
    if (found) allPass = false;
  }

  return allPass;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  🧾 TAC Invoice & Shipping Label Test Suite");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n  Expected details on ALL documents:");
  console.log(`  Company:  ${EXPECTED.companyName}`);
  console.log(`  GSTIN:    ${EXPECTED.gstin}`);
  console.log(`  Phone 1:  +91 ${EXPECTED.phone1}`);
  console.log(`  Phone 2:  +91 ${EXPECTED.phone2}`);
  console.log(`  Note:     ${EXPECTED.taxNote} (invoices only)`);

  // Generate PDFs
  await testRegularInvoice();
  await testBulkInvoice();
  await testShippingLabel();

  // Verify source code
  const allPass = verifySourceCode();

  console.log("\n═══════════════════════════════════════════════════════");
  if (allPass) {
    console.log("  ✅ ALL CHECKS PASSED!");
  } else {
    console.log("  ❌ SOME CHECKS FAILED — review above output");
    process.exit(1);
  }
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n📂 Open these PDFs to visually verify layout:");
  console.log("   • scripts/test-invoice.pdf");
  console.log("   • scripts/test-bulk-invoice.pdf");
  console.log("   • scripts/test-shipping-label.pdf\n");
}

main().catch(console.error);
