import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import Payroll from './Payroll';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
import StatusPill from '../../../shared/components/StatusPill';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Wallet,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Loader2,
  X,
  RotateCw,
  AlertTriangle,
  Coins,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  CheckCircle2,
  Building2,
  Search,
  Filter,
  AlertCircle,
  Sliders,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  Printer,
  Eye,
  Layers,
  ShoppingBag,
  UserCheck,
  Tag,
  CreditCard,
  Building,
  DollarSign,
  HelpCircle,
  ExternalLink,
  Receipt,
  BookOpen,
  PieChart,
  Check,
  Link2
} from 'lucide-react';

/**
 * Terbilang Rupiah Helper untuk Cetak Bukti Kas Keluar (BKK) & Pemindahan Kas (BPK)
 */
function toTerbilang(angka) {
  const bil = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const n = Math.floor(Math.abs(Number(angka) || 0));
  if (n < 12) return bil[n];
  if (n < 20) return toTerbilang(n - 10) + ' Belas';
  if (n < 100) return toTerbilang(Math.floor(n / 10)) + ' Puluh ' + toTerbilang(n % 10);
  if (n < 200) return 'Seratus ' + toTerbilang(n - 100);
  if (n < 1000) return toTerbilang(Math.floor(n / 100)) + ' Ratus ' + toTerbilang(n % 100);
  if (n < 2000) return 'Seribu ' + toTerbilang(n - 1000);
  if (n < 1000000) return toTerbilang(Math.floor(n / 1000)) + ' Ribu ' + toTerbilang(n % 1000);
  if (n < 1000000000) return toTerbilang(Math.floor(n / 1000000)) + ' Juta ' + toTerbilang(n % 1000000);
  if (n < 1000000000000) return toTerbilang(Math.floor(n / 1000000000)) + ' Milyar ' + toTerbilang(n % 1000000000);
  return toTerbilang(Math.floor(n / 1000000000000)) + ' Triliun ' + toTerbilang(n % 1000000000000);
}

/**
 * Membuka Popup Cetak Bukti Pemindahan Kas (BPK / Internal Cash Transfer Voucher)
 */
