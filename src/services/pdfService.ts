import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface PDFData {
  tenant: any;
  client: any;
  items: any[];
  summary: {
    subtotal: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    total: number;
  };
  docInfo: {
    number: string;
    date: Date;
    validUntil: Date;
  };
}

export function generateInvoicePDF(data: PDFData) {
  const doc = new jsPDF();
  const { tenant, client, items, summary, docInfo } = data;

  // Header - Branded (Dark Blue)
  doc.setFontSize(24);
  doc.setTextColor(30, 58, 138); // blue-900 (#1e3a8a)
  doc.text(tenant.company_name || 'BillKaro', 14, 22);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(tenant.address || '', 14, 28);
  doc.text(`GSTIN: ${tenant.gstin || 'N/A'} | State: ${tenant.state || 'N/A'}`, 14, 33);

  // Document Type Header
  doc.setFontSize(28);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('QUOTATION', 196, 25, { align: 'right' });

  // Bill To & Quote Info
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO:', 14, 45);
  doc.text('QUOTE DETAILS:', 196, 45, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(client.name || 'N/A', 14, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Number: ${docInfo.number}`, 196, 52, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Phone: ${client.phone || 'N/A'}`, 14, 57);
  doc.text(`Address: ${client.address || 'N/A'}`, 14, 62);
  doc.text(`GSTIN: ${client.gstin || 'N/A'}`, 14, 67);
  doc.text(`Place of Supply: ${client.state || 'N/A'}`, 14, 72);

  doc.text(`Date: ${format(docInfo.date, 'dd MMM yyyy')}`, 196, 57, { align: 'right' });
  doc.text(`Valid Until: ${format(docInfo.validUntil, 'dd MMM yyyy')}`, 196, 62, { align: 'right' });

  // Line Items Table
  const tableRows = items.map(item => [
    item.productName,
    item.quantity.toString(),
    `$${item.unitPrice.toFixed(2)}`,
    `${item.gstRate}%`,
    `$${item.lineTotal.toFixed(2)}`
  ]);

  doc.autoTable({
    startY: 82,
    head: [['Description', 'Qty', 'Unit Rate', 'GST %', 'Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
    bodyStyles: { textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  // Totals Section
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', 140, finalY, { align: 'right' });
  
  doc.setTextColor(15, 23, 42);
  doc.text(`$${summary.subtotal.toFixed(2)}`, 196, finalY, { align: 'right' });

  let taxY = finalY + 7;
  if (summary.igst && summary.igst > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('IGST (Inter-state):', 140, taxY, { align: 'right' });
    doc.setTextColor(15, 23, 42);
    doc.text(`$${summary.igst.toFixed(2)}`, 196, taxY, { align: 'right' });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text('CGST:', 140, taxY, { align: 'right' });
    doc.setTextColor(15, 23, 42);
    doc.text(`$${(summary.cgst || 0).toFixed(2)}`, 196, taxY, { align: 'right' });
    
    taxY += 7;
    doc.setTextColor(100, 116, 139);
    doc.text('SGST:', 140, taxY, { align: 'right' });
    doc.setTextColor(15, 23, 42);
    doc.text(`$${(summary.sgst || 0).toFixed(2)}`, 196, taxY, { align: 'right' });
  }

  const grandTotalY = taxY + 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(130, grandTotalY - 7, 196, grandTotalY - 7);
  
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', 140, grandTotalY, { align: 'right' });
  doc.text(`$${summary.total.toFixed(2)}`, 196, grandTotalY, { align: 'right' });

  // Bank Info & Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 35, 196, pageHeight - 35);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT DETAILS:', 14, pageHeight - 28);
  
  doc.setTextColor(15, 23, 42);
  const bank = tenant.bank_details;
  doc.text([
    `Bank: ${bank?.bank_name || 'N/A'}`,
    `A/C: ${bank?.account_number || 'N/A'}`,
    `IFSC: ${bank?.ifsc || 'N/A'}`
  ], 14, pageHeight - 22);

  doc.setTextColor(100, 116, 139);
  doc.text('NOTE:', 100, pageHeight - 28);
  doc.text(doc.splitTextToSize(tenant.terms_conditions || 'Quotations are valid for 30 days. All disputes are subject to local jurisdiction.', 80), 100, pageHeight - 22);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorised Signatory', 196, pageHeight - 10, { align: 'right' });

  return doc;
}