function openCashTransferVoucherInNewTab(transfer, unitName = 'Yayasan Aldepos') {
  const printWindow = window.open('', '_blank', 'width=900,height=750,menubar=no,toolbar=no,location=no,status=no');
  if (!printWindow) {
    alert('Pop-up browser terblokir. Izinkan pop-up untuk mencetak Bukti Pemindahan Kas.');
    return;
  }

  const transferDate = transfer.transfer_date ? formatDate(transfer.transfer_date) : formatDate(new Date());
  const totalAmount = parseFloat(transfer.amount || 0);
  const words = (toTerbilang(totalAmount) + ' Rupiah').replace(/\s+/g, ' ').trim();
  const voucherNo = transfer.transfer_number || `TRF-${transfer.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
    `ALDEPOS-TRF|NO:${voucherNo}|UNIT:${unitName}|NOMINAL:Rp${totalAmount}|TGL:${transferDate}|VALID`
  )}`;

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Bukti Pemindahan Kas - ${voucherNo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; background: #fff; padding: 24px; }
        .voucher-card { max-width: 800px; margin: 0 auto; border: 2px solid #312e81; padding: 24px; border-radius: 8px; position: relative; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #312e81; padding-bottom: 12px; margin-bottom: 16px; }
        .org-info h2 { font-size: 18px; font-weight: 800; color: #312e81; text-transform: uppercase; letter-spacing: 0.5px; }
        .org-info p { font-size: 11px; color: #475569; margin-top: 2px; }
        .doc-title { text-align: right; }
        .doc-title h1 { font-size: 18px; font-weight: 900; color: #4338ca; text-transform: uppercase; letter-spacing: 1px; }
        .doc-title .doc-num { font-size: 12px; font-family: monospace; font-weight: 700; color: #0f172a; margin-top: 3px; }
        
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 11.5px; }
        .meta-row { display: flex; margin-bottom: 4px; }
        .meta-label { width: 150px; color: #475569; font-weight: 600; }
        .meta-val { flex: 1; font-weight: 700; color: #0f172a; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px; }
        th { background: #e0e7ff; border: 1px solid #c7d2fe; padding: 8px 10px; font-weight: 700; text-align: left; color: #312e81; }
        td { border: 1px solid #e2e8f0; padding: 8px 10px; vertical-align: top; }
        .total-row td { background: #f8fafc; font-weight: 800; font-size: 12px; }
        
        .terbilang-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; }
        .terbilang-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
        .terbilang-text { font-size: 12px; font-weight: 700; color: #0f172a; font-style: italic; }

        .signature-section { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 16px; margin-top: 24px; padding-top: 12px; }
        .digital-box { display: flex; align-items: center; gap: 10px; }
        .digital-box img { width: 80px; height: 80px; border: 1px solid #cbd5e1; padding: 2px; }
        .digital-text h4 { font-size: 10px; font-weight: 800; color: #4338ca; }
        .digital-text p { font-size: 9.5px; color: #64748b; line-height: 1.3; }
        .sign-box { text-align: center; display: flex; flex-direction: column; justify-content: space-between; height: 95px; }
        .sign-title { font-size: 11px; font-weight: 600; color: #475569; }
        .sign-name { font-size: 11.5px; font-weight: 700; color: #0f172a; border-top: 1px solid #94a3b8; padding-top: 4px; margin-top: auto; }

        .print-btn-bar { margin-top: 24px; text-align: center; }
        .btn { padding: 8px 18px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; margin: 0 4px; border: none; }
        .btn-primary { background: #4338ca; color: #fff; }
        .btn-secondary { background: #e2e8f0; color: #334155; }

        @media print {
          .print-btn-bar { display: none; }
          body { padding: 0; }
          .voucher-card { border: 1px solid #000; }
        }
      </style>
    </head>
    <body>
      <div class="voucher-card">
        <div class="header">
          <div class="org-info">
            <h2>${unitName}</h2>
            <p>Sistem Manajemen Keuangan Terpadu Aldepos</p>
          </div>
          <div class="doc-title">
            <h1>BUKTI PEMINDAHAN KAS</h1>
            <div class="doc-num">NO: ${voucherNo}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-row">
              <span class="meta-label">Kas / Rekening Asal:</span>
              <span class="meta-val">${transfer.from_cash_account_name || 'Kas Asal'} ${transfer.from_bank_name ? `(${transfer.from_bank_name} - ${transfer.from_bank_account_number || ''})` : ''}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Kas / Rekening Tujuan:</span>
              <span class="meta-val">${transfer.to_cash_account_name || 'Kas Tujuan'} ${transfer.to_bank_name ? `(${transfer.to_bank_name} - ${transfer.to_bank_account_number || ''})` : ''}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Keterangan / Alasan:</span>
              <span class="meta-val">${transfer.reason || 'Pemindahan Kas Internal'}</span>
            </div>
          </div>
          <div>
            <div class="meta-row">
              <span class="meta-label">Tanggal Pemindahan:</span>
              <span class="meta-val">${transferDate}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">No. Referensi / Slip:</span>
              <span class="meta-val">${transfer.reference_number || '-'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">No. Jurnal Akuntansi:</span>
              <span class="meta-val">${transfer.journal_number || 'Auto Jurnal Berpasangan'}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;" class="text-center">No</th>
              <th>Deskripsi Mutasi Internal Kas</th>
              <th>Akun Asal (Kredit)</th>
              <th>Akun Tujuan (Debet)</th>
              <th style="width: 150px;" class="text-right">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">1</td>
              <td style="font-weight: 600;">
                Pemindahan saldo kas internal
                <br/><span style="font-size:10px; color:#64748b;">${transfer.reason || '-'}</span>
              </td>
              <td>${transfer.from_cash_account_name || 'Kas Asal'}</td>
              <td>${transfer.to_cash_account_name || 'Kas Tujuan'}</td>
              <td class="text-right" style="font-weight: 700; font-family: monospace; color: #4338ca;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
            </tr>
            <tr class="total-row">
              <td colspan="4" style="text-align: right; text-transform: uppercase;">Total Dana Dipindahkan:</td>
              <td class="text-right" style="color: #4338ca; font-family: monospace;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <div class="terbilang-box">
          <div class="terbilang-label">Jumlah Uang Terbilang</div>
          <div class="terbilang-text"># ${words} #</div>
        </div>

        <div class="signature-section">
          <div class="digital-box">
            <img src="${qrUrl}" alt="QR Validation" />
            <div class="digital-text">
              <h4>VERIFIKASI DIGITAL</h4>
              <p>Dokumen BPK resmi & telah dibukukan secara otomatis ke Jurnal Kas Aldepos.</p>
            </div>
          </div>
          <div class="sign-box">
            <div class="sign-title">Kasir / Petugas Pengirim,</div>
            <div class="sign-name">${transfer.from_cash_account_name || 'Petugas Pengirim'}</div>
          </div>
          <div class="sign-box">
            <div class="sign-title">Kasir / Petugas Penerima,</div>
            <div class="sign-name">${transfer.to_cash_account_name || 'Petugas Penerima'}</div>
          </div>
        </div>

        <div class="print-btn-bar">
          <button class="btn btn-primary" onclick="window.print()">&#128424; Cetak / Simpan PDF</button>
          <button class="btn btn-secondary" onclick="window.close()">Tutup Jendela</button>
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Membuka Popup Cetak Bukti Kas Keluar (BKK / Voucher Pengeluaran)
 */
function openExpenseVoucherInNewTab(voucher, unitName = 'Yayasan Aldepos') {
  const printWindow = window.open('', '_blank', 'width=900,height=750,menubar=no,toolbar=no,location=no,status=no');
  if (!printWindow) {
    alert('Pop-up browser terblokir. Izinkan pop-up untuk mencetak Bukti Kas Keluar.');
    return;
  }

  const expenseDate = voucher.expense_date ? formatDate(voucher.expense_date) : formatDate(new Date());
  const totalAmount = parseFloat(voucher.total_amount || 0);
  const words = (toTerbilang(totalAmount) + ' Rupiah').replace(/\s+/g, ' ').trim();
  const voucherNo = voucher.voucher_number || voucher.proof_number || `BKK-${voucher.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
    `ALDEPOS-BKK|NO:${voucherNo}|UNIT:${unitName}|NOMINAL:Rp${totalAmount}|TGL:${expenseDate}|VALID`
  )}`;

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Bukti Kas Keluar - ${voucherNo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; background: #fff; padding: 24px; }
        .voucher-card { max-width: 800px; margin: 0 auto; border: 2px solid #0f172a; padding: 24px; border-radius: 8px; position: relative; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
        .org-info h2 { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
        .org-info p { font-size: 11px; color: #475569; margin-top: 2px; }
        .doc-title { text-align: right; }
        .doc-title h1 { font-size: 20px; font-weight: 900; color: #b91c1c; text-transform: uppercase; letter-spacing: 1px; }
        .doc-title .doc-num { font-size: 12px; font-family: monospace; font-weight: 700; color: #0f172a; margin-top: 3px; }
        
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 11.5px; }
        .meta-row { display: flex; margin-bottom: 4px; }
        .meta-label { width: 150px; color: #475569; font-weight: 600; }
        .meta-val { flex: 1; font-weight: 700; color: #0f172a; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px; }
        th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 10px; font-weight: 700; text-align: left; }
        td { border: 1px solid #e2e8f0; padding: 8px 10px; vertical-align: top; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row td { font-weight: 800; font-size: 12.5px; background: #f8fafc; border-top: 2px solid #0f172a; }

        .terbilang-box { background: #f8fafc; border: 1px dashed #94a3b8; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 11.5px; }
        .terbilang-label { font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.5px; }
        .terbilang-text { font-style: italic; font-weight: 700; color: #0f172a; margin-top: 2px; }

        .signature-section { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 12px; align-items: flex-end; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; }
        .digital-box { display: flex; align-items: center; gap: 10px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #f8fafc; }
        .digital-box img { width: 65px; height: 65px; }
        .digital-text h4 { font-size: 10px; font-weight: 800; color: #059669; }
        .digital-text p { font-size: 9px; color: #64748b; line-height: 1.2; margin-top: 2px; }
        .sign-box { text-align: center; }
        .sign-title { font-size: 11px; color: #475569; font-weight: 600; margin-bottom: 45px; }
        .sign-name { font-weight: 700; border-top: 1px solid #0f172a; padding-top: 3px; display: inline-block; min-width: 140px; }

        .print-btn-bar { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }
        .btn { padding: 8px 18px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; border: none; }
        .btn-primary { background: #0f172a; color: #fff; }
        .btn-secondary { background: #e2e8f0; color: #334155; }

        @media print {
          body { padding: 0; }
          .voucher-card { border: 1.5px solid #000; }
          .print-btn-bar { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="voucher-card">
        <div class="header">
          <div class="org-info">
            <h2>YAYASAN ALDEPOS SALAM MULIA</h2>
            <p>${unitName} &bull; Sistem Informasi Manajemen Terpadu Aldepos</p>
            <p>Bogor, Jawa Barat &bull; Dokumen Bukti Transaksi Resmi Keuangan</p>
          </div>
          <div class="doc-title">
            <h1>BUKTI KAS KELUAR</h1>
            <div class="doc-num">NO: ${voucherNo}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-row">
              <span class="meta-label">Dibayarkan Kepada:</span>
              <span class="meta-val">${voucher.vendor || voucher.staff_name || 'Umum / Pihak Ketiga'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">PIC / GTK Penanggung:</span>
              <span class="meta-val">${voucher.staff_name || '-'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Pos Anggaran RAPBS:</span>
              <span class="meta-val">${voucher.budget_item_name || 'Di Luar Perencanaan RAPBS'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Program Anggaran:</span>
              <span class="meta-val">${voucher.budget_program_name || '-'}</span>
            </div>
          </div>
          <div>
            <div class="meta-row">
              <span class="meta-label">Tanggal Pengeluaran:</span>
              <span class="meta-val">${expenseDate}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Rekening Kas/Bank:</span>
              <span class="meta-val">${voucher.cash_account_name || 'Kasir Loket Utama'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Metode Pembayaran:</span>
              <span class="meta-val">${voucher.payment_method || 'Tunai'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">No. Bukti / Nota:</span>
              <span class="meta-val">${voucher.proof_number || '-'}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;" class="text-center">No</th>
              <th>Uraian / Keterangan Belanja</th>
              <th style="width: 80px;" class="text-center">Jumlah</th>
              <th style="width: 80px;" class="text-center">Satuan</th>
              <th style="width: 130px;" class="text-right">Harga Satuan (Rp)</th>
              <th style="width: 140px;" class="text-right">Subtotal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">1</td>
              <td style="font-weight: 600;">
                ${voucher.item_name}
                ${voucher.notes ? `<br/><span style="font-size:10px; color:#64748b;">Catatan: ${voucher.notes}</span>` : ''}
              </td>
              <td class="text-center">${voucher.quantity}</td>
              <td class="text-center">${voucher.unit || 'pcs'}</td>
              <td class="text-right" style="font-family: monospace;">Rp ${parseFloat(voucher.unit_price || 0).toLocaleString('id-ID')}</td>
              <td class="text-right" style="font-weight: 700; font-family: monospace;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
            </tr>
            <tr class="total-row">
              <td colspan="5" style="text-align: right; text-transform: uppercase;">Total Pengeluaran Kas (BKK):</td>
              <td class="text-right" style="color: #b91c1c; font-family: monospace;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <div class="terbilang-box">
          <div class="terbilang-label">Jumlah Uang Terbilang</div>
          <div class="terbilang-text"># ${words} #</div>
        </div>

        <div class="signature-section">
          <div class="digital-box">
            <img src="${qrUrl}" alt="QR Validation" />
            <div class="digital-text">
              <h4>VERIFIKASI DIGITAL</h4>
              <p>Dokumen BKK resmi & telah dibukukan secara otomatis ke Jurnal Pengeluaran Aldepos.</p>
            </div>
          </div>
          <div class="sign-box">
            <div class="sign-title">Penerima Uang / Vendor,</div>
            <div class="sign-name">${voucher.vendor || voucher.staff_name || 'Penerima'}</div>
          </div>
          <div class="sign-box">
            <div class="sign-title">Bendahara / Petugas Kas,</div>
            <div class="sign-name">....................................</div>
          </div>
        </div>

        <div class="print-btn-bar">
          <button class="btn btn-primary" onclick="window.print()">&#128424; Cetak / Simpan PDF</button>
          <button class="btn btn-secondary" onclick="window.close()">Tutup Jendela</button>
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function Expenses() {
  const { activeSchoolUnit } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMainTab = searchParams.get('tab') === 'payroll' ? 'payroll' : 'expenses';
  const [mainTab, setMainTab] = useState(initialMainTab);

  // 1. Data States
  const [expenses, setExpenses] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [budgetIncomeItems, setBudgetIncomeItems] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [budgetPrograms, setBudgetPrograms] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [fundBalancesOptions, setFundBalancesOptions] = useState([]);
  const [availableFundGroups, setAvailableFundGroups] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. Macro Summary State
  const [macroSummary, setMacroSummary] = useState({
    total_expenses_amount: 0,
    total_expenses_count: 0,
    total_budgeted_amount: 0,
    budgeted_count: 0,
    total_outside_budget_amount: 0,
    outside_budget_count: 0,
    total_non_cash_amount: 0,
    total_cash_amount: 0,
    reconciled_bank_count: 0,
    total_rapbs_pagu: 0,
    rapbs_realization_percentage: 0,
    remaining_rapbs_pagu: 0
  });

  // 3. Filters
  const [filterMonth, setFilterMonth] = useState('all'); // 'all' | '1' .. '12'
  const [filterBudgetStatus, setFilterBudgetStatus] = useState('all'); // 'all' | 'budgeted' | 'outside'
  const [filterCashAccountId, setFilterCashAccountId] = useState('all');
  const [filterProgramId, setFilterProgramId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // 4. Modal Catat Pengeluaran Baru States
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncingBudget, setSyncingBudget] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState('cash'); // 'cash' | 'bank_transfer'
  const [bankStatementsOptions, setBankStatementsOptions] = useState([]);
  const [loadingBankStatements, setLoadingBankStatements] = useState(false);
  const [showAccountingOverride, setShowAccountingOverride] = useState(false);

  // Form State Tambah
  const [formData, setFormData] = useState({
    budget_plan_expense_item_id: '',
    is_outside_budget: false,
    proposed_to_rapbs: false,
    catalog_item_id: '',
    item_name: '',
    is_package: false,
    unit: 'pcs',
    unit_price: '',
    quantity: 1,
    total_amount: '',
    vendor: '',
    expense_date: new Date().toISOString().slice(0, 10),
    proof_number: '',
    cash_account_id: '',
    bank_statement_id: '',
    budget_program_id: '',
    staff_id: '',
    staff_name: '',
    expense_category_id: '',
    transaction_category_id: '',
    academic_year_id: '',
    fund_source_type: 'opening_pool',
    fund_source_ref_id: 0,
    fund_source_override_reason: '',
    fund_sources: null,
    override_debit_account_id: '',
    override_credit_account_id: '',
    override_reason: '',
    notes: ''
  });

  // 5. Modal Edit / Koreksi States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editPaymentMethodType, setEditPaymentMethodType] = useState('cash');
  const [editBankStatementsOptions, setEditBankStatementsOptions] = useState([]);
  const [loadingEditBankStatements, setLoadingEditBankStatements] = useState(false);
  const [showEditAccountingOverride, setShowEditAccountingOverride] = useState(false);

  const [editFormData, setEditFormData] = useState({
    id: null,
    budget_plan_expense_item_id: '',
    is_outside_budget: false,
    proposed_to_rapbs: false,
    catalog_item_id: '',
    item_name: '',
    is_package: false,
    unit: 'pcs',
    unit_price: '',
    quantity: 1,
    total_amount: '',
    vendor: '',
    expense_date: '',
    proof_number: '',
    cash_account_id: '',
    bank_statement_id: '',
    budget_program_id: '',
    staff_id: '',
    staff_name: '',
    transaction_category_id: '',
    academic_year_id: '',
    fund_source_type: 'opening_pool',
    fund_source_ref_id: 0,
    fund_source_override_reason: '',
    override_debit_account_id: '',
    override_credit_account_id: '',
    override_reason: '',
    notes: '',
    edit_reason: ''
  });

  // 6. Modal Detail State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState(null);

  // 7. Modal Reassign Fund Source State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignExpense, setReassignExpense] = useState(null);
  const [reassignForm, setReassignForm] = useState({
    fund_source_type: 'opening_pool',
    fund_source_ref_id: 0,
    reason: ''
  });

  // 8. Modal Cancel / Void State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [expenseToCancel, setExpenseToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // 9. Data & Filter States Pemindahan Kas (Cash Transfers)
  const [transfers, setTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferCashAccountFilter, setTransferCashAccountFilter] = useState('all');
  const [transferDateFrom, setTransferDateFrom] = useState('');
  const [transferDateTo, setTransferDateTo] = useState('');
  const [fromBankStatementsOptions, setFromBankStatementsOptions] = useState([]);
  const [loadingFromBankStatements, setLoadingFromBankStatements] = useState(false);
  const [toBankStatementsOptions, setToBankStatementsOptions] = useState([]);
  const [loadingToBankStatements, setLoadingToBankStatements] = useState(false);

  const [transferFormData, setTransferFormData] = useState({
    from_cash_account_id: '',
    from_bank_statement_id: '',
    to_cash_account_id: '',
    to_bank_statement_id: '',
    amount: '',
    transfer_date: new Date().toISOString().slice(0, 10),
    reference_number: '',
    reason: '',
    notes: ''
  });

  // Sinkronisasi Tab dari URL Search Param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'payroll' && mainTab !== 'payroll') {
      setMainTab('payroll');
    } else if ((tabParam === 'transfers' || tabParam === 'cash_transfers') && mainTab !== 'cash_transfers') {
      setMainTab('cash_transfers');
    }
  }, [searchParams]);

  const handleMainTabChange = (t) => {
    setMainTab(t);
    if (t === 'payroll') {
      setSearchParams({ tab: 'payroll' });
    } else if (t === 'cash_transfers') {
      setSearchParams({ tab: 'transfers' });
    } else {
      setSearchParams({});
    }
  };

  // ---------------------------------------------------------------------------
  // CASH TRANSFERS HANDLERS & BANK RECONCILIATION
  // ---------------------------------------------------------------------------
  const fetchFromTransferBankStatements = async (accId, pDate) => {
    if (!accId) {
      setFromBankStatementsOptions([]);
      return;
    }
    const acc = cashAccounts.find(a => String(a.id) === String(accId));
    if (!acc || acc.account_kind !== 'bank') {
      setFromBankStatementsOptions([]);
      return;
    }
    setLoadingFromBankStatements(true);
    try {
      const params = {
        cash_account_id: accId,
        dc_type: 'debit', // Kas Keluar Bank
        no_pagination: true,
        sort_by: 'transaction_date',
        sort_dir: 'desc'
      };
      const res = await api.get('/keuangan/bank-statements', { params });
      let rows = res.data?.data?.statements || (Array.isArray(res.data?.data) ? res.data.data : []);
      const opts = rows.map(r => mapBankStatementOption(r, pDate));
      opts.sort((a, b) => {
        if (!a.disabled && b.disabled) return -1;
        if (a.disabled && !b.disabled) return 1;
        if (a.isExactDate && !b.isExactDate) return -1;
        if (!a.isExactDate && b.isExactDate) return 1;
        return (b.rawDate || '').localeCompare(a.rawDate || '');
      });
      setFromBankStatementsOptions(opts);
    } catch (err) {
      console.warn('Error fetching from bank statements:', err);
      setFromBankStatementsOptions([]);
    } finally {
      setLoadingFromBankStatements(false);
    }
  };

  const fetchToTransferBankStatements = async (accId, pDate) => {
    if (!accId) {
      setToBankStatementsOptions([]);
      return;
    }
    const acc = cashAccounts.find(a => String(a.id) === String(accId));
    if (!acc || acc.account_kind !== 'bank') {
      setToBankStatementsOptions([]);
      return;
    }
    setLoadingToBankStatements(true);
    try {
      const params = {
        cash_account_id: accId,
        dc_type: 'credit', // Kas Masuk Bank
        no_pagination: true,
        sort_by: 'transaction_date',
        sort_dir: 'desc'
      };
      const res = await api.get('/keuangan/bank-statements', { params });
      let rows = res.data?.data?.statements || (Array.isArray(res.data?.data) ? res.data.data : []);
      const opts = rows.map(r => mapBankStatementOption(r, pDate));
      opts.sort((a, b) => {
        if (!a.disabled && b.disabled) return -1;
        if (a.disabled && !b.disabled) return 1;
        if (a.isExactDate && !b.isExactDate) return -1;
        if (!a.isExactDate && b.isExactDate) return 1;
        return (b.rawDate || '').localeCompare(a.rawDate || '');
      });
      setToBankStatementsOptions(opts);
    } catch (err) {
      console.warn('Error fetching to bank statements:', err);
      setToBankStatementsOptions([]);
    } finally {
      setLoadingToBankStatements(false);
    }
  };

  const fetchTransfersData = useCallback(async () => {
    setLoadingTransfers(true);
    try {
      const params = {
        cash_account_id: transferCashAccountFilter !== 'all' ? transferCashAccountFilter : undefined,
        from_date: transferDateFrom || undefined,
        to_date: transferDateTo || undefined,
        search: transferSearch || undefined,
        limit: 100
      };
      const res = await api.get('/keuangan/cash-transfers', { params });
      const list = normalizeArray(res, ['transfers', 'items']);
      setTransfers(list);
    } catch (err) {
      console.error('Error fetching cash transfers:', err);
    } finally {
      setLoadingTransfers(false);
    }
  }, [transferCashAccountFilter, transferDateFrom, transferDateTo, transferSearch]);

  useEffect(() => {
    if (mainTab === 'cash_transfers') {
      fetchTransfersData();
    }
  }, [mainTab, fetchTransfersData]);

  const handleOpenNewTransferModal = () => {
    const defaultFrom = cashAccounts[0] ? String(cashAccounts[0].id) : '';
    const defaultTo = cashAccounts[1] ? String(cashAccounts[1].id) : (cashAccounts[0] ? String(cashAccounts[0].id) : '');
    const today = new Date().toISOString().slice(0, 10);
    setTransferFormData({
      from_cash_account_id: defaultFrom,
      from_bank_statement_id: '',
      to_cash_account_id: defaultTo,
      to_bank_statement_id: '',
      amount: '',
      transfer_date: today,
      reference_number: '',
      reason: '',
      notes: ''
    });
    setTransferModalOpen(true);
    if (defaultFrom) fetchFromTransferBankStatements(defaultFrom, today);
    if (defaultTo) fetchToTransferBankStatements(defaultTo, today);
  };

  const handleSelectFromBankStatement = (bsId) => {
    if (!bsId) {
      setTransferFormData(prev => ({ ...prev, from_bank_statement_id: '' }));
      return;
    }
    const stmt = fromBankStatementsOptions.find(o => String(o.value) === String(bsId));
    if (stmt) {
      setTransferFormData(prev => {
        const nextDate = stmt.rawDate || prev.transfer_date;
        const nextAmount = String(stmt.remaining_amount !== undefined ? stmt.remaining_amount : stmt.amount);
        const nextRef = stmt.refNo || prev.reference_number;
        const nextReason = prev.reason || (stmt.desc ? `Pemindahan: ${stmt.desc}` : '');
        return {
          ...prev,
          from_bank_statement_id: String(bsId),
          amount: nextAmount,
          transfer_date: nextDate,
          reference_number: nextRef,
          reason: nextReason
        };
      });
    }
  };

  const handleSelectToBankStatement = (bsId) => {
    if (!bsId) {
      setTransferFormData(prev => ({ ...prev, to_bank_statement_id: '' }));
      return;
    }
    const stmt = toBankStatementsOptions.find(o => String(o.value) === String(bsId));
    if (stmt) {
      setTransferFormData(prev => {
        const nextDate = prev.from_bank_statement_id ? prev.transfer_date : (stmt.rawDate || prev.transfer_date);
        const nextAmount = prev.amount ? prev.amount : String(stmt.remaining_amount !== undefined ? stmt.remaining_amount : stmt.amount);
        const nextRef = prev.reference_number || stmt.refNo;
        const nextReason = prev.reason || (stmt.desc ? `Pemindahan: ${stmt.desc}` : '');
        return {
          ...prev,
          to_bank_statement_id: String(bsId),
          amount: nextAmount,
          transfer_date: nextDate,
          reference_number: nextRef,
          reason: nextReason
        };
      });
    }
  };

  const handleCreateTransferSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!transferFormData.from_cash_account_id || !transferFormData.to_cash_account_id) {
      alert('Pilih Rekening Kas Asal dan Rekening Kas Tujuan.');
      return;
    }
    if (String(transferFormData.from_cash_account_id) === String(transferFormData.to_cash_account_id)) {
      alert('Rekening Kas Asal dan Kas Tujuan tidak boleh sama.');
      return;
    }
    const numAmt = parseFloat(transferFormData.amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      alert('Masukkan nominal pemindahan kas yang valid.');
      return;
    }

    // Validasi perbandingan mutasi jika keduanya adalah mutasi rekening koran
    if (transferFormData.from_bank_statement_id && transferFormData.to_bank_statement_id) {
      const stmtFrom = fromBankStatementsOptions.find(o => String(o.value) === String(transferFormData.from_bank_statement_id));
      const stmtTo = toBankStatementsOptions.find(o => String(o.value) === String(transferFormData.to_bank_statement_id));
      if (stmtFrom && stmtTo) {
        const fromVal = parseFloat(stmtFrom.amount);
        const toVal = parseFloat(stmtTo.amount);
        if (Math.abs(fromVal - toVal) > 0.01) {
          alert(`Nominal mutasi rekening koran kas asal (${formatCurrency(fromVal)}) berbeda dengan kas tujuan (${formatCurrency(toVal)}). Nominal pemindahan antar rekening bank harus sama.`);
          return;
        }
      }
    }

    setTransferSubmitting(true);
    try {
      const payload = {
        from_cash_account_id: parseInt(transferFormData.from_cash_account_id, 10),
        from_bank_statement_id: transferFormData.from_bank_statement_id ? parseInt(transferFormData.from_bank_statement_id, 10) : null,
        to_cash_account_id: parseInt(transferFormData.to_cash_account_id, 10),
        to_bank_statement_id: transferFormData.to_bank_statement_id ? parseInt(transferFormData.to_bank_statement_id, 10) : null,
        amount: numAmt,
        transfer_date: transferFormData.transfer_date,
        reference_number: transferFormData.reference_number || null,
        reason: transferFormData.reason || 'Pemindahan Kas Internal',
        notes: transferFormData.notes || null
      };

      const res = await api.post('/keuangan/cash-transfers', payload);
      alert(res.data?.message || 'Pemindahan kas berhasil disimpan dan jurnal berpasangan telah dibukukan.');
      setTransferModalOpen(false);
      fetchTransfersData();
      fetchMasterData();
    } catch (err) {
      console.error('Error creating cash transfer:', err);
      alert(err.response?.data?.message || 'Gagal menyimpan pemindahan kas.');
    } finally {
      setTransferSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // FETCH INITIAL MASTER DATA
  // ---------------------------------------------------------------------------
  const normalizeArray = (res, keys = []) => {
    if (!res) return [];
    const d = res.data !== undefined ? res.data : res;
    if (Array.isArray(d)) return d;
    if (d && typeof d === 'object') {
      if (Array.isArray(d.data)) return d.data;
      if (d.data && typeof d.data === 'object') {
        for (const k of keys) {
          if (Array.isArray(d.data[k])) return d.data[k];
        }
        if (Array.isArray(d.data.items)) return d.data.items;
      }
      for (const k of keys) {
        if (Array.isArray(d[k])) return d[k];
      }
      if (Array.isArray(d.items)) return d.items;
    }
    return [];
  };

  const fetchMasterData = async () => {
    try {
      const [ayRes, cashRes, catRes, coaRes, progRes, catalogRes, empRes, feesRes] = await Promise.all([
        api.get('/akademik/academic-years').catch(() => api.get('/keuangan/academic-years').catch(() => ({ data: { data: [] } }))),
        api.get('/keuangan/cash-accounts').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/transaction-categories').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/chart-of-accounts').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/budget-programs').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/catalog-items').catch(() => ({ data: { data: [] } })),
        api.get('/kepegawaian/employees?limit=200').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/fee-types').catch(() => ({ data: { data: [] } }))
      ]);

      const yearsList = normalizeArray(ayRes, ['academic_years']);
      setAcademicYears(yearsList);
      if (yearsList.length > 0 && !selectedAcademicYearId) {
        const activeYear = yearsList.find(y => y.is_active) || yearsList[0];
        setSelectedAcademicYearId(String(activeYear.id));
      }

      setCashAccounts(normalizeArray(cashRes, ['cash_accounts']));
      setExpenseCategories(normalizeArray(catRes, ['categories', 'transaction_categories']));
      setChartOfAccounts(normalizeArray(coaRes, ['accounts', 'chart_of_accounts']));
      setBudgetPrograms(normalizeArray(progRes, ['programs', 'budget_programs']));
      setCatalogItems(normalizeArray(catalogRes, ['items', 'catalog_items']));
      setEmployees(normalizeArray(empRes, ['employees', 'items']));
      setFeeTypes(normalizeArray(feesRes, ['fee_types', 'types', 'items']));
    } catch (err) {
      console.error('Error fetching master data for expenses:', err);
    }
  };

  const [syncingCoa, setSyncingCoa] = useState(false);

  const handleSyncCoa = async () => {
    setSyncingCoa(true);
    try {
      const coaRes = await api.get('/keuangan/chart-of-accounts').catch(() => ({ data: { data: [] } }));
      setChartOfAccounts(normalizeArray(coaRes, ['accounts', 'chart_of_accounts']));
    } catch (err) {
      console.warn('Error syncing COA:', err);
    } finally {
      setSyncingCoa(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [activeSchoolUnit]);

  // Otomatis refresh master data COA & Kas saat modal Catat/Edit dibuka
  useEffect(() => {
    if (modalOpen || editModalOpen) {
      fetchMasterData();
    }
  }, [modalOpen, editModalOpen]);

  // Fetch Sumber Dana / Fund Balances
  const fetchAvailableFundSources = async (ayId) => {
    try {
      const res = await api.get('/keuangan/fund-balances/available-sources', {
        params: { academic_year_id: ayId || selectedAcademicYearId || undefined }
      });
      if (res.data?.success) {
        setAvailableFundGroups(Array.isArray(res.data.data?.groups) ? res.data.data.groups : []);
        setFundBalancesOptions(Array.isArray(res.data.data?.options) ? res.data.data.options : []);
      }
    } catch (err) {
      console.warn('Error fetching available fund sources:', err.message);
    }
  };

  // Fetch Data Pengeluaran, Item RAPBS, & Summary
  const fetchExpensesData = async () => {
    setLoading(true);
    try {
      const ayId = selectedAcademicYearId || undefined;
      const params = {
        academic_year_id: ayId,
        month: filterMonth !== 'all' ? filterMonth : undefined,
        is_outside_budget: filterBudgetStatus === 'budgeted' ? '0' : (filterBudgetStatus === 'outside' ? '1' : undefined),
        cash_account_id: filterCashAccountId !== 'all' ? filterCashAccountId : undefined,
        budget_program_id: filterProgramId !== 'all' ? filterProgramId : undefined,
        start_date: filterStartDate || undefined,
        end_date: filterEndDate || undefined,
        search: searchQuery || undefined
      };

      const [expRes, summaryRes, budgetRes] = await Promise.all([
        api.get('/keuangan/expenses', { params }),
        api.get('/keuangan/expenses/summary', { params: { academic_year_id: ayId, month: filterMonth !== 'all' ? filterMonth : undefined } }).catch(() => ({ data: { data: {} } })),
        api.get('/keuangan/budget-plans', { params: { academic_year_id: ayId } }).catch(() => ({ data: { data: [] } }))
      ]);

      const expList = normalizeArray(expRes, ['expenses', 'items']);
      setExpenses(expList);
      if (summaryRes.data?.data) {
        setMacroSummary(summaryRes.data.data);
      }

      // Format budget items & income items dari budget plans
      let plans = normalizeArray(budgetRes, ['budget_plans', 'plans', 'items']);
      if (plans.length === 0 && ayId) {
        try {
          const fallbackPlansRes = await api.get('/keuangan/budget-plans');
          const fallbackPlans = normalizeArray(fallbackPlansRes, ['budget_plans', 'plans', 'items']);
          if (fallbackPlans.length > 0) {
            plans = fallbackPlans;
          }
        } catch (_) {}
      }

      const allExpenseItems = [];
      const allIncomeItems = [];
      if (plans.length > 0) {
        try {
          const planDetailsRes = await Promise.all(
            plans.map(p => api.get(`/keuangan/budget-plans/${p.id}`).catch(() => null))
          );

          planDetailsRes.forEach((pRes, idx) => {
            const detail = pRes?.data?.data;
            const pHeader = plans[idx];
            const planTitle = detail?.title || pHeader?.title || 'RAPBS';
            const planYearId = detail?.academic_year_id || pHeader?.academic_year_id;
            const planStatus = detail?.status || pHeader?.status || 'draft';
            
            const expItems = detail?.expense_items;
            if (Array.isArray(expItems)) {
              expItems.forEach(it => {
                allExpenseItems.push({
                  ...it,
                  plan_title: planTitle,
                  plan_status: planStatus,
                  academic_year_id: planYearId
                });
              });
            }

            const incItems = detail?.income_items;
            if (Array.isArray(incItems)) {
              incItems.forEach(it => {
                allIncomeItems.push({
                  ...it,
                  plan_title: planTitle,
                  plan_status: planStatus,
                  academic_year_id: planYearId
                });
              });
            }
          });
        } catch (err) {
          console.warn('Error fetching budget plan detail items:', err);
        }
      }
      setBudgetItems(allExpenseItems);
      setBudgetIncomeItems(allIncomeItems);

      if (ayId) {
        fetchAvailableFundSources(ayId);
      }
    } catch (err) {
      console.error('Error fetching expenses data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper Sinkronisasi Cepat Pos Anggaran RAPBS & Master Data COA
  const handleSyncBudgetPlans = async (targetAyId = null) => {
    const ayId = targetAyId || formData.academic_year_id || editFormData.academic_year_id || selectedAcademicYearId || undefined;
    setSyncingBudget(true);
    try {
      await fetchMasterData();
      const budgetRes = await api.get('/keuangan/budget-plans', { params: { academic_year_id: ayId } }).catch(() => ({ data: { data: [] } }));
      let plans = normalizeArray(budgetRes, ['budget_plans', 'plans', 'items']);
      if (plans.length === 0 && ayId) {
        try {
          const fallbackPlansRes = await api.get('/keuangan/budget-plans');
          const fallbackPlans = normalizeArray(fallbackPlansRes, ['budget_plans', 'plans', 'items']);
          if (fallbackPlans.length > 0) {
            plans = fallbackPlans;
          }
        } catch (_) {}
      }

      const allExpenseItems = [];
      const allIncomeItems = [];
      if (plans.length > 0) {
        const planDetailsRes = await Promise.all(
          plans.map(p => api.get(`/keuangan/budget-plans/${p.id}`).catch(() => null))
        );

        planDetailsRes.forEach((pRes, idx) => {
          const detail = pRes?.data?.data;
          const pHeader = plans[idx];
          const planTitle = detail?.title || pHeader?.title || 'RAPBS';
          const planYearId = detail?.academic_year_id || pHeader?.academic_year_id;
          const planStatus = detail?.status || pHeader?.status || 'draft';
          
          const expItems = detail?.expense_items;
          if (Array.isArray(expItems)) {
            expItems.forEach(it => {
              allExpenseItems.push({
                ...it,
                plan_title: planTitle,
                plan_status: planStatus,
                academic_year_id: planYearId
              });
            });
          }

          const incItems = detail?.income_items;
          if (Array.isArray(incItems)) {
            incItems.forEach(it => {
              allIncomeItems.push({
                ...it,
                plan_title: planTitle,
                plan_status: planStatus,
                academic_year_id: planYearId
              });
            });
          }
        });
      }
      setBudgetItems(allExpenseItems);
      setBudgetIncomeItems(allIncomeItems);

      if (ayId) {
        fetchAvailableFundSources(ayId);
      }
    } catch (err) {
      console.error('Error syncing budget plans:', err);
    } finally {
      setSyncingBudget(false);
    }
  };

  useEffect(() => {
    if (selectedAcademicYearId) {
      fetchExpensesData();
    }
  }, [
    activeSchoolUnit,
    selectedAcademicYearId,
    filterMonth,
    filterBudgetStatus,
    filterCashAccountId,
    filterProgramId,
    filterStartDate,
    filterEndDate
  ]);

  // ---------------------------------------------------------------------------
  // MUTASI REKENING KORAN BANK HELPER (Live Search & Mapping)
  // ---------------------------------------------------------------------------
  // Helper format variasi tanggal untuk live search mutasi rekening koran
  const formatStatementDatesForSearch = (isoDateStr) => {
    if (!isoDateStr) return [];
    const dateObj = new Date(isoDateStr);
    if (isNaN(dateObj.getTime())) {
      const s = String(isoDateStr).slice(0, 10);
      return [s];
    }
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const d = dateObj.getDate();
    const mIndex = dateObj.getMonth();

    const indoMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const indoMonthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const engMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const engMonthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthNameIndo = indoMonths[mIndex];
    const monthShortIndo = indoMonthsShort[mIndex];
    const monthNameEng = engMonths[mIndex];
    const monthShortEng = engMonthsShort[mIndex];

    return [
      `${yyyy}-${mm}-${dd}`,
      `${dd}/${mm}/${yyyy}`,
      `${dd}-${mm}-${yyyy}`,
      `${dd}.${mm}.${yyyy}`,
      `${d}/${mIndex + 1}/${yyyy}`,
      `${d}-${mIndex + 1}-${yyyy}`,
      `${d} ${monthNameIndo} ${yyyy}`,
      `${d} ${monthShortIndo} ${yyyy}`,
      `${monthNameIndo} ${yyyy}`,
      `${monthShortIndo} ${yyyy}`,
      `${d} ${monthNameEng} ${yyyy}`,
      `${d} ${monthShortEng} ${yyyy}`,
      monthNameIndo,
      monthShortIndo,
      monthNameEng
    ];
  };

  // Standard Option Mapper untuk Mutasi Rekening Koran Kas Keluar / Debet
  const mapBankStatementOption = (r, pDate, currentBsId = '') => {
    const desc = r.description || r.mutation_description || 'Mutasi Debet / Kas Keluar';
    const refNo = r.journal_number || r.reference_number || r.reconciliation_notes || r.import_batch_id || '';
    const rkDate = r.transaction_date ? String(r.transaction_date).slice(0, 10) : '';
    const isExactDate = pDate && rkDate === String(pDate).slice(0, 10);
    const isCurrentLinked = currentBsId && String(r.id) === String(currentBsId);
    const totalPlafon = parseFloat(r.amount || 0);
    const allocatedAmt = parseFloat(r.allocated_amount || 0);
    const remainingAmt = r.remaining_amount !== undefined ? parseFloat(r.remaining_amount) : Math.max(0, totalPlafon - allocatedAmt);
    const isFullyAllocated = Boolean(r.is_reconciled) || (remainingAmt <= 0.01 && totalPlafon > 0);
    const isPartial = !isFullyAllocated && allocatedAmt > 0 && remainingAmt > 0.01;

    const bankName = r.bank_name || r.cash_account_name || '';
    const bankAccNo = r.bank_account_number || '';
    const bankPrefix = bankName ? `[${bankName}] ` : '';

    let badgeText = isCurrentLinked ? '📌 DITAUTKAN' : (isExactDate ? '⭐ TGL COCOK' : 'DEBET');
    let badgeStyle = isCurrentLinked
      ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold'
      : (isExactDate ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-rose-50 text-rose-700 font-bold');

    if (!isCurrentLinked && isPartial) {
      badgeText = isExactDate ? '⭐ TGL COCOK | SISA' : '⚡ SISA PLAFON';
      badgeStyle = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
    }

    if (!isCurrentLinked && isFullyAllocated) {
      badgeText = '⛔ HABIS TERALOKASI';
      badgeStyle = 'bg-rose-100 text-rose-800 border border-rose-300 font-bold';
    }

    const labelText = isCurrentLinked
      ? `[DITAUTKAN] ${bankPrefix}${formatCurrency(totalPlafon)} - ${desc}`
      : isFullyAllocated
      ? `[HABIS TERALOKASI] ${bankPrefix}${formatCurrency(totalPlafon)} - ${desc}`
      : isPartial
      ? `${bankPrefix}Sisa: ${formatCurrency(remainingAmt)} (Plafon: ${formatCurrency(totalPlafon)}) - ${desc}`
      : `${bankPrefix}${formatCurrency(totalPlafon)} - ${desc}`;

    const sublabelText = isFullyAllocated && !isCurrentLinked
      ? `Tgl: ${rkDate || '-'} | Ref/Jurnal: ${refNo || '-'} | ${bankName ? `${bankName}${bankAccNo ? ` (${bankAccNo})` : ''} | ` : ''}Plafon: ${formatCurrency(totalPlafon)} (Teralokasi: ${formatCurrency(allocatedAmt)}) • Habis`
      : `Tgl: ${rkDate || '-'} | Ref/Jurnal: ${refNo || '-'} | ${bankName ? `${bankName}${bankAccNo ? ` (${bankAccNo})` : ''} | ` : ''}Plafon: ${formatCurrency(totalPlafon)}${allocatedAmt > 0 ? ` (Teralokasi: ${formatCurrency(allocatedAmt)})` : ''}`;

    const dateVariations = formatStatementDatesForSearch(r.transaction_date);

    const searchTerms = [
      refNo,
      r.journal_number,
      r.reference_number,
      r.reconciliation_notes,
      r.import_batch_id,
      desc,
      r.description,
      r.mutation_description,
      bankName,
      bankAccNo,
      r.cash_account_name,
      String(r.amount || ''),
      String(totalPlafon),
      String(remainingAmt),
      String(allocatedAmt),
      formatCurrency(totalPlafon),
      formatCurrency(remainingAmt),
      `#${r.id}`,
      String(r.id),
      ...dateVariations
    ].filter(Boolean);

    return {
      value: String(r.id),
      label: labelText,
      sublabel: sublabelText,
      badge: badgeText,
      badgeClass: badgeStyle,
      amount: totalPlafon,
      allocated_amount: allocatedAmt,
      remaining_amount: remainingAmt,
      rawDate: rkDate,
      desc: desc,
      refNo: refNo,
      journal_number: r.journal_number,
      reference_number: r.journal_number || r.reference_number,
      reconciliation_notes: r.reconciliation_notes,
      import_batch_id: r.import_batch_id,
      cash_account_id: r.cash_account_id,
      cash_account_name: bankName,
      bank_name: bankName,
      bank_account_number: bankAccNo,
      searchTerms: searchTerms,
      isExactDate,
      disabled: isFullyAllocated && !isCurrentLinked,
      isFullyAllocated: isFullyAllocated && !isCurrentLinked,
      disabledReason: `Mutasi rekening koran (${desc}) sebesar ${formatCurrency(totalPlafon)} sudah habis teralokasi (teralokasi penuh ${formatCurrency(allocatedAmt)}). Tidak dapat dipilih untuk belanja baru.`
    };
  };

  // Fetch Mutasi Bank untuk Modal Tambah
  const fetchExpenseBankStatements = async (accId, pDate) => {
    setLoadingBankStatements(true);
    try {
      const selectedAccount = cashAccounts.find(a => String(a.id) === String(accId));
      const isBankKind = selectedAccount && selectedAccount.account_kind === 'bank';

      const params = {
        dc_type: 'debit', // Mutasi Debit = Pengeluaran / Kas Keluar Bank
        no_pagination: true,
        sort_by: 'transaction_date',
        sort_dir: 'desc'
      };
      if (accId && isBankKind) {
        params.cash_account_id = accId;
      }

      const res = await api.get('/keuangan/bank-statements', { params });
      let rows = res.data?.data?.statements || (Array.isArray(res.data?.data) ? res.data.data : []);

      if (rows.length === 0 && accId) {
        try {
          const allRes = await api.get('/keuangan/bank-statements', {
            params: { dc_type: 'debit', no_pagination: true, sort_by: 'transaction_date', sort_dir: 'desc' }
          });
          const allRows = allRes.data?.data?.statements || (Array.isArray(allRes.data?.data) ? allRes.data.data : []);
          if (allRows.length > 0) rows = allRows;
        } catch (_) {}
      }

      const opts = rows.map(r => mapBankStatementOption(r, pDate));
      opts.sort((a, b) => {
        if (!a.disabled && b.disabled) return -1;
        if (a.disabled && !b.disabled) return 1;
        if (a.isExactDate && !b.isExactDate) return -1;
        if (!a.isExactDate && b.isExactDate) return 1;
        return (b.rawDate || '').localeCompare(a.rawDate || '');
      });

      setBankStatementsOptions(opts);
    } catch (err) {
      console.warn('Error fetching bank statements for expense:', err);
      setBankStatementsOptions([]);
    } finally {
      setLoadingBankStatements(false);
    }
  };

  // Fetch Mutasi Bank untuk Modal Edit
  const fetchEditExpenseBankStatements = async (accId, pDate, currentBsId = '') => {
    setLoadingEditBankStatements(true);
    try {
      const selectedAccount = cashAccounts.find(a => String(a.id) === String(accId));
      const isBankKind = selectedAccount && selectedAccount.account_kind === 'bank';

      const params = {
        dc_type: 'debit',
        no_pagination: true,
        sort_by: 'transaction_date',
        sort_dir: 'desc'
      };
      if (accId && isBankKind) {
        params.cash_account_id = accId;
      }

      const res = await api.get('/keuangan/bank-statements', { params });
      let rows = res.data?.data?.statements || (Array.isArray(res.data?.data) ? res.data.data : []);

      if (rows.length === 0 && accId) {
        try {
          const allRes = await api.get('/keuangan/bank-statements', {
            params: { dc_type: 'debit', no_pagination: true, sort_by: 'transaction_date', sort_dir: 'desc' }
          });
          const allRows = allRes.data?.data?.statements || (Array.isArray(allRes.data?.data) ? allRes.data.data : []);
          if (allRows.length > 0) rows = allRows;
        } catch (_) {}
      }

      if (currentBsId && !rows.some(r => String(r.id) === String(currentBsId))) {
        try {
          const singleRes = await api.get(`/keuangan/bank-statements/${currentBsId}`);
          const singleRow = singleRes.data?.data;
          if (singleRow) rows = [singleRow, ...rows];
        } catch (_) {}
      }

      const opts = rows.map(r => mapBankStatementOption(r, pDate, currentBsId));
      opts.sort((a, b) => {
        if (!a.disabled && b.disabled) return -1;
        if (a.disabled && !b.disabled) return 1;
        if (a.isExactDate && !b.isExactDate) return -1;
        if (!a.isExactDate && b.isExactDate) return 1;
        return (b.rawDate || '').localeCompare(a.rawDate || '');
      });

      setEditBankStatementsOptions(opts);
    } catch (err) {
      console.warn('Error fetching edit bank statements for expense:', err);
      setEditBankStatementsOptions([]);
    } finally {
      setLoadingEditBankStatements(false);
    }
  };

  useEffect(() => {
    if (modalOpen && paymentMethodType === 'bank_transfer') {
      fetchExpenseBankStatements(formData.cash_account_id, formData.expense_date);
    } else {
      setBankStatementsOptions([]);
    }
  }, [modalOpen, paymentMethodType, formData.cash_account_id, formData.expense_date]);

  useEffect(() => {
    if (editModalOpen && editPaymentMethodType === 'bank_transfer') {
      fetchEditExpenseBankStatements(editFormData.cash_account_id, editFormData.expense_date, editFormData.bank_statement_id);
    } else {
      setEditBankStatementsOptions([]);
    }
  }, [editModalOpen, editPaymentMethodType, editFormData.cash_account_id, editFormData.expense_date, editFormData.bank_statement_id]);

  // Handler Pemilihan Mutasi Bank
  const handleBankStatementSelect = (bsId, isEdit = false) => {
    const setForm = isEdit ? setEditFormData : setFormData;
    const opts = isEdit ? editBankStatementsOptions : bankStatementsOptions;

    setForm(prev => {
      if (!bsId) {
        return { ...prev, bank_statement_id: '' };
      }
      const opt = opts.find(o => String(o.value) === String(bsId));
      if (!opt) return { ...prev, bank_statement_id: bsId };

      const remainingAmt = opt.remaining_amount !== undefined && opt.remaining_amount > 0 ? opt.remaining_amount : opt.amount;
      const autoNotes = (!prev.notes || prev.notes.trim() === '') ? opt.desc : prev.notes;
      const targetCashAccId = opt.cash_account_id ? String(opt.cash_account_id) : prev.cash_account_id;
      const selectedCash = cashAccounts.find(a => String(a.id) === String(targetCashAccId));

      // Jika dalam mode multi-sumber dana dan hanya memiliki 1 baris, sinkronkan nominalnya juga
      let updatedFundSources = prev.fund_sources;
      if (Array.isArray(prev.fund_sources) && prev.fund_sources.length === 1) {
        updatedFundSources = [{ ...prev.fund_sources[0], amount: remainingAmt }];
      }

      return {
        ...prev,
        bank_statement_id: bsId,
        cash_account_id: targetCashAccId,
        override_credit_account_id: selectedCash?.account_id ? String(selectedCash.account_id) : prev.override_credit_account_id,
        expense_date: opt.rawDate || prev.expense_date,
        total_amount: String(remainingAmt),
        unit_price: prev.is_package ? String(remainingAmt) : (prev.quantity > 0 ? String(remainingAmt / prev.quantity) : String(remainingAmt)),
        notes: autoNotes,
        proof_number: (!prev.proof_number && opt.refNo && opt.refNo !== '-') ? opt.refNo : prev.proof_number,
        fund_sources: updatedFundSources
      };
    });
  };

  // ---------------------------------------------------------------------------
  // HANDLERS FOR RAPBS, CATALOG & MULTI-FUND SELECTION
  // ---------------------------------------------------------------------------

  // Helper Resolusi Nilai String Terpilih Pos Sumber Dana (Mencocokkan type:id dengan fundSourceOptions)
  const resolveSelectedFundSourceValue = (fundType, fundRefId) => {
    if (!fundType || fundType === 'opening_pool' || Number(fundRefId || 0) === 0) {
      return 'opening_pool:0';
    }
    const directKey = `${fundType}:${fundRefId}`;
    const opts = Array.isArray(fundSourceOptions) ? fundSourceOptions : [];
    if (opts.some(o => o.value === directKey)) {
      return directKey;
    }
    if (fundType === 'budget_income_item') {
      const altKey = `transaction_category:${fundRefId}`;
      if (opts.some(o => o.value === altKey)) return altKey;
    }
    if (fundType === 'transaction_category') {
      const altKey = `budget_income_item:${fundRefId}`;
      if (opts.some(o => o.value === altKey)) return altKey;
    }
    // Cek jika fundRefId merujuk ke budget income item yang memiliki fee_type_id
    const matchedInc = (budgetIncomeItems || []).find(x => Number(x.id) === Number(fundRefId));
    if (matchedInc?.fee_type_id) {
      const feeKey = `fee_type:${matchedInc.fee_type_id}`;
      if (opts.some(o => o.value === feeKey)) return feeKey;
    }
    return directKey;
  };

  // 1. Handler Pemilihan Pos RAPBS (Auto-fill Kas, Akuntansi Debet/Kredit, Program & Multi-Sumber Dana)
  const handleSelectBudgetItem = (itemId, isEdit = false) => {
    const setForm = isEdit ? setEditFormData : setFormData;

    if (!itemId) {
      const defaultCash = cashAccounts[0] || null;
      const defaultDebit = chartOfAccounts.find(c => c.account_group === 'biaya' || c.account_group === 'expense' || String(c.account_code || '').startsWith('5'));
      setForm(prev => ({
        ...prev,
        budget_plan_expense_item_id: '',
        is_outside_budget: true,
        override_debit_account_id: prev.override_debit_account_id || (defaultDebit ? String(defaultDebit.id) : ''),
        override_credit_account_id: prev.override_credit_account_id || (defaultCash?.account_id ? String(defaultCash.account_id) : '')
      }));
      return;
    }

    const item = budgetItems.find(x => String(x.id) === String(itemId));
    if (!item) return;

    // 1. Resolusi Program RKS Otomatis
    const targetProgramId = item.budget_program_id ? String(item.budget_program_id) : '';

    // 2. Resolusi Standar Katalog & Uraian
    const targetCatalogId = item.catalog_item_id ? String(item.catalog_item_id) : '';
    const catalogObj = catalogItems.find(c => String(c.id) === String(targetCatalogId));

    // 3. Resolusi Pos Sumber Dana Otomatis & Multi-Sumber Dana dari Isian RAPBS
    let parsedSources = null;
    if (item.fund_sources) {
      try {
        const raw = typeof item.fund_sources === 'string' ? JSON.parse(item.fund_sources) : item.fund_sources;
        if (Array.isArray(raw) && raw.length > 0) {
          parsedSources = raw.map(s => {
            let fType = s.fund_type || (s.fee_type_id ? 'fee_type' : (s.income_item_id ? 'budget_income_item' : 'opening_pool'));
            let fRef = Number(s.fund_ref_id || s.fee_type_id || s.income_item_id || 0);

            if (fType === 'transaction_category' || fType === 'budget_income_item' || s.income_item_id) {
              const matchedInc = (budgetIncomeItems || []).find(x => Number(x.id) === fRef || Number(x.id) === Number(s.income_item_id));
              if (matchedInc?.fee_type_id) {
                fType = 'fee_type';
                fRef = Number(matchedInc.fee_type_id);
              } else if (!s.fund_type) {
                fType = 'budget_income_item';
              }
            }

            const resolvedVal = resolveSelectedFundSourceValue(fType, fRef);
            const [finalType, finalRef] = resolvedVal.split(':');
            const matchedOpt = fundSourceOptions.find(o => o.value === resolvedVal);
            const resolvedCleanName = cleanFundLabel(matchedOpt?.label) || (fType === 'fee_type' ? feeTypes.find(f => Number(f.id) === fRef)?.name : (fType === 'budget_income_item' ? budgetIncomeItems.find(i => Number(i.id) === fRef)?.name : null)) || cleanFundLabel(s.name) || 'Pos Sumber Dana';

            return {
              fund_type: finalType || fType,
              fund_ref_id: Number(finalRef || fRef),
              name: resolvedCleanName,
              amount: parseFloat(s.amount || 0)
            };
          });
        }
      } catch (_) {}
    }

    let defaultFundType = 'opening_pool';
    let defaultFundRefId = 0;

    if (item.fund_source_fee_type_id) {
      defaultFundType = 'fee_type';
      defaultFundRefId = Number(item.fund_source_fee_type_id);
    } else if (item.fund_source_income_item_id || item.catalog_fund_source_income_item_id || catalogObj?.fund_source_income_item_id) {
      const incId = Number(item.fund_source_income_item_id || item.catalog_fund_source_income_item_id || catalogObj?.fund_source_income_item_id);
      const matchedInc = (budgetIncomeItems || []).find(x => Number(x.id) === incId);
      if (matchedInc?.fee_type_id) {
        defaultFundType = 'fee_type';
        defaultFundRefId = Number(matchedInc.fee_type_id);
      } else {
        defaultFundType = 'budget_income_item';
        defaultFundRefId = incId;
      }
    } else if (parsedSources && parsedSources.length > 0) {
      defaultFundType = parsedSources[0].fund_type;
      defaultFundRefId = parsedSources[0].fund_ref_id;
    } else if (item.fund_source_income_name || item.fund_source_fee_type_name || item.fund_source_name) {
      const searchName = cleanFundLabel(item.fund_source_income_name || item.fund_source_fee_type_name || item.fund_source_name || '').toLowerCase();
      const matchedOpt = fundSourceOptions.find(o => o.value !== 'opening_pool:0' && cleanFundLabel(o.label).toLowerCase().includes(searchName));
      if (matchedOpt) {
        const [fType, fRef] = matchedOpt.value.split(':');
        defaultFundType = fType;
        defaultFundRefId = Number(fRef || 0);
      }
    }

    const resolvedSingleFundVal = resolveSelectedFundSourceValue(defaultFundType, defaultFundRefId);
    const [finalSingleType, finalSingleRef] = resolvedSingleFundVal.split(':');
    defaultFundType = finalSingleType || defaultFundType;
    defaultFundRefId = Number(finalSingleRef || defaultFundRefId);

    // 4. Resolusi Akun Akuntansi Debet (Beban Belanja) Sesuai RAPBS
    let autoDebitAccountId = '';
    if (item.debit_account_id) {
      autoDebitAccountId = String(item.debit_account_id);
    } else if (item.catalog_debit_account_id) {
      autoDebitAccountId = String(item.catalog_debit_account_id);
    } else if (catalogObj?.debit_account_id) {
      autoDebitAccountId = String(catalogObj.debit_account_id);
    } else if (catalogObj?.related_account_id) {
      autoDebitAccountId = String(catalogObj.related_account_id);
    } else if (item.related_account_id) {
      autoDebitAccountId = String(item.related_account_id);
    } else if (item.expense_category_id) {
      const catObj = expenseCategories.find(c => String(c.id) === String(item.expense_category_id));
      if (catObj?.related_account_id) autoDebitAccountId = String(catObj.related_account_id);
    } else if (item.debit_account_code) {
      const matchedDebit = chartOfAccounts.find(c => String(c.account_code) === String(item.debit_account_code));
      if (matchedDebit) autoDebitAccountId = String(matchedDebit.id);
    } else if (item.related_account_code) {
      const matchedDebit = chartOfAccounts.find(c => String(c.account_code) === String(item.related_account_code));
      if (matchedDebit) autoDebitAccountId = String(matchedDebit.id);
    }
    // Fallback akun debet jika belum ada ke Akun Beban/Biaya pertama di Chart of Accounts
    if (!autoDebitAccountId) {
      const fallbackDebit = chartOfAccounts.find(c => c.account_group === 'biaya' || c.account_group === 'expense' || String(c.account_code || '').startsWith('5'));
      if (fallbackDebit) autoDebitAccountId = String(fallbackDebit.id);
    }

    // 5. Resolusi Akun Akuntansi Kredit (Kas/Bank) & Rekening Kas Pembayar
    let autoCreditAccountId = '';
    if (item.credit_account_id) {
      autoCreditAccountId = String(item.credit_account_id);
    } else if (item.catalog_credit_account_id) {
      autoCreditAccountId = String(item.catalog_credit_account_id);
    } else if (catalogObj?.credit_account_id) {
      autoCreditAccountId = String(catalogObj.credit_account_id);
    } else if (item.credit_account_code) {
      const matchedCredit = chartOfAccounts.find(c => String(c.account_code) === String(item.credit_account_code));
      if (matchedCredit) autoCreditAccountId = String(matchedCredit.id);
    }

    let targetCashAccountId = '';
    if (item.cash_account_id) {
      targetCashAccountId = String(item.cash_account_id);
    } else if (item.catalog_cash_account_id) {
      targetCashAccountId = String(item.catalog_cash_account_id);
    } else if (catalogObj?.cash_account_id) {
      targetCashAccountId = String(catalogObj.cash_account_id);
    }

    // Jika rekening kas belum spesifik tapi akun kredit RAPBS sudah ditentukan, sinkronkan rekening kas
    if (!targetCashAccountId && autoCreditAccountId) {
      const matchedCashByCreditCoa = cashAccounts.find(c => String(c.account_id) === String(autoCreditAccountId));
      if (matchedCashByCreditCoa) {
        targetCashAccountId = String(matchedCashByCreditCoa.id);
      }
    }

    const selectedCash = targetCashAccountId 
      ? cashAccounts.find(a => String(a.id) === String(targetCashAccountId))
      : (cashAccounts[0] || null);
    const finalCashAccountId = selectedCash ? String(selectedCash.id) : (cashAccounts[0] ? String(cashAccounts[0].id) : '');

    // Jika akun kredit belum ditentukan di RAPBS, gunakan akun COA milik rekening kas terpilih
    if (!autoCreditAccountId && selectedCash?.account_id) {
      autoCreditAccountId = String(selectedCash.account_id);
    }
    // Fallback akun kredit ke akun Kas/Harta pertama di Chart of Accounts jika masih kosong
    if (!autoCreditAccountId) {
      const fallbackCredit = chartOfAccounts.find(c => c.account_group === 'harta' || c.account_group === 'kas' || String(c.account_code || '').startsWith('1'));
      if (fallbackCredit) autoCreditAccountId = String(fallbackCredit.id);
    }

    // Otomatis ubah mode metode pembayaran sesuai jenis rekening kas
    if (!isEdit && selectedCash) {
      if (selectedCash.account_kind === 'bank') {
        setPaymentMethodType('bank_transfer');
      } else {
        setPaymentMethodType('cash');
      }
    } else if (isEdit && selectedCash) {
      if (selectedCash.account_kind === 'bank') {
        setEditPaymentMethodType('bank_transfer');
      } else {
        setEditPaymentMethodType('cash');
      }
    }

    setForm(prev => {
      const isPackageMode = Boolean(item.is_package || item.entry_mode === 'lump_sum' || prev.is_package);
      const qty = parseFloat(item.quantity || 1);
      const unitP = parseFloat(item.unit_price || 0);
      const plannedAmt = parseFloat(item.planned_amount || item.total_price || (qty * unitP) || 0);
      const resolvedName = item.name || item.item_name || item.catalog_item_name || item.lump_sum_description || prev.item_name;

      return {
        ...prev,
        budget_plan_expense_item_id: String(item.id),
        is_outside_budget: false,
        budget_program_id: targetProgramId || prev.budget_program_id,
        catalog_item_id: targetCatalogId || prev.catalog_item_id,
        item_name: resolvedName,
        unit: item.unit || catalogObj?.unit || prev.unit || 'pcs',
        is_package: isPackageMode,
        quantity: isPackageMode ? 1 : qty,
        unit_price: isPackageMode ? String(plannedAmt) : (item.unit_price ? String(item.unit_price) : (qty > 0 ? String(plannedAmt / qty) : String(plannedAmt))),
        total_amount: String(plannedAmt),
        fund_source_type: defaultFundType,
        fund_source_ref_id: defaultFundRefId,
        fund_sources: (parsedSources && parsedSources.length > 1) ? parsedSources : null,
        cash_account_id: finalCashAccountId || prev.cash_account_id,
        override_debit_account_id: autoDebitAccountId || '',
        override_credit_account_id: autoCreditAccountId || '',
        academic_year_id: item.academic_year_id ? String(item.academic_year_id) : prev.academic_year_id
      };
    });
  };

  // Helper Multi-Sumber Dana
  const handleSwitchToMultiFund = (isEdit = false) => {
    const setForm = isEdit ? setEditFormData : setFormData;
    const currentForm = isEdit ? editFormData : formData;
    const total = parseFloat(currentForm.total_amount || 0);
    const activeVal = resolveSelectedFundSourceValue(currentForm.fund_source_type, currentForm.fund_source_ref_id);
    const [resolvedType, resolvedRef] = activeVal.split(':');
    const matchedOpt = fundSourceOptions.find(o => o.value === activeVal);

    const initialSource = {
      fund_type: resolvedType || 'opening_pool',
      fund_ref_id: Number(resolvedRef || 0),
      name: matchedOpt?.label || 'Saldo Awal Kas (Opening Pool)',
      amount: total > 0 ? total : 0
    };

    setForm(prev => ({
      ...prev,
      fund_sources: [initialSource]
    }));
  };

  const cleanFundLabel = (label = '') => {
    return (label || '').replace(/^\[.*?\]\s*/, '').trim();
  };

  const handleSwitchToSingleFund = (isEdit = false) => {
    const setForm = isEdit ? setEditFormData : setFormData;
    const currentForm = isEdit ? editFormData : formData;
    const firstSource = currentForm.fund_sources?.[0];
    const fType = firstSource?.fund_type || (firstSource?.fee_type_id ? 'fee_type' : (firstSource?.income_item_id ? 'budget_income_item' : (currentForm.fund_source_type || 'opening_pool')));
    const fRef = Number(firstSource?.fund_ref_id || firstSource?.fee_type_id || firstSource?.income_item_id || currentForm.fund_source_ref_id || 0);

    setForm(prev => ({
      ...prev,
      fund_source_type: fType,
      fund_source_ref_id: fRef,
      fund_sources: null
    }));
  };

  const handleAddFundSourceRow = (isEdit = false) => {
    const setForm = isEdit ? setEditFormData : setFormData;
    const currentForm = isEdit ? editFormData : formData;
    const currentSources = Array.isArray(currentForm.fund_sources) ? currentForm.fund_sources : [];
    const totalExpense = parseFloat(currentForm.total_amount || 0);
    const allocated = currentSources.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
    const remaining = Math.max(0, totalExpense - allocated);

    setForm(prev => ({
      ...prev,
      fund_sources: [
        ...(Array.isArray(prev.fund_sources) ? prev.fund_sources : []),
        {
          fund_type: 'opening_pool',
          fund_ref_id: 0,
          name: 'Saldo Awal Kas (Opening Pool)',
          amount: remaining
        }
      ]
    }));
  };

  const handleUpdateFundSourceRow = (index, field, value, isEdit = false) => {
    const setForm = isEdit ? setEditFormData : setFormData;
    setForm(prev => {
      const updated = [...(Array.isArray(prev.fund_sources) ? prev.fund_sources : [])];
      if (!updated[index]) return prev;

      if (field === 'fund_val') {
        const [fType, fRef] = (value || 'opening_pool:0').split(':');
        const matchedOpt = fundSourceOptions.find(o => o.value === value);
        const resolvedName = cleanFundLabel(matchedOpt?.label) || 'Pos Sumber Dana';
        updated[index] = {
          ...updated[index],
          fund_type: fType,
          fund_ref_id: Number(fRef || 0),
          name: resolvedName
        };
        if (index === 0) {
          return {
            ...prev,
            fund_source_type: fType,
            fund_source_ref_id: Number(fRef || 0),
            fund_sources: updated
          };
        }
      } else if (field === 'amount') {
        updated[index] = {
          ...updated[index],
          amount: parseFloat(value) || 0
        };
      }
      return { ...prev, fund_sources: updated };
    });
  };

  const handleRemoveFundSourceRow = (index, isEdit = false) => {
    const setForm = isEdit ? setEditFormData : setFormData;
    setForm(prev => {
      const updated = (Array.isArray(prev.fund_sources) ? prev.fund_sources : []).filter((_, idx) => idx !== index);
      return { ...prev, fund_sources: updated.length > 0 ? updated : null };
    });
  };

  // 2. Handler Pemilihan Standar Biaya / Katalog Barang
  const handleSelectCatalogItem = (catalogId, isEdit = false) => {
    const setForm = isEdit ? setEditFormData : setFormData;

    if (!catalogId) {
      setForm(prev => ({ ...prev, catalog_item_id: '' }));
      return;
    }

    const catItem = catalogItems.find(c => String(c.id) === String(catalogId));
    if (!catItem) return;

    // Resolusi akun debet katalog
    let catDebitId = '';
    if (catItem.debit_account_id) {
      catDebitId = String(catItem.debit_account_id);
    } else if (catItem.related_account_id) {
      catDebitId = String(catItem.related_account_id);
    } else if (catItem.expense_category_id) {
      const catObj = expenseCategories.find(c => String(c.id) === String(catItem.expense_category_id));
      if (catObj?.related_account_id) catDebitId = String(catObj.related_account_id);
    }

    // Resolusi akun kredit & rekening kas katalog
    let catCreditId = catItem.credit_account_id ? String(catItem.credit_account_id) : '';
    let targetCashId = catItem.cash_account_id ? String(catItem.cash_account_id) : '';

    if (catCreditId && !targetCashId) {
      const matchedCash = cashAccounts.find(c => String(c.account_id) === String(catCreditId));
      if (matchedCash) targetCashId = String(matchedCash.id);
    }

    setForm(prev => {
      const unitPrice = parseFloat(catItem.reference_price || catItem.unit_price || 0);
      const qty = prev.is_package ? 1 : (parseFloat(prev.quantity || 1));
      const total = prev.is_package ? unitPrice : (unitPrice * qty);
      const resolvedCashId = targetCashId || prev.cash_account_id;
      const selectedCash = cashAccounts.find(a => String(a.id) === String(resolvedCashId));
      const finalCreditId = catCreditId || (selectedCash?.account_id ? String(selectedCash.account_id) : prev.override_credit_account_id);

      return {
        ...prev,
        catalog_item_id: String(catItem.id),
        transaction_category_id: catItem.expense_category_id ? String(catItem.expense_category_id) : prev.transaction_category_id,
        item_name: (!prev.item_name || prev.item_name.trim() === '') ? catItem.name : prev.item_name,
        unit: catItem.unit || prev.unit || 'pcs',
        unit_price: String(unitPrice),
        total_amount: String(total),
        cash_account_id: resolvedCashId || prev.cash_account_id,
        override_debit_account_id: catDebitId || prev.override_debit_account_id,
        override_credit_account_id: finalCreditId || prev.override_credit_account_id
      };
    });
  };

  // 3. Handler Perubahan Metode Pembayaran (Tunai vs Non-Tunai Bank)
  const handlePaymentMethodChange = (method, isEdit = false) => {
    const setMethod = isEdit ? setEditPaymentMethodType : setPaymentMethodType;
    const setForm = isEdit ? setEditFormData : setFormData;

    setMethod(method);

    if (method === 'cash') {
      const cashAccount = cashAccounts.find(a => a.account_kind === 'cash' || a.account_kind === 'petty_cash')
        || cashAccounts.find(a => a.account_kind !== 'bank')
        || cashAccounts[0];

      const cashCoa = (cashAccount && cashAccount.account_id)
        ? chartOfAccounts.find(c => String(c.id) === String(cashAccount.account_id))
        : chartOfAccounts.find(c => (c.account_group === 'harta' || c.account_group === 'kas') && (c.account_name.toLowerCase().includes('kas') || String(c.account_code || '').startsWith('111')));

      const finalCreditId = cashAccount?.account_id ? String(cashAccount.account_id) : (cashCoa ? String(cashCoa.id) : '');

      setForm(prev => ({
        ...prev,
        cash_account_id: cashAccount ? String(cashAccount.id) : prev.cash_account_id,
        override_credit_account_id: finalCreditId || prev.override_credit_account_id,
        bank_statement_id: ''
      }));
    } else if (method === 'bank_transfer') {
      const bankAccount = cashAccounts.find(a => a.account_kind === 'bank')
        || cashAccounts.find(a => a.bank_name || a.bank_account_number)
        || cashAccounts[0];

      const bankCoa = (bankAccount && bankAccount.account_id)
        ? chartOfAccounts.find(c => String(c.id) === String(bankAccount.account_id))
        : chartOfAccounts.find(c => (c.account_group === 'harta' || c.account_group === 'bank') && (c.account_name.toLowerCase().includes('bank') || String(c.account_code || '').startsWith('112')));

      const finalCreditId = bankAccount?.account_id ? String(bankAccount.account_id) : (bankCoa ? String(bankCoa.id) : '');

      setForm(prev => ({
        ...prev,
        cash_account_id: bankAccount ? String(bankAccount.id) : prev.cash_account_id,
        override_credit_account_id: finalCreditId || prev.override_credit_account_id
      }));
    }
  };

  // 4. Handler Perubahan Rekening Kas / Bank Penampung
  const handleCashAccountChange = (cashAccId, isEdit = false) => {
    const setForm = isEdit ? setEditFormData : setFormData;
    const selectedCash = cashAccounts.find(a => String(a.id) === String(cashAccId));
    if (selectedCash) {
      if (selectedCash.account_kind === 'bank') {
        if (isEdit) setEditPaymentMethodType('bank_transfer');
        else setPaymentMethodType('bank_transfer');
      } else {
        if (isEdit) setEditPaymentMethodType('cash');
        else setPaymentMethodType('cash');
      }
    }

    setForm(prev => ({
      ...prev,
      cash_account_id: cashAccId,
      override_credit_account_id: selectedCash?.account_id ? String(selectedCash.account_id) : prev.override_credit_account_id
    }));
  };

  // 4. Handler Pemilihan GTK PIC
  const handleSelectStaff = (staffId, isEdit = false) => {
    const setForm = isEdit ? setEditFormData : setFormData;
    const emp = employees.find(e => String(e.id) === String(staffId));

    setForm(prev => ({
      ...prev,
      staff_id: staffId || '',
      staff_name: emp?.name || emp?.full_name || ''
    }));
  };

  // 5. Kalkulator Otomatis Qty, Unit Price, Total Amount, Sifat Paket
  const handleAmountCalculations = (field, val, isEdit = false) => {
    const setForm = isEdit ? setEditFormData : setFormData;

    setForm(prev => {
      const updated = { ...prev, [field]: val };
      if (updated.is_package) {
        if (field === 'total_amount' || field === 'unit_price') {
          updated.total_amount = val;
          updated.unit_price = val;
        }
        updated.quantity = 1;
        updated.unit = 'Paket';
      } else {
        const q = parseFloat(field === 'quantity' ? val : updated.quantity) || 0;
        const up = parseFloat(field === 'unit_price' ? val : updated.unit_price) || 0;
        if (field === 'total_amount') {
          const tot = parseFloat(val) || 0;
          updated.total_amount = val;
          updated.unit_price = q > 0 ? String(tot / q) : val;
        } else {
          updated.total_amount = String(q * up);
        }
      }
      return updated;
    });
  };

  // ---------------------------------------------------------------------------
  // SUBMIT HANDLERS
  // ---------------------------------------------------------------------------

  // 1. Simpan Pengeluaran Baru
  const handleSaveExpense = async (printAfter = false) => {
    if (!formData.item_name?.trim()) {
      alert('Silakan isi Uraian / Keterangan Belanja.');
      return;
    }
    const total = parseFloat(formData.total_amount || 0);
    if (isNaN(total) || total <= 0) {
      alert('Nominal pengeluaran harus lebih besar dari 0.');
      return;
    }
    if (!formData.expense_date) {
      alert('Silakan pilih Tanggal Pengeluaran.');
      return;
    }
    if (!formData.cash_account_id) {
      alert('Silakan pilih Rekening Kas / Bank Pembayar.');
      return;
    }
    if (!formData.budget_program_id) {
      alert('Silakan pilih Program Anggaran RKS terkait. Setiap transaksi belanja wajib terhubung ke program kerja.');
      return;
    }

    if (Array.isArray(formData.fund_sources) && formData.fund_sources.length > 0) {
      const totalAllocated = formData.fund_sources.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
      if (Math.abs(totalAllocated - total) > 1) {
        alert(`Total alokasi multi-sumber dana (Rp ${totalAllocated.toLocaleString('id-ID')}) belum sesuai dengan Total Pengeluaran Kas (Rp ${total.toLocaleString('id-ID')}). Silakan sesuaikan pembagian nominal sumber dana.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        budget_plan_expense_item_id: formData.is_outside_budget ? null : (formData.budget_plan_expense_item_id || null),
        is_outside_budget: Boolean(formData.is_outside_budget),
        proposed_to_rapbs: Boolean(formData.proposed_to_rapbs),
        catalog_item_id: formData.catalog_item_id || null,
        budget_program_id: formData.budget_program_id || null,
        transaction_category_id: formData.transaction_category_id || formData.expense_category_id || null,
        staff_id: formData.staff_id || null,
        staff_name: formData.staff_name || null,
        payment_method: paymentMethodType,
        bank_statement_id: paymentMethodType === 'bank_transfer' ? (formData.bank_statement_id || null) : null,
        cash_account_id: formData.cash_account_id,
        item_name: formData.item_name,
        is_package: Boolean(formData.is_package),
        unit: formData.is_package ? 'Paket' : (formData.unit || 'pcs'),
        unit_price: parseFloat(formData.unit_price || 0),
        quantity: parseFloat(formData.quantity || 1),
        total_amount: total,
        vendor: formData.vendor || null,
        expense_date: formData.expense_date,
        proof_number: formData.proof_number || null,
        academic_year_id: Number(formData.academic_year_id || selectedAcademicYearId || 2),
        fund_source_type: formData.fund_source_type || 'opening_pool',
        fund_source_ref_id: Number(formData.fund_source_ref_id || 0),
        fund_source_override_reason: formData.fund_source_override_reason || null,
        fund_sources: formData.fund_sources,
        override_debit_account_id: formData.override_debit_account_id || null,
        override_credit_account_id: formData.override_credit_account_id || null,
        override_reason: formData.override_reason || null,
        notes: formData.notes || null
      };

      const res = await api.post('/keuangan/expenses', payload);
      alert('Pengeluaran kas berhasil dicatat & jurnal otomatis telah dibukukan!');

      if (res.data?.data?.budget_warning) {
        alert(res.data.data.budget_warning);
      }

      setModalOpen(false);
      fetchExpensesData();

      if (printAfter && res.data?.data) {
        openExpenseVoucherInNewTab(res.data.data, activeSchoolUnit?.name);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Simpan Edit / Koreksi Pengeluaran
  const handleUpdateExpenseSubmit = async () => {
    if (!editFormData.item_name?.trim()) {
      alert('Silakan isi Uraian / Keterangan Belanja.');
      return;
    }
    const total = parseFloat(editFormData.total_amount || 0);
    if (isNaN(total) || total <= 0) {
      alert('Nominal pengeluaran harus lebih besar dari 0.');
      return;
    }
    if (!editFormData.edit_reason?.trim()) {
      alert('Alasan Perubahan / Koreksi Belanja wajib diisi untuk audit log.');
      return;
    }
    if (!editFormData.budget_program_id) {
      alert('Silakan pilih Program Anggaran RKS terkait. Setiap transaksi belanja wajib terhubung ke program kerja.');
      return;
    }

    if (Array.isArray(editFormData.fund_sources) && editFormData.fund_sources.length > 0) {
      const totalAllocated = editFormData.fund_sources.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
      if (Math.abs(totalAllocated - total) > 1) {
        alert(`Total alokasi multi-sumber dana (Rp ${totalAllocated.toLocaleString('id-ID')}) belum sesuai dengan Total Pengeluaran Kas (Rp ${total.toLocaleString('id-ID')}). Silakan sesuaikan pembagian nominal sumber dana.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        budget_plan_expense_item_id: editFormData.is_outside_budget ? null : (editFormData.budget_plan_expense_item_id || null),
        is_outside_budget: Boolean(editFormData.is_outside_budget),
        proposed_to_rapbs: Boolean(editFormData.proposed_to_rapbs),
        catalog_item_id: editFormData.catalog_item_id || null,
        budget_program_id: editFormData.budget_program_id || null,
        transaction_category_id: editFormData.transaction_category_id || null,
        staff_id: editFormData.staff_id || null,
        staff_name: editFormData.staff_name || null,
        payment_method: editPaymentMethodType,
        bank_statement_id: editPaymentMethodType === 'bank_transfer' ? (editFormData.bank_statement_id || null) : null,
        cash_account_id: editFormData.cash_account_id,
        item_name: editFormData.item_name,
        is_package: Boolean(editFormData.is_package),
        unit: editFormData.is_package ? 'Paket' : (editFormData.unit || 'pcs'),
        unit_price: parseFloat(editFormData.unit_price || 0),
        quantity: parseFloat(editFormData.quantity || 1),
        total_amount: total,
        vendor: editFormData.vendor || null,
        expense_date: editFormData.expense_date,
        proof_number: editFormData.proof_number || null,
        academic_year_id: Number(editFormData.academic_year_id || selectedAcademicYearId || 2),
        fund_source_type: editFormData.fund_source_type || 'opening_pool',
        fund_source_ref_id: Number(editFormData.fund_source_ref_id || 0),
        fund_source_override_reason: editFormData.fund_source_override_reason || null,
        fund_sources: editFormData.fund_sources,
        override_debit_account_id: editFormData.override_debit_account_id || null,
        override_credit_account_id: editFormData.override_credit_account_id || null,
        override_reason: editFormData.override_reason || null,
        notes: editFormData.notes || null,
        edit_reason: editFormData.edit_reason
      };

      await api.put(`/keuangan/expenses/${editFormData.id}`, payload);
      alert('Pengeluaran berhasil diperbarui & jurnal otomatis telah disesuaikan!');
      setEditModalOpen(false);
      fetchExpensesData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Batalkan / Void Pengeluaran
  const handleExecuteCancelExpense = async () => {
    if (!cancellationReason.trim()) {
      alert('Alasan pembatalan wajib diisi.');
      return;
    }

    setCancelling(true);
    try {
      await api.delete(`/keuangan/expenses/${expenseToCancel.id}`, {
        data: { deleted_reason: cancellationReason }
      });
      alert('Pengeluaran berhasil dibatalkan dan jurnal pembalik telah diterbitkan!');
      setCancelModalOpen(false);
      setExpenseToCancel(null);
      setCancellationReason('');
      fetchExpensesData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan pengeluaran');
    } finally {
      setCancelling(false);
    }
  };

  // 4. Alihkan Sumber Dana (Reassign Fund Source)
  const handleExecuteReassignFund = async (e) => {
    e.preventDefault();
    if (!reassignForm.reason.trim()) {
      alert('Alasan pengalihan sumber dana wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/keuangan/expenses/${reassignExpense.id}/fund-source`, reassignForm);
      alert('Sumber dana berhasil dialokasikan ulang!');
      setReassignModalOpen(false);
      setReassignExpense(null);
      fetchExpensesData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengalihkan sumber dana');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // DROPDOWN OPTIONS LIST BUILDERS
  // ---------------------------------------------------------------------------

  // Options Pos Belanja RAPBS (Mendukung Prioritas Sesuai Program Terpilih)
  const getRapbsExpenseOptions = (currentProgramId) => {
    const opts = [
      {
        value: '',
        label: '-- Di Luar Perencanaan RAPBS (Pengeluaran Non-RAPBS / Darurat) --',
        sublabel: 'Pengeluaran di luar anggaran tahun berjalan yang direncanakan',
        badge: 'Non-RAPBS',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
      }
    ];

    const sortedItems = [...(Array.isArray(budgetItems) ? budgetItems : [])].sort((a, b) => {
      if (currentProgramId) {
        const aMatch = String(a.budget_program_id) === String(currentProgramId);
        const bMatch = String(b.budget_program_id) === String(currentProgramId);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    sortedItems.forEach(item => {
      const q = parseFloat(item.quantity || 1);
      const p = parseFloat(item.unit_price || 0);
      const rawPagu = parseFloat(item.planned_amount || item.total_price || (q * p) || 0);
      const pagu = isNaN(rawPagu) ? 0 : rawPagu;

      const itemName = item.name || item.item_name || item.catalog_item_name || item.lump_sum_description || 'Pos Belanja';
      const itemCode = item.code || item.item_code || '';
      const progName = item.budget_program_name || '';
      const planTitle = item.plan_title || 'RAPBS';
      const isProgMatch = currentProgramId && String(item.budget_program_id) === String(currentProgramId);
      const statusBadge = isProgMatch
        ? `⭐ Program Sesuai (${item.plan_status === 'published' ? 'RAPBS Sah' : 'Draft'})`
        : (item.plan_status === 'published' ? 'RAPBS Sah' : (item.plan_status === 'draft' ? 'RAPBS Draft' : 'Pos RAPBS'));
      const badgeClass = isProgMatch
        ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold'
        : (item.plan_status === 'published'
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
          : 'bg-amber-50 text-amber-800 border-amber-300');

      opts.push({
        value: String(item.id),
        label: `${itemCode ? `[${itemCode}] ` : ''}${itemName}`,
        sublabel: `Pagu: ${formatCurrency(pagu)} &bull; ${planTitle}${progName ? ` &bull; Program: ${progName}` : ''} &bull; Satuan: ${item.unit || 'pcs'}`,
        badge: statusBadge,
        badgeClass: badgeClass,
        searchTerms: [
          itemName,
          item.name,
          item.item_name,
          item.catalog_item_name,
          item.lump_sum_description,
          itemCode,
          planTitle,
          progName,
          item.unit,
          formatCurrency(pagu),
          String(pagu),
          String(item.budget_program_id)
        ].filter(Boolean)
      });
    });

    return opts;
  };

  const rapbsExpenseOptions = useMemo(() => {
    return getRapbsExpenseOptions('');
  }, [budgetItems]);

  // Options Standar Biaya / Katalog Barang
  const catalogItemOptions = useMemo(() => {
    const opts = [
      {
        value: '',
        label: '-- Input Bebas / Di Luar Standar Katalog Barang --',
        sublabel: 'Barang / jasa custom di luar katalog acuan harga satuan'
      }
    ];

    (Array.isArray(catalogItems) ? catalogItems : []).forEach(cat => {
      const price = parseFloat(cat.reference_price || cat.unit_price || 0);
      opts.push({
        value: String(cat.id),
        label: cat.name,
        sublabel: `Satuan: ${cat.unit || 'pcs'} &bull; Acuan: ${formatCurrency(price)} &bull; Kategori: ${cat.category_name || 'Umum'}`,
        badge: cat.unit || 'Barang',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        searchTerms: [cat.name, cat.unit, formatCurrency(price), cat.category_name].filter(Boolean)
      });
    });

    return opts;
  }, [catalogItems]);

  // Options Program Anggaran RKS
  const budgetProgramOptions = useMemo(() => {
    const opts = [
      { value: '', label: '-- Pilih Program Kerja / Kegiatan RKS --', sublabel: 'Opsional klasifikasi program' }
    ];
    (Array.isArray(budgetPrograms) ? budgetPrograms : []).forEach(prog => {
      opts.push({
        value: String(prog.id),
        label: prog.name,
        sublabel: prog.rks_reference_id ? `Ref RKS #${prog.rks_reference_id}` : 'Program Operasional',
        searchTerms: [prog.name, String(prog.id)]
      });
    });
    return opts;
  }, [budgetPrograms]);

  // Options Pegawai / GTK Terkait
  const employeeOptions = useMemo(() => {
    const opts = [
      { value: '', label: '-- Tanpa PIC Pegawai / Umum --', sublabel: 'Pembelian langsung / vendor' }
    ];
    (Array.isArray(employees) ? employees : []).forEach(emp => {
      const empName = emp.name || emp.full_name || `Pegawai #${emp.id}`;
      const nip = emp.nip || emp.employee_number || '';
      const role = emp.position || emp.job_title || emp.status || '';
      opts.push({
        value: String(emp.id),
        label: empName,
        sublabel: `${nip ? `NIP: ${nip} &bull; ` : ''}${role || 'GTK'}`,
        badge: 'GTK',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
        searchTerms: [empName, nip, role, String(emp.id)].filter(Boolean)
      });
    });
    return opts;
  }, [employees]);

  // Options Rekening Kas / Bank (Tampilkan Nomor Rekening & Nama Bank)
  const cashAccountOptions = useMemo(() => {
    return (Array.isArray(cashAccounts) ? cashAccounts : []).map(c => {
      const isBank = c.account_kind === 'bank';
      const bankName = c.bank_name || 'Bank';
      const accNum = c.bank_account_number || '';
      
      const labelText = isBank
        ? (accNum ? `${c.name} - ${bankName} [No. Rek: ${accNum}]` : `${c.name} - ${bankName}`)
        : `${c.name} (Kas Tunai)`;
      
      const sublabelText = isBank
        ? `Bank: ${bankName} &bull; ${accNum ? `No. Rek: ${accNum}` : 'Tanpa No. Rek'} &bull; Saldo: ${formatCurrency(c.balance || 0)}`
        : `Kasir / Loket Tunai &bull; Saldo: ${formatCurrency(c.balance || 0)}`;

      return {
        value: String(c.id),
        label: labelText,
        sublabel: sublabelText,
        badge: isBank ? bankName : 'Kas Tunai',
        badgeClass: isBank ? 'bg-sky-100 text-sky-800 border-sky-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200',
        searchTerms: [c.name, bankName, accNum, isBank ? 'bank' : 'tunai', String(c.id)].filter(Boolean)
      };
    });
  }, [cashAccounts]);

  // Resolver Warna Khusus & Unik untuk Setiap Pos Sumber Dana (Kantong Dana)
  const resolveFundColor = (name = '', fundType = '') => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('saldo awal') || lower.includes('opening pool') || fundType === 'opening_pool') {
      return { badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/90 shadow-2xs', dotClass: 'bg-teal-500' };
    }
    if (lower.includes('spp') || lower.includes('syahriah') || lower.includes('santri') || fundType === 'fee_type') {
      return { badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/90 shadow-2xs', dotClass: 'bg-indigo-500' };
    }
    if (lower.includes('bos') || lower.includes('bantuan operasional') || lower.includes('pemerintah')) {
      return { badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 shadow-2xs', dotClass: 'bg-emerald-500' };
    }
    if (lower.includes('subsidi') || lower.includes('yayasan') || lower.includes('hibah')) {
      return { badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90 shadow-2xs', dotClass: 'bg-amber-500' };
    }
    if (lower.includes('infaq') || lower.includes('gedung') || lower.includes('wakaf') || lower.includes('donasi')) {
      return { badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/90 shadow-2xs', dotClass: 'bg-purple-500' };
    }
    if (lower.includes('dapur') || lower.includes('kantin') || lower.includes('konsumsi') || lower.includes('makan')) {
      return { badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/90 shadow-2xs', dotClass: 'bg-rose-500' };
    }
    if (lower.includes('psb') || lower.includes('ppdb') || lower.includes('daftar') || lower.includes('formulir')) {
      return { badgeClass: 'bg-sky-50 text-sky-800 border-sky-200/90 shadow-2xs', dotClass: 'bg-sky-500' };
    }
    if (lower.includes('sewa') || lower.includes('usaha') || lower.includes('unit')) {
      return { badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200/90 shadow-2xs', dotClass: 'bg-cyan-500' };
    }

    // Deterministic curated palette untuk pos lainnya berdasarkan hash nama
    const palettes = [
      { badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/90 shadow-2xs', dotClass: 'bg-blue-500' },
      { badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 shadow-2xs', dotClass: 'bg-emerald-500' },
      { badgeClass: 'bg-violet-50 text-violet-800 border-violet-200/90 shadow-2xs', dotClass: 'bg-violet-500' },
      { badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90 shadow-2xs', dotClass: 'bg-amber-500' },
      { badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/90 shadow-2xs', dotClass: 'bg-rose-500' },
      { badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/90 shadow-2xs', dotClass: 'bg-teal-500' },
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % palettes.length;
    return palettes[idx];
  };

  // Helper Format Singkat & Ringkas Rekening Kas (Contoh: "BSI - 5114411440" / "Kas Tunai")
  const formatCashAccountShortLabel = (cashAcc, exp = {}) => {
    const bAccNo = exp.cash_bank_account_number || cashAcc?.bank_account_number || '';
    const rawBankName = exp.cash_bank_name || cashAcc?.bank_name || '';
    const accName = exp.cash_account_name || cashAcc?.name || '';
    const isBank = cashAcc?.account_kind === 'bank' || exp.payment_method === 'bank_transfer' || Boolean(bAccNo);

    if (isBank) {
      let shortBank = '';
      const combined = `${rawBankName} ${accName}`.toUpperCase();
      if (combined.includes('BSI') || combined.includes('SYARIAH INDONESIA')) shortBank = 'BSI';
      else if (combined.includes('BNI')) shortBank = 'BNI';
      else if (combined.includes('BCA')) shortBank = 'BCA';
      else if (combined.includes('BRI')) shortBank = 'BRI';
      else if (combined.includes('MANDIRI')) shortBank = 'Mandiri';
      else if (combined.includes('BJB') || combined.includes('JABAR')) shortBank = 'BJB';
      else if (combined.includes('MUAMALAT')) shortBank = 'Muamalat';
      else if (combined.includes('CIMB')) shortBank = 'CIMB';
      else if (rawBankName) {
        shortBank = rawBankName.replace(/^Bank\s+/i, '').replace(/\s*\([^)]*\)/g, '').trim();
      } else {
        shortBank = 'Bank';
      }

      if (bAccNo) {
        return `${shortBank} - ${bAccNo}`;
      }
      return shortBank;
    }

    return accName || 'Kas Tunai';
  };

  // Resolver Warna Khusus & Unik untuk Setiap Bank / Rekening Non-Tunai
  const resolveBankBadgeColor = (bankName = '', accountNumber = '') => {
    const combined = `${bankName} ${accountNumber}`.toLowerCase();
    if (combined.includes('bsi') || combined.includes('syariah')) {
      return { badgeClass: 'bg-teal-50 text-teal-900 border-teal-300 font-bold', dotClass: 'bg-teal-500' };
    }
    if (combined.includes('bca')) {
      return { badgeClass: 'bg-blue-50 text-blue-900 border-blue-300 font-bold', dotClass: 'bg-blue-600' };
    }
    if (combined.includes('mandiri')) {
      return { badgeClass: 'bg-amber-50 text-amber-950 border-amber-300 font-bold', dotClass: 'bg-amber-500' };
    }
    if (combined.includes('bni')) {
      return { badgeClass: 'bg-orange-50 text-orange-950 border-orange-300 font-bold', dotClass: 'bg-orange-500' };
    }
    if (combined.includes('bri')) {
      return { badgeClass: 'bg-sky-50 text-sky-950 border-sky-300 font-bold', dotClass: 'bg-sky-500' };
    }
    if (combined.includes('bjb') || combined.includes('jabar')) {
      return { badgeClass: 'bg-indigo-50 text-indigo-950 border-indigo-300 font-bold', dotClass: 'bg-indigo-600' };
    }
    if (combined.includes('muamalat')) {
      return { badgeClass: 'bg-purple-50 text-purple-950 border-purple-300 font-bold', dotClass: 'bg-purple-600' };
    }
    if (combined.includes('cimb') || combined.includes('niaga')) {
      return { badgeClass: 'bg-rose-50 text-rose-950 border-rose-300 font-bold', dotClass: 'bg-rose-600' };
    }

    // Deterministic palette untuk bank lainnya berdasarkan hash
    const palettes = [
      { badgeClass: 'bg-cyan-50 text-cyan-900 border-cyan-300 font-bold', dotClass: 'bg-cyan-500' },
      { badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold', dotClass: 'bg-emerald-500' },
      { badgeClass: 'bg-violet-50 text-violet-900 border-violet-300 font-bold', dotClass: 'bg-violet-500' },
      { badgeClass: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-300 font-bold', dotClass: 'bg-fuchsia-500' },
      { badgeClass: 'bg-lime-50 text-lime-900 border-lime-300 font-bold', dotClass: 'bg-lime-600' },
      { badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 font-bold', dotClass: 'bg-slate-500' }
    ];
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = combined.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % palettes.length;
    return palettes[idx];
  };

  // Options Sumber Dana (Kantong Dana & Pelacakan Arus Pemasukan ke Pengeluaran)
  const fundSourceOptions = useMemo(() => {
    const opts = [
      {
        value: 'opening_pool:0',
        label: 'Saldo Awal Kas (Opening Pool)',
        sublabel: 'Saldo awal kas operasional sekolah & kas utama (Master Data)',
        badge: 'Saldo Awal',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-300',
        searchTerms: ['opening_pool', 'saldo awal kas', 'saldo awal', 'opening pool', 'kas utama']
      }
    ];

    // 1. Master Pos Penagihan Santri (Fee Types) - Didahulukan agar nama pos bersih
    (Array.isArray(feeTypes) ? feeTypes : []).forEach(ft => {
      const val = `fee_type:${ft.id}`;
      if (!opts.some(o => o.value === val)) {
        const colorScheme = resolveFundColor(ft.name, 'fee_type');
        opts.push({
          value: val,
          label: `[Tagihan Santri] ${ft.name}`,
          sublabel: `Pos Penagihan Biaya Santri • Pola: ${ft.billing_pattern || 'Bulanan'} ${ft.code ? `• Kode: ${ft.code}` : ''}`,
          badge: 'Tagihan Santri',
          badgeClass: colorScheme.badgeClass,
          searchTerms: [ft.name, ft.code, 'tagihan', 'santri', 'spp', String(ft.id)].filter(Boolean)
        });
      }
    });

    // 2. Rencana Pemasukan RAPBS (Budget Income Items)
    (Array.isArray(budgetIncomeItems) ? budgetIncomeItems : []).forEach(inc => {
      const pagu = parseFloat(inc.planned_amount || 0);
      const incVal = inc.fee_type_id ? `fee_type:${inc.fee_type_id}` : `budget_income_item:${inc.id}`;
      const statusText = inc.plan_status === 'published' ? 'RAPBS Sah' : (inc.plan_status === 'draft' ? 'RAPBS Draft' : 'RAPBS');
      const colorScheme = resolveFundColor(inc.name, inc.fee_type_id ? 'fee_type' : 'budget_income_item');
      
      const existingIdx = opts.findIndex(o => o.value === incVal);
      if (existingIdx >= 0) {
        // Tambahkan konteks pencarian RAPBS ke opsi yang sudah ada tanpa menimpa nama bersihnya
        opts[existingIdx].searchTerms = [
          ...opts[existingIdx].searchTerms,
          inc.name,
          inc.plan_title,
          formatCurrency(pagu)
        ];
      } else {
        opts.push({
          value: incVal,
          label: `[Pemasukan RAPBS] ${inc.name}`,
          sublabel: `Pagu Rencana: ${formatCurrency(pagu)} ${inc.fee_type_name ? `• Jenis Tagihan: ${inc.fee_type_name}` : ''} • ${inc.plan_title || 'RAPBS'} (${statusText})`,
          badge: 'Pemasukan RAPBS',
          badgeClass: colorScheme.badgeClass,
          searchTerms: [
            inc.name,
            inc.fee_type_name,
            'pemasukan',
            'rapbs',
            inc.plan_title,
            formatCurrency(pagu),
            String(inc.id)
          ].filter(Boolean)
        });
      }
    });

    // 3. Saldo Awal / Kantong Dana Terdaftar (Fund Balances)
    const fundList = [];
    (Array.isArray(availableFundGroups) ? availableFundGroups : []).forEach(grp => {
      const items = Array.isArray(grp.options) ? grp.options : (Array.isArray(grp.sources) ? grp.sources : []);
      items.forEach(s => fundList.push({ ...s, group_title: grp.group_title || grp.title || grp.name }));
    });
    if (fundList.length === 0 && Array.isArray(fundBalancesOptions)) {
      fundBalancesOptions.forEach(s => fundList.push(s));
    }

    fundList.forEach(s => {
      const val = `${s.fund_type}:${s.fund_ref_id}`;
      if (!opts.some(o => o.value === val)) {
        const colorScheme = resolveFundColor(s.name, s.fund_type);
        opts.push({
          value: val,
          label: s.name,
          sublabel: `Grup: ${s.group_title || s.category || 'Kantong Dana'} • Sisa Saldo: ${formatCurrency(s.balance || 0)}`,
          badge: s.group_title || 'Kantong Dana',
          badgeClass: colorScheme.badgeClass,
          searchTerms: [s.name, s.group_title, s.category, formatCurrency(s.balance || 0), s.fund_type, String(s.fund_ref_id)].filter(Boolean)
        });
      }
    });

    return opts;
  }, [budgetIncomeItems, feeTypes, availableFundGroups, fundBalancesOptions]);

  // Helper resolusi info badge lengkap & warna Pos Sumber Dana
  const getExpenseFundSourceBadgeInfo = (exp) => {
    if (!exp) {
      return {
        name: 'Saldo Awal Kas (Opening Pool)',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/90 shadow-2xs',
        dotClass: 'bg-teal-500',
        isMulti: false
      };
    }

    let parsedFs = null;
    if (exp.fund_sources) {
      try {
        const raw = typeof exp.fund_sources === 'string' ? JSON.parse(exp.fund_sources) : exp.fund_sources;
        if (Array.isArray(raw) && raw.length > 0) parsedFs = raw;
      } catch (_) {}
    }

    if (parsedFs && parsedFs.length > 0) {
      if (parsedFs.length === 1) {
        const s = parsedFs[0];
        const fType = s.fund_type || (s.fee_type_id ? 'fee_type' : (s.income_item_id ? 'budget_income_item' : 'opening_pool'));
        const fRef = Number(s.fund_ref_id || s.fee_type_id || s.income_item_id || 0);

        let singleName = '';
        if (fType === 'opening_pool' || fRef === 0) {
          singleName = 'Saldo Awal Kas (Opening Pool)';
        } else if (fType === 'fee_type') {
          const ft = feeTypes.find(f => Number(f.id) === fRef);
          singleName = ft?.name || exp.actual_fund_fee_name || cleanFundLabel(s.name) || 'Pos Tagihan Santri';
        } else if (fType === 'budget_income_item') {
          const inc = budgetIncomeItems.find(i => Number(i.id) === fRef);
          singleName = inc?.name || exp.actual_fund_income_item_name || cleanFundLabel(s.name) || 'Pemasukan RAPBS';
        } else if (fType === 'transaction_category') {
          const tc = expenseCategories.find(c => Number(c.id) === fRef);
          singleName = tc?.name || exp.actual_fund_cat_name || cleanFundLabel(s.name) || 'Kategori Pemasukan';
        } else {
          const matchedOpt = fundSourceOptions.find(o => o.value === `${fType}:${fRef}`);
          singleName = cleanFundLabel(matchedOpt?.label) || cleanFundLabel(s.name) || 'Pos Sumber Dana';
        }

        const color = resolveFundColor(singleName, fType);
        return {
          name: singleName,
          badgeClass: color.badgeClass,
          dotClass: color.dotClass,
          isMulti: false
        };
      }
      return {
        name: `⚡ Multi-Sumber (${parsedFs.length})`,
        tooltip: parsedFs.map(s => `${cleanFundLabel(s.name) || 'Pos'}: ${formatCurrency(s.amount)}`).join(', '),
        badgeClass: 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 border-amber-300 font-bold shadow-2xs',
        dotClass: 'bg-amber-500',
        isMulti: true,
        count: parsedFs.length
      };
    }

    const fundType = exp.fund_source_type || 'opening_pool';
    const fundRefId = Number(exp.fund_source_ref_id || 0);

    if (fundType === 'opening_pool' || fundRefId === 0) {
      const color = resolveFundColor('Saldo Awal Kas (Opening Pool)', 'opening_pool');
      return {
        name: 'Saldo Awal Kas (Opening Pool)',
        badgeClass: color.badgeClass,
        dotClass: color.dotClass,
        isMulti: false
      };
    }

    let resolvedName = '';
    if (fundType === 'fee_type') {
      const ft = feeTypes.find(f => Number(f.id) === Number(fundRefId));
      resolvedName = ft?.name || exp.actual_fund_fee_name || 'Pos Tagihan Santri';
    } else if (fundType === 'budget_income_item') {
      const inc = budgetIncomeItems.find(i => Number(i.id) === Number(fundRefId));
      resolvedName = inc?.name || exp.actual_fund_income_item_name || 'Pemasukan RAPBS';
    } else if (fundType === 'transaction_category') {
      const tc = expenseCategories.find(c => Number(c.id) === Number(fundRefId));
      resolvedName = tc?.name || exp.actual_fund_cat_name || 'Kategori Pemasukan';
    } else {
      const matchedOpt = fundSourceOptions.find(o => o.value === `${fundType}:${fundRefId}`);
      if (matchedOpt?.label) {
        resolvedName = cleanFundLabel(matchedOpt.label);
      } else {
        resolvedName = exp.actual_fund_income_item_name || exp.actual_fund_fee_name || exp.actual_fund_cat_name || 'Pos Sumber Dana';
      }
    }

    const color = resolveFundColor(resolvedName, fundType);
    return {
      name: resolvedName,
      badgeClass: color.badgeClass,
      dotClass: color.dotClass,
      isMulti: false
    };
  };

  // Helper resolusi nama string Pos Sumber Dana
  const getExpenseFundSourceName = (exp) => {
    return getExpenseFundSourceBadgeInfo(exp).name;
  };

  // Options Toolbar Filters dengan LiveSearch
  const monthFilterOptions = useMemo(() => [
    { value: 'all', label: 'Semua Bulan Transaksi' },
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ], []);

  const budgetStatusFilterOptions = useMemo(() => [
    { value: 'all', label: 'Semua Status RAPBS' },
    { value: 'budgeted', label: 'Sesuai Perencanaan RAPBS', badge: 'Pos RAPBS', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { value: 'outside', label: 'Di Luar RAPBS (Darurat)', badge: 'Non-RAPBS', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' }
  ], []);

  const filterCashAccountOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Semua Kas / Bank', sublabel: 'Tampilkan seluruh rekening kas & bank' },
      ...cashAccountOptions
    ];
  }, [cashAccountOptions]);

  const filterProgramOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Semua Program RKS', sublabel: 'Tampilkan seluruh program kerja' },
      ...(Array.isArray(budgetPrograms) ? budgetPrograms : []).map(p => ({
        value: String(p.id),
        label: p.name,
        sublabel: p.rks_reference_id ? `Ref RKS #${p.rks_reference_id}` : 'Program Operasional',
        searchTerms: [p.name, String(p.id)]
      }))
    ];
  }, [budgetPrograms]);

  // Options Kategori Pengeluaran Bebas
  const categoryOptions = useMemo(() => {
    return (Array.isArray(expenseCategories) ? expenseCategories : []).map(cat => ({
      value: String(cat.id),
      label: cat.name,
      sublabel: `Akun Terkait: ${cat.account_name || cat.related_account_id || '-'}`,
      searchTerms: [cat.name, String(cat.id)]
    }));
  }, [expenseCategories]);

  // Options COA Debet Beban / Aset
  const coaDebitOptions = useMemo(() => {
    return (Array.isArray(chartOfAccounts) ? chartOfAccounts : []).map(c => ({
      value: String(c.id),
      label: `[${c.account_code}] ${c.account_name}`,
      sublabel: `Grup: ${c.account_group} &bull; Saldo Normal: ${c.normal_balance}`,
      badge: c.account_group === 'biaya' ? 'Beban' : (c.account_group === 'harta' ? 'Aset/Harta' : c.account_group),
      badgeClass: c.account_group === 'biaya' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200',
      searchTerms: [c.account_code, c.account_name, c.account_group]
    }));
  }, [chartOfAccounts]);

  // Options COA Kredit Kas / Bank
  const coaCreditOptions = useMemo(() => {
    return (Array.isArray(chartOfAccounts) ? chartOfAccounts : []).map(c => ({
      value: String(c.id),
      label: `[${c.account_code}] ${c.account_name}`,
      sublabel: `Grup: ${c.account_group} &bull; Saldo Normal: ${c.normal_balance}`,
      badge: c.account_group === 'harta' ? 'Kas/Harta' : c.account_group,
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
      searchTerms: [c.account_code, c.account_name, c.account_group]
    }));
  }, [chartOfAccounts]);

  // Options Tahun Ajaran
  const academicYearOptions = useMemo(() => {
    return (Array.isArray(academicYears) ? academicYears : []).map(ay => ({
      value: String(ay.id),
      label: `${ay.name || ay.academic_year_name || 'T.A.'} ${ay.is_active ? '(Aktif)' : ''}`,
      badge: ay.is_active ? 'T.A. Aktif' : '',
      badgeClass: ay.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : ''
    }));
  }, [academicYears]);

  // Active Selected BudgetItem Details untuk Visual Guide
  const activeSelectedBudgetItem = useMemo(() => {
    if (formData.is_outside_budget || !formData.budget_plan_expense_item_id) return null;
    return (Array.isArray(budgetItems) ? budgetItems : []).find(x => String(x.id) === String(formData.budget_plan_expense_item_id)) || null;
  }, [formData.is_outside_budget, formData.budget_plan_expense_item_id, budgetItems]);

  const activeBudgetItemPagu = activeSelectedBudgetItem ? parseFloat(activeSelectedBudgetItem.planned_amount || activeSelectedBudgetItem.total_price || 0) : 0;

  // Live Realtime Filter Pencarian Pengeluaran Kas
  const filteredExpenses = useMemo(() => {
    if (!Array.isArray(expenses)) return [];
    if (!searchQuery || !searchQuery.trim()) return expenses;

    const term = searchQuery.toLowerCase().trim();
    return expenses.filter(exp => {
      const fundName = getExpenseFundSourceName(exp)?.toLowerCase() || '';
      const bkkCode = `bkk-${exp.id}`.toLowerCase();
      const proofNo = (exp.proof_number || '').toLowerCase();
      const itemName = (exp.item_name || '').toLowerCase();
      const notes = (exp.notes || '').toLowerCase();
      const vendor = (exp.vendor || '').toLowerCase();
      const staffName = (exp.staff_name || '').toLowerCase();
      const budgetItem = (exp.budget_item_name || '').toLowerCase();
      const budgetProg = (exp.budget_program_name || '').toLowerCase();
      const catName = (exp.catalog_item_name || exp.category_name || '').toLowerCase();
      const bankName = (exp.cash_bank_name || '').toLowerCase();
      const bankAccNo = (exp.cash_bank_account_number || '').toLowerCase();
      const amountStr = String(exp.total_amount || '');

      return (
        itemName.includes(term) ||
        notes.includes(term) ||
        vendor.includes(term) ||
        proofNo.includes(term) ||
        bkkCode.includes(term) ||
        staffName.includes(term) ||
        budgetItem.includes(term) ||
        budgetProg.includes(term) ||
        catName.includes(term) ||
        cashName.includes(term) ||
        bankName.includes(term) ||
        bankAccNo.includes(term) ||
        fundName.includes(term) ||
        amountStr.includes(term)
      );
    });
  }, [expenses, searchQuery]);

  // ---------------------------------------------------------------------------
  // RENDER INTERFACE
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-20 w-full">
      {/* 1. Header & Global Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-md shadow-rose-600/20">
              <Wallet className="w-5 h-5" />
            </span>
            <span>Pengeluaran Kas &amp; Realisasi Anggaran</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan realisasi belanja RAPBS, pengeluaran operasional non-RAPBS, rekonsiliasi kas bank, dan pencairan payroll.
          </p>
        </div>

        {/* Pilihan Tahun Ajaran di samping tombol Catat Pengeluaran Baru */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap sm:flex-nowrap">
          <div className="w-48 sm:w-56">
            <SearchableSelect
              options={academicYearOptions}
              value={selectedAcademicYearId}
              onChange={(val) => setSelectedAcademicYearId(val)}
              placeholder="Pilih Tahun Ajaran..."
              searchPlaceholder="Cari T.A..."
              accentColor="rose"
              allowClear={false}
            />
          </div>

          {mainTab === 'expenses' && (
            <button
              type="button"
              onClick={() => {
                const initialCash = cashAccounts.find(a => a.account_kind === 'cash' || a.account_kind === 'petty_cash')
                  || cashAccounts.find(a => a.account_kind !== 'bank')
                  || cashAccounts[0];
                const initialCashCoa = (initialCash && initialCash.account_id)
                  ? chartOfAccounts.find(c => String(c.id) === String(initialCash.account_id))
                  : chartOfAccounts.find(c => (c.account_group === 'harta' || c.account_group === 'kas') && (c.account_name.toLowerCase().includes('kas') || String(c.account_code || '').startsWith('111')));

                setFormData({
                  budget_plan_expense_item_id: '',
                  is_outside_budget: false,
                  proposed_to_rapbs: false,
                  catalog_item_id: '',
                  item_name: '',
                  is_package: false,
                  unit: 'pcs',
                  unit_price: '',
                  quantity: 1,
                  total_amount: '',
                  vendor: '',
                  expense_date: new Date().toISOString().slice(0, 10),
                  proof_number: '',
                  cash_account_id: initialCash ? String(initialCash.id) : '',
                  bank_statement_id: '',
                  budget_program_id: '',
                  staff_id: '',
                  staff_name: '',
                  expense_category_id: '',
                  transaction_category_id: '',
                  academic_year_id: selectedAcademicYearId || 2,
                  fund_source_type: 'opening_pool',
                  fund_source_ref_id: 0,
                  fund_source_override_reason: '',
                  fund_sources: null,
                  override_debit_account_id: '',
                  override_credit_account_id: initialCash?.account_id ? String(initialCash.account_id) : (initialCashCoa ? String(initialCashCoa.id) : ''),
                  override_reason: '',
                  notes: ''
                });
                setPaymentMethodType('cash');
                setShowAccountingOverride(false);
                setModalOpen(true);
              }}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-rose-600/20 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Pengeluaran Baru</span>
            </button>
          )}

          {mainTab === 'cash_transfers' && (
            <button
              type="button"
              onClick={handleOpenNewTransferModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer shrink-0"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Catat Pemindahan Kas Baru</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (mainTab === 'cash_transfers') {
                fetchTransfersData();
              } else {
                fetchExpensesData();
              }
            }}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
            title="Muat Ulang Data"
          >
            <RotateCw className={`w-4 h-4 ${(loading || loadingTransfers) ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tabs: Pengeluaran Belanja vs Pemindahan Kas vs Payroll */}
      <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 max-w-fit">
        <button
          type="button"
          onClick={() => handleMainTabChange('expenses')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            mainTab === 'expenses'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-rose-600" />
          <span>Pengeluaran Belanja &amp; RAPBS</span>
          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] rounded-full font-black border border-rose-200">
            {expenses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleMainTabChange('cash_transfers')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            mainTab === 'cash_transfers'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
          <span>Pemindahan Kas &amp; Mutasi Internal</span>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-full font-black border border-indigo-200">
            {transfers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleMainTabChange('payroll')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            mainTab === 'payroll'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Coins className="w-4 h-4 text-emerald-600" />
          <span>Pencairan Gaji &amp; Payroll GTK</span>
        </button>
      </div>

      {/* TAB 1: PENGELUARAN BELANJA & RAPBS */}
      {mainTab === 'expenses' && (
        <div className="space-y-6">
          {/* 2. Kartu Ringkasan Makro Pengeluaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Realisasi Pengeluaran */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950 via-slate-900 to-rose-950 border border-rose-800/50 text-white shadow-md relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-500/20 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                  Total Realisasi Belanja
                </div>
                <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/30 shrink-0">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-white tracking-tight truncate" title={formatCurrency(macroSummary.total_expenses_amount || 0)}>
                {formatCurrency(macroSummary.total_expenses_amount || 0)}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-rose-200/80 font-medium">
                <span>{macroSummary.total_expenses_count || 0} total transaksi</span>
                <span>{filterMonth !== 'all' ? `Bulan ${filterMonth}` : 'Sepanjang Tahun'}</span>
              </div>
            </div>

            {/* Card 2: Sesuai RAPBS & Penyerapan */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border border-emerald-200/80 shadow-xs relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Sesuai Rencana RAPBS
                </div>
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-emerald-950 tracking-tight truncate" title={formatCurrency(macroSummary.total_budgeted_amount || 0)}>
                {formatCurrency(macroSummary.total_budgeted_amount || 0)}
              </div>
              <div className="mt-2 w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, macroSummary.rapbs_realization_percentage || 0)}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-emerald-800 font-medium">
                <span>Pagu: {formatCurrency(macroSummary.total_rapbs_pagu || 0)}</span>
                <span className="font-bold">{macroSummary.rapbs_realization_percentage || 0}% terserap</span>
              </div>
            </div>

            {/* Card 3: Di Luar Perencanaan RAPBS */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-white to-amber-50/40 border border-amber-200/80 shadow-xs relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Di Luar RAPBS (Darurat)
                </div>
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-amber-950 tracking-tight truncate" title={formatCurrency(macroSummary.total_outside_budget_amount || 0)}>
                {formatCurrency(macroSummary.total_outside_budget_amount || 0)}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-amber-800 font-medium">
                <span>Non-Anggaran Berjalan</span>
                <span className="font-bold">{macroSummary.outside_budget_count || 0} transaksi</span>
              </div>
            </div>

            {/* Card 4: Nontunai / Bank Reconciliation */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 via-white to-sky-50/40 border border-sky-200/80 shadow-xs relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                  Nontunai &amp; Rekonsiliasi Bank
                </div>
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/30 shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-sky-950 tracking-tight truncate" title={formatCurrency(macroSummary.total_non_cash_amount || 0)}>
                {formatCurrency(macroSummary.total_non_cash_amount || 0)}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-sky-800 font-medium">
                <span>Tunai: {formatCurrency(macroSummary.total_cash_amount || 0)}</span>
                <span className="font-bold text-sky-700">{macroSummary.reconciled_bank_count || 0} link RK</span>
              </div>
            </div>
          </div>

          {/* 3. Toolbar Filter Komprehensif dengan LiveSearch */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Filter &amp; Pencarian Pengeluaran Kas
                </h3>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold">
                  {filteredExpenses.length} data {searchQuery.trim() ? `(dari ${expenses.length})` : 'ditemukan'}
                </span>
              </div>

              {(filterMonth !== 'all' || filterBudgetStatus !== 'all' || filterCashAccountId !== 'all' || filterProgramId !== 'all' || filterStartDate || filterEndDate || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterMonth('all');
                    setFilterBudgetStatus('all');
                    setFilterCashAccountId('all');
                    setFilterProgramId('all');
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200 cursor-pointer transition"
                  title="Reset Semua Filter"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            {/* Grid 4 Dropdown Filter dengan LiveSearch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Bulan Transaksi</label>
                <SearchableSelect
                  options={monthFilterOptions}
                  value={filterMonth}
                  onChange={(val) => setFilterMonth(val || 'all')}
                  placeholder="Semua Bulan"
                  searchPlaceholder="Cari bulan..."
                  accentColor="rose"
                  allowClear={false}
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Status RAPBS</label>
                <SearchableSelect
                  options={budgetStatusFilterOptions}
                  value={filterBudgetStatus}
                  onChange={(val) => setFilterBudgetStatus(val || 'all')}
                  placeholder="Semua Status"
                  searchPlaceholder="Cari status RAPBS..."
                  accentColor="emerald"
                  allowClear={false}
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Rekening Kas / Bank</label>
                <SearchableSelect
                  options={filterCashAccountOptions}
                  value={filterCashAccountId}
                  onChange={(val) => setFilterCashAccountId(val || 'all')}
                  placeholder="Semua Kas/Bank"
                  searchPlaceholder="Cari nama kas, bank, no rek..."
                  accentColor="sky"
                  allowClear={false}
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Program RKS</label>
                <SearchableSelect
                  options={filterProgramOptions}
                  value={filterProgramId}
                  onChange={(val) => setFilterProgramId(val || 'all')}
                  placeholder="Semua Program"
                  searchPlaceholder="Cari program kerja..."
                  accentColor="indigo"
                  allowClear={false}
                />
              </div>
            </div>

            {/* Baris Pencarian Teks & Rentang Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center pt-2 border-t border-slate-100">
              {/* Search Input */}
              <div className="lg:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari uraian belanja, vendor, no bukti nota, GTK PIC, pos RAPBS, no rekening..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Datepicker Dari Tanggal */}
              <div className="lg:col-span-3">
                <DatePickerField
                  value={filterStartDate}
                  onChange={(val) => setFilterStartDate(val)}
                  placeholder="Dari Tgl (DD/MM/YYYY)"
                />
              </div>

              {/* Datepicker Sampai Tanggal */}
              <div className="lg:col-span-3">
                <DatePickerField
                  value={filterEndDate}
                  onChange={(val) => setFilterEndDate(val)}
                  placeholder="Sampai Tgl (DD/MM/YYYY)"
                />
              </div>
            </div>
          </div>

          {/* 4. Tabel Data Pengeluaran */}
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
              <span>Memuat data pengeluaran kas...</span>
            </div>
          ) : (Array.isArray(expenses) ? expenses : []).length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2.5">
              <ShoppingBag className="w-9 h-9 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">Belum ada catatan pengeluaran belanja.</p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Klik tombol "Catat Pengeluaran Baru" di atas untuk mencatat pengadaan barang/jasa berbasis RAPBS atau operasional kas.
              </p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2.5">
              <Search className="w-9 h-9 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700 text-sm">Tidak ada transaksi yang cocok.</p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Tidak ditemukan data pengeluaran dengan kata kunci pencarian &quot;<strong className="text-slate-700">{searchQuery}</strong>&quot;.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Hapus Pencarian
              </button>
            </div>
          ) : (
            <div className="table-container border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3">No. BKK &amp; Tgl</th>
                    <th className="px-3.5 py-3">Uraian &amp; Catatan Belanja</th>
                    <th className="px-3.5 py-3">Pos RAPBS / Program</th>
                    <th className="px-3.5 py-3">Rekening Kas &amp; Metode</th>
                    <th className="px-3.5 py-3">GTK PIC &amp; Vendor</th>
                    <th className="px-3.5 py-3">Sumber Dana</th>
                    <th className="px-3.5 py-3 text-right">Nominal (Rp)</th>
                    <th className="px-3.5 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredExpenses.map((exp, idx) => {
                    const isOutside = Boolean(exp.is_outside_budget);
                    const totalAmt = parseFloat(exp.total_amount || 0);

                    return (
                      <tr key={`expense-row-${exp.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        {/* No BKK / Bukti & Tanggal */}
                        <td className="px-3.5 py-3 text-slate-700 tnum">
                          <span className="font-bold text-slate-900 font-mono block text-[11px]">
                            {exp.proof_number || `BKK-${exp.id}`}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDate(exp.expense_date)}
                          </span>
                        </td>

                        {/* Uraian Belanja & Catatan Tambahan */}
                        <td className="px-3.5 py-3">
                          <span className="font-bold text-slate-900 block line-clamp-1" title={exp.item_name}>
                            {exp.item_name}
                          </span>
                          {exp.notes ? (
                            <span className="text-[10.5px] text-slate-500 block line-clamp-2 mt-0.5" title={exp.notes}>
                              {exp.notes}
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-slate-400 italic block mt-0.5">
                              -
                            </span>
                          )}
                        </td>

                        {/* Pos RAPBS / Program RKS */}
                        <td className="px-3.5 py-3">
                          {isOutside ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Di Luar RAPBS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 max-w-[160px] truncate" title={exp.budget_item_name}>
                              <Layers className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">{exp.budget_item_name || 'Pos RAPBS'}</span>
                            </span>
                          )}
                          <span className="block text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                            {exp.budget_program_name || exp.category_name || 'Operasional'}
                          </span>
                        </td>

                        {/* Rekening Kas & Metode Pembayaran */}
                        <td className="px-3.5 py-3">
                          {(() => {
                            const cashAcc = (Array.isArray(cashAccounts) ? cashAccounts : []).find(a => Number(a.id) === Number(exp.cash_account_id));
                            const isBank = cashAcc?.account_kind === 'bank' || exp.payment_method === 'bank_transfer' || Boolean(exp.cash_bank_account_number || cashAcc?.bank_account_number);
                            const displayText = formatCashAccountShortLabel(cashAcc, exp);

                            if (isBank) {
                              const bName = exp.cash_bank_name || cashAcc?.bank_name || displayText;
                              const bAccNo = exp.cash_bank_account_number || cashAcc?.bank_account_number || '';
                              const bankColor = resolveBankBadgeColor(bName, bAccNo || displayText);

                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs whitespace-nowrap ${bankColor.badgeClass}`}
                                  title={`${exp.cash_account_name || 'Rekening Kas'}${bAccNo ? ` (${bAccNo})` : ''}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${bankColor.dotClass}`} />
                                  <span>{displayText}</span>
                                </span>
                              );
                            }

                            return (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap"
                                title={exp.cash_account_name || 'Kas Tunai'}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                                <span>{displayText}</span>
                              </span>
                            );
                          })()}
                        </td>

                        {/* GTK PIC & Vendor */}
                        <td className="px-3.5 py-3">
                          <span className="font-medium text-slate-800 block text-[11px] truncate max-w-[140px]" title={exp.staff_name || '-'}>
                            👤 {exp.staff_name || 'Tanpa PIC'}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[140px]" title={exp.vendor || '-'}>
                            Rekanan: {exp.vendor || 'Umum'}
                          </span>
                        </td>

                        {/* Sumber Dana (Kantong Dana) */}
                        <td className="px-3.5 py-3">
                          {(() => {
                            const badgeInfo = getExpenseFundSourceBadgeInfo(exp);
                            if (badgeInfo.isMulti) {
                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10.5px] font-bold border truncate max-w-[170px] ${badgeInfo.badgeClass}`}
                                  title={badgeInfo.tooltip}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeInfo.dotClass}`} />
                                  <span className="truncate">{badgeInfo.name}</span>
                                </span>
                              );
                            }
                            return (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10.5px] font-semibold border truncate max-w-[170px] ${badgeInfo.badgeClass}`}
                                title={badgeInfo.name}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeInfo.dotClass}`} />
                                <span className="truncate">{badgeInfo.name}</span>
                              </span>
                            );
                          })()}
                        </td>

                        {/* Nominal Total (Rp) */}
                        <td className="px-3.5 py-3 text-right">
                          <span className="font-mono font-black text-slate-900 text-xs block">
                            {formatCurrency(totalAmt)}
                          </span>
                          {exp.debit_account_code && (
                            <span className="text-[9.5px] text-slate-400 font-mono block mt-0.5" title={`${exp.debit_account_code} ${exp.debit_account_name || ''}`}>
                              Akun: {exp.debit_account_code}
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="px-3.5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Cetak BKK */}
                            <button
                              type="button"
                              onClick={() => openExpenseVoucherInNewTab(exp, activeSchoolUnit?.name)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                              title="Cetak Bukti Kas Keluar (BKK / Voucher)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Detail */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedExpenseDetail(exp);
                                setDetailModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition cursor-pointer"
                              title="Lihat Detail Transaksi"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExpense(exp);
                                let parsedFs = null;
                                if (exp.fund_sources) {
                                  try {
                                    const raw = typeof exp.fund_sources === 'string' ? JSON.parse(exp.fund_sources) : exp.fund_sources;
                                    if (Array.isArray(raw) && raw.length > 0) {
                                      parsedFs = raw;
                                    }
                                  } catch (_) {}
                                }

                                let editFundType = exp.fund_source_type || 'opening_pool';
                                let editFundRefId = Number(exp.fund_source_ref_id || 0);
                                let editFundSources = null;

                                if (parsedFs && parsedFs.length > 1) {
                                  editFundSources = parsedFs.map(s => {
                                    const fType = s.fund_type || (s.fee_type_id ? 'fee_type' : (s.income_item_id ? 'budget_income_item' : 'opening_pool'));
                                    const fRef = Number(s.fund_ref_id || s.fee_type_id || s.income_item_id || 0);
                                    return {
                                      fund_type: fType,
                                      fund_ref_id: fRef,
                                      name: cleanFundLabel(s.name) || 'Pos Sumber Dana',
                                      amount: parseFloat(s.amount || 0)
                                    };
                                  });
                                  editFundType = editFundSources[0].fund_type;
                                  editFundRefId = editFundSources[0].fund_ref_id;
                                } else if (parsedFs && parsedFs.length === 1) {
                                  const single = parsedFs[0];
                                  editFundType = single.fund_type || (single.fee_type_id ? 'fee_type' : (single.income_item_id ? 'budget_income_item' : (exp.fund_source_type || 'opening_pool')));
                                  editFundRefId = Number(single.fund_ref_id || single.fee_type_id || single.income_item_id || exp.fund_source_ref_id || 0);
                                  editFundSources = null;
                                }

                                setEditFormData({
                                  id: exp.id,
                                  budget_plan_expense_item_id: exp.budget_plan_expense_item_id ? String(exp.budget_plan_expense_item_id) : '',
                                  is_outside_budget: Boolean(exp.is_outside_budget),
                                  proposed_to_rapbs: Boolean(exp.proposed_to_rapbs),
                                  catalog_item_id: exp.catalog_item_id ? String(exp.catalog_item_id) : '',
                                  item_name: exp.item_name || '',
                                  is_package: Boolean(exp.is_package),
                                  unit: exp.unit || 'pcs',
                                  unit_price: String(exp.unit_price || 0),
                                  quantity: parseFloat(exp.quantity || 1),
                                  total_amount: String(exp.total_amount || 0),
                                  vendor: exp.vendor || '',
                                  expense_date: exp.expense_date ? String(exp.expense_date).slice(0, 10) : '',
                                  proof_number: exp.proof_number || '',
                                  cash_account_id: exp.cash_account_id ? String(exp.cash_account_id) : (cashAccounts[0] ? String(cashAccounts[0].id) : ''),
                                  bank_statement_id: exp.bank_statement_id ? String(exp.bank_statement_id) : '',
                                  budget_program_id: exp.budget_program_id ? String(exp.budget_program_id) : '',
                                  staff_id: exp.staff_id ? String(exp.staff_id) : '',
                                  staff_name: exp.staff_name || '',
                                  transaction_category_id: exp.transaction_category_id ? String(exp.transaction_category_id) : '',
                                  academic_year_id: exp.academic_year_id ? String(exp.academic_year_id) : selectedAcademicYearId,
                                  fund_source_type: editFundType,
                                  fund_source_ref_id: editFundRefId,
                                  fund_source_override_reason: exp.fund_source_override_reason || '',
                                  fund_sources: editFundSources,
                                  override_debit_account_id: exp.override_debit_account_id ? String(exp.override_debit_account_id) : '',
                                  override_credit_account_id: exp.override_credit_account_id ? String(exp.override_credit_account_id) : '',
                                  override_reason: exp.override_reason || '',
                                  notes: exp.notes || '',
                                  edit_reason: ''
                                });
                                setEditPaymentMethodType(exp.payment_method === 'bank_transfer' ? 'bank_transfer' : 'cash');
                                setShowEditAccountingOverride(false);
                                setEditModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded-lg transition cursor-pointer"
                              title="Edit &amp; Koreksi Belanja"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Alihkan Sumber Dana */}
                            <button
                              type="button"
                              onClick={() => {
                                setReassignExpense(exp);
                                setReassignForm({
                                  fund_source_type: exp.fund_source_type || 'opening_pool',
                                  fund_source_ref_id: exp.fund_source_ref_id || 0,
                                  reason: ''
                                });
                                setReassignModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-amber-600 rounded-lg transition cursor-pointer"
                              title="Alihkan Alokasi Sumber Dana"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </button>

                            {/* Batalkan / Void */}
                            <button
                              type="button"
                              onClick={() => {
                                setExpenseToCancel(exp);
                                setCancellationReason('');
                                setCancelModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition cursor-pointer"
                              title="Batalkan / Void Pengeluaran (Storno Jurnal)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENCAIRAN GAJI & PAYROLL */}
      {mainTab === 'payroll' && (
        <div className="animate-in fade-in duration-200">
          <Payroll />
        </div>
      )}

      {/* TAB 3: PEMINDAHAN KAS & MUTASI INTERNAL */}
      {mainTab === 'cash_transfers' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 1. Kartu Ringkasan Makro Pemindahan Kas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Dana Dipindahkan */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-800/50 text-white shadow-md relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Total Dana Dipindahkan
                </div>
                <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/30 shrink-0">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-white tracking-tight truncate">
                {formatCurrency(transfers.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0))}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-indigo-200/80 font-medium">
                <span>{transfers.length} total mutasi pemindahan</span>
                <span>Internal Kas / Bank</span>
              </div>
            </div>

            {/* Card 2: Jumlah Rekening / Kas Terdaftar */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50/40 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Akun Kas / Bank Aktif
                </div>
                <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shadow-md shadow-slate-700/30 shrink-0">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-slate-900 tracking-tight truncate">
                {cashAccounts.length} Rekening Kas
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>{cashAccounts.filter(c => c.account_kind === 'bank').length} Bank &bull; {cashAccounts.filter(c => c.account_kind !== 'bank').length} Kas Tunai</span>
                <span className="font-bold text-slate-700">Multi-Akun</span>
              </div>
            </div>

            {/* Card 3: Otomatisasi Jurnal Berpasangan */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border border-emerald-200/80 shadow-xs relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Pembukuan Jurnal Berpasangan
                </div>
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-emerald-950 tracking-tight truncate">
                100% Terintegrasi
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                <span>Debet Kas Tujuan &bull; Kredit Kas Asal</span>
                <span className="font-bold text-emerald-700">Buku Besar GL</span>
              </div>
            </div>

            {/* Card 4: Alokasi Kantong Sumber Dana Aman */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 via-white to-sky-50/40 border border-sky-200/80 shadow-xs relative overflow-hidden group hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                  Alokasi Kantong Dana
                </div>
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/30 shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-sky-950 tracking-tight truncate">
                Saldo Dana Aman
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-sky-800 font-medium">
                <span>Hanya memindahkan likuiditas kas</span>
                <span className="font-bold text-sky-700">Bebas Defisit</span>
              </div>
            </div>
          </div>

          {/* 2. Toolbar Filter Mutasi Kas */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Filter &amp; Pencarian Riwayat Pemindahan Kas
                </h3>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold">
                  {transfers.length} transaksi
                </span>
              </div>

              {(transferSearch || transferCashAccountFilter !== 'all' || transferDateFrom || transferDateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setTransferSearch('');
                    setTransferCashAccountFilter('all');
                    setTransferDateFrom('');
                    setTransferDateTo('');
                  }}
                  className="px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-200 cursor-pointer transition"
                  title="Reset Filter Pemindahan Kas"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Cari Kata Kunci</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    placeholder="No. BPK, Ref, Keterangan..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Rekening Kas Terkait</label>
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'Semua Rekening Kas / Bank' },
                    ...cashAccounts.map(c => ({
                      value: String(c.id),
                      label: `${c.name} (${c.bank_name ? `${c.bank_name} - ${c.bank_account_number || ''}` : 'Tunai'})`
                    }))
                  ]}
                  value={transferCashAccountFilter}
                  onChange={(val) => setTransferCashAccountFilter(val || 'all')}
                  placeholder="Semua Kas/Bank"
                  searchPlaceholder="Cari nama kas atau bank..."
                  accentColor="indigo"
                  allowClear={false}
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Dari Tanggal</label>
                <DatePickerField
                  value={transferDateFrom}
                  onChange={(val) => setTransferDateFrom(val)}
                  placeholder="Pilih Tanggal Mulai..."
                  accentColor="indigo"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Sampai Tanggal</label>
                <DatePickerField
                  value={transferDateTo}
                  onChange={(val) => setTransferDateTo(val)}
                  placeholder="Pilih Tanggal Selesai..."
                  accentColor="indigo"
                />
              </div>
            </div>
          </div>

          {/* 3. Tabel Riwayat Pemindahan Kas */}
          {loadingTransfers ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <RotateCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Memuat data riwayat pemindahan kas internal...</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Belum Ada Riwayat Pemindahan Kas</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Gunakan tombol "Catat Pemindahan Kas Baru" untuk melakukan mutasi saldo antar kas tunai dan rekening bank.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewTransferModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Pemindahan Kas Pertama</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 text-[11px] uppercase tracking-wider font-bold">
                    <th className="px-3.5 py-3 text-center w-12">No</th>
                    <th className="px-3.5 py-3">No. Bukti / Tanggal</th>
                    <th className="px-3.5 py-3">Alur Pemindahan Kas</th>
                    <th className="px-3.5 py-3 text-right">Nominal (Rp)</th>
                    <th className="px-3.5 py-3">Keterangan / Ref</th>
                    <th className="px-3.5 py-3">Jurnal GL</th>
                    <th className="px-3.5 py-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.map((trf, idx) => (
                    <tr key={trf.id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="px-3.5 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-3.5 py-3">
                        <span className="font-mono font-bold text-indigo-700 block text-xs">
                          {trf.transfer_number || `TRF-${trf.id}`}
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-medium">
                          {trf.transfer_date ? formatDate(trf.transfer_date) : '-'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          {/* Kas Asal (Kredit) */}
                          <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-900 max-w-[190px]">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9.5px] font-bold text-rose-700 uppercase block tracking-wider">Kas Asal (Kredit)</span>
                              {trf.from_bank_statement_id && (
                                <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded" title={`RK Asal: ${trf.from_bank_statement_desc || '-'}`}>
                                  🔗 RK
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-xs block truncate" title={trf.from_cash_account_name}>
                              {trf.from_cash_account_name || 'Kas Asal'}
                            </span>
                            {trf.from_bank_name && (
                              <span className="text-[10px] text-rose-600/80 block truncate font-mono">
                                {trf.from_bank_name} - {trf.from_bank_account_number || ''}
                              </span>
                            )}
                          </div>

                          <ArrowRightLeft className="w-4 h-4 text-slate-400 shrink-0" />

                          {/* Kas Tujuan (Debet) */}
                          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-900 max-w-[190px]">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9.5px] font-bold text-emerald-700 uppercase block tracking-wider">Kas Tujuan (Debet)</span>
                              {trf.to_bank_statement_id && (
                                <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded" title={`RK Tujuan: ${trf.to_bank_statement_desc || '-'}`}>
                                  🔗 RK
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-xs block truncate" title={trf.to_cash_account_name}>
                              {trf.to_cash_account_name || 'Kas Tujuan'}
                            </span>
                            {trf.to_bank_name && (
                              <span className="text-[10px] text-emerald-600/80 block truncate font-mono">
                                {trf.to_bank_name} - {trf.to_bank_account_number || ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <span className="font-mono font-black text-indigo-700 text-xs block">
                          {formatCurrency(trf.amount || 0)}
                        </span>
                        <span className="text-[9.5px] text-slate-400 block mt-0.5">
                          Internal Shift
                        </span>
                      </td>
                      <td className="px-3.5 py-3 max-w-[200px]">
                        <span className="font-medium text-slate-800 block text-xs truncate" title={trf.reason || '-'}>
                          {trf.reason || 'Pemindahan Kas Internal'}
                        </span>
                        {trf.reference_number && (
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate" title={`Ref: ${trf.reference_number}`}>
                            Ref: {trf.reference_number}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        {trf.journal_number ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10.5px] font-mono font-bold rounded-lg border border-emerald-200" title={`Jurnal ID: ${trf.journal_id || '-'}`}>
                            📒 {trf.journal_number}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-lg">
                            Auto-Journal
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => openCashTransferVoucherInNewTab(trf, activeSchoolUnit?.name)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition cursor-pointer mx-auto shadow-2xs"
                          title="Cetak Bukti Pemindahan Kas (BPK)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak BPK</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: CATAT PENGELUARAN BARU (ENTERPRISE EDITION)                */}
      {/* ==================================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md shadow-rose-600/20">
                  <ShoppingBag className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Catat Pengeluaran Kas Baru (Belanja RAPBS &amp; Operasional)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Otomatisasi pengisian akun, kas, pagu anggaran, dan rekonsiliasi kas bank.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => { e.preventDefault(); handleSaveExpense(false); }} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* SECTION 1: PROGRAM KERJA RKS & POS MATA ANGGARAN RAPBS (PALING ATAS) */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 via-indigo-50/40 to-slate-50 border border-emerald-200/90 rounded-xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <span>1. Program Kerja RKS &amp; Pos Mata Anggaran Belanja RAPBS</span>
                  </span>
                  {!formData.is_outside_budget && formData.budget_plan_expense_item_id ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                      ✨ Terkoneksi ke RAPBS
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      Belanja Non-RAPBS / Darurat
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Field 1: Program Anggaran RKS (Paling Atas) */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Program Anggaran RKS <span className="text-rose-500">*</span></span>
                      </span>
                      {formData.budget_program_id && (
                        <span className="text-[9.5px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                          Wajib Program
                        </span>
                      )}
                    </label>
                    <SearchableSelect
                      options={budgetProgramOptions}
                      value={formData.budget_program_id}
                      onChange={(val) => {
                        setFormData(prev => ({
                          ...prev,
                          budget_program_id: val
                        }));
                      }}
                      placeholder="-- Pilih Program Kerja RKS --"
                      searchPlaceholder="Cari program kerja..."
                      accentColor="indigo"
                      allowClear={true}
                    />
                  </div>

                  {/* Field 2: Pos Mata Anggaran Belanja RAPBS */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pos Mata Anggaran Belanja RAPBS <span className="text-rose-500">*</span></span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {formData.budget_plan_expense_item_id && (
                          <span className="text-[9.5px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Auto-Sync RAPBS
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSyncBudgetPlans(formData.academic_year_id)}
                          disabled={syncingBudget}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition cursor-pointer disabled:opacity-60 shadow-2xs"
                          title="Sinkronkan data pos mata anggaran terbaru dari RAPBS"
                        >
                          <RotateCw className={`w-3 h-3 ${syncingBudget ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
                          <span>{syncingBudget ? 'Menyinkronkan...' : 'Sinkron RAPBS'}</span>
                        </button>
                      </div>
                    </label>
                    <SearchableSelect
                      options={getRapbsExpenseOptions(formData.budget_program_id)}
                      value={formData.budget_plan_expense_item_id}
                      onChange={(val) => handleSelectBudgetItem(val, false)}
                      placeholder="-- Pilih Pos Mata Anggaran RAPBS atau Di Luar RAPBS --"
                      searchPlaceholder="Cari kode pos, nama pos belanja, pagu..."
                      accentColor="emerald"
                      allowClear={true}
                    />
                  </div>
                </div>

                {/* Info Box Realisasi Pos RAPBS jika dipilih */}
                {(() => {
                  const activeSelectedBudgetItem = budgetItems.find(b => String(b.id) === String(formData.budget_plan_expense_item_id));
                  if (!activeSelectedBudgetItem) return null;
                  const q = parseFloat(activeSelectedBudgetItem.quantity || 1);
                  const p = parseFloat(activeSelectedBudgetItem.unit_price || 0);
                  const activeBudgetItemPagu = parseFloat(activeSelectedBudgetItem.planned_amount || activeSelectedBudgetItem.total_price || (q * p) || 0);

                  const debitName = activeSelectedBudgetItem.debit_account_name || activeSelectedBudgetItem.related_account_name;
                  const debitCode = activeSelectedBudgetItem.debit_account_code || activeSelectedBudgetItem.related_account_code;
                  const creditName = activeSelectedBudgetItem.credit_account_name || activeSelectedBudgetItem.cash_account_name;
                  const creditCode = activeSelectedBudgetItem.credit_account_code;

                  return (
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-[11px] animate-in fade-in duration-150">
                      <div>
                        <span className="text-slate-500">Pagu Anggaran Rencana:</span>{' '}
                        <strong className="text-slate-900 font-mono">{formatCurrency(activeBudgetItemPagu)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Rencana Satuan &amp; Volume:</span>{' '}
                        <strong className="text-slate-800">{activeSelectedBudgetItem.quantity || 1} {activeSelectedBudgetItem.unit || 'pcs'}</strong>
                      </div>
                      {activeSelectedBudgetItem.fund_source_name && (
                        <div>
                          <span className="text-slate-500">Pos Dana RAPBS:</span>{' '}
                          <strong className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{cleanFundLabel(activeSelectedBudgetItem.fund_source_name)}</strong>
                        </div>
                      )}
                      {(debitName || creditName) && (
                        <div className="w-full pt-1.5 border-t border-emerald-100 flex flex-wrap items-center gap-2 text-[10.5px]">
                          <span className="text-slate-500 font-semibold">✨ Ketetapan Akun RAPBS:</span>
                          {debitName && (
                            <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-mono font-bold">
                              (D) {debitCode ? `[${debitCode}] ` : ''}{debitName}
                            </span>
                          )}
                          {creditName && (
                            <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-mono font-bold">
                              (K) {creditCode ? `[${creditCode}] ` : ''}{creditName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Opsi Tambahan jika Di Luar RAPBS */}
                {formData.is_outside_budget && (
                  <div className="pt-2.5 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="proposed_to_rapbs_check"
                        checked={formData.proposed_to_rapbs}
                        onChange={(e) => setFormData(prev => ({ ...prev, proposed_to_rapbs: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                      <label htmlFor="proposed_to_rapbs_check" className="font-bold text-emerald-900 text-xs cursor-pointer">
                        📝 Usulkan transaksi ini ke Rencana Anggaran RAPBS Perubahan (Adendum)
                      </label>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Kategori Klasifikasi Pengeluaran Bebas
                      </label>
                      <SearchableSelect
                        options={categoryOptions}
                        value={formData.transaction_category_id}
                        onChange={(val) => setFormData(prev => ({ ...prev, transaction_category_id: val }))}
                        placeholder="-- Pilih Kategori Pengeluaran Bebas --"
                        searchPlaceholder="Cari kategori belanja..."
                        accentColor="amber"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: STANDAR BIAYA / KATALOG BARANG & URAIAN */}
              {!formData.is_outside_budget && formData.budget_plan_expense_item_id ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Uraian / Keterangan Belanja <span className="text-rose-500">*</span></span>
                    {formData.catalog_item_id && (
                      <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Tag className="w-3 h-3 text-indigo-500" />
                        <span>Katalog: {catalogItems.find(c => String(c.id) === String(formData.catalog_item_id))?.name || 'Sesuai RAPBS'}</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                    placeholder="Contoh: Pembelian Kertas HVS &amp; Tinta Printer Ujian"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-semibold text-slate-800"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Standar Biaya / Katalog Barang</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <SearchableSelect
                      options={catalogItemOptions}
                      value={formData.catalog_item_id}
                      onChange={(val) => handleSelectCatalogItem(val, false)}
                      placeholder="-- Pilih dari Katalog Standar Harga --"
                      searchPlaceholder="Cari nama barang acuan..."
                      accentColor="indigo"
                      allowClear={true}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Uraian / Keterangan Belanja <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.item_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                      placeholder="Contoh: Pembelian Kertas HVS &amp; Tinta Printer Ujian"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: SIFAT PENGADAAN (PAKET VS SATUAN) & HARGA */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Perhitungan Kuantitas &amp; Nilai Belanja</span>
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={formData.is_package}
                      onChange={(e) => {
                        const isPkg = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          is_package: isPkg,
                          unit: isPkg ? 'Paket' : (prev.unit === 'Paket' ? 'pcs' : prev.unit),
                          quantity: isPkg ? 1 : prev.quantity
                        }));
                      }}
                      className="w-3.5 h-3.5 text-rose-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-700">Sifat Paket / Borongan / Lumpsum</span>
                  </label>
                </div>

                {formData.is_package ? (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nominal Total Paket / Borongan (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={formData.total_amount}
                      onChange={(e) => handleAmountCalculations('total_amount', e.target.value, false)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-black text-slate-900 text-sm focus:border-rose-500"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Satuan Barang / Jasa
                      </label>
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                        placeholder="pcs / rim / dus / unit / orang"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Jumlah (Qty) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={formData.quantity}
                        onChange={(e) => handleAmountCalculations('quantity', e.target.value, false)}
                        placeholder="1"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Harga Satuan (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.unit_price}
                        onChange={(e) => handleAmountCalculations('unit_price', e.target.value, false)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                )}

                <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-950">Total Kas Keluar:</span>
                  <strong className="font-mono font-black text-rose-800 text-sm">
                    {formatCurrency(formData.total_amount || 0)}
                  </strong>
                </div>
              </div>

              {/* SECTION 4: METODE PEMBAYARAN & REKENING KAS / BANK (DENGAN LIVE SEARCH RK) */}
              <div className="p-3.5 bg-sky-50/60 border border-sky-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-950 text-xs flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-sky-700" />
                    <span>Rekening Kas &amp; Metode Pembayaran</span>
                  </span>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-sky-200">
                    <button
                      type="button"
                      onClick={() => handlePaymentMethodChange('cash', false)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        paymentMethodType === 'cash' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      💵 Tunai (Kasir)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePaymentMethodChange('bank_transfer', false)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        paymentMethodType === 'bank_transfer' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🏦 Non-Tunai (Bank)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Rekening Kas / Bank Pembayar <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      options={cashAccountOptions}
                      value={formData.cash_account_id}
                      onChange={(val) => handleCashAccountChange(val, false)}
                      placeholder="-- Pilih Rekening Kas / Bank --"
                      searchPlaceholder="Cari nama kas atau nomor rekening..."
                      accentColor="sky"
                      allowClear={false}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tanggal Pengeluaran <span className="text-rose-500">*</span>
                    </label>
                    <DatePickerField
                      value={formData.expense_date}
                      onChange={(val) => setFormData(prev => ({ ...prev, expense_date: val }))}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                </div>

                {/* Dropdown Mutasi Rekening Koran Bank Nontunai */}
                {paymentMethodType === 'bank_transfer' && (
                  <div className="pt-2 border-t border-sky-200 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-sky-950 text-xs flex items-center gap-1.5">
                        <span>🔗 Mutasi Rekening Koran Bank Terkait (Debet / Kas Keluar)</span>
                      </label>
                      <span className="text-[10px] text-sky-700 font-medium">
                        {loadingBankStatements ? 'Memuat mutasi...' : `${bankStatementsOptions.length} mutasi tersedia`}
                      </span>
                    </div>
                    <SearchableSelect
                      options={bankStatementsOptions}
                      value={formData.bank_statement_id}
                      onChange={(val) => handleBankStatementSelect(val, false)}
                      placeholder="-- Pilih mutasi rekening koran atau biarkan kosong jika belum diimpor --"
                      searchPlaceholder="Cari tanggal, nominal debet, keterangan bank, no referensi..."
                      accentColor="sky"
                      allowClear={true}
                    />
                    <p className="text-[10px] text-slate-500">
                      💡 <em>Memilih mutasi bank otomatis mengisi tanggal, nominal belanja, dan menandai mutasi bank sebagai teralokasi (reconciled).</em>
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 5: GTK PIC, VENDOR & NOMOR BUKTI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>PIC Belanja / Pegawai GTK</span>
                  </label>
                  <SearchableSelect
                    options={employeeOptions}
                    value={formData.staff_id}
                    onChange={(val) => handleSelectStaff(val, false)}
                    placeholder="-- Pilih GTK / Pegawai --"
                    searchPlaceholder="Cari nama pegawai, NIP, jabatan..."
                    accentColor="purple"
                    allowClear={true}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Vendor / Toko / Rekanan
                  </label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                    placeholder="Contoh: Toko Gramedia / CV Sinar Terang"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nomor Bukti / Faktur / Kwitansi Nota
                  </label>
                  <input
                    type="text"
                    value={formData.proof_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, proof_number: e.target.value }))}
                    placeholder="Contoh: INV-2026/09/001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white"
                  />
                </div>
              </div>

              {/* SECTION 6: POS SUMBER DANA (KANTONG DANA PENGELUARAN & MULTI-SUMBER DANA) */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span>Pos Sumber Dana (Kantong Dana Pengeluaran)</span>
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Pelacakan asal kas masuk / pos anggaran yang membiayai belanja ini (mendukung multi-sumber dana seperti RAPBS).
                    </p>
                  </div>

                  {Array.isArray(formData.fund_sources) && formData.fund_sources.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleSwitchToSingleFund(false)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition shrink-0"
                    >
                      Ganti ke 1 Sumber Dana Tunggal
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSwitchToMultiFund(false)}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition shrink-0 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-amber-700" />
                      <span>Bagi ke Multi-Sumber Dana (Patungan)</span>
                    </button>
                  )}
                </div>

                {Array.isArray(formData.fund_sources) && formData.fund_sources.length > 0 ? (
                  <div className="space-y-2.5 animate-in fade-in duration-150">
                    <div className="space-y-2">
                      {formData.fund_sources.map((fs, idx) => {
                        const currentVal = resolveSelectedFundSourceValue(fs.fund_type, fs.fund_ref_id);
                        return (
                          <div key={idx} className="p-2.5 bg-white border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex-1 min-w-[200px]">
                              <SearchableSelect
                                options={fundSourceOptions}
                                value={currentVal}
                                onChange={(val) => handleUpdateFundSourceRow(idx, 'fund_val', val, false)}
                                placeholder="-- Pilih Pos Sumber Dana --"
                                searchPlaceholder="Cari pemasukan RAPBS, BOS, SPP..."
                                accentColor="amber"
                                allowClear={false}
                              />
                            </div>

                            <div className="w-full sm:w-44 shrink-0 flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500">Rp</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={fs.amount}
                                onChange={(e) => handleUpdateFundSourceRow(idx, 'amount', e.target.value, false)}
                                placeholder="Nominal alokasi"
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                              />
                              {formData.fund_sources.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFundSourceRow(idx, false)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                  title="Hapus baris sumber dana"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddFundSourceRow(false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100/90 hover:bg-amber-200 rounded-lg border border-amber-300 transition self-start"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Pos Sumber Dana Lainnya</span>
                      </button>

                      {(() => {
                        const totalExpense = parseFloat(formData.total_amount || 0);
                        const totalAllocated = formData.fund_sources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
                        const diff = totalExpense - totalAllocated;
                        const isBalanced = Math.abs(diff) <= 1;

                        return (
                          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 ${
                            isBalanced
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            <span>Total Alokasi: <strong className="font-mono">{formatCurrency(totalAllocated)}</strong> / <span className="font-mono">{formatCurrency(totalExpense)}</span></span>
                            {isBalanced ? (
                              <span className="text-[10px] bg-emerald-200/80 px-1.5 py-0.2 rounded text-emerald-900">✅ Seimbang</span>
                            ) : (
                              <span className="text-[10px] bg-rose-200 px-1.5 py-0.2 rounded text-rose-900">
                                {diff > 0 ? `Kurang ${formatCurrency(diff)}` : `Lebih ${formatCurrency(Math.abs(diff))}`}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div>
                    <SearchableSelect
                      options={fundSourceOptions}
                      value={resolveSelectedFundSourceValue(formData.fund_source_type, formData.fund_source_ref_id)}
                      onChange={(val) => {
                        const [fType, fRef] = (val || 'opening_pool:0').split(':');
                        setFormData(prev => ({
                          ...prev,
                          fund_source_type: fType,
                          fund_source_ref_id: Number(fRef || 0),
                          fund_sources: null
                        }));
                      }}
                      placeholder="-- Pilih Pos / Kantong Sumber Dana --"
                      searchPlaceholder="Cari pemasukan RAPBS, tagihan santri, pos dana BOS..."
                      accentColor="amber"
                      allowClear={false}
                    />
                  </div>
                )}
              </div>

              {/* SECTION 7: AKUN AKUNTANSI PEMBUKUAN (DEBET BEBAN & KREDIT KAS) - SELALU TAMPIL & DAPAT DIEDIT */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>Akun Akuntansi Pembukuan Jurnal (Debet &amp; Kredit)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSyncCoa}
                      disabled={syncingCoa}
                      title="Sinkron / Muat Ulang Master Data Akun COA Terbaru"
                      className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 active:scale-95 border border-slate-300 rounded-md flex items-center gap-1 transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <RotateCw className={`w-3 h-3 text-slate-600 ${syncingCoa ? 'animate-spin' : ''}`} />
                      <span>{syncingCoa ? 'Sinkron...' : 'Sinkron COA'}</span>
                    </button>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      ✨ Otomatis RAPBS &amp; Kas
                    </span>
                  </div>
                </div>

                {/* Box Preview Jurnal Dinamis */}
                {(() => {
                  const dCoa = chartOfAccounts.find(c => String(c.id) === String(formData.override_debit_account_id));
                  const cCoa = chartOfAccounts.find(c => String(c.id) === String(formData.override_credit_account_id));
                  const debitText = dCoa ? `[${dCoa.account_code}] ${dCoa.account_name}` : 'Pilih Akun Beban (D)';
                  const creditText = cCoa ? `[${cCoa.account_code}] ${cCoa.account_name}` : (cashAccounts.find(a => String(a.id) === String(formData.cash_account_id))?.name || 'Pilih Akun Kas/Bank (K)');

                  return (
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-700">
                      <div>
                        <strong className="text-slate-900 font-bold">Jurnal Pembukuan:</strong> (D) <span className="font-semibold text-rose-700">{debitText}</span> &bull; (K) <span className="font-semibold text-sky-700">{creditText}</span>
                      </div>
                      <span className="font-mono font-black text-rose-700 text-xs">
                        {formatCurrency(formData.total_amount || 0)}
                      </span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Akun Debet (Beban / Aset Belanja)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Sisi Debet</span>
                    </label>
                    <SearchableSelect
                      options={coaDebitOptions}
                      value={formData.override_debit_account_id}
                      onChange={(val) => setFormData(prev => ({ ...prev, override_debit_account_id: val }))}
                      placeholder="-- Pilih Akun Debet Beban --"
                      searchPlaceholder="Cari kode atau nama akun beban..."
                      accentColor="rose"
                      allowClear={true}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Akun Kredit (Kas / Bank Pembayar)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Sisi Kredit</span>
                    </label>
                    <SearchableSelect
                      options={coaCreditOptions}
                      value={formData.override_credit_account_id}
                      onChange={(val) => setFormData(prev => ({ ...prev, override_credit_account_id: val }))}
                      placeholder="-- Pilih Akun Kredit Kas/Bank --"
                      searchPlaceholder="Cari kode atau nama akun kas..."
                      accentColor="sky"
                      allowClear={true}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Catatan Penyesuaian Akun / Alasan Override (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.override_reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, override_reason: e.target.value }))}
                    placeholder="Contoh: Pembebanan khusus pos kegiatan / akun beban ad-hoc"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Tambahan Pengeluaran
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Keterangan tambahan transaksi belanja / nomor referensi memo internal..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                />
              </div>

              {/* Footer Modal 1 */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2 bg-slate-50/70 p-3.5 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveExpense(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-300" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveExpense(true)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan &amp; Cetak BKK'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: EDIT / KOREKSI PENGELUARAN                                  */}
      {/* ==================================================================== */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20">
                  <Edit2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Edit / Koreksi Pengeluaran #{editFormData.id}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Koreksi nominal, rincian barang, rekonsiliasi kas bank, dan jurnal akuntansi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdateExpenseSubmit(); }} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* SECTION 1: PROGRAM KERJA RKS & POS MATA ANGGARAN RAPBS (PALING ATAS) */}
              <div className="p-3.5 bg-gradient-to-br from-indigo-50/70 via-emerald-50/40 to-slate-50 border border-indigo-200/90 rounded-xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-700" />
                    <span>1. Program Kerja RKS &amp; Pos Mata Anggaran Belanja RAPBS</span>
                  </span>
                  {!editFormData.is_outside_budget && editFormData.budget_plan_expense_item_id ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                      ✨ Terkoneksi ke RAPBS
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      Belanja Non-RAPBS / Darurat
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Field 1: Program Anggaran RKS (Paling Atas) */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Program Anggaran RKS <span className="text-rose-500">*</span></span>
                      </span>
                      {editFormData.budget_program_id && (
                        <span className="text-[9.5px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                          Wajib Program
                        </span>
                      )}
                    </label>
                    <SearchableSelect
                      options={budgetProgramOptions}
                      value={editFormData.budget_program_id}
                      onChange={(val) => {
                        setEditFormData(prev => ({
                          ...prev,
                          budget_program_id: val
                        }));
                      }}
                      placeholder="-- Pilih Program Kerja RKS --"
                      searchPlaceholder="Cari program kerja..."
                      accentColor="indigo"
                      allowClear={true}
                    />
                  </div>

                  {/* Field 2: Pos Mata Anggaran Belanja RAPBS */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pos Mata Anggaran Belanja RAPBS <span className="text-rose-500">*</span></span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {editFormData.budget_plan_expense_item_id && (
                          <span className="text-[9.5px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Auto-Sync RAPBS
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSyncBudgetPlans(editFormData.academic_year_id)}
                          disabled={syncingBudget}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition cursor-pointer disabled:opacity-60 shadow-2xs"
                          title="Sinkronkan data pos mata anggaran terbaru dari RAPBS"
                        >
                          <RotateCw className={`w-3 h-3 ${syncingBudget ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
                          <span>{syncingBudget ? 'Menyinkronkan...' : 'Sinkron RAPBS'}</span>
                        </button>
                      </div>
                    </label>
                    <SearchableSelect
                      options={getRapbsExpenseOptions(editFormData.budget_program_id)}
                      value={editFormData.budget_plan_expense_item_id}
                      onChange={(val) => handleSelectBudgetItem(val, true)}
                      placeholder="-- Pilih Pos Mata Anggaran RAPBS atau Di Luar RAPBS --"
                      searchPlaceholder="Cari kode pos, nama pos belanja, pagu..."
                      accentColor="emerald"
                      allowClear={true}
                    />
                  </div>
                </div>

                {/* Info Box Realisasi Pos RAPBS jika dipilih */}
                {(() => {
                  const activeSelectedBudgetItem = budgetItems.find(b => String(b.id) === String(editFormData.budget_plan_expense_item_id));
                  if (!activeSelectedBudgetItem) return null;
                  const q = parseFloat(activeSelectedBudgetItem.quantity || 1);
                  const p = parseFloat(activeSelectedBudgetItem.unit_price || 0);
                  const activeBudgetItemPagu = parseFloat(activeSelectedBudgetItem.planned_amount || activeSelectedBudgetItem.total_price || (q * p) || 0);

                  const debitName = activeSelectedBudgetItem.debit_account_name || activeSelectedBudgetItem.related_account_name;
                  const debitCode = activeSelectedBudgetItem.debit_account_code || activeSelectedBudgetItem.related_account_code;
                  const creditName = activeSelectedBudgetItem.credit_account_name || activeSelectedBudgetItem.cash_account_name;
                  const creditCode = activeSelectedBudgetItem.credit_account_code;

                  return (
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-[11px] animate-in fade-in duration-150">
                      <div>
                        <span className="text-slate-500">Pagu Anggaran Rencana:</span>{' '}
                        <strong className="text-slate-900 font-mono">{formatCurrency(activeBudgetItemPagu)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Rencana Satuan &amp; Volume:</span>{' '}
                        <strong className="text-slate-800">{activeSelectedBudgetItem.quantity || 1} {activeSelectedBudgetItem.unit || 'pcs'}</strong>
                      </div>
                      {activeSelectedBudgetItem.fund_source_name && (
                        <div>
                          <span className="text-slate-500">Pos Dana RAPBS:</span>{' '}
                          <strong className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{cleanFundLabel(activeSelectedBudgetItem.fund_source_name)}</strong>
                        </div>
                      )}
                      {(debitName || creditName) && (
                        <div className="w-full pt-1.5 border-t border-emerald-100 flex flex-wrap items-center gap-2 text-[10.5px]">
                          <span className="text-slate-500 font-semibold">✨ Ketetapan Akun RAPBS:</span>
                          {debitName && (
                            <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-mono font-bold">
                              (D) {debitCode ? `[${debitCode}] ` : ''}{debitName}
                            </span>
                          )}
                          {creditName && (
                            <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-mono font-bold">
                              (K) {creditCode ? `[${creditCode}] ` : ''}{creditName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Opsi Tambahan jika Di Luar RAPBS */}
                {editFormData.is_outside_budget && (
                  <div className="pt-2.5 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edit_proposed_to_rapbs_check"
                        checked={editFormData.proposed_to_rapbs}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, proposed_to_rapbs: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                      <label htmlFor="edit_proposed_to_rapbs_check" className="font-bold text-emerald-900 text-xs cursor-pointer">
                        📝 Usulkan transaksi ini ke Rencana Anggaran RAPBS Perubahan (Adendum)
                      </label>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Kategori Klasifikasi Pengeluaran Bebas
                      </label>
                      <SearchableSelect
                        options={categoryOptions}
                        value={editFormData.transaction_category_id}
                        onChange={(val) => setEditFormData(prev => ({ ...prev, transaction_category_id: val }))}
                        placeholder="-- Pilih Kategori Pengeluaran Bebas --"
                        searchPlaceholder="Cari kategori belanja..."
                        accentColor="amber"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: STANDAR BIAYA / KATALOG BARANG & URAIAN */}
              {!editFormData.is_outside_budget && editFormData.budget_plan_expense_item_id ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Uraian / Keterangan Belanja <span className="text-rose-500">*</span></span>
                    {editFormData.catalog_item_id && (
                      <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Tag className="w-3 h-3 text-indigo-500" />
                        <span>Katalog: {catalogItems.find(c => String(c.id) === String(editFormData.catalog_item_id))?.name || 'Sesuai RAPBS'}</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.item_name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, item_name: e.target.value }))}
                    placeholder="Contoh: Pembelian Kertas HVS &amp; Tinta Printer Ujian"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-semibold text-slate-800"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Standar Biaya / Katalog Barang</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <SearchableSelect
                      options={catalogItemOptions}
                      value={editFormData.catalog_item_id}
                      onChange={(val) => handleSelectCatalogItem(val, true)}
                      placeholder="-- Pilih dari Katalog Standar Harga --"
                      searchPlaceholder="Cari nama barang acuan..."
                      accentColor="indigo"
                      allowClear={true}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Uraian / Keterangan Belanja <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.item_name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, item_name: e.target.value }))}
                      placeholder="Contoh: Pembelian Kertas HVS &amp; Tinta Printer Ujian"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: SIFAT PENGADAAN (PAKET VS SATUAN) & HARGA */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Perhitungan Kuantitas &amp; Nilai Belanja</span>
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={editFormData.is_package}
                      onChange={(e) => {
                        const isPkg = e.target.checked;
                        setEditFormData(prev => ({
                          ...prev,
                          is_package: isPkg,
                          unit: isPkg ? 'Paket' : (prev.unit === 'Paket' ? 'pcs' : prev.unit),
                          quantity: isPkg ? 1 : prev.quantity
                        }));
                      }}
                      className="w-3.5 h-3.5 text-rose-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-700">Sifat Paket / Borongan / Lumpsum</span>
                  </label>
                </div>

                {editFormData.is_package ? (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nominal Total Paket / Borongan (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={editFormData.total_amount}
                      onChange={(e) => handleAmountCalculations('total_amount', e.target.value, true)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-black text-slate-900 text-sm focus:border-rose-500"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Satuan Barang / Jasa
                      </label>
                      <input
                        type="text"
                        value={editFormData.unit}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, unit: e.target.value }))}
                        placeholder="pcs / rim / dus / unit / orang"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Jumlah (Qty) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={editFormData.quantity}
                        onChange={(e) => handleAmountCalculations('quantity', e.target.value, true)}
                        placeholder="1"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Harga Satuan (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editFormData.unit_price}
                        onChange={(e) => handleAmountCalculations('unit_price', e.target.value, true)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                )}

                <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-950">Total Kas Keluar:</span>
                  <strong className="font-mono font-black text-rose-800 text-sm">
                    {formatCurrency(editFormData.total_amount || 0)}
                  </strong>
                </div>
              </div>

              {/* SECTION 4: METODE PEMBAYARAN & REKENING KAS / BANK (DENGAN LIVE SEARCH RK) */}
              <div className="p-3.5 bg-sky-50/60 border border-sky-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-950 text-xs flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-sky-700" />
                    <span>Rekening Kas &amp; Metode Pembayaran</span>
                  </span>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-sky-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handlePaymentMethodChange('cash', true)}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        editPaymentMethodType === 'cash' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      💵 Tunai (Kasir)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePaymentMethodChange('bank_transfer', true)}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        editPaymentMethodType === 'bank_transfer' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🏦 Non-Tunai (Bank)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Rekening Kas / Bank Pembayar <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-sky-700 font-medium">Asal Pengeluaran</span>
                    </label>
                    <SearchableSelect
                      options={cashAccountOptions}
                      value={editFormData.cash_account_id}
                      onChange={(val) => handleCashAccountChange(val, true)}
                      placeholder="-- Pilih Rekening Kas / Bank --"
                      searchPlaceholder="Cari kas loket, rekening bank, nomor rekening..."
                      accentColor="sky"
                      allowClear={false}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tanggal Pengeluaran Kas <span className="text-rose-500">*</span>
                    </label>
                    <DatePickerField
                      value={editFormData.expense_date}
                      onChange={(val) => setEditFormData(prev => ({ ...prev, expense_date: val }))}
                    />
                  </div>
                </div>

                {/* Mutasi Rekening Koran Bank Terkait */}
                {editPaymentMethodType === 'bank_transfer' && (
                  <div className="pt-2 border-t border-sky-200/80 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-sky-950 text-xs flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-sky-700" />
                        <span>Mutasi Rekening Koran Bank Terkait (Debet / Kas Keluar)</span>
                      </label>
                      <span className="text-[10px] text-sky-700 font-medium">
                        {loadingEditBankStatements ? 'Memuat mutasi rekening koran...' : `${editBankStatementsOptions.length} mutasi debet`}
                      </span>
                    </div>
                    <SearchableSelect
                      options={editBankStatementsOptions}
                      value={editFormData.bank_statement_id}
                      onChange={(val) => handleBankStatementSelect(val, true)}
                      placeholder="-- Cari atau pilih mutasi rekening koran bank yang sesuai --"
                      searchPlaceholder="Cari berdasarkan tanggal (2026-08-15), nominal (500000), deskripsi, no ref..."
                      accentColor="sky"
                      allowClear={true}
                    />
                    <p className="text-[10px] text-slate-500">
                      💡 Memilih mutasi akan otomatis menyelaraskan tanggal transaksi, nominal belanja, dan nomor referensi bukti.
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 5: GTK PIC, VENDOR / REKANAN, & NO BUKTI NOTA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>PIC / GTK Penanggung Jawab</span>
                  </label>
                  <SearchableSelect
                    options={employeeOptions}
                    value={editFormData.staff_id}
                    onChange={(val) => handleSelectStaff(val, true)}
                    placeholder="-- Pilih GTK PIC --"
                    searchPlaceholder="Cari nama pegawai, NIP, jabatan..."
                    accentColor="purple"
                    allowClear={true}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Penerima / Vendor / Rekanan Toko
                  </label>
                  <input
                    type="text"
                    value={editFormData.vendor}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, vendor: e.target.value }))}
                    placeholder="Contoh: Toko Gramedia / CV Sinar Terang"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nomor Bukti / Faktur / Kwitansi Nota
                  </label>
                  <input
                    type="text"
                    value={editFormData.proof_number}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, proof_number: e.target.value }))}
                    placeholder="Contoh: INV-2026/09/001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white"
                  />
                </div>
              </div>

              {/* SECTION 6: POS SUMBER DANA (KANTONG DANA PENGELUARAN & MULTI-SUMBER DANA) */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span>Pos Sumber Dana (Kantong Dana Pengeluaran)</span>
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Pelacakan asal kas masuk / pos anggaran yang membiayai belanja ini (mendukung multi-sumber dana seperti RAPBS).
                    </p>
                  </div>

                  {Array.isArray(editFormData.fund_sources) && editFormData.fund_sources.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleSwitchToSingleFund(true)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition shrink-0"
                    >
                      Ganti ke 1 Sumber Dana Tunggal
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSwitchToMultiFund(true)}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition shrink-0 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-amber-700" />
                      <span>Bagi ke Multi-Sumber Dana (Patungan)</span>
                    </button>
                  )}
                </div>

                {Array.isArray(editFormData.fund_sources) && editFormData.fund_sources.length > 0 ? (
                  <div className="space-y-2.5 animate-in fade-in duration-150">
                    <div className="space-y-2">
                      {editFormData.fund_sources.map((fs, idx) => {
                        const currentVal = resolveSelectedFundSourceValue(fs.fund_type, fs.fund_ref_id);
                        return (
                          <div key={idx} className="p-2.5 bg-white border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex-1 min-w-[200px]">
                              <SearchableSelect
                                options={fundSourceOptions}
                                value={currentVal}
                                onChange={(val) => handleUpdateFundSourceRow(idx, 'fund_val', val, true)}
                                placeholder="-- Pilih Pos Sumber Dana --"
                                searchPlaceholder="Cari pemasukan RAPBS, BOS, SPP..."
                                accentColor="amber"
                                allowClear={false}
                              />
                            </div>

                            <div className="w-full sm:w-44 shrink-0 flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500">Rp</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={fs.amount}
                                onChange={(e) => handleUpdateFundSourceRow(idx, 'amount', e.target.value, true)}
                                placeholder="Nominal alokasi"
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                              />
                              {editFormData.fund_sources.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFundSourceRow(idx, true)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                  title="Hapus baris sumber dana"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddFundSourceRow(true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100/90 hover:bg-amber-200 rounded-lg border border-amber-300 transition self-start"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Pos Sumber Dana Lainnya</span>
                      </button>

                      {(() => {
                        const totalExpense = parseFloat(editFormData.total_amount || 0);
                        const totalAllocated = editFormData.fund_sources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
                        const diff = totalExpense - totalAllocated;
                        const isBalanced = Math.abs(diff) <= 1;

                        return (
                          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 ${
                            isBalanced
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            <span>Total Alokasi: <strong className="font-mono">{formatCurrency(totalAllocated)}</strong> / <span className="font-mono">{formatCurrency(totalExpense)}</span></span>
                            {isBalanced ? (
                              <span className="text-[10px] bg-emerald-200/80 px-1.5 py-0.2 rounded text-emerald-900">✅ Seimbang</span>
                            ) : (
                              <span className="text-[10px] bg-rose-200 px-1.5 py-0.2 rounded text-rose-900">
                                {diff > 0 ? `Kurang ${formatCurrency(diff)}` : `Lebih ${formatCurrency(Math.abs(diff))}`}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div>
                    <SearchableSelect
                      options={fundSourceOptions}
                      value={resolveSelectedFundSourceValue(editFormData.fund_source_type, editFormData.fund_source_ref_id)}
                      onChange={(val) => {
                        const [fType, fRef] = (val || 'opening_pool:0').split(':');
                        setEditFormData(prev => ({
                          ...prev,
                          fund_source_type: fType,
                          fund_source_ref_id: Number(fRef || 0),
                          fund_sources: null
                        }));
                      }}
                      placeholder="-- Pilih Pos / Kantong Sumber Dana --"
                      searchPlaceholder="Cari pemasukan RAPBS, tagihan santri, pos dana BOS..."
                      accentColor="amber"
                      allowClear={false}
                    />
                  </div>
                )}
              </div>

              {/* SECTION 7: AKUN AKUNTANSI PEMBUKUAN (DEBET BEBAN & KREDIT KAS) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>Akun Akuntansi Pembukuan Jurnal (Debet &amp; Kredit)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSyncCoa}
                      disabled={syncingCoa}
                      title="Sinkron / Muat Ulang Master Data Akun COA Terbaru"
                      className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 active:scale-95 border border-slate-300 rounded-md flex items-center gap-1 transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <RotateCw className={`w-3 h-3 text-slate-600 ${syncingCoa ? 'animate-spin' : ''}`} />
                      <span>{syncingCoa ? 'Sinkron...' : 'Sinkron COA'}</span>
                    </button>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      ✨ Otomatis RAPBS &amp; Kas
                    </span>
                  </div>
                </div>

                {/* Box Preview Jurnal Dinamis */}
                {(() => {
                  const dCoa = chartOfAccounts.find(c => String(c.id) === String(editFormData.override_debit_account_id));
                  const cCoa = chartOfAccounts.find(c => String(c.id) === String(editFormData.override_credit_account_id));
                  const debitText = dCoa ? `[${dCoa.account_code}] ${dCoa.account_name}` : 'Pilih Akun Beban (D)';
                  const creditText = cCoa ? `[${cCoa.account_code}] ${cCoa.account_name}` : (cashAccounts.find(a => String(a.id) === String(editFormData.cash_account_id))?.name || 'Pilih Akun Kas/Bank (K)');

                  return (
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-700">
                      <div>
                        <strong className="text-slate-900 font-bold">Jurnal Pembukuan:</strong> (D) <span className="font-semibold text-rose-700">{debitText}</span> &bull; (K) <span className="font-semibold text-sky-700">{creditText}</span>
                      </div>
                      <span className="font-mono font-black text-rose-700 text-xs">
                        {formatCurrency(editFormData.total_amount || 0)}
                      </span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Akun Debet (Beban / Aset Belanja)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Sisi Debet</span>
                    </label>
                    <SearchableSelect
                      options={coaDebitOptions}
                      value={editFormData.override_debit_account_id}
                      onChange={(val) => setEditFormData(prev => ({ ...prev, override_debit_account_id: val }))}
                      placeholder="-- Pilih Akun Debet Beban --"
                      searchPlaceholder="Cari kode atau nama akun beban..."
                      accentColor="rose"
                      allowClear={true}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Akun Kredit (Kas / Bank Pembayar)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Sisi Kredit</span>
                    </label>
                    <SearchableSelect
                      options={coaCreditOptions}
                      value={editFormData.override_credit_account_id}
                      onChange={(val) => setEditFormData(prev => ({ ...prev, override_credit_account_id: val }))}
                      placeholder="-- Pilih Akun Kredit Kas/Bank --"
                      searchPlaceholder="Cari kode atau nama akun kas..."
                      accentColor="sky"
                      allowClear={true}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Catatan Penyesuaian Akun / Alasan Override (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editFormData.override_reason}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, override_reason: e.target.value }))}
                    placeholder="Contoh: Pembebanan khusus pos kegiatan / akun beban ad-hoc"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Keterangan transaksi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                />
              </div>

              {/* Alasan Koreksi (Wajib) */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                <label className="block font-bold text-amber-950 text-xs">
                  Alasan Perubahan / Koreksi Pengeluaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.edit_reason}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, edit_reason: e.target.value }))}
                  placeholder="Contoh: Koreksi nominal nota faktur vendor / salah pilih rekening kas"
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/70 p-3.5 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleUpdateExpenseSubmit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Koreksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: DETAIL RINCIAN PENGELUARAN                                 */}
      {/* ==================================================================== */}
      {detailModalOpen && selectedExpenseDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-rose-600 text-white rounded-xl">
                  <Receipt className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Rincian Bukti Kas Keluar #{selectedExpenseDetail.id}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {selectedExpenseDetail.proof_number || `BKK-${selectedExpenseDetail.id}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block">Uraian Belanja</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedExpenseDetail.item_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total Nominal</span>
                  <span className="font-mono font-black text-rose-700 text-base">
                    {formatCurrency(selectedExpenseDetail.total_amount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="font-semibold text-slate-500 block">Tanggal:</span>
                  <span>{formatDate(selectedExpenseDetail.expense_date)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Status RAPBS:</span>
                  <span>{selectedExpenseDetail.is_outside_budget ? 'Di Luar RAPBS (Darurat)' : (selectedExpenseDetail.budget_item_name || 'Sesuai RAPBS')}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Rekening Kas/Bank:</span>
                  <span>{selectedExpenseDetail.cash_account_name || 'Kasir Loket'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Metode Pembayaran:</span>
                  <span>{selectedExpenseDetail.payment_method === 'bank_transfer' ? 'Non-Tunai (Bank)' : 'Tunai'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">GTK PIC:</span>
                  <span>{selectedExpenseDetail.staff_name || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Vendor / Rekanan:</span>
                  <span>{selectedExpenseDetail.vendor || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Akun Akuntansi:</span>
                  <span>(D) {selectedExpenseDetail.debit_account_code || 'Beban'} &bull; (K) {selectedExpenseDetail.credit_account_code || 'Kas'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Pos Sumber Dana:</span>
                  {(() => {
                    const badgeInfo = getExpenseFundSourceBadgeInfo(selectedExpenseDetail);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeInfo.badgeClass}`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${badgeInfo.dotClass}`} />
                        <span>{badgeInfo.name}</span>
                      </span>
                    );
                  })()}
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-slate-500 block">Nomor Jurnal:</span>
                  <span className="font-mono">{selectedExpenseDetail.journal_number || '-'}</span>
                </div>
              </div>

              {selectedExpenseDetail.notes && (
                <div className="p-3 bg-slate-50 rounded-lg text-slate-700 border border-slate-200">
                  <span className="font-bold block text-[10.5px] text-slate-500 mb-0.5">Catatan:</span>
                  <p>{selectedExpenseDetail.notes}</p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openExpenseVoucherInNewTab(selectedExpenseDetail, activeSchoolUnit?.name)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen BKK</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: ALOKASIKAN ULANG SUMBER DANA                                */}
      {/* ==================================================================== */}
      {reassignModalOpen && reassignExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-amber-950 text-sm">
                  Alihkan Sumber Dana Belanja #{reassignExpense.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReassignFund} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Uraian &amp; Nominal:</span>
                <strong className="text-slate-800">{reassignExpense.item_name}</strong>
                <span className="font-mono font-black text-rose-700 block mt-0.5">{formatCurrency(reassignExpense.total_amount)}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Kantong Sumber Dana Baru <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={fundSourceOptions}
                  value={resolveSelectedFundSourceValue(reassignForm.fund_source_type, reassignForm.fund_source_ref_id)}
                  onChange={(val) => {
                    const [fType, fRef] = (val || 'opening_pool:0').split(':');
                    setReassignForm(prev => ({
                      ...prev,
                      fund_source_type: fType,
                      fund_source_ref_id: Number(fRef || 0)
                    }));
                  }}
                  placeholder="-- Pilih Pos / Kantong Sumber Dana Baru --"
                  searchPlaceholder="Cari nama pos sumber dana..."
                  accentColor="amber"
                  allowClear={false}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan Pengalihan Sumber Dana <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reassignForm.reason}
                  onChange={(e) => setReassignForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Contoh: Pemindahan pos pembebanan ke dana BOS"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
                >
                  {submitting ? 'Memproses...' : 'Alihkan Dana'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: BATALKAN / VOID PENGELUARAN (STORNO REVERSAL)               */}
      {/* ==================================================================== */}
      {cancelModalOpen && expenseToCancel && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full my-auto shadow-2xl border border-rose-200 overflow-hidden">
            <div className="p-4 border-b border-rose-100 flex items-center gap-2 bg-rose-50 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="font-extrabold text-sm">
                Batalkan Pengeluaran #{expenseToCancel.id}?
              </h3>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Pembatalan (Void) pengeluaran <strong>{expenseToCancel.item_name}</strong> sebesar <strong className="text-rose-700 font-mono">{formatCurrency(expenseToCancel.total_amount)}</strong> akan:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <li>Menerbitkan Jurnal Pembalik (Storno Reversal).</li>
                <li>Mengembalikan saldo ke Kantong Sumber Dana terkait.</li>
                <li>Membatalkan alokasi mutasi rekening koran bank (jika ada).</li>
              </ul>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan Pembatalan / Void <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Contoh: Transaksi salah input / nota dibatalkan pihak vendor"
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl font-semibold text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleExecuteCancelExpense}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-600/20"
                >
                  {cancelling ? 'Membatalkan...' : 'Ya, Batalkan Transaksi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: CATAT PEMINDAHAN KAS & MUTASI INTERNAL (BPK)                 */}
      {/* ==================================================================== */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20">
                  <ArrowRightLeft className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Catat Pemindahan Kas &amp; Mutasi Internal
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mutasi saldo antar rekening kas/bank dengan otomatisasi jurnal berpasangan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateTransferSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Tanggal Pemindahan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tanggal Pemindahan Kas <span className="text-rose-500">*</span>
                </label>
                <DatePickerField
                  value={transferFormData.transfer_date}
                  onChange={(val) => {
                    setTransferFormData(prev => ({ ...prev, transfer_date: val }));
                    if (transferFormData.from_cash_account_id) {
                      fetchFromTransferBankStatements(transferFormData.from_cash_account_id, val);
                    }
                    if (transferFormData.to_cash_account_id) {
                      fetchToTransferBankStatements(transferFormData.to_cash_account_id, val);
                    }
                  }}
                  placeholder="Pilih tanggal pemindahan kas..."
                  accentColor="indigo"
                  required
                />
              </div>

              {/* Grid Kas Asal & Kas Tujuan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
                {/* 1. KAS ASAL (KREDIT) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>1. Kas / Rekening Asal (Kredit)</span>
                    </label>
                    <span className="text-[9.5px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Saldo Berkurang
                    </span>
                  </div>

                  <SearchableSelect
                    options={cashAccounts.map(c => ({
                      value: String(c.id),
                      label: `${c.name} ${c.bank_name ? `(${c.bank_name} - ${c.bank_account_number || ''})` : '(Kas Tunai)'}`,
                      sublabel: c.bank_name ? `Bank: ${c.bank_name} | No. Rek: ${c.bank_account_number || '-'}` : 'Kasir / Brankas Tunai',
                      badge: c.account_kind === 'bank' ? 'BANK' : 'TUNAI',
                      badgeClass: c.account_kind === 'bank' ? 'bg-sky-50 text-sky-800 font-bold' : 'bg-slate-100 text-slate-700 font-bold',
                      disabled: String(c.id) === String(transferFormData.to_cash_account_id),
                      disabledReason: 'Tidak boleh sama dengan Kas Tujuan'
                    }))}
                    value={transferFormData.from_cash_account_id}
                    onChange={(newFromId) => {
                      setTransferFormData(prev => ({
                        ...prev,
                        from_cash_account_id: newFromId || '',
                        from_bank_statement_id: ''
                      }));
                      if (newFromId) {
                        fetchFromTransferBankStatements(newFromId, transferFormData.transfer_date);
                      } else {
                        setFromBankStatementsOptions([]);
                      }
                    }}
                    placeholder="-- Pilih Kas / Rekening Pengirim --"
                    searchPlaceholder="Cari nama kas, bank, atau no rek..."
                    accentColor="rose"
                    allowClear={false}
                  />

                  {/* Mutasi Rekening Koran Kas Asal (Hanya untuk Bank) */}
                  {(() => {
                    const fromAcc = cashAccounts.find(a => String(a.id) === String(transferFormData.from_cash_account_id));
                    if (fromAcc && fromAcc.account_kind === 'bank') {
                      return (
                        <div className="space-y-1 pt-1 border-t border-rose-100">
                          <label className="text-[10.5px] font-bold text-slate-700 flex items-center justify-between">
                            <span>Mutasi Rekening Koran Kas Keluar (Debet Bank)</span>
                            {loadingFromBankStatements && <RotateCw className="w-3 h-3 animate-spin text-rose-600" />}
                          </label>
                          <SearchableSelect
                            options={[
                              { value: '', label: '-- Tanpa Referensi Rekening Koran (Manual) --' },
                              ...fromBankStatementsOptions
                            ]}
                            value={transferFormData.from_bank_statement_id}
                            onChange={(val) => handleSelectFromBankStatement(val)}
                            placeholder="Cari mutasi kas keluar di rekening koran..."
                            searchPlaceholder="Ketik tanggal, nominal, no ref, atau uraian..."
                            accentColor="rose"
                            allowClear={true}
                          />
                          <p className="text-[9.5px] text-slate-500 italic">
                            Memilih mutasi kas keluar akan otomatis mengisi tanggal, nominal, dan no. referensi.
                          </p>
                        </div>
                      );
                    } else if (fromAcc) {
                      return (
                        <div className="px-2.5 py-1.5 bg-slate-100 rounded-lg text-[10.5px] text-slate-600 font-medium flex items-center gap-1.5 border border-slate-200">
                          <span>💵</span>
                          <span><strong>Kas Tunai (Fisik)</strong> &bull; Bebas mutasi rekening koran bank</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* 2. KAS TUJUAN (DEBET) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>2. Kas / Rekening Tujuan (Debet)</span>
                    </label>
                    <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Saldo Bertambah
                    </span>
                  </div>

                  <SearchableSelect
                    options={cashAccounts.map(c => ({
                      value: String(c.id),
                      label: `${c.name} ${c.bank_name ? `(${c.bank_name} - ${c.bank_account_number || ''})` : '(Kas Tunai)'}`,
                      sublabel: c.bank_name ? `Bank: ${c.bank_name} | No. Rek: ${c.bank_account_number || '-'}` : 'Kasir / Brankas Tunai',
                      badge: c.account_kind === 'bank' ? 'BANK' : 'TUNAI',
                      badgeClass: c.account_kind === 'bank' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-700 font-bold',
                      disabled: String(c.id) === String(transferFormData.from_cash_account_id),
                      disabledReason: 'Tidak boleh sama dengan Kas Asal'
                    }))}
                    value={transferFormData.to_cash_account_id}
                    onChange={(newToId) => {
                      setTransferFormData(prev => ({
                        ...prev,
                        to_cash_account_id: newToId || '',
                        to_bank_statement_id: ''
                      }));
                      if (newToId) {
                        fetchToTransferBankStatements(newToId, transferFormData.transfer_date);
                      } else {
                        setToBankStatementsOptions([]);
                      }
                    }}
                    placeholder="-- Pilih Kas / Rekening Penerima --"
                    searchPlaceholder="Cari nama kas, bank, atau no rek..."
                    accentColor="emerald"
                    allowClear={false}
                  />

                  {/* Mutasi Rekening Koran Kas Tujuan (Hanya untuk Bank) */}
                  {(() => {
                    const toAcc = cashAccounts.find(a => String(a.id) === String(transferFormData.to_cash_account_id));
                    if (toAcc && toAcc.account_kind === 'bank') {
                      return (
                        <div className="space-y-1 pt-1 border-t border-emerald-100">
                          <label className="text-[10.5px] font-bold text-slate-700 flex items-center justify-between">
                            <span>Mutasi Rekening Koran Kas Masuk (Kredit Bank)</span>
                            {loadingToBankStatements && <RotateCw className="w-3 h-3 animate-spin text-emerald-600" />}
                          </label>
                          <SearchableSelect
                            options={[
                              { value: '', label: '-- Tanpa Referensi Rekening Koran (Manual) --' },
                              ...toBankStatementsOptions
                            ]}
                            value={transferFormData.to_bank_statement_id}
                            onChange={(val) => handleSelectToBankStatement(val)}
                            placeholder="Cari mutasi kas masuk di rekening koran..."
                            searchPlaceholder="Ketik tanggal, nominal, no ref, atau uraian..."
                            accentColor="emerald"
                            allowClear={true}
                          />
                          <p className="text-[9.5px] text-slate-500 italic">
                            Pilih mutasi kas masuk pada bank penerima untuk rekonsiliasi berpasangan.
                          </p>
                        </div>
                      );
                    } else if (toAcc) {
                      return (
                        <div className="px-2.5 py-1.5 bg-slate-100 rounded-lg text-[10.5px] text-slate-600 font-medium flex items-center gap-1.5 border border-slate-200">
                          <span>💵</span>
                          <span><strong>Kas Tunai (Fisik)</strong> &bull; Bebas mutasi rekening koran bank</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Banner Perbandingan / Validasi Antar Mutasi Rekening Koran */}
              {(() => {
                const stmtFrom = fromBankStatementsOptions.find(o => String(o.value) === String(transferFormData.from_bank_statement_id));
                const stmtTo = toBankStatementsOptions.find(o => String(o.value) === String(transferFormData.to_bank_statement_id));

                if (stmtFrom && stmtTo) {
                  const fromVal = parseFloat(stmtFrom.amount || 0);
                  const toVal = parseFloat(stmtTo.amount || 0);
                  const isAmtMatch = Math.abs(fromVal - toVal) < 0.01;
                  const isDtMatch = stmtFrom.rawDate === stmtTo.rawDate;

                  if (isAmtMatch && isDtMatch) {
                    return (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 shadow-2xs animate-in fade-in duration-150">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-extrabold block">Rekonsiliasi Antar Rekening Koran 100% Cocok</span>
                          <span className="text-[11px] text-emerald-800">
                            Nominal ({formatCurrency(fromVal)}) dan Tanggal ({stmtFrom.rawDate}) antara Rekening Koran Kas Asal dan Kas Tujuan tervalidasi sama persis.
                          </span>
                        </div>
                      </div>
                    );
                  } else if (!isAmtMatch) {
                    return (
                      <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 shadow-2xs animate-in fade-in duration-150">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold block">Peringatan Selisih Nominal Rekening Koran</span>
                          <span className="text-[11px] text-rose-800">
                            Nominal Kas Keluar di Kas Asal adalah <strong>{formatCurrency(fromVal)}</strong> sedangkan Kas Masuk di Kas Tujuan adalah <strong>{formatCurrency(toVal)}</strong>. Pemindahan kas internal antar bank mewajibkan nominal yang sama persis.
                          </span>
                        </div>
                      </div>
                    );
                  } else if (!isDtMatch) {
                    return (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs animate-in fade-in duration-150">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold block">Informasi Selisih Tanggal Kliring Bank</span>
                          <span className="text-[11px] text-amber-800">
                            Tanggal mutasi Kas Asal ({stmtFrom.rawDate}) berbeda dengan Kas Tujuan ({stmtTo.rawDate}). Transaksi pembukuan akan dicatat pada tanggal efektif <strong>{transferFormData.transfer_date}</strong>.
                          </span>
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {/* Nominal Pemindahan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nominal Pemindahan Kas (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="0"
                    value={transferFormData.amount}
                    onChange={(e) => setTransferFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                {parseFloat(transferFormData.amount || 0) > 0 && (
                  <div className="mt-1.5 p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between text-[11px] text-indigo-900">
                    <span className="font-semibold italic">Terbilang: {toTerbilang(parseFloat(transferFormData.amount || 0))} Rupiah</span>
                    <span className="font-mono font-bold">{formatCurrency(parseFloat(transferFormData.amount || 0))}</span>
                  </div>
                )}
              </div>

              {/* No. Ref & Alasan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    No. Referensi / No. Slip Bank (Opsional)
                  </label>
                  <input
                    type="text"
                    value={transferFormData.reference_number}
                    onChange={(e) => setTransferFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                    placeholder="Contoh: SLIP-TRF-08912"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Alasan / Keperluan Pemindahan Kas
                  </label>
                  <input
                    type="text"
                    required
                    value={transferFormData.reason}
                    onChange={(e) => setTransferFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Contoh: Tarik tunai dari rekening bank untuk operasional harian"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Simulasi Pembukuan Jurnal Otomatis */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/60 to-slate-50 border border-indigo-200/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Otomatisasi Pembukuan Jurnal Umum (GL)</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-300">
                    Auto-Balanced
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-600 leading-relaxed">
                  Sistem akan secara otomatis mendebet akun kas tujuan dan mengkredit akun kas asal pada Buku Besar Akuntansi, serta mencatat nomor Bukti Pemindahan Kas (BPK) untuk kebutuhan arsip dan audit.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {transferSubmitting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan &amp; Membukukan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan &amp; Bukukan Pemindahan Kas</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
