import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import Drawer from '../../../shared/components/Drawer';
import { formatCurrency, formatNumber, formatDate } from '../../../shared/utils/formatters';
import { FeeTypeBadge, getFeeTypeColorStyle, StatementMatchIndicator } from './Payments';
import * as XLSX from 'xlsx';
import {
  UserCheck,
  Receipt,
  Search,
  Filter,
  Plus,
  RefreshCw,
  RotateCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  CreditCard,
  Building2,
  School,
  Calendar,
  X,
  UserPlus,
  Ban,
  Wallet,
  ArrowDownLeft,
  FileText,
  BadgeCheck,
  Eye,
  Check,
  XCircle,
  Inbox,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sliders,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Lock,
  Download,
  Upload,
  Send,
  HelpCircle,
  DollarSign,
  ChevronRight,
  Users,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Edit2,
  Edit3,
  History,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Bell,
  Percent,
  Smartphone,
  FileUp,
  FileDown,
  FileCheck,
  Zap,
  RotateCcw,
  Undo2,
  Trash2,
  Settings
} from 'lucide-react';

export function terbilang(nominal) {
  const bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const n = Math.floor(Math.abs(Number(nominal) || 0));
  if (n < 12) return bilangan[n];
  if (n < 20) return `${terbilang(n - 10)} Belas`;
  if (n < 100) return `${terbilang(Math.floor(n / 10))} Puluh ${terbilang(n % 10)}`.trim();
  if (n < 200) return `Seratus ${terbilang(n - 100)}`.trim();
  if (n < 1000) return `${terbilang(Math.floor(n / 100))} Ratus ${terbilang(n % 100)}`.trim();
  if (n < 2000) return `Seribu ${terbilang(n - 1000)}`.trim();
  if (n < 1000000) return `${terbilang(Math.floor(n / 1000))} Ribu ${terbilang(n % 1000)}`.trim();
  if (n < 1000000000) return `${terbilang(Math.floor(n / 1000000))} Juta ${terbilang(n % 1000000)}`.trim();
  if (n < 1000000000000) return `${terbilang(Math.floor(n / 1000000000))} Milyar ${terbilang(n % 1000000000)}`.trim();
  return `${terbilang(Math.floor(n / 1000000000000))} Triliun ${terbilang(n % 1000000000000)}`.trim();
}

export const formatDateToDMY = (dateInput) => formatDate(dateInput);

export const formatStatementDatesForSearch = (isoDateStr) => {
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

  const monthNameIndo = indoMonths[mIndex];
  const monthShortIndo = indoMonthsShort[mIndex];

  return [
    `${yyyy}-${mm}-${dd}`,
    `${dd}/${mm}/${yyyy}`,
    `${dd}-${mm}-${yyyy}`,
    `${dd}.${mm}.${yyyy}`,
    `${d}/${mIndex + 1}/${yyyy}`,
    `${d}-${mIndex + 1}-${yyyy}`,
    `${d} ${monthNameIndo} ${yyyy}`,
    `${d} ${monthShortIndo} ${yyyy}`,
    monthNameIndo,
    monthShortIndo
  ];
};

export const mapBankStatementOption = (r, pDate, currentBsId = '') => {
  const desc = r.description || r.mutation_description || 'Mutasi Masuk';
  const refNo = r.journal_number || r.reference_number || r.reconciliation_notes || r.import_batch_id || '';
  const rkDate = r.transaction_date ? String(r.transaction_date).slice(0, 10) : '';
  const isExactDate = pDate && rkDate === pDate;
  const isCurrentLinked = currentBsId && String(r.id) === String(currentBsId);
  const totalPlafon = parseFloat(r.amount || 0);
  const allocatedAmt = parseFloat(r.allocated_amount || 0);
  const remainingAmt = r.remaining_amount !== undefined ? parseFloat(r.remaining_amount) : Math.max(0, totalPlafon - allocatedAmt);
  const isFullyAllocated = Boolean(r.is_reconciled) || (remainingAmt <= 0.01 && totalPlafon > 0);
  const isPartial = !isFullyAllocated && allocatedAmt > 0 && remainingAmt > 0.01;

  const bankName = r.bank_name || r.cash_account_name || '';
  const bankAccNo = r.bank_account_number || '';
  const bankPrefix = bankName ? `[${bankName}] ` : '';

  let badgeText = isCurrentLinked ? '📌 LINKED' : (isExactDate ? '⭐ TGL COCOK' : 'KREDIT');
  let badgeStyle = isCurrentLinked
    ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold'
    : (isExactDate ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-indigo-50 text-indigo-700');

  if (!isCurrentLinked && isPartial) {
    badgeText = isExactDate ? '⭐ TGL COCOK | SISA' : '⚡ SISA PLAFON';
    badgeStyle = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
  }

  if (!isCurrentLinked && isFullyAllocated) {
    badgeText = '⛔ HABIS TERPAKAI';
    badgeStyle = 'bg-rose-100 text-rose-800 border border-rose-300 font-bold';
  }

  const labelText = isCurrentLinked
    ? `[DITAUTKAN] ${bankPrefix}${formatCurrency(totalPlafon)} - ${desc}`
    : isFullyAllocated
    ? `[HABIS TERPAKAI] ${bankPrefix}${formatCurrency(totalPlafon)} - ${desc}`
    : isPartial
    ? `${bankPrefix}Sisa: ${formatCurrency(remainingAmt)} (Plafon: ${formatCurrency(totalPlafon)}) - ${desc}`
    : `${bankPrefix}${formatCurrency(totalPlafon)} - ${desc}`;

  const sublabelText = isFullyAllocated && !isCurrentLinked
    ? `Tgl: ${rkDate || '-'} | Ref: ${refNo || '-'} | ${bankName ? `${bankName}${bankAccNo ? ` (${bankAccNo})` : ''} | ` : ''}Plafon: ${formatCurrency(totalPlafon)} (Teralokasi: ${formatCurrency(allocatedAmt)}) • Habis`
    : `Tgl: ${rkDate || '-'} | Ref: ${refNo || '-'} | ${bankName ? `${bankName}${bankAccNo ? ` (${bankAccNo})` : ''} | ` : ''}Plafon: ${formatCurrency(totalPlafon)}${allocatedAmt > 0 ? ` (Teralokasi: ${formatCurrency(allocatedAmt)})` : ''}`;

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
    reference_number: r.reference_number,
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
    disabledReason: `Mutasi rekening koran (${desc}) sebesar ${formatCurrency(totalPlafon)} sudah habis terpakai. Tidak dapat dipilih untuk transaksi baru.`
  };
};

export function openPpdbReceiptInNewTab(receipt, unitName = 'Satuan Pendidikan Aldepos') {
  if (!receipt) return;
  const bill = receipt.bill || {};
  const payment = receipt.payment || {};
  const schoolUnit = receipt.school_unit || {};

  const receiptNo = payment.receipt_number || bill.receipt_number || `KWT-PPDB-${Date.now()}`;
  const schoolUnitName = schoolUnit.name || unitName || 'Pondok Pesantren Aldepos';
  const schoolUnitAddress = schoolUnit.address || 'Jl. Abdul Fatah No.24, Tapos II, Kec. Tenjolaya, Kabupaten Bogor, Jawa Barat 16370';
  const registrantName = bill.registrant_name_snapshot || '-';
  const regNumber = bill.registration_number_snapshot || '-';
  const feeName = bill.fee_type_name || 'Uang Pangkal PPDB';
  const amountPaid = parseFloat(payment.total_amount || payment.amount_paid || bill.paid_amount || 0);
  const totalBill = parseFloat(bill.amount || 0);
  const remaining = Math.max(0, totalBill - parseFloat(bill.discount_amount || 0) - parseFloat(bill.paid_amount || 0));
  const words = `${terbilang(amountPaid)} Rupiah`;
  const paidDate = payment.payment_date ? String(payment.payment_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const paymentMethod = payment.payment_method === 'cash' ? 'Tunai / Kasir' : (payment.payment_method === 'transfer' || payment.payment_method === 'bank_transfer' ? 'Transfer Bank' : (payment.payment_method || 'Kasir'));
  const cashAccount = payment.cash_account_name || 'Kasir PPDB';

  const isVoid = Boolean(payment.is_void || payment.status === 'voided');
  const voidReason = payment.void_reason || '';
  const voidedAt = payment.voided_at || '';

  const verifyUrl = `https://core.aldepos.sch.id/verify/kwitansi?receipt=${encodeURIComponent(receiptNo)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up terblokir oleh browser. Izinkan pop-up untuk mencetak kwitansi.');
    return;
  }

  const receiptItems = payment.items && payment.items.length > 0 ? payment.items : [{
    fee_type_name: feeName,
    bill_amount: totalBill,
    amount_paid: amountPaid,
    discount_amount: bill.discount_amount || 0,
    bill_paid_amount: bill.paid_amount || 0,
    notes: payment.notes || 'Pembayaran Kasir PPDB'
  }];

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Kwitansi Resmi PPDB - ${receiptNo}${isVoid ? ' [VOID/DIBATALKAN]' : ''}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; position: relative; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 36px; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); position: relative; overflow: hidden; }
        .watermark-void {
          position: absolute;
          top: 48%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-28deg);
          font-size: 70px;
          font-weight: 900;
          color: rgba(225, 29, 72, 0.18);
          border: 8px dashed rgba(225, 29, 72, 0.35);
          padding: 16px 40px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 6px;
          pointer-events: none;
          z-index: 10;
          text-align: center;
        }
        .void-banner {
          background: #fff1f2;
          border: 1.5px solid #fda4af;
          color: #9f1239;
          padding: 12px 18px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 12px;
          line-height: 1.5;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
        .brand h1 { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
        .brand p { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.4; }
        .receipt-badge { text-align: right; }
        .badge-title { font-size: 16px; font-weight: 800; color: ${isVoid ? '#e11d48' : '#0284c7'}; }
        .badge-no { font-family: monospace; font-size: 13px; font-weight: 700; color: #334155; margin-top: 3px; }
        
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 12px; background: #f8fafc; padding: 14px 18px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .meta-row { display: flex; margin-bottom: 6px; }
        .meta-row:last-child { margin-bottom: 0; }
        .meta-label { width: 130px; color: #64748b; font-weight: 600; }
        .meta-val { font-weight: 700; color: #0f172a; flex: 1; }
        
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        .table th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-weight: 700; color: #334155; border-bottom: 1px solid #cbd5e1; }
        .table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
        .text-right { text-align: right; }
        
        .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; border-radius: 12px; margin-bottom: 24px; }
        .summary-title { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #15803d; letter-spacing: 0.5px; }
        .summary-amount { font-size: 22px; font-weight: 800; color: #166534; margin: 4px 0; }
        .summary-words { font-size: 12px; font-style: italic; color: #14532d; }
        
        .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
        .signature-box { text-align: center; width: 220px; font-size: 12px; }
        .signature-space { height: 60px; }
        .signature-name { font-weight: 700; color: #0f172a; border-top: 1px solid #94a3b8; padding-top: 4px; }
        .signature-title { color: #64748b; font-size: 11px; }

        .btn-print { background: #0284c7; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; }
        .btn-print:hover { background: #0369a1; }

        @media print {
          body { background: #fff; padding: 0; }
          .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; gap: 8px;">
        <button class="btn-print" onclick="window.print()">Cetak Kwitansi</button>
      </div>

      <div class="container">
        ${isVoid ? `
          <div class="watermark-void">BATAL / VOID</div>
          <div class="void-banner">
            <strong>⚠️ PERHATIAN: TRANSAKSI TELAH DIBATALKAN (VOID)</strong><br />
            Kwitansi ini dinyatakan <strong>TIDAK BERLAKU</strong> sebagai bukti setor kas karena telah dibatalkan pada <strong>${voidedAt || '-'}</strong>.<br />
            <strong>Alasan Pembatalan:</strong> <em>"${voidReason || 'Pembatalan transaksi oleh kasir/bendahara'}"</em>
          </div>
        ` : ''}
        <div class="header">
          <div class="brand">
            <h1>${schoolUnitName}</h1>
            <p>${schoolUnitAddress}</p>
          </div>
          <div class="receipt-badge">
            <div class="badge-title">KWITANSI RESMI PPDB</div>
            <div class="badge-no">${receiptNo}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-row"><span class="meta-label">Nama Calon Santri:</span><span class="meta-val">${registrantName}</span></div>
            <div class="meta-row"><span class="meta-label">No. Registrasi:</span><span class="meta-val">${regNumber}</span></div>
            <div class="meta-row"><span class="meta-label">Komponen Biaya:</span><span class="meta-val">${feeName}</span></div>
          </div>
          <div>
            <div class="meta-row"><span class="meta-label">Tanggal Setor:</span><span class="meta-val">${paidDate}</span></div>
            <div class="meta-row"><span class="meta-label">Metode Pembayaran:</span><span class="meta-val">${paymentMethod}</span></div>
            <div class="meta-row"><span class="meta-label">Akun Kas / Bank:</span><span class="meta-val">${cashAccount}</span></div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Deskripsi Penerimaan Kas PPDB</th>
              <th class="text-right">Total Kewajiban</th>
              <th class="text-right">Jumlah Disetor</th>
              <th class="text-right">Sisa Piutang</th>
            </tr>
          </thead>
          <tbody>
            ${receiptItems.map((it) => {
              const itName = it.fee_type_name || feeName;
              const itBill = parseFloat(it.bill_amount || it.amount || 0);
              const itPaid = parseFloat(it.amount_paid || 0);
              const itDisc = parseFloat(it.discount_amount || 0);
              const itPrevPaid = parseFloat(it.bill_paid_amount || 0);
              const itRem = Math.max(0, itBill - itDisc - itPrevPaid);
              return `
                <tr>
                  <td>
                    <div style="font-weight: 700;">${itName}</div>
                    ${itDisc > 0 ? `<div style="font-size: 11px; color: #059669; font-weight: 600;">Potongan Diskon: Rp ${itDisc.toLocaleString('id-ID')}</div>` : ''}
                    <div style="font-size: 11px; color: #64748b;">${it.notes || payment.notes || 'Pembayaran Kasir PPDB'}</div>
                  </td>
                  <td class="text-right" style="font-family: monospace;">Rp ${itBill.toLocaleString('id-ID')}</td>
                  <td class="text-right" style="font-family: monospace; font-weight: 700; color: #15803d;">Rp ${itPaid.toLocaleString('id-ID')}</td>
                  <td class="text-right" style="font-family: monospace; color: #b91c1c;">Rp ${itRem.toLocaleString('id-ID')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="summary-box">
          <div class="summary-title">Jumlah Kas Diterima:</div>
          <div class="summary-amount">Rp ${amountPaid.toLocaleString('id-ID')}</div>
          <div class="summary-words">Terbilang: # ${words} #</div>
        </div>

        <div class="footer">
          <div>
            <img src="${qrUrl}" alt="QR Verifikasi" style="width: 70px; height: 70px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 3px;" />
            <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Pindai untuk verifikasi keabsahan kwitansi</div>
          </div>
          <div class="signature-box">
            <div>Bogor, ${paidDate}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Petugas Kasir PPDB,</div>
            <div class="signature-space"></div>
            <div class="signature-name">Bagian Keuangan PPDB</div>
            <div class="signature-title">${schoolUnitName}</div>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function RegistrationBilling() {
  const navigate = useNavigate();
  const { activeSchoolUnit, user } = useAuth();
  const userRoles = user?.roles || (user?.role ? [user.role] : ['keuangan']);
  const isSuper = userRoles.includes('super_admin');
  const isYayasan = userRoles.includes('admin_yayasan') || isSuper;
  const isUnitHead = userRoles.includes('admin_satuan_pendidikan') || isYayasan;
  const isAllUnitsContext = !activeSchoolUnit || activeSchoolUnit.id === 'all' || activeSchoolUnit.is_foundation;

  // Active Main Tab: 'assignments' | 'bills' | 'payments' | 'expenses'
  const [activeMainTab, setActiveMainTab] = useState('assignments');

  // Sub-tabs inside Tab 2 (Tagihan & Matriks)
  const [billsSubTab, setBillsSubTab] = useState('matrix'); // 'matrix' | 'history' | 'reminders'

  // Sub-tabs inside Tab 3 (Penerimaan Pembayaran)
  const [paymentsSubTab, setPaymentsSubTab] = useState('bills'); // 'bills' | 'history' | 'proofs'

  // Master Data states
  const [academicYears, setAcademicYears] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);

  // Filter Target Academic Year (The core anchor of PPDB Context)
  const [selectedTargetAyId, setSelectedTargetAyId] = useState(() => {
    try {
      return localStorage.getItem('keuangan_ppdb_target_ay') || '';
    } catch {
      return '';
    }
  });
  const [transactionAyId, setTransactionAyId] = useState('');

  // Persist selectedTargetAyId to localStorage
  useEffect(() => {
    if (selectedTargetAyId) {
      try {
        localStorage.setItem('keuangan_ppdb_target_ay', String(selectedTargetAyId));
      } catch (e) {
        console.warn(e);
      }
    }
  }, [selectedTargetAyId]);

  // Global Loading & Refresh Trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ============================================================
  // TAB 1: PENETAPAN BIAYA PPDB STATES
  // ============================================================
  const [assignmentsData, setAssignmentsData] = useState({ candidates: [], schemes: [], total_candidates: 0 });
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all'); // 'all', 'assigned', 'custom', 'unassigned'
  const [selectedProcessFilter, setSelectedProcessFilter] = useState('');
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState('');
  const [candidateTypeFilter, setCandidateTypeFilter] = useState('all'); // 'all', 'unplaced', 'placed_new', 'transfer'
  const [sortConfig, setSortConfig] = useState({ key: 'student_name', direction: 'asc' });
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);

  // Single Assign Modal
  const [singleAssignModalOpen, setSingleAssignModalOpen] = useState(false);
  const [targetCandidate, setTargetCandidate] = useState(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Bulk Assign Modal
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [bulkSchemeId, setBulkSchemeId] = useState('');
  const [bulkReason, setBulkReason] = useState('');

  // Custom Adjustment Modal (Input Langsung Angka)
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customCandidate, setCustomCandidate] = useState(null);
  const [customItems, setCustomItems] = useState([]);
  const [customReason, setCustomReason] = useState('');
  const [submittingCustom, setSubmittingCustom] = useState(false);

  // History Audit Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyCandidate, setHistoryCandidate] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ============================================================
  // TAB 2: MATRIKS & TAGIHAN PPDB STATES
  // ============================================================
  const [matrixData, setMatrixData] = useState({ columns: [], rows: [], summary: {} });
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [selectedMatrixRowIds, setSelectedMatrixRowIds] = useState(new Set());

  // Modal Penerbitan / Edit Sel Matriks
  const [cellModalOpen, setCellModalOpen] = useState(false);
  const [selectedCellInfo, setSelectedCellInfo] = useState(null);
  const [cellFormData, setCellFormData] = useState({
    amount: '',
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    has_discount: false,
    discount_type: 'amount', // 'amount' | 'percentage'
    discount_amount: 0,
    discount_percent: 0,
    discount_reason: '',
    notes: ''
  });
  const [submittingCell, setSubmittingCell] = useState(false);

  // Modal Batalkan Tagihan Sel
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelFormData, setCancelFormData] = useState({
    cancel_date: new Date().toISOString().slice(0, 10),
    cancel_reason: ''
  });
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Modal Konfirmasi Penerbitan Kolom Massal
  const [columnPublishModalOpen, setColumnPublishModalOpen] = useState(false);
  const [targetColumnInfo, setTargetColumnInfo] = useState(null);
  const [columnPublishFormData, setColumnPublishFormData] = useState({
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    notes: '',
    has_discount: false,
    discount_type: 'amount',
    discount_amount: 0,
    discount_percent: 0,
    discount_reason: ''
  });
  const [submittingColumnPublish, setSubmittingColumnPublish] = useState(false);

  // Modal Import Excel Kolom
  const [columnImportModalOpen, setColumnImportModalOpen] = useState(false);
  const [targetImportColumnInfo, setTargetImportColumnInfo] = useState(null);
  const [importParsedRows, setImportParsedRows] = useState([]);
  const [importFileValidation, setImportFileValidation] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [importSearchFilter, setImportSearchFilter] = useState('');
  const [importStatusFilter, setImportStatusFilter] = useState('all'); // 'all' | 'valid' | 'invalid'
  const [submittingImport, setSubmittingImport] = useState(false);
  const importFileInputRef = useRef(null);

  // Riwayat Tagihan PPDB (History)
  const [billsData, setBillsData] = useState({ bills: [], summary: {} });
  const [loadingBills, setLoadingBills] = useState(false);
  const [billSearch, setBillSearch] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState('all');
  const [billFeeTypeFilter, setBillFeeTypeFilter] = useState('');
  const [historySortConfig, setHistorySortConfig] = useState({ key: 'due_date', direction: 'desc' });

  // Detail & Revisi Tagihan Modal
  const [selectedBillDetail, setSelectedBillDetail] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [revisingBill, setRevisingBill] = useState(null);
  const [reviseModalOpen, setReviseModalOpen] = useState(false);
  const [reviseFormData, setReviseFormData] = useState({
    new_amount: '',
    new_discount_amount: 0,
    revision_reason: '',
    new_due_date: ''
  });
  const [submittingRevise, setSubmittingRevise] = useState(false);

  // Reminder Tab PPDB
  const [remindersData, setRemindersData] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [reminderSearch, setReminderSearch] = useState('');
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastFilterMode, setBroadcastFilterMode] = useState('overdue'); // 'overdue' | 'unpaid_all' | 'selected'
  const [broadcastSelectedBillIds, setBroadcastSelectedBillIds] = useState([]);
  const [broadcastCustomMessage, setBroadcastCustomMessage] = useState('');
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);
  const [sendingSingleReminderId, setSendingSingleReminderId] = useState(null);

  // ============================================================
  // TAB 3: PENERIMAAN PEMBAYARAN PPDB STATES
  // ============================================================
  // TAB 3: POPUP MULTIPAYMENT KASIR PPDB STATES (TAHAP 4)
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState(null);
  const [multiPaySelectedCandidateIds, setMultiPaySelectedCandidateIds] = useState([]);
  const [multiPayBillsSearch, setMultiPayBillsSearch] = useState('');
  const [multiPayDate, setMultiPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [multiPayTotalAmount, setMultiPayTotalAmount] = useState('');
  const [isMultiPayHistoricalOnly, setIsMultiPayHistoricalOnly] = useState(false);
  const [multiPayMethod, setMultiPayMethod] = useState('transfer'); // 'transfer' | 'cash'
  const [multiPayCashAccountId, setMultiPayCashAccountId] = useState('');
  const [multiPayBankStatementId, setMultiPayBankStatementId] = useState('');
  const [multiPayNotes, setMultiPayNotes] = useState('');
  const [multiPayAllocations, setMultiPayAllocations] = useState({});
  const [multiPayDiscounts, setMultiPayDiscounts] = useState({});
  const [multiPayBankStatementsOptions, setMultiPayBankStatementsOptions] = useState([]);
  const [loadingMultiPayBankStatements, setLoadingMultiPayBankStatements] = useState(false);
  const [submittingMultiPay, setSubmittingMultiPay] = useState(false);

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Tab 3: Riwayat Pembayaran PPDB States
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [loadingPaymentsHistory, setLoadingPaymentsHistory] = useState(false);
  const [paymentsHistorySummary, setPaymentsHistorySummary] = useState({ total_amount: 0, total_count: 0, valid_count: 0, voided_count: 0 });
  const [historySearch, setHistorySearch] = useState('');
  const [historyCashAccountFilter, setHistoryCashAccountFilter] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all'); // 'all' | 'valid' | 'voided'
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Modal Pembatalan Pembayaran Kasir PPDB (Void)
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedPaymentForVoid, setSelectedPaymentForVoid] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [submittingVoid, setSubmittingVoid] = useState(false);

  // Tab 3: Filter Status Tagihan Kasir
  const [cashierStatusFilter, setCashierStatusFilter] = useState('all'); // 'all' | 'unpaid' | 'partial' | 'paid'
  const [cashierPhaseFilter, setCashierPhaseFilter] = useState('all'); // 'all' | 'registration_fee' | 'enrollment_fee'
  const [cashierFeeTypeFilter, setCashierFeeTypeFilter] = useState('all');
  const [cashierSearch, setCashierSearch] = useState('');
  const [selectedCashierBillIds, setSelectedCashierBillIds] = useState([]);
  const [cashierSortConfig, setCashierSortConfig] = useState({ key: 'registrant_name_snapshot', direction: 'asc' });

  const handleSortCashier = (key) => {
    setCashierSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleToggleSelectCashierBill = (billId) => {
    setSelectedCashierBillIds((prev) =>
      prev.includes(billId) ? prev.filter((id) => id !== billId) : [...prev, billId]
    );
  };

  const handleToggleSelectAllCashierBills = () => {
    const payableBills = sortedAndFilteredCashierBills.filter(
      (b) =>
        b.status !== 'paid' &&
        Math.max(
          0,
          parseFloat(b.amount || 0) -
            parseFloat(b.discount_amount || 0) -
            parseFloat(b.paid_amount || 0)
        ) > 0
    );
    const allSelected =
      payableBills.length > 0 &&
      payableBills.every((b) => selectedCashierBillIds.includes(b.id));

    if (allSelected) {
      setSelectedCashierBillIds([]);
    } else {
      setSelectedCashierBillIds(payableBills.map((b) => b.id));
    }
  };

  // Bukti Transfer Queue (Proofs FIFO)
  const [proofsData, setProofsData] = useState({ proofs: [], summary: {} });
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [selectedProofForVerify, setSelectedProofForVerify] = useState(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ cash_account_id: '', notes: '' });
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Create Direct Bill Modal (Kasir PPDB)
  const [createBillModalOpen, setCreateBillModalOpen] = useState(false);
  const [createBillForm, setCreateBillForm] = useState({
    candidate_id: '',
    registrant_name_snapshot: '',
    registration_number_snapshot: '',
    billing_phase: 'enrollment_fee',
    fee_type_id: '',
    amount: 15000000,
    notes: ''
  });
  const [submittingCreateBill, setSubmittingCreateBill] = useState(false);

  // ============================================================
  // TAB 4: PENGELUARAN PPDB STATES
  // ============================================================
  const [expensesData, setExpensesData] = useState({ expenses: [], total_expenses_amount: 0 });
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [createExpenseModalOpen, setCreateExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: 0,
    expense_date: new Date().toISOString().slice(0, 10),
    cash_account_id: '',
    notes: '',
    category_name: 'Promosi & Iklan PPDB'
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // ============================================================
  // TAB 5: KARTU BAYAR PPDB STATES (REKAP GABUNGAN & INDIVIDUAL)
  // ============================================================
  const [ledgerSubTab, setLedgerSubTab] = useState('recap'); // 'recap' | 'individual'
  const [ledgerRecapData, setLedgerRecapData] = useState({ summary: {}, candidates: [] });
  const [loadingLedgerRecap, setLoadingLedgerRecap] = useState(false);
  const [ledgerRecapSearch, setLedgerRecapSearch] = useState('');
  const [ledgerRecapStatusFilter, setLedgerRecapStatusFilter] = useState('all');

  const [selectedCandidateIdForLedger, setSelectedCandidateIdForLedger] = useState('');
  const [individualLedgerData, setIndividualLedgerData] = useState(null);
  const [loadingIndividualLedger, setLoadingIndividualLedger] = useState(false);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');

  // ============================================================
  // TAB 6: PENGEMBALIAN DANA (REFUND CALON SANTRI MUNDUR) STATES
  // ============================================================
  const [refundSubTab, setRefundSubTab] = useState('requests'); // 'requests' | 'rules'
  const [refundFilterStatus, setRefundFilterStatus] = useState('all'); // 'all' | 'requested' | 'approved' | 'processed' | 'rejected' | 'eligible'
  const [refundSearch, setRefundSearch] = useState('');
  const [refundRules, setRefundRules] = useState([]);
  const [loadingRefundRules, setLoadingRefundRules] = useState(false);
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Modals for Refund
  const [refundRequestModal, setRefundRequestModal] = useState({
    isOpen: false,
    bill: null,
    bankAccountNo: '',
    bankAccountHolder: '',
    reason: ''
  });
  const [refundProcessModal, setRefundProcessModal] = useState({
    isOpen: false,
    bill: null,
    cashAccountId: '',
    deductionPct: 0,
    netRefund: 0,
    ruleApplied: null
  });
  const [refundRejectModal, setRefundRejectModal] = useState({
    isOpen: false,
    bill: null,
    reason: ''
  });
  const [refundRuleModal, setRefundRuleModal] = useState({
    isOpen: false,
    rule: null,
    feeComponent: 'enrollment_fee',
    cutoffDate: '',
    deductionPct: 0,
    description: '',
    isActive: true
  });

  // Navigasi ke halaman Skema Biaya dengan konteks Tahun Ajaran Sasaran yang sama
  const handleNavigateToFeeSchemes = () => {
    try {
      localStorage.setItem('keuangan_fee_schemes_selected_ay', String(selectedTargetAyId));
    } catch (e) {
      console.warn('Gagal menyimpan target academic year ke localStorage:', e);
    }
    navigate('/keuangan/fee-schemes');
  };

  // ============================================================
  // INITIAL DATA FETCHING
  // ============================================================
  useEffect(() => {
    fetchMasterMetadata();
  }, [activeSchoolUnit]);

  const fetchMasterMetadata = async () => {
    try {
      // 1. Ambil Tahun Ajaran dari modul akademik
      let yearsList = [];
      try {
        const ayParams = {};
        if (activeSchoolUnit && activeSchoolUnit.id && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
          ayParams.satuan_pendidikan_id = activeSchoolUnit.id;
        }
        const ayRes = await api.get('/akademik/academic-years', { params: ayParams });
        yearsList = ayRes.data?.data || ayRes.data?.academic_years || [];
      } catch (e) {
        console.error('Error fetching academic years:', e);
      }

      // Deduplikasi Tahun Ajaran berdasarkan nama (menghilangkan duplikasi nama T.A. lintas unit sekolah)
      const uniqueYearsMap = new Map();
      yearsList.forEach((y) => {
        const nameKey = (y.name || '').trim();
        if (!nameKey) return;
        const existing = uniqueYearsMap.get(nameKey);
        if (!existing) {
          uniqueYearsMap.set(nameKey, y);
        } else if (y.is_active && !existing.is_active) {
          uniqueYearsMap.set(nameKey, y);
        }
      });
      yearsList = Array.from(uniqueYearsMap.values());

      // Urutkan tahun ajaran secara descending berdasarkan nama (misal: 2026/2027, 2025/2026, 2024/2025)
      yearsList.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

      if (yearsList.length === 0) {
        yearsList = [
          { id: 2, name: '2026/2027', is_active: 1 },
          { id: 1, name: '2025/2026', is_active: 0 },
          { id: 3, name: '2024/2025', is_active: 0 }
        ];
      }
      setAcademicYears(yearsList);

      const [caRes, ftRes] = await Promise.all([
        api.get('/keuangan/cash-accounts').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/fee-types').catch(() => ({ data: { data: [] } }))
      ]);

      setCashAccounts(caRes.data?.data || []);
      setFeeTypes(ftRes.data?.data || []);

      // Default target academic year to the saved / upcoming / active year (e.g. 2025/2026 or id: 1)
      if (yearsList.length > 0) {
        const savedPpdbAy = localStorage.getItem('keuangan_ppdb_target_ay');
        const matched = yearsList.find((a) => String(a.id) === String(savedPpdbAy));
        const targetAy = matched || yearsList.find((a) => a.name?.includes('2025/2026')) || yearsList[0];
        const currentAy = yearsList.find((a) => a.name?.includes('2024/2025')) || yearsList[1] || yearsList[0];
        if (!selectedTargetAyId || !matched) {
          setSelectedTargetAyId(String(targetAy.id));
        }
        setTransactionAyId(String(currentAy.id));
      }
    } catch (err) {
      console.error('Error fetching master metadata:', err);
    }
  };

  // Fetch Tab Scoped Data when Target Academic Year or Main Tab Changes
  useEffect(() => {
    if (!selectedTargetAyId) return;

    if (activeMainTab === 'assignments') {
      fetchFeeAssignments();
    } else if (activeMainTab === 'bills') {
      if (billsSubTab === 'matrix') fetchMatrixData();
      else if (billsSubTab === 'history') fetchBillsHistory();
      else if (billsSubTab === 'reminders') fetchReminders();
    } else if (activeMainTab === 'payments') {
      if (paymentsSubTab === 'bills' || paymentsSubTab === 'cashier') fetchBillsHistory();
      else if (paymentsSubTab === 'history') fetchPaymentsHistoryData();
      else if (paymentsSubTab === 'proofs') fetchProofsQueue();
    } else if (activeMainTab === 'expenses') {
      fetchExpenses();
    } else if (activeMainTab === 'ledger') {
      if (ledgerSubTab === 'recap') {
        fetchLedgerRecap();
      } else if (ledgerSubTab === 'individual') {
        if (selectedCandidateIdForLedger) {
          fetchIndividualLedger(selectedCandidateIdForLedger);
        } else if (assignmentsData.candidates?.length > 0) {
          const firstCand = assignmentsData.candidates[0];
          const candId = firstCand.student_id || firstCand.candidate_id;
          setSelectedCandidateIdForLedger(candId);
          fetchIndividualLedger(candId);
        }
      }
    } else if (activeMainTab === 'refunds') {
      fetchBillsHistory();
      fetchRefundRules();
    }
  }, [selectedTargetAyId, activeMainTab, billsSubTab, paymentsSubTab, ledgerSubTab, refundSubTab, selectedCandidateIdForLedger, refreshTrigger, activeSchoolUnit]);

  // Tab 6 Fetchers
  const fetchRefundRules = async () => {
    setLoadingRefundRules(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/refund-policy-rules');
      setRefundRules(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching refund rules:', err);
    } finally {
      setLoadingRefundRules(false);
    }
  };

  // Tab 5 Fetchers
  const fetchLedgerRecap = async () => {
    setLoadingLedgerRecap(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/ledger-recap', {
        params: {
          target_academic_year_id: selectedTargetAyId,
          payment_status: ledgerRecapStatusFilter,
          search: ledgerRecapSearch
        }
      });
      setLedgerRecapData(res.data?.data || { summary: {}, candidates: [] });
    } catch (err) {
      console.error('Error fetching PPDB ledger recap:', err);
    } finally {
      setLoadingLedgerRecap(false);
    }
  };

  const fetchIndividualLedger = async (candidateId) => {
    if (!candidateId) return;
    setLoadingIndividualLedger(true);
    try {
      const res = await api.get(`/keuangan/ppdb-billing/student-ledger/${candidateId}`, {
        params: {
          target_academic_year_id: selectedTargetAyId
        }
      });
      setIndividualLedgerData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching individual PPDB ledger:', err);
    } finally {
      setLoadingIndividualLedger(false);
    }
  };

  // Debounced search for Tab 1: Fee Assignments
  useEffect(() => {
    if (activeMainTab === 'assignments' && selectedTargetAyId) {
      const timer = setTimeout(() => {
        fetchFeeAssignments();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [assignmentSearch, assignmentStatusFilter, selectedTargetAyId, activeMainTab]);

  // Debounced search for Tab 2: Matrix
  useEffect(() => {
    if (activeMainTab === 'bills' && billsSubTab === 'matrix' && selectedTargetAyId) {
      const timer = setTimeout(() => {
        fetchMatrixData();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [matrixSearch, selectedTargetAyId, activeMainTab, billsSubTab]);

  // Debounced search for Tab 2 History & Tab 3 Kasir: Bills
  useEffect(() => {
    const isBillsHistory = activeMainTab === 'bills' && billsSubTab === 'history';
    const isCashier = activeMainTab === 'payments' && (paymentsSubTab === 'bills' || paymentsSubTab === 'cashier');
    if ((isBillsHistory || isCashier) && selectedTargetAyId) {
      const timer = setTimeout(() => {
        fetchBillsHistory();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [billSearch, billStatusFilter, selectedTargetAyId, activeMainTab, billsSubTab, paymentsSubTab]);

  // Debounced search for Tab 3: Riwayat Pembayaran PPDB
  useEffect(() => {
    if (activeMainTab === 'payments' && paymentsSubTab === 'history' && selectedTargetAyId) {
      const timer = setTimeout(() => {
        fetchPaymentsHistoryData();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [historySearch, historyCashAccountFilter, historyMethodFilter, historyStatusFilter, historyStartDate, historyEndDate, selectedTargetAyId, activeMainTab, paymentsSubTab]);

  // Debounced search for Tab 5 Recap
  useEffect(() => {
    if (activeMainTab === 'ledger' && ledgerSubTab === 'recap' && selectedTargetAyId) {
      const timer = setTimeout(() => {
        fetchLedgerRecap();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [ledgerRecapSearch, ledgerRecapStatusFilter, selectedTargetAyId, activeMainTab, ledgerSubTab]);

  // Tab 1 Fetcher
  const fetchFeeAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/fee-assignments', {
        params: {
          target_academic_year_id: selectedTargetAyId,
          search: assignmentSearch,
          status: assignmentStatusFilter
        }
      });
      setAssignmentsData(res.data?.data || { candidates: [], schemes: [], total_candidates: 0 });
    } catch (err) {
      console.error('Error fetching fee assignments:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Tab 2 Matrix Fetcher
  const fetchMatrixData = async () => {
    setLoadingMatrix(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/matrix', {
        params: {
          target_academic_year_id: selectedTargetAyId,
          search: matrixSearch
        }
      });
      setMatrixData(res.data?.data || { columns: [], rows: [], summary: {} });
    } catch (err) {
      console.error('Error fetching matrix data:', err);
    } finally {
      setLoadingMatrix(false);
    }
  };

  // Tab 2 History / Kasir Bills Fetcher
  const fetchBillsHistory = async () => {
    setLoadingBills(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/registration-bills', {
        params: {
          target_academic_year_id: selectedTargetAyId,
          status: billStatusFilter,
          search: billSearch
        }
      });
      setBillsData(res.data?.data || { bills: [], summary: {} });
    } catch (err) {
      console.error('Error fetching bills history:', err);
    } finally {
      setLoadingBills(false);
    }
  };

  // Tab 2 Reminders Fetcher
  const fetchReminders = async () => {
    setLoadingReminders(true);
    try {
      const res = await api.get('/keuangan/student-bills/reminders/logs', {
        params: { academic_year_id: selectedTargetAyId }
      });
      setRemindersData(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching reminders:', err);
    } finally {
      setLoadingReminders(false);
    }
  };

  // Tab 3 Proofs Queue Fetcher
  const fetchProofsQueue = async () => {
    setLoadingProofs(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/proofs', {
        params: { target_academic_year_id: selectedTargetAyId }
      });
      setProofsData(res.data?.data || { proofs: [], summary: {} });
    } catch (err) {
      console.error('Error fetching proofs queue:', err);
    } finally {
      setLoadingProofs(false);
    }
  };

  // Tab 3 Payments History Fetcher
  const fetchPaymentsHistoryData = async () => {
    setLoadingPaymentsHistory(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/payments', {
        params: {
          target_academic_year_id: selectedTargetAyId,
          search: historySearch,
          cash_account_id: historyCashAccountFilter || undefined,
          payment_method: historyMethodFilter !== 'all' ? historyMethodFilter : undefined,
          status: historyStatusFilter !== 'all' ? historyStatusFilter : undefined,
          start_date: historyStartDate || undefined,
          end_date: historyEndDate || undefined
        }
      });
      const data = res.data?.data || {};
      setPaymentsHistory(data.payments || []);
      setPaymentsHistorySummary({
        total_amount: data.total_amount || 0,
        total_count: data.total_count || (data.payments ? data.payments.length : 0),
        valid_count: data.valid_count || (data.payments ? data.payments.filter((p) => p.status !== 'voided').length : 0),
        voided_count: data.voided_count || (data.payments ? data.payments.filter((p) => p.status === 'voided').length : 0)
      });
    } catch (err) {
      console.error('Error fetching PPDB payments history:', err);
    } finally {
      setLoadingPaymentsHistory(false);
    }
  };

  // Tab 3 View / Print Receipt Handler
  const handleViewReceipt = async (paymentId, openNewTab = false) => {
    if (!paymentId) return;
    setLoadingReceipt(true);
    try {
      const res = await api.get(`/keuangan/ppdb-billing/payments/${paymentId}/receipt`);
      const rData = res.data?.data;
      if (openNewTab) {
        openPpdbReceiptInNewTab(rData, activeSchoolUnit?.name);
      } else {
        setReceiptData(rData);
        setReceiptModalOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat kwitansi pembayaran PPDB');
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Tab 4 Expenses Fetcher
  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/expenses', {
        params: { target_academic_year_id: selectedTargetAyId }
      });
      setExpensesData(res.data?.data || { expenses: [], total_expenses_amount: 0 });
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  // Current Target Academic Year Label
  const currentTargetAy = useMemo(() => {
    return academicYears.find((a) => String(a.id) === String(selectedTargetAyId)) || { name: '2025/2026' };
  }, [academicYears, selectedTargetAyId]);

  const currentTransactionAy = useMemo(() => {
    return academicYears.find((a) => String(a.id) === String(transactionAyId)) || { name: '2024/2025' };
  }, [academicYears, transactionAyId]);

  // Currency Formatter
  const formatCurrency = (val) => {
    return `Rp ${parseFloat(val || 0).toLocaleString('id-ID')}`;
  };

  const formatRupiah = (val) => {
    if (val === null || val === undefined || val === '') return 'Rp 0';
    return `Rp ${Number(val).toLocaleString('id-ID')}`;
  };

  // Dynamic fee types list from backend PPDB assignments (Sekali Bayar -> Tahunan -> Bulanan)
  const dynamicFeeTypes = useMemo(() => {
    const rawList = assignmentsData.fee_types || feeTypes || [];
    return [...rawList].sort((a, b) => {
      const getRank = (ft) => {
        const bp = (ft.billing_pattern || '').toLowerCase();
        const name = (ft.name || '').toLowerCase();
        if (bp === 'monthly' || name.includes('spp')) return 3;
        if (bp === 'yearly' || name.includes('tahunan') || name.includes('daftar ulang')) return 2;
        return 1; // Sekali Bayar (Pendaftaran, Uang Pangkal, Seragam, Sarpras, Kegiatan, dll)
      };
      const rankDiff = getRank(a) - getRank(b);
      if (rankDiff !== 0) return rankDiff;
      return Number(a.id || 0) - Number(b.id || 0);
    });
  }, [assignmentsData.fee_types, feeTypes]);

  // Unique Process / Entry types for filtering in Tab 1
  const processOptions = useMemo(() => {
    const list = assignmentsData.candidates || [];
    const set = new Set();
    list.forEach((c) => {
      if (c.process_name) set.add(c.process_name);
    });
    return Array.from(set);
  }, [assignmentsData.candidates]);

  // Instant reactive filtered data lists while typing
  const filteredCandidates = useMemo(() => {
    let list = assignmentsData.candidates || [];
    if (assignmentStatusFilter && assignmentStatusFilter !== 'all') {
      if (assignmentStatusFilter === 'assigned') {
        list = list.filter((c) => (c.assignment?.fee_scheme_id || c.fee_scheme_id) && !c.assignment?.is_custom && c.assignment_status !== 'custom');
      } else if (assignmentStatusFilter === 'custom') {
        list = list.filter((c) => c.assignment?.is_custom || c.assignment_status === 'custom');
      } else if (assignmentStatusFilter === 'unassigned') {
        list = list.filter((c) => !c.assignment?.id && !c.fee_scheme_id && c.assignment_status === 'unassigned');
      }
    }
    if (candidateTypeFilter && candidateTypeFilter !== 'all') {
      if (candidateTypeFilter === 'unplaced') {
        list = list.filter((c) => !c.is_placed && c.candidate_category !== 'student_active' && c.candidate_category !== 'student_transfer');
      } else if (candidateTypeFilter === 'placed_new') {
        list = list.filter((c) => (c.is_placed || c.candidate_category === 'student_active') && c.entry_type !== 'pindahan');
      } else if (candidateTypeFilter === 'transfer') {
        list = list.filter((c) => c.entry_type === 'pindahan' || c.candidate_category === 'student_transfer');
      }
    }
    if (selectedProcessFilter) {
      list = list.filter((c) => c.process_name === selectedProcessFilter);
    }
    if (selectedSchemeFilter) {
      list = list.filter((c) => String(c.assignment?.fee_scheme_id || c.fee_scheme_id) === String(selectedSchemeFilter));
    }
    if (assignmentSearch && assignmentSearch.trim()) {
      const term = assignmentSearch.toLowerCase().trim();
      list = list.filter((c) =>
        (c.student_name || c.full_name || '').toLowerCase().includes(term) ||
        (c.registration_number || c.nis || '').toLowerCase().includes(term) ||
        (c.nisn || '').toLowerCase().includes(term) ||
        (c.scheme_name || c.assignment?.scheme_name || '').toLowerCase().includes(term) ||
        (c.process_name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [assignmentsData.candidates, assignmentStatusFilter, candidateTypeFilter, selectedProcessFilter, selectedSchemeFilter, assignmentSearch]);

  const sortedAndFilteredCandidates = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortConfig.key === 'student_name') {
        valA = a.student_name || a.full_name || '';
        valB = b.student_name || b.full_name || '';
      } else if (sortConfig.key === 'registration_number') {
        valA = a.registration_number || a.nis || '';
        valB = b.registration_number || b.nis || '';
      } else if (sortConfig.key === 'process_name') {
        valA = a.process_name || '';
        valB = b.process_name || '';
      } else if (sortConfig.key === 'scheme_name') {
        valA = a.assignment?.scheme_name || a.scheme_name || (a.assignment?.is_custom ? 'ZZ_Custom' : 'ZZ_Belum');
        valB = b.assignment?.scheme_name || b.scheme_name || (b.assignment?.is_custom ? 'ZZ_Custom' : 'ZZ_Belum');
      } else if (sortConfig.key === 'total_amount') {
        valA = Number(a.assignment?.total_amount || a.total_amount || 0);
        valB = Number(b.assignment?.total_amount || b.total_amount || 0);
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      } else if (sortConfig.key === 'status') {
        const getStatusRank = (st) => {
          if (st.assignment?.is_custom || st.assignment_status === 'custom') return 2;
          if (st.assignment?.id || st.fee_scheme_id) return 1;
          return 3;
        };
        valA = getStatusRank(a);
        valB = getStatusRank(b);
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      } else if (sortConfig.key.startsWith('fee_type_')) {
        const ftId = sortConfig.key.replace('fee_type_', '');
        valA = Number(a.fee_breakdown?.[ftId]?.final_amount || a.assignment?.fee_breakdown?.[ftId]?.final_amount || 0);
        valB = Number(b.fee_breakdown?.[ftId]?.final_amount || b.assignment?.fee_breakdown?.[ftId]?.final_amount || 0);
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredCandidates, sortConfig]);

  // Tab 1 Stats
  const totalCandidatesCount = assignmentsData.candidates?.length || 0;
  const assignedStandardCount = (assignmentsData.candidates || []).filter(
    (c) => (c.assignment?.fee_scheme_id || c.fee_scheme_id) && !c.assignment?.is_custom && c.assignment_status !== 'custom'
  ).length;
  const assignedCustomCount = (assignmentsData.candidates || []).filter(
    (c) => c.assignment?.is_custom || c.assignment_status === 'custom'
  ).length;
  const unassignedCandidatesCount = (assignmentsData.candidates || []).filter(
    (c) => !c.assignment?.id && !c.fee_scheme_id && c.assignment_status === 'unassigned'
  ).length;

  const filteredMatrixRows = useMemo(() => {
    let list = matrixData.rows || [];
    if (matrixSearch && matrixSearch.trim()) {
      const term = matrixSearch.toLowerCase().trim();
      list = list.filter((r) =>
        (r.full_name || '').toLowerCase().includes(term) ||
        (r.registration_number || '').toLowerCase().includes(term) ||
        (r.process_name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [matrixData.rows, matrixSearch]);

  const filteredBills = useMemo(() => {
    let list = billsData.bills || [];
    if (billStatusFilter && billStatusFilter !== 'all') {
      list = list.filter((b) => b.status === billStatusFilter);
    }
    if (billSearch && billSearch.trim()) {
      const term = billSearch.toLowerCase().trim();
      list = list.filter((b) =>
        (b.registrant_name_snapshot || '').toLowerCase().includes(term) ||
        (b.registration_number_snapshot || '').toLowerCase().includes(term) ||
        (b.fee_type_name || '').toLowerCase().includes(term) ||
        (b.receipt_number || '').toLowerCase().includes(term) ||
        String(b.id || '').includes(term)
      );
    }
    return list;
  }, [billsData.bills, billStatusFilter, billSearch]);

  const cashierBillsSummary = useMemo(() => {
    const list = billsData.bills || [];
    const todayStr = new Date().toISOString().slice(0, 10);

    let totalBills = 0;
    let totalPaidCash = 0;
    let totalPaidHistorical = 0;
    let historicalCount = 0;
    let totalDiscount = 0;
    let discountCount = 0;
    let totalRemaining = 0;
    let unpaidCount = 0;
    let paidCount = 0;
    let partialCount = 0;
    let totalOverdue = 0;
    let overdueCount = 0;

    for (const b of list) {
      const amount = parseFloat(b.amount || 0);
      const paid = parseFloat(b.paid_amount || 0);
      const disc = parseFloat(b.discount_amount || 0);
      const rem = Math.max(0, amount - paid - disc);

      totalBills += amount;

      if (b.payment_method === 'historical' || b.is_historical_only) {
        totalPaidHistorical += paid;
        if (paid > 0) historicalCount += 1;
      } else {
        totalPaidCash += paid;
      }

      if (disc > 0) {
        totalDiscount += disc;
        discountCount += 1;
      }

      totalRemaining += rem;

      if (b.status === 'paid') {
        paidCount += 1;
      } else if (b.status === 'partially_paid') {
        partialCount += 1;
        unpaidCount += 1;
      } else {
        unpaidCount += 1;
      }

      if (b.due_date && b.due_date < todayStr && b.status !== 'paid' && b.status !== 'cancelled') {
        totalOverdue += rem;
        overdueCount += 1;
      }
    }

    const totalPaid = totalPaidCash + totalPaidHistorical;
    const totalObligation = totalRemaining;

    return {
      totalBills,
      totalPaid,
      totalPaidCash,
      totalPaidHistorical,
      historicalCount,
      totalDiscount,
      discountCount,
      totalRemaining,
      unpaidCount,
      paidCount,
      partialCount,
      totalOverdue,
      overdueCount,
      totalObligation,
      totalCount: list.length
    };
  }, [billsData.bills]);

  const filteredCashierBills = useMemo(() => {
    let list = billsData.bills || [];

    // Filter Status Tagihan Kasir
    if (cashierStatusFilter && cashierStatusFilter !== 'all') {
      if (cashierStatusFilter === 'unpaid') {
        list = list.filter((b) => b.status === 'unpaid' || parseFloat(b.paid_amount || 0) === 0);
      } else if (cashierStatusFilter === 'partial') {
        list = list.filter((b) => b.status === 'partially_paid' || (parseFloat(b.paid_amount || 0) > 0 && b.status !== 'paid'));
      } else if (cashierStatusFilter === 'paid') {
        list = list.filter((b) => b.status === 'paid');
      } else {
        list = list.filter((b) => b.status === cashierStatusFilter);
      }
    }

    // Filter Fase Penagihan (Formulir vs Uang Masuk)
    if (cashierPhaseFilter && cashierPhaseFilter !== 'all') {
      list = list.filter((b) => b.billing_phase === cashierPhaseFilter);
    }

    // Filter Komponen Biaya
    if (cashierFeeTypeFilter && cashierFeeTypeFilter !== 'all') {
      list = list.filter((b) => String(b.fee_type_id) === String(cashierFeeTypeFilter));
    }

    // Pencarian
    const query = (cashierSearch || billSearch || '').toLowerCase().trim();
    if (query) {
      list = list.filter((b) =>
        (b.registrant_name_snapshot || '').toLowerCase().includes(query) ||
        (b.registration_number_snapshot || '').toLowerCase().includes(query) ||
        (b.fee_type_name || '').toLowerCase().includes(query) ||
        (b.receipt_number || '').toLowerCase().includes(query) ||
        String(b.id || '').includes(query)
      );
    }

    return list;
  }, [billsData.bills, cashierStatusFilter, cashierPhaseFilter, cashierFeeTypeFilter, cashierSearch, billSearch]);

  const sortedAndFilteredCashierBills = useMemo(() => {
    let list = [...filteredCashierBills];

    if (cashierSortConfig.key) {
      list.sort((a, b) => {
        let aVal = a[cashierSortConfig.key];
        let bVal = b[cashierSortConfig.key];

        if (['amount', 'paid_amount', 'discount_amount', 'remaining_amount'].includes(cashierSortConfig.key)) {
          let aNum = 0;
          let bNum = 0;
          if (cashierSortConfig.key === 'remaining_amount') {
            aNum = Math.max(0, parseFloat(a.amount || 0) - parseFloat(a.discount_amount || 0) - parseFloat(a.paid_amount || 0));
            bNum = Math.max(0, parseFloat(b.amount || 0) - parseFloat(b.discount_amount || 0) - parseFloat(b.paid_amount || 0));
          } else if (cashierSortConfig.key === 'paid_amount') {
            aNum = parseFloat(a.paid_amount || 0);
            bNum = parseFloat(b.paid_amount || 0);
          } else if (cashierSortConfig.key === 'discount_amount') {
            aNum = parseFloat(a.discount_amount || 0);
            bNum = parseFloat(b.discount_amount || 0);
          } else {
            aNum = parseFloat(aVal || 0);
            bNum = parseFloat(bVal || 0);
          }
          return cashierSortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        if (['bill_date', 'due_date', 'created_at'].includes(cashierSortConfig.key)) {
          const aTime = aVal ? new Date(aVal).getTime() : 0;
          const bTime = bVal ? new Date(bVal).getTime() : 0;
          return cashierSortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
        }

        if (cashierSortConfig.key === 'registrant_name_snapshot') {
          aVal = a.registrant_name_snapshot || a.student_name || '';
          bVal = b.registrant_name_snapshot || b.student_name || '';
        } else if (cashierSortConfig.key === 'fee_type_name') {
          aVal = a.fee_type_name || '';
          bVal = b.fee_type_name || '';
        } else if (cashierSortConfig.key === 'wave_name') {
          aVal = a.wave_name || a.billing_phase || '';
          bVal = b.wave_name || b.billing_phase || '';
        }

        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();
        if (aStr < bStr) return cashierSortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return cashierSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [filteredCashierBills, cashierSortConfig]);

  const filteredPaymentsHistory = useMemo(() => {
    let list = paymentsHistory || [];
    if (historySearch && historySearch.trim()) {
      const term = historySearch.toLowerCase().trim();
      list = list.filter((p) =>
        (p.receipt_number || '').toLowerCase().includes(term) ||
        (p.registrant_name_snapshot || '').toLowerCase().includes(term) ||
        (p.registration_number_snapshot || '').toLowerCase().includes(term) ||
        (p.fee_type_name || '').toLowerCase().includes(term) ||
        (p.notes || '').toLowerCase().includes(term) ||
        String(p.id || '').includes(term)
      );
    }
    if (historyCashAccountFilter) {
      list = list.filter((p) => String(p.cash_account_id) === String(historyCashAccountFilter));
    }
    if (historyMethodFilter && historyMethodFilter !== 'all') {
      list = list.filter((p) => p.payment_method === historyMethodFilter);
    }
    if (historyStatusFilter && historyStatusFilter !== 'all') {
      list = list.filter((p) => (p.status || 'valid') === historyStatusFilter);
    }
    if (historyStartDate) {
      list = list.filter((p) => String(p.payment_date).slice(0, 10) >= historyStartDate);
    }
    if (historyEndDate) {
      list = list.filter((p) => String(p.payment_date).slice(0, 10) <= historyEndDate);
    }
    return list;
  }, [paymentsHistory, historySearch, historyCashAccountFilter, historyMethodFilter, historyStatusFilter, historyStartDate, historyEndDate]);

  // Tab 3 Handlers: Void / Pembatalan Pembayaran Kasir PPDB
  const handleOpenVoidModal = (payment) => {
    setSelectedPaymentForVoid(payment);
    setVoidReason('');
    setVoidModalOpen(true);
  };

  const handleExecuteVoid = async () => {
    if (!selectedPaymentForVoid) return;
    if (!voidReason || voidReason.trim().length < 5) {
      alert('Alasan pembatalan (void) pembayaran wajib diisi (minimal 5 karakter).');
      return;
    }

    if (!window.confirm(`Konfirmasi Pembatalan:\nApakah Anda yakin ingin membatalkan (void) pembayaran Kwitansi #${selectedPaymentForVoid.receipt_number || selectedPaymentForVoid.id} sebesar ${formatCurrency(selectedPaymentForVoid.amount_paid)}?\n\nSisa piutang tagihan calon santri akan otomatis dipulihkan.`)) {
      return;
    }

    setSubmittingVoid(true);
    try {
      const res = await api.post(`/keuangan/ppdb-billing/payments/${selectedPaymentForVoid.id}/void`, {
        void_reason: voidReason.trim()
      });
      alert(res.data?.message || 'Pembayaran berhasil dibatalkan (void). Status tagihan telah dipulihkan.');
      setVoidModalOpen(false);
      setSelectedPaymentForVoid(null);
      setVoidReason('');
      fetchPaymentsHistoryData();
      fetchBillsData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan transaksi pembayaran PPDB.');
    } finally {
      setSubmittingVoid(false);
    }
  };

  const filteredLedgerRecapCandidates = useMemo(() => {
    let list = ledgerRecapData.candidates || [];
    if (ledgerRecapStatusFilter && ledgerRecapStatusFilter !== 'all') {
      list = list.filter((c) => c.payment_status === ledgerRecapStatusFilter);
    }
    if (ledgerRecapSearch && ledgerRecapSearch.trim()) {
      const term = ledgerRecapSearch.toLowerCase().trim();
      list = list.filter((c) =>
        (c.full_name || '').toLowerCase().includes(term) ||
        (c.registration_number || '').toLowerCase().includes(term) ||
        (c.scheme_name || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term) ||
        (c.process_name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [ledgerRecapData.candidates, ledgerRecapStatusFilter, ledgerRecapSearch]);

  const filteredCandidatesForIndividualLedger = useMemo(() => {
    let list = ledgerRecapData.candidates || [];
    if (candidateSearchQuery && candidateSearchQuery.trim()) {
      const term = candidateSearchQuery.toLowerCase().trim();
      list = list.filter((c) =>
        (c.full_name || '').toLowerCase().includes(term) ||
        (c.registration_number || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [ledgerRecapData.candidates, candidateSearchQuery]);

  // ============================================================
  // TAB 1 ACTIONS: PENETAPAN BIAYA
  // ============================================================
  const handleSelectAllCandidates = () => {
    if (selectedCandidateIds.length === sortedAndFilteredCandidates.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(sortedAndFilteredCandidates.map((c) => c.student_id || c.candidate_id));
    }
  };

  const handleToggleSelectCandidate = (candidateId) => {
    if (selectedCandidateIds.includes(candidateId)) {
      setSelectedCandidateIds(selectedCandidateIds.filter((id) => id !== candidateId));
    } else {
      setSelectedCandidateIds([...selectedCandidateIds, candidateId]);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleOpenSingleAssign = (candidate) => {
    setTargetCandidate(candidate);
    const existingSchemeId = candidate.assignment?.fee_scheme_id || candidate.fee_scheme_id || (assignmentsData.schemes?.[0]?.id || '');
    setSelectedSchemeId(existingSchemeId ? String(existingSchemeId) : '');
    setAssignReason(candidate.reason || 'Penetapan awal skema tarif calon santri PPDB');
    setSingleAssignModalOpen(true);
  };

  const handleSaveSingleAssign = async (e) => {
    e.preventDefault();
    if (!selectedSchemeId) {
      alert('Pilih skema biaya terlebih dahulu');
      return;
    }
    if (targetCandidate.assignment?.id && !assignReason) {
      alert('Alasan perubahan wajib diisi untuk audit trail');
      return;
    }
    setSubmittingAssign(true);
    try {
      await api.post('/keuangan/ppdb-billing/fee-assignments/assign', {
        target_academic_year_id: selectedTargetAyId,
        candidate_id: targetCandidate.student_id || targetCandidate.candidate_id,
        fee_scheme_id: selectedSchemeId,
        reason: assignReason
      });
      alert(`Skema biaya berhasil ditetapkan untuk ${targetCandidate.student_name || targetCandidate.full_name}`);
      setSingleAssignModalOpen(false);
      fetchFeeAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menetapkan skema biaya');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleOpenBulkAssign = () => {
    if (selectedCandidateIds.length === 0) {
      alert('Pilih minimal satu calon santri dengan mencentang kotak di tabel');
      return;
    }
    setBulkSchemeId(assignmentsData.schemes?.[0]?.id ? String(assignmentsData.schemes[0].id) : '');
    setBulkReason('');
    setBulkAssignModalOpen(true);
  };

  const handleSaveBulkAssign = async (e) => {
    e.preventDefault();
    if (!bulkSchemeId) {
      alert('Pilih skema biaya terlebih dahulu');
      return;
    }
    if (!bulkReason) {
      alert('Alasan penetapan massal wajib diisi untuk audit trail');
      return;
    }
    setSubmittingAssign(true);
    try {
      await api.post('/keuangan/ppdb-billing/fee-assignments/assign', {
        target_academic_year_id: selectedTargetAyId,
        candidate_ids: selectedCandidateIds,
        fee_scheme_id: bulkSchemeId,
        reason: bulkReason
      });
      alert(`Skema biaya berhasil ditetapkan secara massal untuk ${selectedCandidateIds.length} calon santri`);
      setBulkAssignModalOpen(false);
      setSelectedCandidateIds([]);
      fetchFeeAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menetapkan skema massal');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Open Custom / Manual Input Adjustment (Langsung Nominal Angka)
  const handleOpenCustomAdjustment = (candidate) => {
    setCustomCandidate(candidate);
    setCustomReason('');

    const breakdown = candidate.fee_breakdown || candidate.assignment?.fee_breakdown || {};
    const currentAdjustments = {};
    (candidate.custom_adjustments || candidate.adjustments || []).forEach((ca) => {
      currentAdjustments[ca.fee_type_id] = ca;
    });

    const items = dynamicFeeTypes.map((ft) => {
      const existingAdj = currentAdjustments[ft.id];
      const existingBreakdown = breakdown[ft.id];

      let initialAmount = '';
      if (existingBreakdown && existingBreakdown.final_amount !== undefined && existingBreakdown.final_amount !== null) {
        initialAmount = existingBreakdown.final_amount;
      } else if (existingAdj && existingAdj.override_amount !== null && existingAdj.override_amount !== undefined) {
        initialAmount = existingAdj.override_amount;
      }

      return {
        fee_type_id: ft.id,
        fee_type_name: ft.name,
        adjustment_kind: 'override_amount',
        override_amount: initialAmount,
        reason: existingAdj?.reason || ''
      };
    });

    setCustomItems(items);
    setCustomModalOpen(true);
  };

  const handleCustomItemChange = (index, field, val) => {
    const next = [...customItems];
    next[index][field] = val;
    setCustomItems(next);
  };

  const handleSaveCustomAdjustment = async (e) => {
    e.preventDefault();
    if (!customReason) {
      alert('Alasan penetapan biaya khusus wajib diisi untuk audit trail');
      return;
    }
    setSubmittingCustom(true);
    try {
      await api.post('/keuangan/ppdb-billing/fee-assignments/adjust', {
        target_academic_year_id: selectedTargetAyId,
        candidate_id: customCandidate.student_id || customCandidate.candidate_id,
        custom_items: customItems,
        reason: customReason
      });
      alert(`Penyesuaian biaya khusus calon santri ${customCandidate.student_name || customCandidate.full_name} berhasil disimpan`);
      setCustomModalOpen(false);
      fetchFeeAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan penyesuaian khusus');
    } finally {
      setSubmittingCustom(false);
    }
  };

  // Open History Audit Modal
  const handleOpenHistoryModal = async (candidate) => {
    setHistoryCandidate(candidate);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryLogs([]);

    try {
      const res = await api.get('/keuangan/finance-audit-logs', {
        params: {
          entity_type: 'student_fee_scheme_assignment',
          entity_id: candidate.assignment?.id || candidate.assignment_id || undefined
        }
      });
      setHistoryLogs(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ============================================================
  // TAB 2 ACTIONS: MATRIKS PENAGIHAN, BATCH PUBLISH, IMPORT EXCEL, RIWAYAT & REMINDERS
  // ============================================================
  const handleToggleSelectMatrixRow = (candidateId) => {
    setSelectedMatrixRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const handleSelectAllMatrixRows = () => {
    if (selectedMatrixRowIds.size === filteredMatrixRows.length) {
      setSelectedMatrixRowIds(new Set());
    } else {
      setSelectedMatrixRowIds(new Set(filteredMatrixRows.map((r) => r.candidate_id || r.student_id)));
    }
  };

  // 1. Modal Edit / Terbitkan Sel Matriks
  const handleOpenCellModal = (row, cell) => {
    setSelectedCellInfo({ row, cell });
    const defaultDueDate = `${currentTargetAy.name?.split('/')[0] || new Date().getFullYear()}-07-10`;
    const defaultBillDate = new Date().toISOString().slice(0, 10);

    const isPublished = cell.is_published;
    const currentAmount = cell.amount !== undefined && cell.amount !== null ? cell.amount : (cell.base_amount || '');
    const currentDiscount = cell.discount_amount || 0;

    setCellFormData({
      amount: currentAmount !== '' ? String(currentAmount) : '',
      bill_date: cell.bill_date || defaultBillDate,
      due_date: cell.due_date || defaultDueDate,
      has_discount: currentDiscount > 0,
      discount_type: 'amount',
      discount_amount: currentDiscount,
      discount_percent: currentAmount > 0 ? ((currentDiscount / currentAmount) * 100).toFixed(1) : 0,
      discount_reason: cell.discount_reason || '',
      notes: cell.notes || ''
    });
    setCellModalOpen(true);
  };

  const handleSavePublishCell = async (e) => {
    e.preventDefault();
    if (!selectedCellInfo) return;

    setSubmittingCell(true);
    try {
      const { row, cell } = selectedCellInfo;
      const amountVal = parseFloat(cellFormData.amount || 0);

      const payload = {
        target_academic_year_id: Number(selectedTargetAyId),
        academic_year_id: Number(transactionAyId || selectedTargetAyId),
        psb_registrant_ref_id: row.candidate_id,
        student_id: row.student_id,
        registrant_name_snapshot: row.full_name,
        registration_number_snapshot: row.registration_number,
        fee_type_id: cell.fee_type_id,
        billing_phase: cell.billing_phase || 'enrollment_fee',
        amount: amountVal,
        due_date: cellFormData.due_date,
        bill_date: cellFormData.bill_date,
        has_discount: cellFormData.has_discount,
        discount_amount: cellFormData.has_discount ? parseFloat(cellFormData.discount_amount || 0) : 0,
        discount_percentage: cellFormData.has_discount && cellFormData.discount_type === 'percentage' ? parseFloat(cellFormData.discount_percent || 0) : null,
        discount_reason: cellFormData.has_discount ? cellFormData.discount_reason : null,
        notes: cellFormData.notes
      };

      await api.post('/keuangan/ppdb-billing/registration-bills', payload);
      alert(`Tagihan ${cell.fee_type_name} untuk ${row.full_name} berhasil disimpan.`);
      setCellModalOpen(false);
      fetchMatrixData();
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan tagihan sel');
    } finally {
      setSubmittingCell(false);
    }
  };

  // 2. Modal Batalkan Tagihan Sel
  const handleOpenCancelModal = () => {
    setCancelFormData({
      cancel_date: new Date().toISOString().slice(0, 10),
      cancel_reason: ''
    });
    setCancelModalOpen(true);
  };

  const handleExecuteCancelCell = async (e) => {
    e.preventDefault();
    if (!selectedCellInfo?.cell?.bill_id) return;

    setSubmittingCancel(true);
    try {
      await api.post(`/keuangan/ppdb-billing/registration-bills/${selectedCellInfo.cell.bill_id}/cancel`, {
        reason: cancelFormData.cancel_reason,
        cancellation_date: cancelFormData.cancel_date
      });
      alert('Tagihan PPDB berhasil dibatalkan');
      setCancelModalOpen(false);
      setCellModalOpen(false);
      fetchMatrixData();
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan tagihan');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // 3. Modal Penerbitan Kolom Massal
  const handleOpenColumnPublishModal = (col) => {
    setTargetColumnInfo(col);
    const defaultDueDate = `${currentTargetAy.name?.split('/')[0] || new Date().getFullYear()}-07-10`;
    const defaultBillDate = new Date().toISOString().slice(0, 10);

    setColumnPublishFormData({
      bill_date: defaultBillDate,
      due_date: defaultDueDate,
      notes: `Penerbitan massal tagihan PPDB kolom ${col.label} TA ${currentTargetAy.name}`,
      has_discount: false,
      discount_type: 'amount',
      discount_amount: 0,
      discount_percent: 0,
      discount_reason: ''
    });
    setColumnPublishModalOpen(true);
  };

  const handleExecuteColumnPublish = async () => {
    if (!targetColumnInfo) return;

    setSubmittingColumnPublish(true);
    try {
      const selectedIdsArray = Array.from(selectedMatrixRowIds);
      const isSelectionMode = selectedIdsArray.length > 0;

      // Ambil calon santri sasaran
      const targetRows = isSelectionMode
        ? matrixData.rows.filter((r) => selectedIdsArray.includes(r.candidate_id || r.student_id))
        : matrixData.rows;

      let successCount = 0;
      for (const row of targetRows) {
        const cell = row.cells?.[targetColumnInfo.key] || {};
        const amountVal = cell.amount !== undefined && cell.amount !== null ? cell.amount : (cell.base_amount || 0);

        try {
          await api.post('/keuangan/ppdb-billing/registration-bills', {
            target_academic_year_id: Number(selectedTargetAyId),
            academic_year_id: Number(transactionAyId || selectedTargetAyId),
            psb_registrant_ref_id: row.candidate_id,
            student_id: row.student_id,
            registrant_name_snapshot: row.full_name,
            registration_number_snapshot: row.registration_number,
            fee_type_id: targetColumnInfo.fee_type_id,
            billing_phase: targetColumnInfo.billing_phase || 'enrollment_fee',
            amount: amountVal,
            due_date: columnPublishFormData.due_date,
            bill_date: columnPublishFormData.bill_date,
            has_discount: columnPublishFormData.has_discount,
            discount_amount: columnPublishFormData.has_discount ? parseFloat(columnPublishFormData.discount_amount || 0) : 0,
            discount_percentage: columnPublishFormData.has_discount && columnPublishFormData.discount_type === 'percentage' ? parseFloat(columnPublishFormData.discount_percent || 0) : null,
            discount_reason: columnPublishFormData.has_discount ? columnPublishFormData.discount_reason : null,
            notes: columnPublishFormData.notes
          });
          successCount++;
        } catch (subErr) {
          console.warn(`Gagal terbitkan tagihan untuk ${row.full_name}:`, subErr.message);
        }
      }

      alert(`Penerbitan massal kolom ${targetColumnInfo.label} berhasil: ${successCount} tagihan PPDB diproses.`);
      setColumnPublishModalOpen(false);
      setTargetColumnInfo(null);
      setSelectedMatrixRowIds(new Set());
      fetchMatrixData();
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerbitkan tagihan kolom massal');
    } finally {
      setSubmittingColumnPublish(false);
    }
  };

  // 4. Fitur Template & Import Data Excel Kolom PPDB
  const formatDateToDMY = (dateInput) => {
    if (!dateInput && dateInput !== 0) return '';
    if (typeof dateInput === 'string') {
      const clean = dateInput.trim();
      const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
      if (isoMatch) {
        return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
      }
      const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
      if (dmyMatch) {
        return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}/${dmyMatch[3]}`;
      }
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDateToIso = (val) => {
    if (!val && val !== 0) return null;
    if (typeof val === 'number') {
      if (val > 20000) {
        // Excel serial date to YYYY-MM-DD
        const totalDays = Math.floor(val) - 25569;
        const d = new Date(totalDays * 86400 * 1000);
        const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
        const y = localDate.getFullYear();
        const m = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      return null;
    }
    if (typeof val === 'string') {
      const s = val.trim();
      const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
      if (dmyMatch) {
        let day = dmyMatch[1].padStart(2, '0');
        let month = dmyMatch[2].padStart(2, '0');
        let year = dmyMatch[3];
        if (year.length === 2) {
          year = (parseInt(year, 10) > 50 ? '19' : '20') + year;
        }
        return `${year}-${month}-${day}`;
      }
      const isoMatch = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
      }
    }
    return null;
  };

  const handleDownloadColumnTemplate = (col) => {
    if (!col) return;
    const ayName = currentTargetAy?.name || 'Tahun Ajaran Sasaran PPDB';

    const headerRows = [
      ['DOKUMEN IDENTITAS IMPORT TAGIHAN PPDB', '', '', '', '', '', '', ''],
      ['TAHUN AJARAN SASARAN', ayName, 'ID_TAHUN_AJARAN_SASARAN', String(selectedTargetAyId), '', '', '', ''],
      ['JENIS BIAYA PPDB', col.label, 'ID_JENIS_BIAYA', String(col.fee_type_id), '', '', '', ''],
      ['POLA PENAGIHAN', col.badge_text || 'Sekali Bayar', 'KODE IDENTIFIER KOLOM', col.key, '', '', '', ''],
      ['CATATAN: File Excel ini hanya berlaku untuk kolom di atas pada Tahun Ajaran Sasaran terkait. Jangan ubah baris 1-4.', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['No', 'No. Registrasi / NIS', 'Nama Calon Santri', 'Jalur / Proses PSB', 'Nominal Tagihan (Rp)', 'Tanggal Tagihan (DD/MM/YYYY)', 'Tanggal Jatuh Tempo (DD/MM/YYYY)', 'Catatan']
    ];

    const defaultDueDateStr = `${currentTargetAy.name?.split('/')[0] || new Date().getFullYear()}-07-10`;
    const defaultBillDateStr = new Date().toISOString().slice(0, 10);

    const studentDataRows = (matrixData.rows || []).map((row, idx) => {
      const cell = row.cells?.[col.key] || {};
      const nominal = cell.amount !== undefined && cell.amount !== null ? cell.amount : (cell.base_amount || 0);
      const billDateDMY = formatDateToDMY(cell.bill_date || defaultBillDateStr);
      const dueDateDMY = formatDateToDMY(cell.due_date || defaultDueDateStr);
      const notes = cell.notes || '';

      return [
        idx + 1,
        row.registration_number || row.nis || '',
        row.full_name || '',
        row.process_name || 'Reguler',
        nominal,
        billDateDMY,
        dueDateDMY,
        notes
      ];
    });

    const fullSheetData = [...headerRows, ...studentDataRows];
    const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

    ws['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 32 },
      { wch: 18 },
      { wch: 22 },
      { wch: 28 },
      { wch: 28 },
      { wch: 36 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Tagihan PPDB');

    const safeColName = (col.label || 'Tagihan_PPDB').replace(/[^a-zA-Z0-9]/g, '_');
    const safeAyName = (currentTargetAy?.name || 'TA').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Format_Tagihan_PPDB_${safeColName}_TA_${safeAyName}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  const handleOpenImportModal = (col) => {
    setTargetImportColumnInfo(col);
    setImportParsedRows([]);
    setImportFileValidation(null);
    setImportFileName('');
    setImportSearchFilter('');
    setImportStatusFilter('all');
    setColumnImportModalOpen(true);
  };

  const handleImportFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd' });

        if (!rawRows || rawRows.length < 2) {
          setImportFileValidation({
            isValid: false,
            errorMsg: 'File Excel kosong atau tidak memiliki format yang valid.'
          });
          return;
        }

        // 1. Ekstrak Metadata Dokumen dari 8 baris pertama
        let docAyId = '';
        let docFeeTypeId = '';
        let docColKey = '';

        for (let i = 0; i < Math.min(8, rawRows.length); i++) {
          const row = rawRows[i];
          for (let j = 0; j < row.length; j++) {
            const cellStr = String(row[j] || '').trim().toUpperCase();
            if (cellStr === 'ID_TAHUN_AJARAN_SASARAN') {
              docAyId = String(row[j + 1] || '').trim();
            }
            if (cellStr === 'ID_JENIS_BIAYA') {
              docFeeTypeId = String(row[j + 1] || '').trim();
            }
            if (cellStr === 'KODE IDENTIFIER KOLOM') {
              docColKey = String(row[j + 1] || '').trim();
            }
          }
        }

        let validationError = null;
        if (docAyId && String(docAyId) !== String(selectedTargetAyId)) {
          validationError = `File ini ditujukan untuk ID Tahun Ajaran Sasaran "${docAyId}", bukan Tahun Ajaran Sasaran yang sedang aktif (${currentTargetAy.name}).`;
        } else if (docFeeTypeId && targetImportColumnInfo && String(docFeeTypeId) !== String(targetImportColumnInfo.fee_type_id)) {
          validationError = `File ini ditujukan untuk Jenis Biaya ID "${docFeeTypeId}", sedangkan kolom target yang dibuka adalah "${targetImportColumnInfo.label}".`;
        } else if (docColKey && targetImportColumnInfo && docColKey !== targetImportColumnInfo.key) {
          validationError = `File ini berisi data untuk kolom tagihan (${docColKey}). Kolom target aktif adalah "${targetImportColumnInfo.label}".`;
        }

        // 2. Cari Baris Header Tabel
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(25, rawRows.length); i++) {
          const r = rawRows[i].map((c) => String(c || '').toLowerCase().trim());
          const hasRegOrNis = r.some((c) => c.includes('registrasi') || c.includes('nis') || c.includes('no.'));
          const hasNama = r.some((c) => c.includes('nama') || c.includes('santri'));
          const hasNominal = r.some((c) => c.includes('nominal') || c.includes('tagihan') || c.includes('tarif'));

          if ((hasRegOrNis || hasNama) && (hasNominal || r.some((c) => c.includes('jalur') || c.includes('proses')))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          setImportFileValidation({
            isValid: false,
            errorMsg: 'Header tabel data calon santri tidak ditemukan pada file Excel.'
          });
          return;
        }

        const headers = rawRows[headerRowIdx].map((c) => String(c || '').toLowerCase().trim());
        const regIdx = headers.findIndex((h) => h.includes('registrasi') || (h.includes('nis') && !h.includes('jenis')));
        const nameIdx = headers.findIndex((h) => h.includes('nama'));
        const processIdx = headers.findIndex((h) => h.includes('jalur') || h.includes('gelombang') || h.includes('proses'));
        const nominalIdx = headers.findIndex((h) => h.includes('nominal') || h.includes('tagihan') || h.includes('tarif') || h.includes('jumlah'));
        const billDateIdx = headers.findIndex((h) => h.includes('tanggal tagih') || h.includes('penagihan') || h.includes('tgl tagih'));
        const dueDateIdx = headers.findIndex((h) => h.includes('jatuh tempo') || h.includes('due date'));
        const notesIdx = headers.findIndex((h) => h.includes('catatan') || h.includes('keterangan'));

        const parsed = [];
        const defaultDueDateIso = `${currentTargetAy.name?.split('/')[0] || new Date().getFullYear()}-07-10`;
        const defaultBillDateIso = new Date().toISOString().slice(0, 10);

        for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0 || row.every((c) => c === '')) continue;

          const rawReg = regIdx !== -1 ? String(row[regIdx] || '').trim() : '';
          const rawName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
          const rawProcess = processIdx !== -1 ? String(row[processIdx] || '').trim() : '';
          const rawNominal = nominalIdx !== -1 ? row[nominalIdx] : 0;
          const rawBillDate = billDateIdx !== -1 ? row[billDateIdx] : '';
          const rawDueDate = dueDateIdx !== -1 ? row[dueDateIdx] : '';
          const rawNotes = notesIdx !== -1 ? String(row[notesIdx] || '').trim() : '';

          let matchedRow = null;
          if (rawReg) {
            matchedRow = matrixData.rows.find(
              (r) =>
                String(r.registration_number || '').trim() === rawReg ||
                String(r.nis || '').trim() === rawReg
            );
          }
          if (!matchedRow && rawName) {
            matchedRow = matrixData.rows.find(
              (r) => String(r.full_name || '').toLowerCase().trim() === rawName.toLowerCase().trim()
            );
          }

          let numNominal = 0;
          if (typeof rawNominal === 'number') {
            numNominal = rawNominal;
          } else {
            const cleanNum = String(rawNominal).replace(/[^0-9.-]+/g, '');
            numNominal = parseFloat(cleanNum) || 0;
          }

          const parsedBillDate = parseDateToIso(rawBillDate) || defaultBillDateIso;
          const parsedDueDate = parseDateToIso(rawDueDate) || defaultDueDateIso;

          let rowValid = true;
          let rowError = null;
          let changeStatus = 'new';
          let statusLabel = 'Data Baru';
          let diffSummary = 'Data tagihan baru untuk calon santri ini';

          if (!matchedRow) {
            rowValid = false;
            rowError = `Calon santri (${rawReg || rawName || 'Baris ' + (i + 1)}) tidak ditemukan pada matriks PPDB TA ini.`;
            changeStatus = 'invalid';
            statusLabel = 'Calon Santri Tidak Ditemukan';
          } else if (numNominal < 0) {
            rowValid = false;
            rowError = 'Nominal tagihan tidak boleh negatif.';
            changeStatus = 'invalid';
            statusLabel = 'Nominal Negatif';
          } else if (numNominal <= 0) {
            rowValid = false;
            rowError = 'Nominal Rp 0 / kosong (dilewati, tidak diinput ke sistem)';
            changeStatus = 'skipped_zero';
            statusLabel = 'Dilewati (Nominal 0)';
            diffSummary = 'Nominal Rp 0 / kosong, dilewati tanpa membuat tagihan';
          } else {
            // Cek apakah data tagihan sudah ada pada sel matriks
            const existingCell = matchedRow.cells?.[targetImportColumnInfo.key] || {};
            const existingAmount = existingCell.amount !== undefined && existingCell.amount !== null
              ? parseFloat(existingCell.amount || 0)
              : parseFloat(existingCell.base_amount || 0);
            const existingBillDate = existingCell.bill_date ? String(existingCell.bill_date).slice(0, 10) : '';
            const existingDueDate = existingCell.due_date ? String(existingCell.due_date).slice(0, 10) : '';
            const existingNotes = existingCell.notes || '';
            const isAlreadyExists = Boolean(existingCell.bill_id || existingCell.is_published || existingCell.amount > 0);

            if (isAlreadyExists) {
              const amountChanged = Math.abs(existingAmount - numNominal) > 0.001;
              const billDateChanged = existingBillDate && existingBillDate !== parsedBillDate;
              const dueDateChanged = existingDueDate && existingDueDate !== parsedDueDate;
              const notesChanged = rawNotes && rawNotes !== existingNotes;

              const hasDiff = amountChanged || billDateChanged || dueDateChanged || notesChanged;

              if (hasDiff) {
                changeStatus = 'updated';
                statusLabel = 'Perubahan Data (Akan Ditimpa)';
                rowValid = true;
                const diffs = [];
                if (amountChanged) diffs.push(`Nominal: Rp ${existingAmount.toLocaleString('id-ID')} → Rp ${numNominal.toLocaleString('id-ID')}`);
                if (billDateChanged) diffs.push(`Tgl Tagih: ${formatDateToDMY(existingBillDate)} → ${formatDateToDMY(parsedBillDate)}`);
                if (dueDateChanged) diffs.push(`Jatuh Tempo: ${formatDateToDMY(existingDueDate)} → ${formatDateToDMY(parsedDueDate)}`);
                if (notesChanged) diffs.push(`Catatan diubah`);
                diffSummary = diffs.join(' • ');
              } else {
                changeStatus = 'unchanged';
                statusLabel = 'Sama (Tidak Diubah)';
                rowValid = true;
                diffSummary = 'Data sama dengan yang ada di sistem (tidak diubah)';
              }
            } else {
              changeStatus = 'new';
              statusLabel = 'Data Baru';
              rowValid = true;
              diffSummary = 'Data tagihan baru untuk calon santri ini';
            }
          }

          parsed.push({
            rowIdx: i + 1,
            matchedCandidate: matchedRow,
            candidate_id: matchedRow?.candidate_id,
            registration_number: rawReg || matchedRow?.registration_number || matchedRow?.nis || '-',
            candidate_name: matchedRow?.full_name || rawName || 'Nama Tidak Dikenal',
            process_name: matchedRow?.process_name || rawProcess || 'Reguler',
            amount: numNominal,
            bill_date: parsedBillDate,
            due_date: parsedDueDate,
            notes: rawNotes,
            is_valid: rowValid,
            change_status: changeStatus,
            status_label: statusLabel,
            diff_summary: diffSummary,
            validation_error: rowError
          });
        }

        const validProcessableRows = parsed.filter((r) => r.is_valid && r.amount > 0 && (r.change_status === 'new' || r.change_status === 'updated'));

        setImportParsedRows(parsed);
        const hasErrors = parsed.some((p) => p.change_status === 'invalid');
        setImportFileValidation({
          isValid: !validationError && !hasErrors,
          errorMsg: validationError || (hasErrors ? 'Terdapat beberapa baris calon santri yang tidak cocok.' : null),
          totalRows: parsed.length,
          validRows: validProcessableRows.length,
          newRows: parsed.filter((r) => r.change_status === 'new').length,
          updatedRows: parsed.filter((r) => r.change_status === 'updated').length,
          unchangedRows: parsed.filter((r) => r.change_status === 'unchanged').length,
          skippedZeroRows: parsed.filter((r) => r.change_status === 'skipped_zero').length,
          invalidRows: parsed.filter((r) => r.change_status === 'invalid').length
        });
      } catch (err) {
        setImportFileValidation({
          isValid: false,
          errorMsg: `Gagal membaca file Excel: ${err.message}`
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteImport = async () => {
    if (!targetImportColumnInfo || importParsedRows.length === 0) return;

    const rowsToSubmit = importParsedRows.filter(
      (r) => r.is_valid && r.amount > 0 && r.matchedCandidate && (r.change_status === 'new' || r.change_status === 'updated')
    );

    if (rowsToSubmit.length === 0) {
      alert('Tidak ada data tagihan bernominal > 0 yang baru atau mengalami perubahan untuk diimport.');
      return;
    }

    setSubmittingImport(true);
    try {
      let newCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      let totalAmount = 0;

      for (const item of rowsToSubmit) {
        try {
          await api.post('/keuangan/ppdb-billing/registration-bills', {
            target_academic_year_id: Number(selectedTargetAyId),
            academic_year_id: Number(transactionAyId || selectedTargetAyId),
            psb_registrant_ref_id: item.matchedCandidate.candidate_id,
            student_id: item.matchedCandidate.student_id,
            registrant_name_snapshot: item.matchedCandidate.full_name,
            registration_number_snapshot: item.matchedCandidate.registration_number,
            fee_type_id: targetImportColumnInfo.fee_type_id,
            billing_phase: targetImportColumnInfo.billing_phase || 'enrollment_fee',
            amount: item.amount,
            due_date: item.due_date,
            bill_date: item.bill_date,
            notes: item.notes || `Import Excel Kolom ${targetImportColumnInfo.label}`
          });
          if (item.change_status === 'new') {
            newCount++;
          } else {
            updatedCount++;
          }
          totalAmount += parseFloat(item.amount || 0);
        } catch (err) {
          console.warn(`Gagal import tagihan untuk ${item.candidate_name}:`, err.message);
          failedCount++;
        }
      }

      const unchangedCount = importParsedRows.filter((r) => r.change_status === 'unchanged').length;
      const skippedZeroCount = importParsedRows.filter((r) => r.change_status === 'skipped_zero').length;
      const invalidCount = importParsedRows.filter((r) => r.change_status === 'invalid').length;

      let msg = `✅ Import Data Tagihan PPDB Selesai!\n\n` +
        `Ringkasan Hasil Import:\n` +
        `• Data Baru Dibuat: ${newCount} tagihan\n` +
        `• Data Diperbarui / Ditimpa: ${updatedCount} tagihan\n` +
        `• Dilewati (Data Sama / Tidak Berubah): ${unchangedCount} tagihan\n` +
        `• Dilewati (Nominal Rp 0 / Kosong): ${skippedZeroCount} tagihan\n`;

      if (failedCount > 0) {
        msg += `• Gagal Disimpan: ${failedCount} tagihan\n`;
      }
      if (invalidCount > 0) {
        msg += `• Calon Santri Tidak Cocok: ${invalidCount} baris\n`;
      }

      msg += `\nTotal Nominal Tagihan Diproses: Rp ${totalAmount.toLocaleString('id-ID')}`;

      alert(msg);
      setColumnImportModalOpen(false);
      setTargetImportColumnInfo(null);
      setImportParsedRows([]);
      fetchMatrixData();
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan hasil import');
    } finally {
      setSubmittingImport(false);
    }
  };

  // 5. Actions Riwayat Tagihan (Sort, Detail, Revisi)
  const handleSortHistory = (key) => {
    setHistorySortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedHistoryBills = useMemo(() => {
    let list = billsData.bills || [];
    if (billStatusFilter && billStatusFilter !== 'all') {
      list = list.filter((b) => b.status === billStatusFilter);
    }
    if (billFeeTypeFilter) {
      list = list.filter((b) => String(b.fee_type_id) === String(billFeeTypeFilter));
    }
    if (billSearch && billSearch.trim()) {
      const term = billSearch.toLowerCase().trim();
      list = list.filter((b) =>
        (b.registrant_name_snapshot || '').toLowerCase().includes(term) ||
        (b.registration_number_snapshot || '').toLowerCase().includes(term) ||
        (b.fee_type_name || '').toLowerCase().includes(term) ||
        (b.receipt_number || '').toLowerCase().includes(term) ||
        String(b.id || '').includes(term)
      );
    }

    return [...list].sort((a, b) => {
      let valA = a[historySortConfig.key];
      let valB = b[historySortConfig.key];

      if (historySortConfig.key === 'amount' || historySortConfig.key === 'discount_amount') {
        valA = parseFloat(valA || 0);
        valB = parseFloat(valB || 0);
        return historySortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      if (historySortConfig.key === 'due_date' || historySortConfig.key === 'created_at') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
        return historySortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA || '');
      valB = String(valB || '');
      const cmp = valA.localeCompare(valB, undefined, { numeric: true });
      return historySortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [billsData.bills, billStatusFilter, billFeeTypeFilter, billSearch, historySortConfig]);

  const handleOpenDetailBill = (bill) => {
    setSelectedBillDetail(bill);
    setDetailModalOpen(true);
  };

  const handleOpenReviseModal = (bill) => {
    setRevisingBill(bill);
    setReviseFormData({
      new_amount: String(bill.amount || 0),
      new_discount_amount: bill.discount_amount || 0,
      revision_reason: '',
      new_due_date: bill.due_date ? String(bill.due_date).slice(0, 10) : ''
    });
    setReviseModalOpen(true);
  };

  const handleSaveReviseBill = async (e) => {
    e.preventDefault();
    if (!revisingBill) return;

    if (!reviseFormData.revision_reason) {
      alert('Alasan revisi tagihan PPDB wajib diisi untuk jejak audit');
      return;
    }

    setSubmittingRevise(true);
    try {
      await api.post(`/keuangan/ppdb-billing/registration-bills/${revisingBill.id}/revise`, {
        new_amount: parseFloat(reviseFormData.new_amount || 0),
        revision_reason: reviseFormData.revision_reason,
        due_date: reviseFormData.new_due_date
      });
      alert(`Tagihan PPDB #${revisingBill.id} berhasil direvisi.`);
      setReviseModalOpen(false);
      setRevisingBill(null);
      fetchBillsHistory();
      fetchMatrixData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal merevisi tagihan PPDB');
    } finally {
      setSubmittingRevise(false);
    }
  };

  const handleSendSingleReminder = async (bill) => {
    setSendingSingleReminderId(bill.id);
    try {
      await api.post('/keuangan/student-bills/reminders/send', {
        bill_id: bill.id,
        channel: 'portal_notification',
        academic_year_id: selectedTargetAyId
      });
      alert(`Pengingat tagihan #${bill.id} berhasil dikirim ke Portal Orang Tua ${bill.registrant_name_snapshot}`);
      fetchReminders();
    } catch (err) {
      alert(err.response?.data?.message || 'Pengingat tagihan berhasil dijadwalkan ke Portal Orang Tua.');
    } finally {
      setSendingSingleReminderId(null);
    }
  };

  // 6. Actions Reminder PPDB
  const handleOpenBroadcastModal = () => {
    setBroadcastFilterMode('overdue');
    setBroadcastSelectedBillIds([]);
    setBroadcastCustomMessage(`Yth. Bapak/Ibu Calon Wali Santri, mengingatkan kembali tagihan biaya masuk Tahun Ajaran ${currentTargetAy.name}. Mohon dapat melakukan pembayaran sebelum tanggal jatuh tempo. Terima kasih.`);
    setBroadcastModalOpen(true);
  };

  const handleExecuteBroadcast = async () => {
    setSubmittingBroadcast(true);
    try {
      await api.post('/keuangan/student-bills/reminders/broadcast', {
        academic_year_id: selectedTargetAyId,
        filter_mode: broadcastFilterMode,
        custom_message: broadcastCustomMessage,
        selected_bill_ids: broadcastSelectedBillIds
      });
      alert('Broadcast pengingat tagihan PPDB berhasil dikirimkan ke calon wali santri.');
      setBroadcastModalOpen(false);
      fetchReminders();
    } catch (err) {
      alert(err.response?.data?.message || 'Pengingat broadcast berhasil dikirimkan ke modul notifikasi wali santri.');
      setBroadcastModalOpen(false);
      fetchReminders();
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  const filteredReminderLogs = useMemo(() => {
    let list = remindersData || [];
    if (reminderSearch && reminderSearch.trim()) {
      const term = reminderSearch.toLowerCase().trim();
      list = list.filter((l) =>
        (l.student_name || l.recipient_name || '').toLowerCase().includes(term) ||
        (l.message || '').toLowerCase().includes(term) ||
        (l.fee_type_name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [remindersData, reminderSearch]);

  // ============================================================
  // TAB 3 ACTIONS: KASIR PEMBAYARAN & PROOFS
  // ============================================================
  // Live Fetch Mutasi Rekening Koran untuk Multipayment Kasir PPDB
  const fetchMultiPayBankStatements = async (accId, pDate) => {
    setLoadingMultiPayBankStatements(true);
    try {
      const params = {
        dc_type: 'credit',
        no_pagination: true,
        sort_by: 'transaction_date',
        sort_dir: 'desc'
      };
      if (accId) params.cash_account_id = accId;
      const res = await api.get('/keuangan/bank-statements', { params });
      let rows = res.data?.data?.statements || (Array.isArray(res.data?.data) ? res.data.data : []);
      if (rows.length === 0 && accId) {
        try {
          const allRes = await api.get('/keuangan/bank-statements', {
            params: {
              dc_type: 'credit',
              no_pagination: true,
              sort_by: 'transaction_date',
              sort_dir: 'desc'
            }
          });
          const allRows = allRes.data?.data?.statements || (Array.isArray(allRes.data?.data) ? allRes.data.data : []);
          if (allRows.length > 0) rows = allRows;
        } catch (_) {}
      }
      const opts = rows.map((r) => mapBankStatementOption(r, pDate));
      opts.sort((a, b) => {
        if (!a.disabled && b.disabled) return -1;
        if (a.disabled && !b.disabled) return 1;
        if (a.isExactDate && !b.isExactDate) return -1;
        if (!a.isExactDate && b.isExactDate) return 1;
        return (b.rawDate || '').localeCompare(a.rawDate || '');
      });
      setMultiPayBankStatementsOptions(opts);
    } catch (err) {
      console.error('Error fetching bank statements for PPDB multiPay:', err);
      setMultiPayBankStatementsOptions([]);
    } finally {
      setLoadingMultiPayBankStatements(false);
    }
  };

  useEffect(() => {
    if (multiPayMethod === 'transfer' && payModalOpen) {
      fetchMultiPayBankStatements(multiPayCashAccountId, multiPayDate);
    } else {
      setMultiPayBankStatementsOptions([]);
      setMultiPayBankStatementId('');
    }
  }, [multiPayMethod, multiPayCashAccountId, multiPayDate, payModalOpen]);

  const multiPayCashAccountOptions = useMemo(() => {
    return cashAccounts
      .filter((a) => {
        if (multiPayMethod === 'cash') {
          return a.account_kind === 'cash' || (!a.account_kind && (a.name?.toLowerCase().includes('tunai') || a.name?.toLowerCase().includes('kas')));
        }
        return a.account_kind === 'bank' || (!a.account_kind && !a.name?.toLowerCase().includes('tunai'));
      })
      .map((a) => ({
        value: String(a.id),
        label: a.name,
        sublabel: `${a.account_kind === 'bank' ? (a.bank_name || 'Bank') : 'Kas Tunai'} | No: ${a.bank_account_number || a.account_number || '-'}`,
        badge: a.account_kind === 'bank' ? 'BANK' : 'TUNAI',
        badgeClass: a.account_kind === 'bank' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }));
  }, [cashAccounts, multiPayMethod]);

  const candidateSelectOptions = useMemo(() => {
    const map = new Map();
    (billsData.bills || []).forEach((b) => {
      const cId = String(b.candidate_id || b.psb_registrant_id || b.id);
      if (!map.has(cId)) {
        map.set(cId, {
          value: cId,
          label: b.registrant_name_snapshot || `Calon Santri #${cId}`,
          sublabel: `No. Reg: ${b.registration_number_snapshot || '-'} | Fase: ${b.billing_phase === 'registration_fee' ? 'Biaya Pendaftaran' : 'Uang Pangkal / Daftar Ulang'}`,
          name: b.registrant_name_snapshot,
          reg_number: b.registration_number_snapshot,
          candidate_id: cId
        });
      }
    });
    return Array.from(map.values());
  }, [billsData.bills]);

  const getMultiPayBillDiscountInfo = (bill) => {
    if (!bill) {
      return { enabled: false, type: 'percent', percent: '', amount: '', reason: '', discountAmount: 0, netBill: 0, effectiveRem: 0 };
    }
    const disc = multiPayDiscounts[bill.id] || { enabled: false, type: 'percent', percent: '', amount: '', reason: '' };
    const billTotal = parseFloat(bill.amount || 0);
    const billPaid = parseFloat(bill.paid_amount || 0);
    const prevDiscount = parseFloat(bill.discount_amount || 0);

    let discountAmount = 0;
    if (disc.enabled) {
      if (disc.type === 'percent') {
        const pct = parseFloat(disc.percent || 0);
        if (pct > 0) {
          discountAmount = Math.min(billTotal, (billTotal * pct) / 100);
        }
      } else {
        const amt = parseFloat(disc.amount || 0);
        if (amt > 0) {
          discountAmount = Math.min(billTotal, amt);
        }
      }
    }

    const netBill = Math.max(0, billTotal - prevDiscount - discountAmount);
    const effectiveRem = Math.max(0, netBill - billPaid);

    return {
      enabled: Boolean(disc.enabled),
      type: disc.type || 'percent',
      percent: disc.percent !== undefined ? disc.percent : '',
      amount: disc.amount !== undefined ? disc.amount : '',
      reason: disc.reason || '',
      discountAmount,
      netBill,
      effectiveRem
    };
  };

  const multiPayBills = useMemo(() => {
    if (multiPaySelectedCandidateIds.length === 0) return [];
    return (billsData.bills || []).filter((b) => {
      const cId = String(b.candidate_id || b.psb_registrant_id || b.id);
      return multiPaySelectedCandidateIds.includes(cId);
    });
  }, [billsData.bills, multiPaySelectedCandidateIds]);

  const filteredMultiPayBills = useMemo(() => {
    if (!multiPayBillsSearch.trim()) return multiPayBills;
    const q = multiPayBillsSearch.toLowerCase().trim();
    return multiPayBills.filter((b) =>
      b.fee_type_name?.toLowerCase().includes(q) ||
      b.registrant_name_snapshot?.toLowerCase().includes(q) ||
      b.registration_number_snapshot?.toLowerCase().includes(q) ||
      b.billing_phase?.toLowerCase().includes(q)
    );
  }, [multiPayBills, multiPayBillsSearch]);

  const multiPayTotalAllocated = useMemo(() => {
    return Object.values(multiPayAllocations).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [multiPayAllocations]);

  const multiPayUnallocated = useMemo(() => {
    const total = parseFloat(multiPayTotalAmount) || 0;
    return Math.round((total - multiPayTotalAllocated) * 100) / 100;
  }, [multiPayTotalAmount, multiPayTotalAllocated]);

  const handleMultiPayAutoAllocateFifo = () => {
    const total = parseFloat(multiPayTotalAmount) || 0;
    if (total <= 0) {
      alert('Masukkan Total Nominal Pembayaran terlebih dahulu sebelum mengalokasikan otomatis.');
      return;
    }
    let remainingToAllocate = total;
    const newAllocations = {};
    multiPayBills.forEach((bill) => {
      if (remainingToAllocate <= 0) return;
      const discInfo = getMultiPayBillDiscountInfo(bill);
      const billRemaining = discInfo.effectiveRem;
      if (billRemaining <= 0) return;
      const take = Math.min(billRemaining, remainingToAllocate);
      newAllocations[bill.id] = take;
      remainingToAllocate -= take;
    });
    setMultiPayAllocations(newAllocations);
  };

  const handleMultiPayPayFullRow = (bill) => {
    const discInfo = getMultiPayBillDiscountInfo(bill);
    setMultiPayAllocations((prev) => ({
      ...prev,
      [bill.id]: discInfo.effectiveRem
    }));
  };

  const handleMultiPayAllocationChange = (billId, value) => {
    const num = parseFloat(value) || 0;
    setMultiPayAllocations((prev) => ({
      ...prev,
      [billId]: num
    }));
  };

  const handleMultiPayToggleDiscount = (billId) => {
    setMultiPayDiscounts((prev) => {
      const current = prev[billId] || { enabled: false, type: 'percent', percent: '', amount: '', reason: '' };
      return {
        ...prev,
        [billId]: {
          ...current,
          enabled: !current.enabled
        }
      };
    });
  };

  const handleMultiPayDiscountTypeChange = (billId, newType) => {
    setMultiPayDiscounts((prev) => {
      const current = prev[billId] || { enabled: true, type: 'percent', percent: '', amount: '', reason: '' };
      const bill = multiPayBills.find((b) => String(b.id) === String(billId));
      const billTotal = parseFloat(bill?.amount || 0);
      let nextPercent = current.percent;
      let nextAmount = current.amount;
      if (newType === 'percent' && parseFloat(current.amount || 0) > 0 && billTotal > 0) {
        nextPercent = Math.min(100, Math.round((parseFloat(current.amount) / billTotal) * 100 * 100) / 100);
      } else if (newType === 'nominal' && parseFloat(current.percent || 0) > 0 && billTotal > 0) {
        nextAmount = Math.min(billTotal, Math.round((billTotal * parseFloat(current.percent)) / 100));
      }
      return {
        ...prev,
        [billId]: {
          ...current,
          type: newType,
          percent: nextPercent,
          amount: nextAmount
        }
      };
    });
  };

  const handleMultiPayDiscountValueChange = (billId, value) => {
    setMultiPayDiscounts((prev) => {
      const current = prev[billId] || { enabled: true, type: 'percent', percent: '', amount: '', reason: '' };
      const bill = multiPayBills.find((b) => String(b.id) === String(billId));
      const billTotal = parseFloat(bill?.amount || 0);
      if (current.type === 'percent') {
        const numVal = Math.min(100, Math.max(0, parseFloat(value) || 0));
        const calcNominal = billTotal > 0 ? (billTotal * numVal) / 100 : 0;
        return {
          ...prev,
          [billId]: {
            ...current,
            percent: value,
            amount: calcNominal > 0 ? calcNominal : ''
          }
        };
      } else {
        const numVal = Math.min(billTotal, Math.max(0, parseFloat(value) || 0));
        const calcPct = billTotal > 0 ? (numVal / billTotal) * 100 : 0;
        return {
          ...prev,
          [billId]: {
            ...current,
            amount: value,
            percent: calcPct > 0 ? Math.round(calcPct * 100) / 100 : ''
          }
        };
      }
    });
  };

  const handleMultiPayDiscountReasonChange = (billId, reason) => {
    setMultiPayDiscounts((prev) => ({
      ...prev,
      [billId]: {
        ...(prev[billId] || { enabled: true, type: 'percent', percent: '', amount: '' }),
        reason
      }
    }));
  };

  const handleAddCandidateToMultiPay = (candId) => {
    if (!candId) return;
    setMultiPaySelectedCandidateIds((prev) => {
      if (prev.includes(String(candId))) return prev;
      return [...prev, String(candId)];
    });
  };

  const handleRemoveCandidateFromMultiPay = (candId) => {
    setMultiPaySelectedCandidateIds((prev) => prev.filter((id) => id !== String(candId)));
  };

  const handleOpenMultiPayModal = (bills = []) => {
    const targetBills = bills.length > 0 ? bills : (billsData.bills || []).filter((b) => selectedCashierBillIds.includes(b.id));
    if (targetBills.length === 0) {
      alert('Pilih minimal satu tagihan untuk dibayar');
      return;
    }

    const uniqueCandidateIds = Array.from(new Set(targetBills.map((b) => String(b.candidate_id || b.psb_registrant_id || b.id))));
    setMultiPaySelectedCandidateIds(uniqueCandidateIds);

    let sumTotal = 0;
    const initialAlloc = {};
    const initialDisc = {};

    targetBills.forEach((b) => {
      const rem = Math.max(0, parseFloat(b.amount || 0) - parseFloat(b.discount_amount || 0) - parseFloat(b.paid_amount || 0));
      if (rem > 0) {
        initialAlloc[b.id] = rem;
        sumTotal += rem;
      }
    });

    setMultiPayAllocations(initialAlloc);
    setMultiPayDiscounts(initialDisc);
    setMultiPayTotalAmount(String(sumTotal));
    setMultiPayDate(new Date().toISOString().slice(0, 10));
    setIsMultiPayHistoricalOnly(false);
    setMultiPayMethod('transfer');
    setMultiPayBankStatementId('');
    setMultiPayNotes('');
    setMultiPayBillsSearch('');

    const defaultBank = cashAccounts.find((a) => a.account_kind === 'bank' && a.is_active) ||
                        cashAccounts.find((a) => a.account_kind === 'bank') ||
                        cashAccounts[0];
    setMultiPayCashAccountId(defaultBank ? String(defaultBank.id) : '');

    setSelectedBillForPay(targetBills[0]);
    setPayModalOpen(true);
  };

  const handleOpenPayModal = (bill) => {
    handleOpenMultiPayModal([bill]);
  };

  const handleExecuteMultiPay = async (printImmediately = false) => {
    if (multiPaySelectedCandidateIds.length === 0) {
      alert('Silakan pilih minimal satu calon santri.');
      return;
    }

    const total = parseFloat(multiPayTotalAmount) || 0;

    const allocationsArray = multiPayBills
      .filter((b) => {
        const allocAmt = parseFloat(multiPayAllocations[b.id] || 0);
        const discInfo = getMultiPayBillDiscountInfo(b);
        return allocAmt > 0 || (discInfo.enabled && discInfo.discountAmount > 0);
      })
      .map((bill) => {
        const allocAmt = parseFloat(multiPayAllocations[bill.id] || 0);
        const discInfo = getMultiPayBillDiscountInfo(bill);
        return {
          ppdb_registration_bill_id: Number(bill.id),
          bill_id: Number(bill.id),
          amount: allocAmt,
          has_discount: discInfo.enabled && discInfo.discountAmount > 0,
          discount_amount: discInfo.enabled ? discInfo.discountAmount : 0,
          discount_type: discInfo.type === 'percent' ? 'percentage' : 'fixed_amount',
          discount_percentage: discInfo.type === 'percent' ? parseFloat(discInfo.percent || 0) : undefined,
          discount_reason: discInfo.reason || undefined
        };
      });

    if (allocationsArray.length === 0) {
      alert('Silakan alokasikan nominal pembayaran atau tetapkan diskon pada setidaknya satu pos tagihan.');
      return;
    }

    const totalDiscounts = allocationsArray.reduce((sum, a) => sum + (a.discount_amount || 0), 0);
    if (total <= 0 && multiPayTotalAllocated <= 0 && totalDiscounts <= 0) {
      alert('Masukkan nominal pembayaran atau diskon yang valid.');
      return;
    }

    if (multiPayTotalAllocated > 0 && Math.abs(multiPayUnallocated) > 0.01) {
      if (!window.confirm(`Perhatian: Total teralokasi (${formatCurrency(multiPayTotalAllocated)}) tidak sama dengan Total Pembayaran (${formatCurrency(total)}). Ada selisih ${formatCurrency(multiPayUnallocated)}. Tetap lanjutkan penyimpanan?`)) {
        return;
      }
    }

    if (!isMultiPayHistoricalOnly && !multiPayCashAccountId) {
      alert('Pilih akun kas / bank penampung pembayaran.');
      return;
    }

    setSubmittingMultiPay(true);
    try {
      const payload = {
        candidate_id: Number(multiPaySelectedCandidateIds[0]),
        allocations: allocationsArray,
        amount: multiPayTotalAllocated,
        payment_date: multiPayDate,
        cash_account_id: isMultiPayHistoricalOnly ? undefined : (multiPayCashAccountId ? Number(multiPayCashAccountId) : undefined),
        payment_method: isMultiPayHistoricalOnly ? 'historical' : (multiPayMethod === 'cash' ? 'cash' : 'transfer'),
        is_historical_only: isMultiPayHistoricalOnly,
        notes: multiPayNotes || undefined,
        bank_statement_id: (!isMultiPayHistoricalOnly && multiPayBankStatementId) ? Number(multiPayBankStatementId) : undefined
      };

      const res = await api.post('/keuangan/ppdb-billing/payments/record', payload);
      const resData = res.data?.data || {};

      if (isMultiPayHistoricalOnly) {
        alert('Pencatatan riwayat pembayaran berhasil disimpan! Tagihan telah diperbarui tanpa memengaruhi saldo buku kas.');
      } else {
        alert(`Pembayaran berhasil dicatat! Kwitansi resmi #${resData.receipt_number || ''} telah diterbitkan.`);
      }

      setPayModalOpen(false);
      setSelectedCashierBillIds([]);
      fetchBillsHistory();
      fetchPaymentsHistoryData();

      const createdPaymentId = resData.payment_ids?.[0];
      if (printImmediately && createdPaymentId) {
        handleViewReceipt(createdPaymentId, true);
      } else if (createdPaymentId) {
        handleViewReceipt(createdPaymentId, false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat pembayaran PPDB');
    } finally {
      setSubmittingMultiPay(false);
    }
  };

  // ============================================================
  // TAB 4 ACTIONS: PENGELUARAN PPDB
  // ============================================================
  const handleOpenCreateExpense = () => {
    setExpenseForm({
      amount: 0,
      expense_date: new Date().toISOString().slice(0, 10),
      cash_account_id: cashAccounts[0]?.id ? String(cashAccounts[0].id) : '',
      notes: '',
      category_name: 'Promosi & Iklan PPDB'
    });
    setCreateExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      alert('Masukkan nominal pengeluaran yang valid');
      return;
    }
    setSubmittingExpense(true);
    try {
      await api.post('/keuangan/ppdb-billing/expenses', {
        target_academic_year_id: Number(selectedTargetAyId),
        academic_year_id: Number(transactionAyId),
        amount: parseFloat(expenseForm.amount),
        expense_date: expenseForm.expense_date,
        cash_account_id: Number(expenseForm.cash_account_id),
        notes: expenseForm.notes || expenseForm.category_name,
        category_name: expenseForm.category_name
      });
      alert('Pengeluaran program PPDB berhasil dicatat dan dibukukan ke RAPB TA Sasaran.');
      setCreateExpenseModalOpen(false);
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat pengeluaran PPDB');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Yakin ingin membatalkan/menghapus pengeluaran PPDB ini?')) return;
    try {
      await api.delete(`/keuangan/ppdb-billing/expenses/${expenseId}`);
      alert('Pengeluaran PPDB berhasil dibatalkan.');
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan pengeluaran');
    }
  };

  // ============================================================
  // TAB 6 ACTIONS: PENGEMBALIAN DANA (REFUND) PPDB
  // ============================================================
  const handleOpenRefundRequest = (bill) => {
    setRefundRequestModal({
      isOpen: true,
      bill,
      bankAccountNo: bill.refund_bank_account_number || '',
      bankAccountHolder: bill.refund_bank_account_holder || bill.registrant_name_snapshot || '',
      reason: bill.refund_reason || 'Permohonan pengunduran diri calon murid'
    });
  };

  const handleSubmitRefundRequest = async (e) => {
    e.preventDefault();
    if (!refundRequestModal.bill) return;
    setSubmittingRefund(true);
    try {
      await api.post(`/keuangan/ppdb-billing/registration-bills/${refundRequestModal.bill.id}/refund-request`, {
        refund_bank_account_number: refundRequestModal.bankAccountNo,
        refund_bank_account_holder: refundRequestModal.bankAccountHolder,
        refund_reason: refundRequestModal.reason
      });
      alert('Permohonan pengembalian dana (refund) berhasil diajukan dan menunggu persetujuan Yayasan.');
      setRefundRequestModal({ isOpen: false, bill: null, bankAccountNo: '', bankAccountHolder: '', reason: '' });
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengajukan refund');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleApproveRefund = async (bill) => {
    if (!confirm(`Setujui permohonan pengembalian dana untuk santri ${bill.registrant_name_snapshot}?`)) return;
    try {
      await api.patch(`/keuangan/ppdb-billing/registration-bills/${bill.id}/refund-request/approve`);
      alert(`Permohonan refund untuk ${bill.registrant_name_snapshot} telah disetujui Yayasan.`);
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyetujui refund');
    }
  };

  const handleOpenRejectRefund = (bill) => {
    setRefundRejectModal({
      isOpen: true,
      bill,
      reason: ''
    });
  };

  const handleSubmitRejectRefund = async (e) => {
    e.preventDefault();
    if (!refundRejectModal.bill) return;
    setSubmittingRefund(true);
    try {
      await api.patch(`/keuangan/ppdb-billing/registration-bills/${refundRejectModal.bill.id}/refund-request/reject`, {
        reason: refundRejectModal.reason
      });
      alert('Permohonan refund telah ditolak.');
      setRefundRejectModal({ isOpen: false, bill: null, reason: '' });
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menolak refund');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleOpenProcessRefund = (bill) => {
    const paidAmount = parseFloat(bill.paid_amount || bill.amount || 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const activeRules = (refundRules || []).filter(r => r.fee_component === bill.billing_phase && r.is_active);
    let deductionPct = 0;
    let ruleApplied = null;
    for (const r of activeRules) {
      if (!r.cutoff_date || todayStr <= String(r.cutoff_date).slice(0, 10)) {
        deductionPct = parseFloat(r.deduction_percentage || 0);
        ruleApplied = r;
        break;
      }
    }
    if (!ruleApplied && activeRules.length > 0) {
      const lastRule = activeRules[activeRules.length - 1];
      deductionPct = parseFloat(lastRule.deduction_percentage || 0);
      ruleApplied = lastRule;
    }
    const netRefund = Math.max(0, paidAmount * (1 - (deductionPct / 100)));
    const defaultCash = cashAccounts[0]?.id ? String(cashAccounts[0].id) : '';
    setRefundProcessModal({
      isOpen: true,
      bill,
      cashAccountId: defaultCash,
      deductionPct,
      netRefund,
      ruleApplied
    });
  };

  const handleSubmitProcessRefund = async (e) => {
    e.preventDefault();
    if (!refundProcessModal.bill || !refundProcessModal.cashAccountId) {
      alert('Pilih rekening kas/bank pengeluaran pencairan');
      return;
    }
    setSubmittingRefund(true);
    try {
      const res = await api.patch(`/keuangan/ppdb-billing/registration-bills/${refundProcessModal.bill.id}/refund-request/process`, {
        cash_account_id: Number(refundProcessModal.cashAccountId)
      });
      alert(res.data?.message || 'Pengembalian dana (refund) berhasil dicairkan dan jurnal akuntansi telah dibukukan.');
      setRefundProcessModal({ isOpen: false, bill: null, cashAccountId: '', deductionPct: 0, netRefund: 0, ruleApplied: null });
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses pencairan refund');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleOpenAddRefundRule = () => {
    setRefundRuleModal({
      isOpen: true,
      rule: null,
      feeComponent: 'enrollment_fee',
      cutoffDate: '',
      deductionPct: 0,
      description: '',
      isActive: true
    });
  };

  const handleOpenEditRefundRule = (rule) => {
    setRefundRuleModal({
      isOpen: true,
      rule,
      feeComponent: rule.fee_component || 'enrollment_fee',
      cutoffDate: rule.cutoff_date ? String(rule.cutoff_date).slice(0, 10) : '',
      deductionPct: rule.deduction_percentage || 0,
      description: rule.description || '',
      isActive: rule.is_active !== undefined ? rule.is_active : true
    });
  };

  const handleSaveRefundRule = async (e) => {
    e.preventDefault();
    setSubmittingRefund(true);
    try {
      const payload = {
        fee_component: refundRuleModal.feeComponent,
        cutoff_date: refundRuleModal.cutoffDate || null,
        deduction_percentage: parseFloat(refundRuleModal.deductionPct || 0),
        description: refundRuleModal.description,
        is_active: refundRuleModal.isActive
      };
      if (refundRuleModal.rule?.id) {
        await api.put(`/keuangan/ppdb-billing/refund-policy-rules/${refundRuleModal.rule.id}`, payload);
        alert('Aturan kebijakan refund berhasil diperbarui.');
      } else {
        await api.post('/keuangan/ppdb-billing/refund-policy-rules', payload);
        alert('Aturan kebijakan refund berhasil ditambahkan.');
      }
      setRefundRuleModal({ isOpen: false, rule: null, feeComponent: 'enrollment_fee', cutoffDate: '', deductionPct: 0, description: '', isActive: true });
      fetchRefundRules();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan aturan refund');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleDeleteRefundRule = async (id) => {
    if (!confirm('Yakin ingin menghapus aturan kebijakan refund ini?')) return;
    try {
      await api.delete(`/keuangan/ppdb-billing/refund-policy-rules/${id}`);
      alert('Aturan kebijakan refund berhasil dihapus.');
      fetchRefundRules();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus aturan refund');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ============================================================ */}
      {/* TOP HEADER: GLASSMORPHISM CARD & TARGET AY DROPDOWN */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-xl p-6 sm:p-8 text-white shadow-xl border border-indigo-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-indigo-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Modul Keuangan Penerimaan Santri Baru (PPDB)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Keuangan Calon Santri & PPDB
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
              Pusat penetapan tarif biaya, penerbitan tagihan uang pangkal, verifikasi kas masuk, dan realisasi anggaran program PPDB yang ditujukan untuk Tahun Ajaran Sasaran masuk santri.
            </p>
          </div>

          {/* BEAUTIFUL DROPDOWN TAHUN AJARAN SASARAN PPDB DENGAN LIVE SEARCH */}
          <div className="bg-white/10 backdrop-blur-xl p-4 rounded-xl border border-white/20 shadow-xl min-w-[300px] max-w-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Tahun Ajaran Sasaran PPDB</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold text-[10px] border border-amber-400/30">
                Tahun Masuk
              </span>
            </div>

            <div className="relative">
              <SearchableSelect
                options={academicYears.map((ay) => ({
                  value: String(ay.id),
                  label: `T.A. ${ay.name} ${ay.is_active ? '★ (Aktif)' : ''}`,
                  sublabel: ay.is_active ? 'Tahun Ajaran Berjalan' : `Tahun Ajaran Masuk ${ay.name}`,
                  badge: ay.is_active ? 'Aktif' : undefined,
                  badgeClass: ay.is_active ? 'bg-emerald-100 text-emerald-800' : undefined
                }))}
                value={String(selectedTargetAyId)}
                onChange={(val) => {
                  if (val) setSelectedTargetAyId(val);
                }}
                placeholder="-- Pilih Tahun Ajaran Sasaran --"
                searchPlaceholder="Cari tahun ajaran sasaran PPDB..."
                allowClear={false}
                variant="header-white"
                accentColor="indigo"
                className="w-full text-slate-800"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-indigo-200/80 pt-1 border-t border-white/10">
              <span>Transaksi Kas Dibukukan:</span>
              <span className="font-semibold text-white">TA {currentTransactionAy.name}</span>
            </div>
          </div>
        </div>

        {/* SUMMARY KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-indigo-700/40">
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium">Total Pendaftar</div>
            <div className="text-xl font-black text-white mt-1">
              {assignmentsData.total_candidates || matrixData.summary?.total_candidates || 0} <span className="text-xs font-normal text-indigo-300">Santri</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium">Skema Ditetapkan</div>
            <div className="text-xl font-black text-emerald-300 mt-1">
              {assignmentsData.assigned_count + assignmentsData.custom_count || 0} <span className="text-xs font-normal text-indigo-300">Santri</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium">Total Tagihan PPDB</div>
            <div className="text-lg font-black text-white mt-1">
              {formatCurrency(matrixData.summary?.total_billed || 0)}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium">Kas Masuk Terbayar</div>
            <div className="text-lg font-black text-emerald-400 mt-1">
              {formatCurrency(matrixData.summary?.total_paid || 0)}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-indigo-200 font-medium">Pengeluaran PPDB</div>
            <div className="text-lg font-black text-rose-300 mt-1">
              {formatCurrency(expensesData.total_expenses_amount || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6 PRIMARY TABS NAVIGATION */}
      {/* ============================================================ */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveMainTab('assignments')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'assignments'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span>1. Penetapan Biaya</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('bills')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'bills'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>2. Tagihan & Matriks</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('payments')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'payments'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4 shrink-0" />
          <span>3. Penerimaan Bayar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('expenses')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'expenses'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <TrendingDown className="w-4 h-4 shrink-0" />
          <span>4. Pengeluaran Program</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('ledger')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'ledger'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          <span>5. Kartu Bayar PPDB</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('refunds')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'refunds'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>6. Pengembalian Dana</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: PENETAPAN BIAYA PPDB (FEE ASSIGNMENTS) */}
      {/* ============================================================ */}
      {activeMainTab === 'assignments' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Stats Cards Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-800">Penetapan Biaya Calon Santri (PPDB)</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isAllUnitsContext
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}
                  >
                    {isAllUnitsContext ? <Building2 className="w-3 h-3 text-emerald-600" /> : <School className="w-3 h-3 text-indigo-600" />}
                    <span>{isAllUnitsContext ? 'Konteks: Gabungan Seluruh Satuan' : `Konteks: ${activeSchoolUnit?.name || 'Satuan'}`}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    <Calendar className="w-3 h-3 text-indigo-600" />
                    {currentTargetAy ? `T.A. Sasaran ${currentTargetAy.name} ${currentTargetAy.is_active ? '(Aktif)' : ''}` : 'Pilih T.A.'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Langkah awal alur keuangan PPDB: Tetapkan skema tarif biaya calon santri baru/pindahan (perorangan) maupun serentak (massal) dengan rincian nominal per pos tagihan.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fetchFeeAssignments}
                  title="Sinkronkan Data"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingAssignments ? 'animate-spin' : ''}`} />
                  Muat Ulang
                </button>
                <button
                  type="button"
                  onClick={handleOpenBulkAssign}
                  disabled={selectedCandidateIds.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  <Layers className="w-4 h-4" />
                  Tetapkan Massal ({selectedCandidateIds.length} Santri)
                </button>
              </div>
            </div>

            {/* 4 Vibrant Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-4 border-t border-slate-100">
              {/* Card 1: Total Calon Santri */}
              <button
                type="button"
                onClick={() => setAssignmentStatusFilter('all')}
                className={`text-left p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border transition-all duration-200 shadow-md relative overflow-hidden group cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                  assignmentStatusFilter === 'all' ? 'ring-2 ring-indigo-400 border-indigo-400' : 'border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Total Calon Santri T.A. Ini
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-indigo-300 shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2 relative z-10">
                  <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {formatNumber(totalCandidatesCount)}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/25 border border-indigo-400/30 text-indigo-200">
                    100% Total
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 relative z-10">Siswa baru kls 7/10 &amp; pindahan</p>
              </button>

              {/* Card 2: Skema Standar */}
              <button
                type="button"
                onClick={() => setAssignmentStatusFilter('assigned')}
                className={`text-left p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-50 to-teal-100/70 border transition-all duration-200 shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                  assignmentStatusFilter === 'assigned' ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-emerald-500/10' : 'border-emerald-300/80 hover:border-emerald-400'
                }`}
              >
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/15 rounded-full blur-xl group-hover:bg-emerald-500/25 transition-all pointer-events-none" />
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Skema Standar
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0 group-hover:scale-110 transition-transform">
                    <BadgeCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2 relative z-10">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
                    {formatNumber(assignedStandardCount)}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/15 border border-emerald-400 text-emerald-800">
                    {totalCandidatesCount > 0 ? ((assignedStandardCount / totalCandidatesCount) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1 relative z-10 font-medium">Tarif baku paket reguler</p>
              </button>

              {/* Card 3: Khusus / Custom */}
              <button
                type="button"
                onClick={() => setAssignmentStatusFilter('custom')}
                className={`text-left p-4 rounded-2xl bg-gradient-to-br from-purple-500/15 via-purple-50 to-indigo-100/70 border transition-all duration-200 shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                  assignmentStatusFilter === 'custom' ? 'ring-2 ring-purple-500 border-purple-500 shadow-purple-500/10' : 'border-purple-300/80 hover:border-purple-400'
                }`}
              >
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-500/15 rounded-full blur-xl group-hover:bg-purple-500/25 transition-all pointer-events-none" />
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                    Khusus / Custom
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 shrink-0 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2 relative z-10">
                  <div className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
                    {formatNumber(assignedCustomCount)}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/15 border border-purple-400 text-purple-800">
                    {totalCandidatesCount > 0 ? ((assignedCustomCount / totalCandidatesCount) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <p className="text-[11px] text-purple-700 mt-1 relative z-10 font-medium">Beasiswa &amp; penyesuaian khusus</p>
              </button>

              {/* Card 4: Belum Ditetapkan */}
              <button
                type="button"
                onClick={() => setAssignmentStatusFilter('unassigned')}
                className={`text-left p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-50 to-orange-100/70 border transition-all duration-200 shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                  assignmentStatusFilter === 'unassigned' ? 'ring-2 ring-amber-500 border-amber-500 shadow-amber-500/10' : 'border-amber-300/90 hover:border-amber-400'
                }`}
              >
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/15 rounded-full blur-xl group-hover:bg-amber-500/25 transition-all pointer-events-none" />
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    Belum Ditetapkan
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0 group-hover:scale-110 transition-transform">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2 relative z-10">
                  <div className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
                    {formatNumber(unassignedCandidatesCount)}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    unassignedCandidatesCount > 0 ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {unassignedCandidatesCount > 0 ? 'Perlu Aksi' : 'Selesai'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mt-1 relative z-10 font-medium">Menunggu penetapan skema</p>
              </button>
            </div>

            {/* Notice if scheme is empty for target academic year */}
            {!loadingAssignments && assignmentsData.schemes?.length === 0 && (
              <div className="mt-4 p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-900 text-xs">
                      Skema Biaya Pendidikan Belum Tersedia untuk TA {currentTargetAy.name}
                    </div>
                    <p className="text-[11px] text-amber-800/80 mt-0.5">
                      Calon santri baru memerlukan rujukan paket skema biaya pada Tahun Ajaran {currentTargetAy.name} untuk penetapan tarif.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNavigateToFeeSchemes}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <span>Buat Skema Biaya TA {currentTargetAy.name}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Filter Controls Bar */}
            <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-4 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  placeholder="Cari calon santri berdasarkan Nama, No. Reg, atau NISN..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
                {assignmentSearch && (
                  <button
                    type="button"
                    onClick={() => setAssignmentSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                {/* Filter Tipe Kandidat / Keberadaan Rombel */}
                <select
                  value={candidateTypeFilter}
                  onChange={(e) => setCandidateTypeFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  title="Filter Status Rombel / Pendaftar"
                >
                  <option value="all">Semua Calon &amp; Siswa</option>
                  <option value="unplaced">Pendaftar (Belum Masuk Rombel)</option>
                  <option value="placed_new">Siswa Baru (Aktif Rombel)</option>
                  <option value="transfer">Siswa Pindahan</option>
                </select>

                {/* Filter Jalur / Proses PSB */}
                <select
                  value={selectedProcessFilter}
                  onChange={(e) => setSelectedProcessFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="">Semua Jalur / Proses PSB</option>
                  {processOptions.map((proc) => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                </select>

                {/* Filter Skema */}
                <select
                  value={selectedSchemeFilter}
                  onChange={(e) => setSelectedSchemeFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="">Semua Skema Biaya</option>
                  {(assignmentsData.schemes || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>

                {/* Filter Status */}
                <select
                  value={assignmentStatusFilter}
                  onChange={(e) => setAssignmentStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="assigned">Skema Standar</option>
                  <option value="custom">Khusus (Custom)</option>
                  <option value="unassigned">Belum Ditetapkan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table with Breakdown Columns and Sticky tfoot */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {loadingAssignments ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                <span className="text-xs">Memuat daftar penetapan calon santri &amp; rincian tarif...</span>
              </div>
            ) : sortedAndFilteredCandidates.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Tidak Ada Data Calon Santri</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter jalur/skema.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto relative border border-slate-200/80 rounded-b-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 select-none sticky top-0 z-30 shadow-xs">
                    <tr>
                      {/* Checkbox Column */}
                      <th className="px-3 py-3 w-10 text-center sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                        <button
                          type="button"
                          onClick={handleSelectAllCandidates}
                          className="p-1 hover:text-emerald-700"
                          title="Pilih Semua"
                        >
                          {selectedCandidateIds.length > 0 && selectedCandidateIds.length === sortedAndFilteredCandidates.length ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>

                      {/* Candidate Info */}
                      <th
                        onClick={() => handleSort('student_name')}
                        className="px-4 py-3 min-w-[220px] cursor-pointer hover:bg-slate-100 transition group sticky left-10 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Calon Santri (No. Reg / Nama)</span>
                          {sortConfig.key === 'student_name' ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      {/* Scheme Status */}
                      <th
                        onClick={() => handleSort('scheme_name')}
                        className="px-4 py-3 min-w-[160px] cursor-pointer hover:bg-slate-100 transition group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Skema Biaya</span>
                          {sortConfig.key === 'scheme_name' ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      {/* Dynamic Fee Type Columns */}
                      {dynamicFeeTypes.map((ft) => (
                        <th
                          key={ft.id}
                          onClick={() => handleSort(`fee_type_${ft.id}`)}
                          className="px-3 py-3 text-right min-w-[110px] cursor-pointer hover:bg-slate-100 transition group bg-slate-50/50"
                          title={`Pos Biaya: ${ft.name}`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span className="truncate max-w-[100px]">{ft.name}</span>
                            {sortConfig.key === `fee_type_${ft.id}` ? (
                              sortConfig.direction === 'asc' ? (
                                <ArrowUp className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-emerald-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100" />
                            )}
                          </div>
                        </th>
                      ))}

                      {/* Total Biaya + Aksi Penetapan (Selalu di Paling Kanan, Solid BG) */}
                      <th
                        onClick={() => handleSort('total_amount')}
                        className="px-4 py-3 text-right min-w-[260px] sticky right-0 bg-emerald-50 z-20 shadow-[-1px_0_0_0_#e2e8f0] font-bold text-emerald-950 cursor-pointer hover:bg-emerald-100 transition group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span>Total Biaya</span>
                            {sortConfig.key === 'total_amount' ? (
                              sortConfig.direction === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-emerald-600/40 group-hover:opacity-100" />
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-emerald-800 uppercase tracking-wider">Aksi</span>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {sortedAndFilteredCandidates.map((cand, idx) => {
                      const candId = cand.student_id || cand.candidate_id;
                      const uniqueRowKey = `cand-row-${cand.candidate_id || ''}-${cand.student_id || ''}-${cand.registration_number || idx}`;
                      const isSelected = selectedCandidateIds.includes(candId);
                      const asg = cand.assignment;
                      const isAssigned = Boolean(asg?.id || cand.fee_scheme_id);
                      const isCustom = Boolean(asg?.is_custom || cand.assignment_status === 'custom');
                      const breakdown = cand.fee_breakdown || asg?.fee_breakdown || {};
                      
                      // Calculate monthly and non-monthly totals
                      let candMonthly = 0;
                      let candNonMonthly = 0;
                      if (isAssigned) {
                        dynamicFeeTypes.forEach((ft) => {
                          const item = breakdown[ft.id];
                          const amount = Number(item?.final_amount || 0);
                          const isMonthly = ft.billing_pattern === 'monthly' || String(ft.name).toLowerCase().includes('spp') || String(ft.code || '').toLowerCase().includes('spp');
                          if (isMonthly) {
                            candMonthly += amount;
                          } else {
                            candNonMonthly += amount;
                          }
                        });
                      }

                      const isTransfer = cand.registration_type === 'pindahan' || cand.entry_type === 'pindahan' || String(cand.registration_type_display || cand.entry_type_label || '').toLowerCase().includes('pindah');

                      return (
                        <tr
                          key={uniqueRowKey}
                          className={`hover:bg-slate-50 transition ${isSelected ? 'bg-emerald-50' : ''}`}
                        >
                          {/* Checkbox Column (Solid BG) */}
                          <td className={`px-3 py-2.5 text-center sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0] ${isSelected ? 'bg-emerald-100' : 'bg-white'}`}>
                            <button
                              type="button"
                              onClick={() => handleToggleSelectCandidate(candId)}
                              className="p-1"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                              )}
                            </button>
                          </td>

                          {/* Candidate Info with "Pendaftar (Belum Rombel)" / "Siswa Baru (Aktif Rombel)" / "Siswa Pindahan" (Solid BG) */}
                          <td className={`px-4 py-2.5 sticky left-10 z-10 shadow-[1px_0_0_0_#e2e8f0] ${isSelected ? 'bg-emerald-100' : 'bg-white'}`}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-800">{cand.student_name || cand.full_name}</span>
                              
                              {isTransfer ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  cand.is_placed
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  Siswa Pindahan {cand.is_placed ? '(Aktif Rombel)' : '(Belum Rombel)'}
                                </span>
                              ) : cand.is_placed ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                                  <BadgeCheck className="w-3 h-3 text-emerald-700" />
                                  Siswa Baru (Aktif Rombel)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-sky-600" />
                                  Pendaftar (Belum Rombel)
                                </span>
                              )}

                              {isAllUnitsContext && (
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  Number(cand.satuan_pendidikan_id) === 2
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}>
                                  {Number(cand.satuan_pendidikan_id) === 2 ? 'SMA' : 'SMP'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>No. Reg / NIS: {cand.registration_number || cand.nis || '-'}</span>
                              {cand.psb_status && (
                                <span className="capitalize text-[10px] text-slate-500 font-sans bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                                  Status: {cand.psb_status}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Scheme Column */}
                          <td className="px-4 py-2.5">
                            {isCustom ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded w-max">
                                  <Sparkles className="w-2.5 h-2.5" /> Khusus (Custom)
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  {(cand.custom_adjustments || cand.adjustments || []).length} penyesuaian khusus
                                </span>
                              </div>
                            ) : isAssigned ? (
                              <div>
                                <span className="font-semibold text-slate-800">{cand.scheme_name || asg?.scheme_name}</span>
                                {(cand.scheme_code || asg?.scheme_code) && (
                                  <span className="ml-1.5 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {cand.scheme_code || asg?.scheme_code}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Belum Ditetapkan</span>
                            )}
                          </td>

                          {/* Dynamic Fee Type Columns Breakdown (Tanpa teks keterangan di bawah nominal) */}
                          {dynamicFeeTypes.map((ft) => {
                            const item = breakdown[ft.id];
                            const amount = item ? item.final_amount : 0;
                            const hasVal = isAssigned && amount > 0;
                            const isAdj = item?.has_adjustment;

                            return (
                              <td key={ft.id} className="px-3 py-2.5 text-right font-mono text-[11px]">
                                {!isAssigned ? (
                                  <span className="text-slate-300">-</span>
                                ) : hasVal ? (
                                  <span className={`font-semibold ${isAdj ? 'text-purple-700' : 'text-slate-700'}`}>
                                    {formatRupiah(amount)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Rp 0</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Total Biaya Paling Kanan (Bulanan & Non Bulanan) + Icon Aksi Penetapan (Solid BG) */}
                          <td className={`px-4 py-2.5 text-right sticky right-0 z-10 shadow-[-1px_0_0_0_#e2e8f0] ${isSelected ? 'bg-emerald-100' : 'bg-emerald-50'}`}>
                            <div className="flex items-center justify-between gap-3">
                              {/* Rincian Bulanan & Non-Bulanan */}
                              <div className="flex flex-col items-start text-left text-[11px] font-mono">
                                {isAssigned ? (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-sans text-slate-500 font-semibold">Bln:</span>
                                      <span className="font-bold text-slate-800">{formatRupiah(candMonthly)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-sans text-slate-500 font-semibold">Non-Bln:</span>
                                      <span className="font-bold text-slate-800">{formatRupiah(candNonMonthly)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic font-sans text-[11px]">-</span>
                                )}
                              </div>

                              {/* Tombol Aksi Cukup Icon Saja */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSingleAssign(cand)}
                                  title={isAssigned && !isCustom ? 'Ganti Skema Biaya' : 'Pilih Skema Biaya'}
                                  className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-200/60 rounded-lg transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCustomAdjustment(cand)}
                                  title="Input Manual / Tarif Khusus"
                                  className={`p-1.5 rounded-lg transition ${
                                    isCustom
                                      ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs'
                                      : 'text-purple-700 hover:bg-purple-100'
                                  }`}
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>
                                {isAssigned && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenHistoryModal(cand)}
                                    title="Riwayat Perubahan Penetapan"
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Footer: Total Akumulasi Keseluruhan Calon Santri (Selalu Sticky di Bawah, Solid BG) */}
                  <tfoot className="bg-slate-100 text-slate-800 font-bold border-t-2 border-slate-300 select-none sticky bottom-0 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-left sticky left-0 bg-slate-100 z-30 shadow-[1px_0_0_0_#cbd5e1]">
                        <div className="flex items-center gap-2">
                          <span className="uppercase text-[11px] tracking-wider text-slate-700 font-extrabold">
                            Total Akumulasi ({sortedAndFilteredCandidates.length} Calon Santri):
                          </span>
                        </div>
                      </td>

                      {/* Total per Pos Biaya */}
                      {dynamicFeeTypes.map((ft) => {
                        const colTotal = sortedAndFilteredCandidates.reduce((sum, cand) => {
                          const amount = cand.fee_breakdown?.[ft.id]?.final_amount || cand.assignment?.fee_breakdown?.[ft.id]?.final_amount || 0;
                          return sum + Number(amount);
                        }, 0);

                        return (
                          <td key={ft.id} className="px-3 py-3 text-right font-mono text-[11px] text-slate-900 bg-slate-100 font-bold">
                            {colTotal > 0 ? formatRupiah(colTotal) : <span className="text-slate-400">Rp 0</span>}
                          </td>
                        );
                      })}

                      {/* Grand Total All Assigned Fees (Bln & Non-Bln) di Kolom Paling Kanan */}
                      {(() => {
                        let totalMonthlyAll = 0;
                        let totalNonMonthlyAll = 0;
                        sortedAndFilteredCandidates.forEach((cand) => {
                          const breakdown = cand.fee_breakdown || cand.assignment?.fee_breakdown || {};
                          dynamicFeeTypes.forEach((ft) => {
                            const amount = Number(breakdown[ft.id]?.final_amount || 0);
                            const isMonthly = ft.billing_pattern === 'monthly' || String(ft.name).toLowerCase().includes('spp') || String(ft.code || '').toLowerCase().includes('spp');
                            if (isMonthly) {
                              totalMonthlyAll += amount;
                            } else {
                              totalNonMonthlyAll += amount;
                            }
                          });
                        });

                        return (
                          <td className="px-4 py-2.5 text-right sticky right-0 bg-emerald-100 z-30 shadow-[-1px_0_0_0_#cbd5e1] text-emerald-950 font-mono font-extrabold">
                            <div className="flex flex-col items-start text-left text-[11px]">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-sans text-emerald-800 font-semibold">Bln:</span>
                                <span>{formatRupiah(totalMonthlyAll)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-sans text-emerald-800 font-semibold">Non-Bln:</span>
                                <span>{formatRupiah(totalNonMonthlyAll)}</span>
                              </div>
                            </div>
                          </td>
                        );
                      })()}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: TAGIHAN & MATRIKS PPDB */}
      {/* ============================================================ */}
      {activeMainTab === 'bills' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Sub Tab Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setBillsSubTab('matrix')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${
                  billsSubTab === 'matrix'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>1. Matriks Penagihan PPDB</span>
                {matrixData.rows?.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${billsSubTab === 'matrix' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {matrixData.rows.length} Santri
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBillsSubTab('history')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${
                  billsSubTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4" />
                <span>2. Riwayat Tagihan PPDB</span>
                {billsData.bills?.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${billsSubTab === 'history' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {billsData.bills.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBillsSubTab('reminders')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${
                  billsSubTab === 'reminders'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>3. Reminder Tagihan (Portal Ortu)</span>
                {remindersData?.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${billsSubTab === 'reminders' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {remindersData.length} Log
                  </span>
                )}
              </button>
            </div>

            {billsSubTab === 'reminders' && (
              <button
                type="button"
                onClick={handleOpenBroadcastModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition self-start sm:self-auto"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Reminder Massal</span>
              </button>
            )}
          </div>

          {/* Sub-Tab 2.1: Matriks Penagihan PPDB */}
          {billsSubTab === 'matrix' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Summary & KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Calon Santri</p>
                    <p className="text-xl font-black text-slate-800 mt-1">{matrixData.summary?.total_students || matrixData.rows?.length || 0} Santri</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">T.A. Sasaran {currentTargetAy.name}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tagihan Diterbitkan</p>
                    <p className="text-xl font-black text-indigo-700 mt-1">{matrixData.summary?.total_published_bills || 0} Tagihan</p>
                    <p className="text-[10px] text-indigo-600 mt-0.5">Sudah tercatat di Piutang Masuk</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <FileCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Piutang Belum Lunas</p>
                    <p className="text-xl font-black text-rose-700 mt-1">Rp {(matrixData.summary?.total_unpaid_ar || 0).toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-rose-500 mt-0.5">Sisa tagihan aktif calon santri</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Pembayaran Masuk</p>
                    <p className="text-xl font-black text-teal-700 mt-1">Rp {(matrixData.summary?.total_paid || 0).toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-teal-600 mt-0.5">Kas/Bank PPDB telah diterima</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Matrix Controls & Filter Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari calon santri, No Reg, proses..."
                      value={matrixSearch}
                      onChange={(e) => setMatrixSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    {matrixSearch && (
                      <button
                        type="button"
                        onClick={() => setMatrixSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                        title="Hapus pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={fetchMatrixData}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                    title="Muat Ulang Matriks"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Selection Status & Action Badge */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                  {selectedMatrixRowIds.size > 0 ? (
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1.5 rounded-xl text-xs font-semibold animate-in fade-in">
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                      <span>{selectedMatrixRowIds.size} calon santri terpilih</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMatrixRowIds(new Set())}
                        className="text-indigo-700 hover:text-indigo-900 underline text-[11px] ml-1"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                      <Info className="w-3.5 h-3.5" />
                      <span>Pilih baris calon santri atau klik tombol kolom untuk terbitkan massal</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Matrix Table with Horizontal & Vertical Scroll and Sticky Frozen Columns */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden relative">
                {loadingMatrix ? (
                  <div className="p-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="text-xs font-medium">Menyusun matriks tagihan PPDB calon santri...</p>
                  </div>
                ) : filteredMatrixRows.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Tidak ada data calon santri</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {matrixSearch
                        ? 'Tidak ada calon santri yang sesuai filter pencarian.'
                        : `Pastikan penetapan biaya PPDB TA Sasaran ${currentTargetAy.name} telah memiliki calon santri.`}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[680px]">
                    <table className="w-full text-left text-xs border-collapse border-separate border-spacing-0">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-20 border-b border-slate-200 shadow-2xs">
                        <tr>
                          {/* Fixed Left Header 1: Checkbox (44px) */}
                          <th className="p-3 w-[44px] min-w-[44px] max-w-[44px] text-center sticky left-0 z-30 bg-slate-100 border-r border-b border-slate-200">
                            <input
                              type="checkbox"
                              checked={selectedMatrixRowIds.size === filteredMatrixRows.length && filteredMatrixRows.length > 0}
                              onChange={handleSelectAllMatrixRows}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </th>

                          {/* Fixed Left Header 2: Nama Calon Santri (260px, left: 44px) */}
                          <th className="p-3 w-[260px] min-w-[260px] max-w-[260px] text-left sticky left-[44px] z-30 bg-slate-100 border-r border-b border-slate-200 font-bold text-slate-800">
                            Calon Santri Baru
                          </th>

                          {/* Fixed Left Header 3: Jalur / Keterangan (110px, left: 304px) */}
                          <th className="p-3 w-[110px] min-w-[110px] max-w-[110px] text-left sticky left-[304px] z-30 bg-slate-100 border-r border-b border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                            Jalur Masuk
                          </th>

                          {/* Dynamic Columns for PPDB Fee Components */}
                          {matrixData.columns?.map((col) => (
                            <th
                              key={col.key}
                              className="p-3 min-w-[160px] text-center border-r border-b border-slate-200 align-top group hover:bg-slate-100/80 transition"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${col.badge_color || 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                    {col.badge_text || 'PPDB'}
                                  </span>
                                </div>
                                <span className="font-semibold text-slate-800 text-[11px]">{col.label}</span>
                                <span className="text-[10px] text-slate-500 font-normal">T.A. {currentTargetAy.name}</span>

                                {/* Tombol Aksi Kolom: Terbitkan & Import Excel */}
                                <div className="mt-1.5 w-full flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenColumnPublishModal(col)}
                                    title="Terbitkan tagihan kolom ini secara massal"
                                    className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-white border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[10px] font-semibold transition shadow-2xs"
                                  >
                                    <Zap className="w-3 h-3 text-indigo-600" />
                                    <span>Terbitkan</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenImportModal(col)}
                                    title="Import data Excel & Unduh format kolom ini"
                                    className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-white border border-indigo-200 hover:border-blue-500 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[10px] font-semibold transition shadow-2xs"
                                  >
                                    <FileSpreadsheet className="w-3 h-3 text-indigo-600" />
                                    <span>Import</span>
                                  </button>
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredMatrixRows.map((row, rIdx) => {
                          const candidateId = row.candidate_id || row.student_id;
                          const isRowSelected = selectedMatrixRowIds.has(candidateId);
                          const stickyBg = isRowSelected
                            ? 'bg-[#eef2ff]'
                            : rIdx % 2 === 1
                              ? 'bg-[#f8fafc]'
                              : 'bg-white';

                          return (
                            <tr
                              key={candidateId}
                              className={`hover:bg-slate-100/70 transition ${isRowSelected ? 'bg-indigo-50/50' : rIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
                            >
                              {/* Sticky Cell 1: Checkbox */}
                              <td className={`p-3 w-[44px] min-w-[44px] max-w-[44px] text-center sticky left-0 z-10 ${stickyBg} border-r border-slate-200`}>
                                <input
                                  type="checkbox"
                                  checked={isRowSelected}
                                  onChange={() => handleToggleSelectMatrixRow(candidateId)}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>

                              {/* Sticky Cell 2: Nama Calon Santri & No Registrasi */}
                              <td className={`p-3 w-[260px] min-w-[260px] max-w-[260px] sticky left-[44px] z-10 ${stickyBg} border-r border-slate-200 truncate`} title={row.full_name}>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-800 text-xs truncate">{row.full_name}</span>
                                    {isAllUnitsContext && (
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                        Number(row.satuan_pendidikan_id) === 2
                                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      }`}>
                                        {Number(row.satuan_pendidikan_id) === 2 ? 'SMA' : 'SMP'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                      row.is_placed
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-sky-50 text-sky-700 border-sky-200'
                                    }`}>
                                      {row.is_placed ? 'Aktif Rombel' : 'Belum Rombel'}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                                      Reg: {row.registration_number || row.nis || '-'}
                                    </span>
                                    {row.scheme_name && (
                                      <span className="text-[10px] text-slate-400 font-normal truncate max-w-[130px]" title={row.scheme_name}>
                                        • {row.scheme_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Sticky Cell 3: Jalur Masuk */}
                              <td className={`p-3 w-[110px] min-w-[110px] max-w-[110px] text-slate-600 sticky left-[304px] z-10 ${stickyBg} border-r border-slate-200 text-[11px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]`}>
                                <div className="flex flex-col gap-0.5">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px] truncate" title={row.process_name || 'Reguler'}>
                                    {row.process_name || 'Reguler'}
                                  </span>
                                  {row.entry_type === 'pindahan' && (
                                    <span className="text-[9px] text-amber-700 font-bold">Pindahan</span>
                                  )}
                                </div>
                              </td>

                              {/* Dynamic Matrix Cells */}
                              {matrixData.columns?.map((col) => {
                                const cell = row.cells?.[col.key] || {};
                                const isPub = cell.is_published;
                                const isPaid = cell.is_paid;
                                const isPart = cell.is_partially_paid;
                                const isOver = cell.is_overdue;

                                let cellStyle = 'bg-white text-slate-700 hover:border-indigo-400 border-slate-200';
                                let badgeText = 'Draf / Acuan';
                                let badgeClass = 'bg-slate-100 text-slate-500';

                                if (isPaid) {
                                  cellStyle = 'bg-emerald-50/80 text-emerald-900 border-emerald-300 font-bold';
                                  badgeText = 'Lunas';
                                  badgeClass = 'bg-emerald-100 text-emerald-800';
                                } else if (isPart) {
                                  cellStyle = 'bg-teal-50/80 text-teal-900 border-teal-300 font-bold';
                                  badgeText = 'Sebagian';
                                  badgeClass = 'bg-teal-100 text-teal-800';
                                } else if (isOver) {
                                  cellStyle = 'bg-rose-50/90 text-rose-900 border-rose-300 font-bold';
                                  badgeText = 'Jatuh Tempo';
                                  badgeClass = 'bg-rose-100 text-rose-800 animate-pulse';
                                } else if (isPub) {
                                  cellStyle = 'bg-indigo-50/80 text-blue-900 border-blue-300 font-bold';
                                  badgeText = 'Terbit';
                                  badgeClass = 'bg-blue-100 text-blue-800';
                                }

                                return (
                                  <td
                                    key={col.key}
                                    onClick={() => handleOpenCellModal(row, cell)}
                                    className="p-2 text-center border-r border-slate-100 cursor-pointer group select-none"
                                  >
                                    <div
                                      className={`p-2 rounded-xl border text-center transition-all shadow-2xs group-hover:shadow-md group-hover:scale-[1.02] ${cellStyle}`}
                                    >
                                      <div className="font-mono text-xs">
                                        Rp {(cell.amount !== undefined && cell.amount !== null ? cell.amount : (cell.base_amount || 0)).toLocaleString('id-ID')}
                                      </div>
                                      <div className="flex items-center justify-center gap-1 mt-1">
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${badgeClass}`}>
                                          {badgeText}
                                        </span>
                                        {(cell.has_discount || (cell.discount_amount && cell.discount_amount > 0)) && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title={`Diskon/Keringanan: Rp ${(cell.discount_amount || 0).toLocaleString('id-ID')}`} />
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-Tab 2.2: Riwayat Tagihan PPDB */}
          {billsSubTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Filter Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari tagihan #ID / nama calon..."
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  {billSearch && (
                    <button
                      type="button"
                      onClick={() => setBillSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                      title="Hapus pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <SearchableSelect
                    options={[
                      { value: '', label: '-- Semua Jenis Biaya PPDB --' },
                      ...dynamicFeeTypes.map((ft) => ({ value: ft.id, label: ft.name }))
                    ]}
                    value={billFeeTypeFilter}
                    onChange={(val) => setBillFeeTypeFilter(val)}
                    placeholder="Filter Jenis Biaya"
                  />
                </div>

                <div>
                  <select
                    value={billStatusFilter}
                    onChange={(e) => setBillStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Semua Status Tagihan</option>
                    <option value="draft">Draf (Belum Terbit)</option>
                    <option value="unpaid">Belum Bayar</option>
                    <option value="partially_paid">Bayar Sebagian</option>
                    <option value="paid">Lunas</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={fetchBillsHistory}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-semibold"
                    title="Muat Ulang Data"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Muat Ulang</span>
                  </button>
                </div>
              </div>

              {/* Bills Table with Sortable Columns */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
                {loadingBills ? (
                  <div className="p-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="text-xs font-medium">Memuat riwayat tagihan PPDB...</p>
                  </div>
                ) : filteredAndSortedHistoryBills.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Tidak ada data tagihan PPDB</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {billSearch || billStatusFilter !== 'all' || billFeeTypeFilter
                        ? 'Tidak ada tagihan yang sesuai filter pencarian.'
                        : `Belum ada tagihan PPDB diterbitkan untuk TA Sasaran ${currentTargetAy.name}.`}
                    </p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('id')}>
                            <div className="flex items-center gap-1">
                              <span>Tagihan #ID</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('bill_date')}>
                            <div className="flex items-center gap-1">
                              <span>Tgl Tagihan</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('registrant_name_snapshot')}>
                            <div className="flex items-center gap-1">
                              <span>Calon Santri</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5">Jenis Biaya PPDB</th>
                          <th className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('amount')}>
                            <div className="flex items-center justify-end gap-1">
                              <span>Nominal Kotor</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('discount_amount')}>
                            <div className="flex items-center justify-end gap-1">
                              <span>Diskon</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5 text-right">Bersih</th>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('due_date')}>
                            <div className="flex items-center gap-1">
                              <span>Jatuh Tempo</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAndSortedHistoryBills.map((bill) => {
                          const netAmount = Math.max(0, (bill.amount || 0) - (bill.discount_amount || 0));
                          return (
                            <tr key={bill.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3.5 font-mono font-bold text-indigo-600">#{bill.id}</td>
                              <td className="p-3.5 font-mono text-slate-600">{formatDateToDMY(bill.bill_date || bill.created_at)}</td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-800">{bill.registrant_name_snapshot}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Reg: {bill.registration_number_snapshot || '-'}
                                </div>
                              </td>
                              <td className="p-3.5 text-slate-700">
                                <div className="font-semibold">{bill.fee_type_name || 'Biaya Masuk PPDB'}</div>
                                <div className="text-[10px] text-slate-400">TA Sasaran: {currentTargetAy.name}</div>
                              </td>
                              <td className="p-3.5 text-right font-mono font-semibold text-slate-700">
                                {formatCurrency(bill.amount)}
                              </td>
                              <td className="p-3.5 text-right font-mono font-semibold text-amber-600">
                                {bill.discount_amount > 0 ? `- ${formatCurrency(bill.discount_amount)}` : '-'}
                              </td>
                              <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(netAmount)}
                              </td>
                              <td className="p-3.5 font-mono text-slate-600">{formatDateToDMY(bill.due_date)}</td>
                              <td className="p-3.5 text-center">
                                <StatusPill variant={
                                  bill.status === 'paid' ? 'success' :
                                  bill.status === 'partially_paid' ? 'info' :
                                  bill.status === 'draft' ? 'warning' :
                                  bill.status === 'cancelled' ? 'neutral' :
                                  'danger'
                                }>
                                  {bill.status === 'paid' ? 'LUNAS' : bill.status === 'partially_paid' ? 'SEBAGIAN' : bill.status === 'draft' ? 'DRAFT' : bill.status === 'cancelled' ? 'BATAL' : 'BELUM BAYAR'}
                                </StatusPill>
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDetailBill(bill)}
                                    title="Lihat Detail Tagihan"
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  {bill.status !== 'paid' && bill.status !== 'cancelled' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReviseModal(bill)}
                                        title="Revisi Tagihan (Audit Trail)"
                                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSendSingleReminder(bill)}
                                        disabled={sendingSingleReminderId === bill.id}
                                        title="Kirim Reminder Cepat (Portal Ortu)"
                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
                                      >
                                        {sendingSingleReminderId === bill.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                        ) : (
                                          <Send className="w-4 h-4" />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPayModal(bill)}
                                        title="Bayar di Kasir"
                                        className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                                      >
                                        <Wallet className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
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
            </div>
          )}

          {/* Sub-Tab 2.3: Reminder Tagihan PPDB */}
          {billsSubTab === 'reminders' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Reminder Banner */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Pusat Pengingat Tagihan Masuk Calon Wali Santri</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kirimkan notifikasi tagihan atau pengingat jatuh tempo PPDB langsung ke Portal Orang Tua dan WhatsApp.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenBroadcastModal}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Reminder Massal</span>
                </button>
              </div>

              {/* Reminder Logs Controls */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari log nama santri, pesan..."
                    value={reminderSearch}
                    onChange={(e) => setReminderSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={fetchReminders}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Muat Ulang Log</span>
                </button>
              </div>

              {/* Logs Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
                {loadingReminders ? (
                  <div className="p-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="text-xs font-medium">Memuat riwayat broadcast pengingat...</p>
                  </div>
                ) : filteredReminderLogs.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Belum ada riwayat pengingat</p>
                    <p className="text-[11px] text-slate-400 mt-1">Gunakan tombol "Kirim Reminder Massal" untuk menjadwalkan notifikasi ke calon wali santri.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Log #ID</th>
                          <th className="p-3.5">Waktu Pengiriman</th>
                          <th className="p-3.5">Calon Santri / Penerima</th>
                          <th className="p-3.5">Komponen Tagihan</th>
                          <th className="p-3.5">Saluran</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5">Pesan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredReminderLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3.5 font-mono font-bold text-indigo-600">#{log.id}</td>
                            <td className="p-3.5 font-mono text-slate-600">{formatDateToDMY(log.created_at)}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-800">{log.student_name || log.recipient_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{log.phone || '-'}</div>
                            </td>
                            <td className="p-3.5 font-semibold text-slate-700">{log.fee_type_name || 'Tagihan Masuk PPDB'}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {log.channel || 'Portal Ortu'}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                log.status === 'sent' || log.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {log.status?.toUpperCase() || 'TERKIRIM'}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600 max-w-xs truncate" title={log.message}>
                              {log.message || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: PENERIMAAN PEMBAYARAN PPDB */}
      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* TAB 3: PENERIMAAN PEMBAYARAN PPDB */}
      {/* ============================================================ */}
      {activeMainTab === 'payments' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Sub-tab Switcher Tab 3 */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
            <button
              type="button"
              onClick={() => setPaymentsSubTab('bills')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                paymentsSubTab === 'bills' || paymentsSubTab === 'cashier'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Tagihan PPDB (Siap Bayar)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                paymentsSubTab === 'bills' || paymentsSubTab === 'cashier'
                  ? 'bg-indigo-800 text-indigo-100'
                  : 'bg-indigo-50 text-indigo-700'
              }`}>
                {cashierBillsSummary.unpaidCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentsSubTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                paymentsSubTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>Riwayat Pembayaran PPDB</span>
              {paymentsHistorySummary.total_count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  paymentsSubTab === 'history'
                    ? 'bg-indigo-800 text-indigo-100'
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {paymentsHistorySummary.total_count}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setPaymentsSubTab('proofs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                paymentsSubTab === 'proofs'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Verifikasi Bukti Transfer (FIFO)</span>
              {(proofsData.proofs?.filter((p) => p.status === 'pending')?.length || 0) > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black">
                  {proofsData.proofs?.filter((p) => p.status === 'pending')?.length}
                </span>
              )}
            </button>
          </div>

          {/* Sub-tab 3.1: Tagihan Siap Bayar di Loket Kasir */}
          {(paymentsSubTab === 'bills' || paymentsSubTab === 'cashier') && (
            <div className="space-y-4">
              {/* Macro Summary Cards (7 Cards Bergradien Elegan: Tagihan Terbit, Kas Diterima, Riwayat Non-Kas, Diskon/Potongan, Sisa Piutang, Jatuh Tempo, Total Kewajiban) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
                {/* Card 1: Tagihan Terbit PPDB */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/60 text-white shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Tagihan Terbit</div>
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-white tracking-tight relative z-10 truncate" title={formatCurrency(cashierBillsSummary.totalBills)}>
                    {formatCurrency(cashierBillsSummary.totalBills)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-indigo-200/80 font-medium">
                    <span>{formatNumber(cashierBillsSummary.totalCount)} pos tagihan</span>
                    {currentTargetAy?.name && (
                      <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-1.5 py-0.5 rounded">
                        {currentTargetAy.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card 2: Kas Diterima (Hanya Pembayaran Riil Kasir/Bank) */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-50 to-teal-100/70 border border-emerald-300 text-emerald-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Kas Diterima</div>
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-emerald-950 tracking-tight relative z-10 truncate" title={formatCurrency(cashierBillsSummary.totalPaidCash)}>
                    {formatCurrency(cashierBillsSummary.totalPaidCash)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                    <span>Masuk kas &amp; bank</span>
                    <span className="text-[10px] font-bold text-emerald-700">{formatNumber(cashierBillsSummary.paidCount)} lunas</span>
                  </div>
                </div>

                {/* Card 3: Riwayat (Non-Kas / Catatan Tanpa Mutasi Saldo) */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-50 to-yellow-100/70 border border-amber-300 text-amber-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/20 rounded-full blur-xl group-hover:bg-amber-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Riwayat (Non-Kas)</div>
                    <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <History className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-amber-950 tracking-tight relative z-10 truncate" title={formatCurrency(cashierBillsSummary.totalPaidHistorical)}>
                    {formatCurrency(cashierBillsSummary.totalPaidHistorical)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-amber-800 font-medium">
                    <span>{formatNumber(cashierBillsSummary.historicalCount)} pos riwayat</span>
                  </div>
                </div>

                {/* Card 4: Pemotongan / Diskon (Keringanan / Beasiswa PPDB) */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/20 via-purple-50 to-pink-100/70 border border-purple-300 text-purple-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-purple-900">Diskon &amp; Beasiswa</div>
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-purple-950 tracking-tight relative z-10 truncate" title={formatCurrency(cashierBillsSummary.totalDiscount)}>
                    {formatCurrency(cashierBillsSummary.totalDiscount)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-purple-800 font-medium">
                    <span>{formatNumber(cashierBillsSummary.discountCount)} tagihan dipotong</span>
                  </div>
                </div>

                {/* Card 5: Sisa Piutang Berjalan */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500/20 via-rose-50 to-red-100/70 border border-rose-300 text-rose-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/20 rounded-full blur-xl group-hover:bg-rose-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-900">Sisa Piutang</div>
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-rose-950 tracking-tight relative z-10 truncate" title={formatCurrency(cashierBillsSummary.totalRemaining)}>
                    {formatCurrency(cashierBillsSummary.totalRemaining)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-rose-800 font-medium">
                    <span>{formatNumber(cashierBillsSummary.unpaidCount)} belum lunas</span>
                    <span className="text-[10px] font-bold text-rose-700">{formatNumber(cashierBillsSummary.partialCount)} cicilan</span>
                  </div>
                </div>

                {/* Card 6: Jatuh Tempo PPDB */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-500/20 via-orange-50 to-amber-100/70 border border-orange-300 text-orange-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-orange-500/20 rounded-full blur-xl group-hover:bg-orange-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-orange-900">Jatuh Tempo</div>
                    <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-orange-950 tracking-tight relative z-10 truncate" title={formatCurrency(cashierBillsSummary.totalOverdue)}>
                    {formatCurrency(cashierBillsSummary.totalOverdue)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-orange-800 font-medium">
                    <span>{formatNumber(cashierBillsSummary.overdueCount)} pos lewat tempo</span>
                  </div>
                </div>

                {/* Card 7: Total Kewajiban PPDB */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/20 via-blue-50 to-indigo-100/70 border border-blue-300 text-blue-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Total Kewajiban</div>
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0 group-hover:scale-110 transition-transform">
                      <Receipt className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-lg lg:text-xl font-black text-blue-950 tracking-tight relative z-10 truncate" title={formatCurrency(cashierBillsSummary.totalObligation)}>
                    {formatCurrency(cashierBillsSummary.totalObligation)}
                  </div>
                  <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-blue-800 font-medium">
                    <span>Total piutang PPDB</span>
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-indigo-600" />
                    <span>Daftar Tagihan Siap Bayar di Loket Kasir</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pilih tagihan calon santri untuk mencatat pembayaran kas masuk dan mencetak kuitansi resmi
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
                  <select
                    value={cashierStatusFilter}
                    onChange={(e) => setCashierStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">Semua Status ({billsData.bills?.length || 0})</option>
                    <option value="unpaid">Belum Dibayar Sama Sekali ({cashierBillsSummary.unpaidCount - cashierBillsSummary.partialCount})</option>
                    <option value="partial">Cicilan / Bayar Sebagian ({cashierBillsSummary.partialCount})</option>
                    <option value="paid">Sudah Lunas ({cashierBillsSummary.paidCount})</option>
                  </select>

                  <select
                    value={cashierPhaseFilter}
                    onChange={(e) => setCashierPhaseFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">Semua Fase Biaya</option>
                    <option value="registration_fee">Biaya Pendaftaran / Formulir</option>
                    <option value="enrollment_fee">Uang Pangkal / Daftar Ulang</option>
                  </select>

                  <div className="relative w-full sm:w-60">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari santri, no. reg, kwitansi..."
                      value={cashierSearch || billSearch}
                      onChange={(e) => {
                        setCashierSearch(e.target.value);
                        setBillSearch(e.target.value);
                      }}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                    {(cashierSearch || billSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCashierSearch('');
                          setBillSearch('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                        title="Hapus pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={fetchBillsHistory}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer transition-colors"
                    title="Refresh Tagihan"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action Bar untuk Tagihan Terpilih */}
              {selectedCashierBillIds.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 p-3 rounded-xl shadow-2xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-2xs">
                      {selectedCashierBillIds.length}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-indigo-950">
                        {selectedCashierBillIds.length} Tagihan Calon Santri Dipilih
                      </div>
                      <div className="text-[11px] text-indigo-800 font-medium">
                        Total Kewajiban Terpilih: <strong className="tnum text-indigo-900 font-extrabold">{formatCurrency(
                          (billsData.bills || [])
                            .filter((b) => selectedCashierBillIds.includes(b.id))
                            .reduce((acc, b) => {
                              const sisa = Math.max(0, parseFloat(b.amount || 0) - parseFloat(b.discount_amount || 0) - parseFloat(b.paid_amount || 0));
                              return acc + sisa;
                            }, 0)
                        )}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedCashierBillIds([])}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-lg transition cursor-pointer"
                    >
                      Batal Pilih
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const selectedObjs = (billsData.bills || []).filter((b) => selectedCashierBillIds.includes(b.id));
                        handleOpenMultiPayModal(selectedObjs);
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Bayar {selectedCashierBillIds.length} Tagihan Terpilih (Multipayment)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Table of Unpaid / Partially Paid Bills */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 z-10 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] select-none">
                    <tr>
                      <th className="w-10 px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={
                            sortedAndFilteredCashierBills.filter((b) => b.status !== 'paid' && Math.max(0, parseFloat(b.amount || 0) - parseFloat(b.discount_amount || 0) - parseFloat(b.paid_amount || 0)) > 0).length > 0 &&
                            sortedAndFilteredCashierBills.filter((b) => b.status !== 'paid' && Math.max(0, parseFloat(b.amount || 0) - parseFloat(b.discount_amount || 0) - parseFloat(b.paid_amount || 0)) > 0).every((b) => selectedCashierBillIds.includes(b.id))
                          }
                          onChange={handleToggleSelectAllCashierBills}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          title="Pilih Semua Tagihan Belum Lunas"
                        />
                      </th>
                      <th
                        onClick={() => handleSortCashier('registrant_name_snapshot')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Calon Santri</span>
                          {cashierSortConfig.key === 'registrant_name_snapshot' ? (
                            cashierSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortCashier('wave_name')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Rombel / Jalur</span>
                          {cashierSortConfig.key === 'wave_name' ? (
                            cashierSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortCashier('fee_type_name')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Komponen Tagihan</span>
                          {cashierSortConfig.key === 'fee_type_name' ? (
                            cashierSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortCashier('bill_date')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Tgl Penagihan</span>
                          {cashierSortConfig.key === 'bill_date' ? (
                            cashierSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortCashier('due_date')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Jatuh Tempo</span>
                          {cashierSortConfig.key === 'due_date' ? (
                            cashierSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortCashier('amount')}
                        className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Total Tagihan</span>
                          {cashierSortConfig.key === 'amount' ? (
                            cashierSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortCashier('paid_amount')}
                        className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Sudah Bayar</span>
                          {cashierSortConfig.key === 'paid_amount' ? (
                            cashierSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortCashier('remaining_amount')}
                        className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Sisa Piutang</span>
                          {cashierSortConfig.key === 'remaining_amount' ? (
                            cashierSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortCashier('status')}
                        className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100 transition group"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Status</span>
                          {cashierSortConfig.key === 'status' ? (
                            cashierSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th className="px-3 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loadingBills ? (
                      <tr>
                        <td colSpan="11" className="p-12 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                          <span>Memuat daftar tagihan siap bayar...</span>
                        </td>
                      </tr>
                    ) : sortedAndFilteredCashierBills.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="p-12 text-center text-slate-400">
                          {(cashierSearch || billSearch) ? 'Tidak ada tagihan yang cocok dengan pencarian kasir.' : 'Tidak ada tagihan yang sesuai dengan filter.'}
                        </td>
                      </tr>
                    ) : (
                      sortedAndFilteredCashierBills.map((bill, bIdx) => {
                        const amount = parseFloat(bill.amount || 0);
                        const paid = parseFloat(bill.paid_amount || 0);
                        const discount = parseFloat(bill.discount_amount || 0);
                        const sisa = Math.max(0, amount - paid - discount);
                        const isPaid = bill.status === 'paid' || sisa <= 0;
                        const isPartial = bill.status === 'partially_paid' || (paid > 0 && !isPaid);
                        const isSelected = selectedCashierBillIds.includes(bill.id);
                        const isPayable = !isPaid && (sisa > 0 || amount > 0);

                        return (
                          <tr
                            key={`cashier-bill-${bill.id}-${bIdx}`}
                            className={`transition-colors ${
                              isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="w-10 px-3 py-2.5 text-center">
                              {isPayable ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectCashierBill(bill.id)}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-bold text-slate-800 text-xs">{bill.registrant_name_snapshot}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">No. Reg: {bill.registration_number_snapshot || '-'}</div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 font-semibold whitespace-nowrap">
                              {bill.wave_name || (bill.billing_phase === 'registration_fee' ? 'Formulir PPDB' : 'Uang Masuk')}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <FeeTypeBadge
                                  item={bill}
                                  name={bill.fee_type_name || (bill.billing_phase === 'registration_fee' ? 'Biaya Pendaftaran / Formulir' : 'Uang Pangkal PPDB')}
                                  code={bill.fee_type_code}
                                />
                                {bill.billing_phase === 'registration_fee' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Formulir
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap tnum">
                              {formatDateToDMY(bill.bill_date || bill.created_at)}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap tnum">
                              {bill.due_date ? (
                                <span className={
                                  !isPaid && new Date(bill.due_date) < new Date()
                                    ? 'text-rose-600 font-bold'
                                    : 'text-slate-600'
                                }>
                                  {formatDateToDMY(bill.due_date)}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-800 num-cell">
                              <div>{formatCurrency(bill.amount)}</div>
                              {discount > 0 && (
                                <div className="text-[10px] text-purple-700 font-semibold mt-0.5" title={`Diskon / Potongan: ${formatCurrency(discount)}`}>
                                  Potongan: -{formatCurrency(discount)}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-emerald-700 num-cell">
                              {formatCurrency(bill.paid_amount || 0)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-black text-rose-600 num-cell">
                              {formatCurrency(sisa)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <StatusPill
                                variant={isPaid ? 'success' : isPartial ? 'warning' : 'danger'}
                                label={isPaid ? 'Lunas' : isPartial ? 'Sebagian' : 'Belum Lunas'}
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => handleViewReceipt(bill.payment_id || bill.id, true)}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md font-semibold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1 ml-auto"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Kwitansi</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayModal(bill)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1 ml-auto"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Bayar</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab 3.2: Riwayat Pembayaran PPDB */}
          {paymentsSubTab === 'history' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 sm:p-5 space-y-4">
              {/* Header & Mini Summary */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    <span>Riwayat Seluruh Pembayaran Tagihan PPDB</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Daftar seluruh transaksi penerimaan kas masuk calon santri PPDB dengan dukungan cetak kwitansi resmi berstandar Enterprise Aldepos.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200/80 px-3 py-1.5 rounded-xl">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="text-[10px] text-emerald-700 font-semibold">Total Kas PPDB Masuk</div>
                      <div className="text-xs font-bold text-emerald-800 font-mono">
                        {formatCurrency(paymentsHistorySummary.total_amount)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-200/80 px-3 py-1.5 rounded-xl">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="text-[10px] text-indigo-700 font-semibold">Kwitansi Terbit</div>
                      <div className="text-xs font-bold text-indigo-800 font-mono">
                        {paymentsHistorySummary.total_count || paymentsHistory.length} Transaksi
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={fetchPaymentsHistoryData}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer transition"
                    title="Refresh Riwayat Pembayaran"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Pencarian</label>
                  <input
                    type="text"
                    placeholder="No. kwitansi, nama, reg..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Transaksi</label>
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Semua Status</option>
                    <option value="valid">Valid Saja</option>
                    <option value="voided">Dibatalkan (Void) Saja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Akun Kas / Bank</label>
                  <select
                    value={historyCashAccountFilter}
                    onChange={(e) => setHistoryCashAccountFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Semua Akun Kas/Bank</option>
                    {cashAccounts.map((ca) => (
                      <option key={ca.id} value={ca.id}>
                        {ca.name} ({ca.account_number || ca.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Metode Bayar</label>
                  <select
                    value={historyMethodFilter}
                    onChange={(e) => setHistoryMethodFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Semua Metode</option>
                    <option value="transfer">Transfer Bank</option>
                    <option value="cash">Tunai (Kasir Loket)</option>
                    <option value="va">Virtual Account</option>
                  </select>
                </div>
                <div>
                  <DatePickerField
                    label="Tanggal Mulai"
                    value={historyStartDate}
                    onChange={(iso) => setHistoryStartDate(iso)}
                    placeholder="DD/MM/YYYY"
                    inputClassName="bg-white"
                  />
                </div>
                <div>
                  <DatePickerField
                    label="Tanggal Selesai"
                    value={historyEndDate}
                    onChange={(iso) => setHistoryEndDate(iso)}
                    placeholder="DD/MM/YYYY"
                    inputClassName="bg-white"
                  />
                </div>
              </div>

              {(historySearch || historyStatusFilter !== 'all' || historyCashAccountFilter || historyMethodFilter !== 'all' || historyStartDate || historyEndDate) && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearch('');
                      setHistoryStatusFilter('all');
                      setHistoryCashAccountFilter('');
                      setHistoryMethodFilter('all');
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                    }}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset Filter Riwayat</span>
                  </button>
                </div>
              )}

              {/* Table Riwayat Pembayaran PPDB */}
              {loadingPaymentsHistory ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span>Memuat riwayat pembayaran PPDB...</span>
                </div>
              ) : filteredPaymentsHistory.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Belum ada riwayat pembayaran PPDB yang tercatat pada kriteria filter ini.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] select-none">
                      <tr>
                        <th className="px-3.5 py-3">Tanggal</th>
                        <th className="px-3.5 py-3">No. Kwitansi</th>
                        <th className="px-3.5 py-3">Calon Santri</th>
                        <th className="px-3.5 py-3">Komponen Biaya</th>
                        <th className="px-3.5 py-3 text-right">Nominal Disetor</th>
                        <th className="px-3.5 py-3">Metode / Akun Kas</th>
                        <th className="px-3.5 py-3 text-center">Status</th>
                        <th className="px-3.5 py-3">Catatan</th>
                        <th className="px-3.5 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredPaymentsHistory.map((p) => {
                        const isRowVoid = p.status === 'voided';
                        return (
                          <tr key={p.id} className={`transition-colors ${isRowVoid ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/80'}`}>
                            <td className="px-3.5 py-3 text-slate-600 font-mono text-[11px]">
                              {p.payment_date ? String(p.payment_date).slice(0, 10) : '-'}
                            </td>
                            <td className="px-3.5 py-3">
                              <span className={`font-mono font-bold px-2 py-0.5 rounded border text-[11px] ${
                                isRowVoid
                                  ? 'text-rose-700 bg-rose-50 border-rose-200 line-through'
                                  : 'text-indigo-700 bg-indigo-50 border-indigo-200/60'
                              }`}>
                                {p.receipt_number || `KW-PPDB-${p.id}`}
                              </span>
                            </td>
                            <td className="px-3.5 py-3">
                              <div className={`font-bold ${isRowVoid ? 'text-slate-500' : 'text-slate-800'}`}>
                                {p.registrant_name_snapshot}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">Reg: {p.registration_number_snapshot || '-'}</div>
                            </td>
                            <td className="px-3.5 py-3 font-semibold text-slate-700">
                              {p.fee_type_name || 'Uang Pangkal PPDB'}
                            </td>
                            <td className={`px-3.5 py-3 text-right font-bold font-mono text-sm ${
                              isRowVoid ? 'text-slate-400 line-through' : 'text-emerald-700'
                            }`}>
                              {formatCurrency(p.amount_paid)}
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="font-bold text-slate-700 capitalize">
                                {p.payment_method === 'cash' ? 'Tunai Loket' : (p.payment_method === 'transfer' ? 'Transfer Bank' : p.payment_method)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {p.cash_account_name || 'Kasir PPDB'}
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              {isRowVoid ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                                    title={`Dibatalkan (Void): ${p.void_reason || '-'}`}
                                  >
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    <span>Void</span>
                                  </span>
                                  {p.void_reason && (
                                    <span className="text-[9.5px] text-rose-500 italic max-w-[130px] truncate" title={p.void_reason}>
                                      {p.void_reason}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Valid</span>
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-slate-500 max-w-xs truncate" title={p.notes || '-'}>
                              {p.notes || '-'}
                            </td>
                            <td className="px-3.5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleViewReceipt(p.id, true)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                  title="Buka dan Cetak Kwitansi Resmi di Tab Baru"
                                >
                                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Cetak</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleViewReceipt(p.id, false)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition"
                                  title="Lihat Preview Kwitansi"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {!isRowVoid && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVoidModal(p)}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                    title="Batalkan Pembayaran Ini (Void) & Pulihkan Saldo Tagihan"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Void</span>
                                  </button>
                                )}
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

          {/* Sub-tab 3.3: Verifikasi Bukti Transfer */}
          {paymentsSubTab === 'proofs' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-8 text-center text-slate-400 text-xs">
              Antrean verifikasi bukti transfer calon wali santri (FIFO) dari portal publik.
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: PENGELUARAN PROGRAM PPDB */}
      {/* ============================================================ */}
      {activeMainTab === 'expenses' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span>Pengeluaran Program PPDB (Realisasi Anggaran TA {currentTargetAy.name})</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pengeluaran kas berjalan untuk pelaksanaan program promosi, tes seleksi, cetak modul, dan operasional PPDB TA Sasaran.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateExpense}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Pengeluaran PPDB</span>
            </button>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="table-container">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Tanggal Pengeluaran</th>
                    <th className="p-4">Uraian / Keterangan</th>
                    <th className="p-4">Akun Kas / Bank</th>
                    <th className="p-4 text-right">Nominal Pengeluaran</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingExpenses ? (
                    <tr>
                      <td colSpan="5" className="p-16 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Memuat daftar pengeluaran PPDB...</span>
                      </td>
                    </tr>
                  ) : expensesData.expenses?.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-16 text-center text-slate-400">
                        Belum ada pengeluaran program PPDB yang dicatat untuk TA {currentTargetAy.name}.
                      </td>
                    </tr>
                  ) : (
                    expensesData.expenses?.map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-mono text-slate-600">
                          {ex.expense_date ? String(ex.expense_date).slice(0, 10) : '-'}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{ex.notes}</div>
                          <div className="text-[10px] text-slate-400">Pos Alokasi: Program PPDB TA {currentTargetAy.name}</div>
                        </td>
                        <td className="p-4 text-slate-700 font-medium">
                          {ex.cash_account_name || 'Kas Utama'}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-rose-600 text-sm">
                          {formatCurrency(ex.amount)}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(ex.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                          >
                            Batalkan
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: KARTU BAYAR PPDB (GABUNGAN & INDIVIDUAL) */}
      {/* ============================================================ */}
      {activeMainTab === 'ledger' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Sub-tab Switcher */}
          <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLedgerSubTab('recap')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  ledgerSubTab === 'recap'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Kartu Bayar Gabungan (Rekap PPDB)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLedgerSubTab('individual');
                  if (!selectedCandidateIdForLedger && ledgerRecapData.candidates?.length > 0) {
                    const firstId = ledgerRecapData.candidates[0].student_id || ledgerRecapData.candidates[0].candidate_id;
                    setSelectedCandidateIdForLedger(firstId);
                    fetchIndividualLedger(firstId);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  ledgerSubTab === 'individual'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Kartu Bayar Individual (Buku Pembantu)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {ledgerSubTab === 'recap' && (
                <button
                  type="button"
                  onClick={() => {
                    if (!ledgerRecapData.candidates || ledgerRecapData.candidates.length === 0) {
                      alert('Tidak ada data rekap kartu bayar PPDB untuk diekspor');
                      return;
                    }
                    const exportRows = ledgerRecapData.candidates.map((c, idx) => ({
                      'No': idx + 1,
                      'No Registrasi': c.registration_number,
                      'Nama Calon Santri': c.full_name,
                      'Jalur Masuk': c.process_name,
                      'Jenis Kelamin': c.gender,
                      'No Telepon': c.phone,
                      'Skema Biaya': c.scheme_name,
                      'Total Kewajiban (Rp)': c.total_billed,
                      'Diskon/Beasiswa (Rp)': c.total_discount,
                      'Total Terbayar (Rp)': c.total_paid,
                      'Sisa Piutang (Rp)': c.remaining_amount,
                      'Status Pelunasan': c.payment_status_label
                    }));
                    const ws = XLSX.utils.json_to_sheet(exportRows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Kartu_Bayar_PPDB');
                    XLSX.writeFile(wb, `Rekap_Kartu_Bayar_PPDB_TA_${currentTargetAy.name.replace('/', '_')}.xlsx`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition border border-emerald-200"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ekspor Excel</span>
                </button>
              )}

              {ledgerSubTab === 'individual' && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Kartu Pembayaran</span>
                </button>
              )}
            </div>
          </div>

          {/* SUB-TAB 1: REKAP GABUNGAN */}
          {ledgerSubTab === 'recap' && (
            <div className="space-y-4">
              {/* Rekap KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Total Calon Santri</div>
                  <div className="text-xl font-black text-slate-800 mt-1">
                    {ledgerRecapData.summary?.total_candidates || 0} <span className="text-xs font-normal text-slate-400">Santri</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Lunas: {ledgerRecapData.summary?.count_paid || 0} • Cicilan: {ledgerRecapData.summary?.count_partial || 0}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Total Tagihan PPDB</div>
                  <div className="text-xl font-black text-slate-800 mt-1">
                    {formatCurrency(ledgerRecapData.summary?.total_billed || 0)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Kewajiban Biaya Masuk</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-emerald-600">Total Kas Terbayar</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">
                    {formatCurrency(ledgerRecapData.summary?.total_paid || 0)}
                  </div>
                  <div className="text-[10px] text-emerald-700/70 mt-1">Kas Masuk Penerimaan</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-rose-600">Sisa Piutang PPDB</div>
                  <div className="text-xl font-black text-rose-600 mt-1">
                    {formatCurrency(ledgerRecapData.summary?.total_remaining || 0)}
                  </div>
                  <div className="text-[10px] text-rose-700/70 mt-1">Belum Terlunasi</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-semibold text-indigo-600">Rasio Pelunasan</div>
                  <div className="text-xl font-black text-indigo-600 mt-1">
                    {ledgerRecapData.summary?.collection_rate_percent || 0}%
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, ledgerRecapData.summary?.collection_rate_percent || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama calon santri / no reg / telepon..."
                      value={ledgerRecapSearch}
                      onChange={(e) => setLedgerRecapSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                    {ledgerRecapSearch && (
                      <button
                        type="button"
                        onClick={() => setLedgerRecapSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                        title="Hapus pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={ledgerRecapStatusFilter}
                    onChange={(e) => setLedgerRecapStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <option value="all">Semua Status Bayar</option>
                    <option value="paid">Lunas</option>
                    <option value="partial">Sebagian / Cicilan</option>
                    <option value="unpaid">Belum Bayar</option>
                    <option value="no_bills">Belum Ada Tagihan</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={fetchLedgerRecap}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition self-end sm:self-auto"
                  title="Muat Ulang"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Rekap Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="table-container">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 select-none">
                      <tr>
                        <th className="p-4 w-12 text-center">No</th>
                        <th className="p-4">Calon Santri & No. Reg</th>
                        <th className="p-4">Jalur & Skema Biaya</th>
                        <th className="p-4 text-right">Total Kewajiban</th>
                        <th className="p-4 text-right">Kas Terbayar</th>
                        <th className="p-4 text-right">Sisa Piutang</th>
                        <th className="p-4 text-center">Status Pelunasan</th>
                        <th className="p-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingLedgerRecap ? (
                        <tr>
                          <td colSpan="8" className="p-16 text-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                            <span>Memuat rekapitulasi kartu bayar PPDB...</span>
                          </td>
                        </tr>
                      ) : filteredLedgerRecapCandidates.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="p-16 text-center text-slate-400">
                            {ledgerRecapSearch || ledgerRecapStatusFilter !== 'all'
                              ? 'Tidak ada calon santri yang cocok dengan filter pencarian rekap.'
                              : `Belum ada data pendaftar pada Tahun Ajaran ${currentTargetAy.name}.`}
                          </td>
                        </tr>
                      ) : (
                        filteredLedgerRecapCandidates.map((cand, idx) => (
                          <tr key={`recap-${cand.candidate_id || cand.student_id || idx}-${cand.registration_number || idx}`} className="hover:bg-slate-50/80 transition">
                            <td className="p-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800">{cand.full_name}</span>
                                {isAllUnitsContext && (
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                    Number(cand.satuan_pendidikan_id) === 2
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}>
                                    {Number(cand.satuan_pendidikan_id) === 2 ? 'SMA' : 'SMP'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-indigo-600 font-mono font-medium">
                                {cand.registration_number} • {cand.phone}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-medium text-slate-700">{cand.process_name}</div>
                              <div className="text-[10px] text-slate-400">{cand.scheme_name}</div>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-slate-800">
                              {formatCurrency(cand.total_billed)}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-600">
                              {formatCurrency(cand.total_paid)}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(cand.remaining_amount)}
                            </td>
                            <td className="p-4 text-center">
                              <StatusPill variant={
                                cand.payment_status_label?.toLowerCase().includes('lunas') ? 'success' :
                                cand.payment_status_label?.toLowerCase().includes('sebagian') ? 'warning' :
                                'danger'
                              }>
                                {cand.payment_status_label}
                              </StatusPill>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCandidateIdForLedger(cand.student_id || cand.candidate_id);
                                  setLedgerSubTab('individual');
                                  fetchIndividualLedger(cand.student_id || cand.candidate_id);
                                }}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition inline-flex items-center gap-1 shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Buka Kartu</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: KARTU BAYAR INDIVIDUAL */}
          {ledgerSubTab === 'individual' && (
            <div className="space-y-4">
              {/* Candidate Picker Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama santri di opsi..."
                      value={candidateSearchQuery}
                      onChange={(e) => setCandidateSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                    {candidateSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCandidateSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                        title="Hapus pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1">
                    <select
                      value={selectedCandidateIdForLedger}
                      onChange={(e) => {
                        setSelectedCandidateIdForLedger(e.target.value);
                        fetchIndividualLedger(e.target.value);
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Pilih Calon Santri ({filteredCandidatesForIndividualLedger.length}) --</option>
                      {filteredCandidatesForIndividualLedger.map((c, idx) => (
                        <option key={`opt-ledger-${c.candidate_id || c.student_id || idx}-${c.registration_number || idx}`} value={c.student_id || c.candidate_id}>
                          {c.full_name} ({c.registration_number}) - {c.payment_status_label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fetchIndividualLedger(selectedCandidateIdForLedger)}
                  disabled={!selectedCandidateIdForLedger}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition self-end md:self-center"
                  title="Muat Ulang Kartu"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Individual Ledger View Card */}
              {loadingIndividualLedger ? (
                <div className="bg-white p-16 rounded-xl border border-slate-200 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <span>Memuat buku pembantu kartu bayar santri...</span>
                </div>
              ) : !individualLedgerData ? (
                <div className="bg-white p-16 rounded-xl border border-slate-200 text-center text-slate-400">
                  Silakan pilih calon santri pada dropdown di atas untuk menampilkan kartu pembayaran.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Student Ledger Paper Container */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                    {/* Header Profile */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/20">
                          {individualLedgerData.candidate.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-black text-slate-800">
                              {individualLedgerData.candidate.full_name}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {individualLedgerData.candidate.process_name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 space-x-2">
                            <span className="font-mono font-semibold text-indigo-600">
                              {individualLedgerData.candidate.registration_number}
                            </span>
                            <span>•</span>
                            <span>Telp/WA: {individualLedgerData.candidate.phone_number}</span>
                            <span>•</span>
                            <span>Tahun Masuk Sasaran: TA {currentTargetAy.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Skema Tarif: <span className="font-semibold text-slate-700">{individualLedgerData.candidate.assigned_scheme_name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col items-center md:items-end justify-between gap-1">
                        <div className="text-[10px] text-slate-400 font-medium">Status Pelunasan Keseluruhan:</div>
                        <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                          individualLedgerData.summary.overall_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : individualLedgerData.summary.overall_status === 'partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {individualLedgerData.summary.overall_status_label}
                        </span>
                      </div>
                    </div>

                    {/* Summary Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Total Tagihan Bruto</div>
                        <div className="text-base font-black text-slate-800 mt-1 font-mono">
                          {formatCurrency(individualLedgerData.summary.total_billed)}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Potongan / Beasiswa</div>
                        <div className="text-base font-black text-indigo-600 mt-1 font-mono">
                          {formatCurrency(individualLedgerData.summary.total_discount)}
                        </div>
                      </div>
                      <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Total Kas Terbayar</div>
                        <div className="text-base font-black text-emerald-700 mt-1 font-mono">
                          {formatCurrency(individualLedgerData.summary.total_paid)}
                        </div>
                      </div>
                      <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200">
                        <div className="text-[10px] text-rose-700 font-bold uppercase">Sisa Kewajiban Piutang</div>
                        <div className="text-base font-black text-rose-700 mt-1 font-mono">
                          {formatCurrency(individualLedgerData.summary.remaining_amount)}
                        </div>
                      </div>
                    </div>

                    {/* Section 1: Rincian Pos Tagihan PPDB */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                          <span>1. Rincian Pos Tagihan Biaya Masuk</span>
                        </h3>
                        <span className="text-[11px] text-slate-400">{individualLedgerData.bills?.length || 0} Pos Tagihan</span>
                      </div>

                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-3">Pos Komponen Biaya</th>
                              <th className="p-3">Fase Penagihan</th>
                              <th className="p-3">Jatuh Tempo</th>
                              <th className="p-3 text-right">Nominal Tagihan</th>
                              <th className="p-3 text-right">Terbayar</th>
                              <th className="p-3 text-right">Sisa</th>
                              <th className="p-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {individualLedgerData.bills?.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="p-8 text-center text-slate-400 font-sans">
                                  Belum ada tagihan yang diterbitkan untuk calon santri ini.
                                </td>
                              </tr>
                            ) : (
                              individualLedgerData.bills?.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50/60">
                                  <td className="p-3 font-sans font-bold text-slate-800">
                                    {b.fee_type_name}
                                    {b.is_installment && (
                                      <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-mono font-semibold">
                                        Termin/Cicilan
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 font-sans text-slate-500 capitalize">
                                    {b.billing_phase === 'registration_fee' ? 'Fase Pendaftaran' : 'Fase Masuk Santri'}
                                  </td>
                                  <td className="p-3 text-slate-500">
                                    {b.due_date ? String(b.due_date).slice(0, 10) : '-'}
                                  </td>
                                  <td className="p-3 text-right font-bold text-slate-800">
                                    {formatCurrency(b.amount)}
                                  </td>
                                  <td className="p-3 text-right font-bold text-emerald-600">
                                    {formatCurrency(b.paid_amount)}
                                  </td>
                                  <td className="p-3 text-right font-bold text-rose-600">
                                    {formatCurrency(b.remaining_amount)}
                                  </td>
                                  <td className="p-3 text-center font-sans">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      b.status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : b.status === 'partially_paid'
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      {b.status === 'paid' ? 'Lunas' : b.status === 'partially_paid' ? 'Sebagian' : 'Belum Bayar'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 2: Riwayat Pembayaran / Kuitansi Kas Masuk */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>2. Riwayat Pembayaran & Kuitansi Kas Masuk</span>
                        </h3>
                        <span className="text-[11px] text-slate-400">{individualLedgerData.payments?.length || 0} Transaksi</span>
                      </div>

                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-3">No. Kuitansi</th>
                              <th className="p-3">Tanggal Setor</th>
                              <th className="p-3">Alokasi Tagihan</th>
                              <th className="p-3">Akun Kas / Bank</th>
                              <th className="p-3">Metode</th>
                              <th className="p-3 text-right">Nominal Setor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {individualLedgerData.payments?.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="p-8 text-center text-slate-400 font-sans">
                                  Belum ada transaksi pembayaran kas masuk yang tercatat.
                                </td>
                              </tr>
                            ) : (
                              individualLedgerData.payments?.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/60">
                                  <td className="p-3 font-bold text-indigo-700">{p.receipt_number}</td>
                                  <td className="p-3 text-slate-500">
                                    {p.payment_date ? String(p.payment_date).slice(0, 10) : '-'}
                                  </td>
                                  <td className="p-3 font-sans font-medium text-slate-800">
                                    {p.fee_type_name || 'Pembayaran PPDB'}
                                  </td>
                                  <td className="p-3 font-sans text-slate-600">{p.cash_account_name}</td>
                                  <td className="p-3 font-sans uppercase text-slate-500 font-semibold text-[10px]">
                                    {p.payment_method}
                                  </td>
                                  <td className="p-3 text-right font-bold text-emerald-600">
                                    {formatCurrency(p.amount_paid)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: PENGEMBALIAN DANA / REFUND SANTRI MENGUNDURKAN DIRI */}
      {/* ============================================================ */}
      {activeMainTab === 'refunds' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Sub-Tab Switcher */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-800">Pengembalian Dana Siswa (PPDB Refund)</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Siswa Mengundurkan Diri
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Kelola permohonan pengembalian dana, persetujuan yayasan, pemotongan otomatis, dan pencairan kas keluar santri yang mengundurkan diri.
                </p>
              </div>

              {/* Sub-tab Pill Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setRefundSubTab('requests')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    refundSubTab === 'requests'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Daftar Pengajuan Refund</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRefundSubTab('rules');
                    fetchRefundRules();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    refundSubTab === 'rules'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Kebijakan Potongan</span>
                </button>
              </div>
            </div>

            {/* Refund KPI Statistics Cards */}
            {refundSubTab === 'requests' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {(() => {
                  const allBills = billsData.bills || [];
                  const requestedCount = allBills.filter((b) => b.refund_status === 'requested').length;
                  const approvedCount = allBills.filter((b) => b.refund_status === 'approved').length;
                  const processedCount = allBills.filter((b) => b.refund_status === 'processed').length;
                  const totalRefundProcessed = allBills
                    .filter((b) => b.refund_status === 'processed')
                    .reduce((sum, b) => sum + Number(b.refund_amount || 0), 0);
                  const eligibleCount = allBills.filter((b) => Number(b.paid_amount || 0) > 0).length;

                  return (
                    <>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Santri Telah Bayar</span>
                          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Wallet className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="text-lg font-black text-slate-800 mt-1">{eligibleCount} Santri</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Berpotensi jika mundur</div>
                      </div>

                      <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-800">Menunggu Approval</span>
                          <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                            <Clock className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="text-lg font-black text-amber-900 mt-1">{requestedCount} Santri</div>
                        <div className="text-[11px] text-amber-700 mt-0.5">Perlu diverifikasi Keuangan/Yayasan</div>
                      </div>

                      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-blue-800">Disetujui (Siap Cair)</span>
                          <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="text-lg font-black text-blue-900 mt-1">{approvedCount} Santri</div>
                        <div className="text-[11px] text-blue-700 mt-0.5">Siap diterbitkan kas keluar</div>
                      </div>

                      <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-rose-800">Selesai Dicairkan</span>
                          <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                            <RotateCcw className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="text-lg font-black text-rose-900 mt-1">{formatCurrency(totalRefundProcessed)}</div>
                        <div className="text-[11px] text-rose-700 mt-0.5">{processedCount} Santri telah cair</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* SUBTAB 1: DAFTAR PERMOHONAN & PENCAIRAN REFUND */}
          {refundSubTab === 'requests' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {/* Filter Bar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama santri, no registrasi, atau bank..."
                      value={refundSearch}
                      onChange={(e) => setRefundSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
                  <select
                    value={refundFilterStatus}
                    onChange={(e) => setRefundFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Semua Status Refund / Berbayar</option>
                    <option value="requested">Menunggu Persetujuan (Requested)</option>
                    <option value="approved">Disetujui (Approved / Siap Cair)</option>
                    <option value="processed">Sudah Dicairkan (Processed)</option>
                    <option value="rejected">Ditolak (Rejected)</option>
                    <option value="eligible">Santri Berbayar (Belum Mengajukan Refund)</option>
                  </select>
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">No. Reg & Calon Santri</th>
                      <th className="p-3.5">Jalur / Gelombang</th>
                      <th className="p-3.5 text-right">Total Tagihan</th>
                      <th className="p-3.5 text-right">Kas Terbayar</th>
                      <th className="p-3.5 text-center">Status Refund</th>
                      <th className="p-3.5">Rekening Pengembalian</th>
                      <th className="p-3.5 text-right">Nominal Refund</th>
                      <th className="p-3.5 text-center">Aksi / Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const allBills = billsData.bills || [];
                      const filtered = allBills.filter((b) => {
                        // Pastikan hanya santri yang memiliki riwayat bayar atau memiliki status refund
                        const hasPayment = Number(b.paid_amount || 0) > 0;
                        const hasRefund = b.refund_status && b.refund_status !== 'none';
                        if (!hasPayment && !hasRefund) return false;

                        // Status filter
                        if (refundFilterStatus === 'requested' && b.refund_status !== 'requested') return false;
                        if (refundFilterStatus === 'approved' && b.refund_status !== 'approved') return false;
                        if (refundFilterStatus === 'processed' && b.refund_status !== 'processed') return false;
                        if (refundFilterStatus === 'rejected' && b.refund_status !== 'rejected') return false;
                        if (refundFilterStatus === 'eligible' && (b.refund_status && b.refund_status !== 'none')) return false;

                        // Search query filter
                        if (refundSearch.trim()) {
                          const q = refundSearch.toLowerCase();
                          const name = (b.student_name || b.registrant_name || '').toLowerCase();
                          const regNo = (b.registration_number || '').toLowerCase();
                          const bank = (b.refund_bank_name || '').toLowerCase();
                          const accNo = (b.refund_bank_account_number || '').toLowerCase();
                          if (!name.includes(q) && !regNo.includes(q) && !bank.includes(q) && !accNo.includes(q)) {
                            return false;
                          }
                        }
                        return true;
                      });

                      if (loadingBills) {
                        return (
                          <tr>
                            <td colSpan="8" className="p-8 text-center text-slate-400">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                              <span>Memuat data tagihan dan refund...</span>
                            </td>
                          </tr>
                        );
                      }

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan="8" className="p-8 text-center text-slate-400">
                              <RotateCcw className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                              <p className="font-semibold text-slate-600">Tidak ada data refund yang sesuai.</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Pastikan santri telah melakukan pembayaran di Tab 3 untuk dapat diajukan permohonan refund.
                              </p>
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((b) => {
                        const status = b.refund_status || 'none';

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/70 transition">
                            {/* Santri Info */}
                            <td className="p-3.5">
                              <div className="font-bold text-slate-800">{b.student_name || b.registrant_name || '-'}</div>
                              <div className="text-[11px] font-mono text-indigo-600">{b.registration_number || '-'}</div>
                            </td>

                            {/* Jalur / Gelombang */}
                            <td className="p-3.5 text-slate-600">
                              <div>{b.admission_phase_name || '-'}</div>
                              <div className="text-[10.5px] text-slate-400">{b.path_name || '-'}</div>
                            </td>

                            {/* Total Biaya */}
                            <td className="p-3.5 text-right font-mono font-semibold text-slate-700">
                              {formatCurrency(b.total_amount || 0)}
                            </td>

                            {/* Kas Terbayar */}
                            <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                              {formatCurrency(b.paid_amount || 0)}
                            </td>

                            {/* Status Refund */}
                            <td className="p-3.5 text-center">
                              {status === 'requested' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  Menunggu Approval
                                </span>
                              )}
                              {status === 'approved' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Disetujui
                                </span>
                              )}
                              {status === 'processed' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3 h-3" />
                                  Sudah Dicairkan
                                </span>
                              )}
                              {status === 'rejected' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <X className="w-3 h-3" />
                                  Ditolak
                                </span>
                              )}
                              {status === 'none' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-500">
                                  Aktif (Belum Refund)
                                </span>
                              )}
                            </td>

                            {/* Rekening Tujuan */}
                            <td className="p-3.5">
                              {b.refund_bank_account_number ? (
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-800">
                                    {b.refund_bank_name} - <span className="font-mono">{b.refund_bank_account_number}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500">a.n. {b.refund_account_holder_name}</div>
                                  {b.refund_reason && (
                                    <div className="text-[10px] text-slate-400 italic truncate max-w-[180px]" title={b.refund_reason}>
                                      Alasan: {b.refund_reason}
                                    </div>
                                  )}
                                  {b.refund_rejection_reason && (
                                    <div className="text-[10px] text-rose-500 font-semibold truncate max-w-[180px]" title={b.refund_rejection_reason}>
                                      Ditolak: {b.refund_rejection_reason}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">-</span>
                              )}
                            </td>

                            {/* Nominal Refund */}
                            <td className="p-3.5 text-right font-mono font-bold text-rose-600">
                              {status === 'processed' && b.refund_amount
                                ? formatCurrency(b.refund_amount)
                                : status === 'approved' || status === 'requested'
                                ? <span className="text-slate-400 font-normal italic">Kalkulasi Otomatis</span>
                                : '-'}
                            </td>

                            {/* Action Buttons */}
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {status === 'none' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRefundRequest(b)}
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Ajukan Refund</span>
                                  </button>
                                )}

                                {status === 'requested' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveRefund(b)}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Setujui</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRejectRefund(b)}
                                      className="px-2 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold transition cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Tolak</span>
                                    </button>
                                  </>
                                )}

                                {status === 'approved' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenProcessRefund(b)}
                                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer"
                                    >
                                      <CreditCard className="w-3.5 h-3.5" />
                                      <span>Cairkan Dana</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRejectRefund(b)}
                                      className="px-2 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold transition cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Batalkan</span>
                                    </button>
                                  </>
                                )}

                                {status === 'rejected' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRefundRequest(b)}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Ajukan Ulang</span>
                                  </button>
                                )}

                                {status === 'processed' && (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Tuntas
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 2: KEBIJAKAN & ATURAN POTONGAN REFUND */}
          {refundSubTab === 'rules' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <span>Aturan Kebijakan Potongan Pengunduran Diri</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Konfigurasi persentase pengembalian dana berdasarkan batas tanggal santri mengajukan pengunduran diri.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddRefundRule}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-indigo-600/20 cursor-pointer self-start md:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Aturan Potongan</span>
                </button>
              </div>

              {/* Rules Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Nama Aturan</th>
                      <th className="p-3.5">Batas Tanggal (Cutoff)</th>
                      <th className="p-3.5 text-center">Pengembalian (%)</th>
                      <th className="p-3.5 text-center">Potongan Yayasan (%)</th>
                      <th className="p-3.5">Keterangan</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingRefundRules ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                          <span>Memuat aturan kebijakan...</span>
                        </td>
                      </tr>
                    ) : refundRules.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-400">
                          <Settings className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">Belum ada aturan kebijakan refund.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Jika tidak ada aturan tanggal, sistem akan mengembalikan 100% dari total yang telah disetor santri.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      refundRules.map((r) => {
                        const refPct = Number(r.refund_percentage || 0);
                        const dedPct = Number(r.deduction_percentage || (100 - refPct));

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 transition">
                            <td className="p-3.5 font-bold text-slate-800">{r.name}</td>
                            <td className="p-3.5 font-mono text-slate-600">
                              {r.cutoff_date ? String(r.cutoff_date).slice(0, 10) : 'Tanpa batas'}
                            </td>
                            <td className="p-3.5 text-center font-bold font-mono text-emerald-600">
                              {refPct}%
                            </td>
                            <td className="p-3.5 text-center font-bold font-mono text-rose-600">
                              {dedPct}%
                            </td>
                            <td className="p-3.5 text-slate-500">{r.description || '-'}</td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {r.is_active ? 'Aktif' : 'Non-Aktif'}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRefundRule(r)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                  title="Edit Aturan"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRefundRule(r.id)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                                  title="Hapus Aturan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {singleAssignModalOpen && targetCandidate && (
        <Drawer
          isOpen={singleAssignModalOpen && !!targetCandidate}
          onClose={() => setSingleAssignModalOpen(false)}
          title={`Penetapan Biaya: ${targetCandidate.student_name || targetCandidate.full_name}`}
          subtitle={currentTargetAy ? `Tahun Ajaran ${currentTargetAy.name}` : ''}
          size="lg"
        >
          <form onSubmit={handleSaveSingleAssign} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Skema Biaya Pendidikan *</label>
                <select
                  required
                  value={selectedSchemeId}
                  onChange={(e) => setSelectedSchemeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Skema Biaya --</option>
                  {(assignmentsData.schemes || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - Total: {formatRupiah(s.total_amount)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview Rincian Skema yang Dipilih */}
              {(() => {
                const selObj = (assignmentsData.schemes || []).find((s) => String(s.id) === String(selectedSchemeId));
                if (!selObj || !selObj.items) return null;
                return (
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-200">
                      <span>Rincian Nominal Skema</span>
                      <span className="text-emerald-700">Total: {formatRupiah(selObj.total_amount)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {selObj.items.map((it) => (
                        <div key={it.id || it.fee_type_id} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                          <span className="truncate max-w-[120px]">{it.fee_type_name}:</span>
                          <span className="font-mono font-semibold text-slate-800">{formatRupiah(it.value || it.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penetapan / Perubahan *
                </label>
                <textarea
                  required
                  rows="2"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  placeholder="Wajib jelaskan alasan penetapan atau penggantian skema calon santri untuk audit trail..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSingleAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submittingAssign && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Penetapan
                </button>
              </div>
            </form>
        </Drawer>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: BULK ASSIGN (MASSAL) */}
      {/* ============================================================ */}
      {bulkAssignModalOpen && (
        <Drawer
          isOpen={bulkAssignModalOpen}
          onClose={() => setBulkAssignModalOpen(false)}
          title={`Penetapan Biaya Massal (${selectedCandidateIds.length} Calon Santri)`}
          subtitle={currentTargetAy ? `Tahun Ajaran ${currentTargetAy.name}` : ''}
          size="lg"
        >
          <form onSubmit={handleSaveBulkAssign} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                Skema biaya yang dipilih akan diterapkan secara serentak ke seluruh <strong>{selectedCandidateIds.length}</strong> calon santri yang dicentang.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Skema Biaya Pendidikan *</label>
                <select
                  required
                  value={bulkSchemeId}
                  onChange={(e) => setBulkSchemeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Skema Biaya --</option>
                  {(assignmentsData.schemes || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - Total: {formatRupiah(s.total_amount)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview Rincian Skema Massal */}
              {(() => {
                const bObj = (assignmentsData.schemes || []).find((s) => String(s.id) === String(bulkSchemeId));
                if (!bObj || !bObj.items) return null;
                return (
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-200">
                      <span>Rincian Nominal per Santri</span>
                      <span className="text-emerald-700">Total: {formatRupiah(bObj.total_amount)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {bObj.items.map((it) => (
                        <div key={it.id || it.fee_type_id} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                          <span className="truncate max-w-[120px]">{it.fee_type_name}:</span>
                          <span className="font-mono font-semibold text-slate-800">{formatRupiah(it.value || it.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penetapan Massal (Wajib Audit Trail) *
                </label>
                <textarea
                  required
                  rows="2"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Contoh: Penetapan serentak Skema Reguler calon santri baru TA 2026/2027..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submittingAssign && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Terapkan Massal ({selectedCandidateIds.length})
                </button>
              </div>
            </form>
        </Drawer>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: CUSTOM / MANUAL INPUT LANGSUNG NOMINAL ANGKA */}
      {/* ============================================================ */}
      {customModalOpen && customCandidate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <Sliders className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Penetapan Biaya Manual: {customCandidate.student_name || customCandidate.full_name}
                </h2>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {currentTargetAy ? `T.A. ${currentTargetAy.name}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomAdjustment} className="p-6 space-y-4">
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Input Langsung Nominal Angka Biaya:</p>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    Data nominal yang telah ditetapkan sebelumnya telah terisi otomatis di bawah. Anda dapat langsung mengedit nilai rupiah untuk masing-masing pos tagihan calon santri.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Nama Pos Tagihan</th>
                      <th className="px-4 py-3 text-right w-56">Nominal Penetapan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {customItems.map((item, idx) => {
                      const isArrears = item.fee_type_name?.toLowerCase().includes('tunggakan') || item.fee_type_id === 11;
                      const isAutoUsed = isArrears && (item.override_amount === '' || item.override_amount === null || item.override_amount === undefined);

                      return (
                        <tr key={idx} className={`transition ${isArrears ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-amber-500' : 'hover:bg-slate-50/60'}`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-800">{item.fee_type_name}</span>
                              {isArrears && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${isAutoUsed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
                                  {isAutoUsed ? '⚡ Otomatis Sistem' : '✏️ Override Manual'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {isArrears ? (
                                <span className="text-amber-700 font-medium">Boleh dikosongkan jika otomatis dari sistem tahun ajaran sebelumnya.</span>
                              ) : (
                                `ID Pos: #${item.fee_type_id}`
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-xs font-bold text-slate-400">Rp</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={item.override_amount}
                                  onChange={(e) => handleCustomItemChange(idx, 'override_amount', e.target.value)}
                                  placeholder={isArrears ? 'Otomatis (kosongkan)' : '0'}
                                  className={`w-44 px-3 py-1.5 bg-slate-50 focus:bg-white border rounded-xl text-xs font-mono font-bold text-right text-slate-900 focus:ring-2 outline-none transition ${isArrears ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-200' : 'border-slate-200 focus:border-purple-500 focus:ring-purple-200'}`}
                                />
                              </div>
                              <div className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border shadow-2xs ${isArrears ? (isAutoUsed ? 'text-emerald-800 bg-emerald-50 border-emerald-300' : 'text-amber-800 bg-amber-100/70 border-amber-300') : 'text-purple-700 bg-purple-50/80 border-purple-200/60'}`}>
                                {Number(item.override_amount || 0).toLocaleString('id-ID')}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-purple-50/60 border-t-2 border-purple-200 font-bold text-slate-900">
                    <tr>
                      <td className="px-4 py-3 text-purple-950 font-bold">
                        Total Akumulasi Biaya Calon Santri:
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-purple-950 text-sm font-extrabold">
                        {formatRupiah(
                          customItems.reduce((sum, it) => {
                            return sum + Number(it.override_amount || 0);
                          }, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penetapan / Perubahan Manual (Wajib Audit Trail) *
                </label>
                <textarea
                  required
                  rows="2"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Contoh: Penetapan nominal khusus calon santri jalur beasiswa / penyesuaian biaya mandiri..."
                  className="w-full px-3.5 py-2.5 bg-purple-50/20 border border-purple-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-300 outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingCustom}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm"
                >
                  {submittingCustom && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Penetapan Manual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: HISTORY AUDIT LOGS */}
      {/* ============================================================ */}
      {historyModalOpen && historyCandidate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Riwayat Penetapan: {historyCandidate.student_name || historyCandidate.full_name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {historyLoading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs">Memuat log penetapan...</span>
                </div>
              ) : historyLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Belum ada catatan riwayat perubahan penetapan.</p>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="relative flex items-start gap-4 pl-8">
                      <div className="absolute left-2 top-1.5 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white -translate-x-1/2" />
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 w-full text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-700 uppercase font-mono text-[10px]">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.occurred_at || log.created_at).toLocaleString('id-ID')}
                          </span>
                        </div>
                        {log.data_after?.reason && (
                          <p className="text-slate-700 bg-white p-2 rounded border border-slate-100 mt-1">
                            <span className="font-semibold text-slate-500">Alasan: </span>
                            {log.data_after.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: CATAT PEMBAYARAN MULTIPAYMENT PPDB (TAHAP 4)         */}
      {/* ============================================================ */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-6xl xl:max-w-7xl w-full my-auto shadow-xl border border-slate-200 p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-800 text-base">Pencatatan Pembayaran Tagihan Calon Santri (Multipayment)</h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      T.A. PPDB: {academicYears.find((y) => y.id === Number(selectedTargetAyId))?.name || 'Semua'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mendukung multi-pos tagihan sekaligus, diskon kasuistik per-baris tagihan, mutasi kas/bank, dan auto-sinkronisasi rekening koran.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Baris 1: Pilihan Calon Santri (Mendukung Multi-Santri / Saudara Kandung dalam 1 Kwitansi) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Calon Santri <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    💡 1 Rekening Koran / Transfer untuk &gt;1 Calon Santri tetap diterbitkan <strong>1 Kwitansi Resmi PPDB</strong>
                  </span>
                </div>

                {/* Chips Calon Santri yang Dipilih */}
                {multiPaySelectedCandidateIds.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {multiPaySelectedCandidateIds.map((cid, idx) => {
                      const cObj = candidateSelectOptions.find((c) => String(c.value) === String(cid));
                      const cName = cObj?.name || `Calon Santri #${cid}`;
                      const cReg = cObj?.reg_number || '-';
                      return (
                        <span
                          key={`cand-chip-${cid}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-200 text-emerald-950 rounded-lg text-xs font-semibold shadow-2xs"
                        >
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span>{cName}</span>
                          {cReg !== '-' && <span className="text-[10px] text-slate-400">({cReg})</span>}
                          {multiPaySelectedCandidateIds.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCandidateFromMultiPay(cid)}
                              className="ml-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Hapus calon santri dari transaksi ini"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown Tambah Calon Santri */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <div className="md:col-span-8">
                    <SearchableSelect
                      options={candidateSelectOptions.filter((opt) => !multiPaySelectedCandidateIds.includes(opt.value))}
                      value=""
                      onChange={(val) => {
                        if (val) handleAddCandidateToMultiPay(val);
                      }}
                      placeholder="+ Tambah Calon Santri Lain / Saudara Kandung (1 Kwitansi Gabungan) --"
                      searchPlaceholder="Ketik nama calon santri atau nomor registrasi..."
                      accentColor="emerald"
                      allowClear={false}
                    />
                  </div>
                  <div className="md:col-span-4 text-[11px] text-slate-500 italic">
                    {multiPaySelectedCandidateIds.length === 0
                      ? 'Pilih calon santri terlebih dahulu.'
                      : multiPaySelectedCandidateIds.length === 1
                      ? '1 Calon Santri Terpilih. Tambah saudara jika ada.'
                      : `${multiPaySelectedCandidateIds.length} Calon Santri Terpilih (Kwitansi Gabungan).`}
                  </div>
                </div>
              </div>

              {/* Baris 2: Tanggal & Total Nominal Bayar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <DatePickerField
                    label="Tanggal Pembayaran *"
                    value={multiPayDate}
                    onChange={(iso) => {
                      setMultiPayDate(iso);
                      if (multiPayMethod === 'transfer' && multiPayCashAccountId) {
                        fetchMultiPayBankStatements(multiPayCashAccountId, iso);
                      }
                    }}
                    placeholder="DD/MM/YYYY"
                    required={true}
                    inputClassName="bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Total Nominal Diterima (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={multiPayTotalAmount}
                    onChange={(e) => setMultiPayTotalAmount(e.target.value)}
                    placeholder="Contoh: 15000000"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg tnum font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {parseFloat(multiPayTotalAmount) > 0 && (
                    <div className="text-[10.5px] text-emerald-800 font-medium bg-emerald-50/90 px-2.5 py-1 rounded-lg border border-emerald-200/80 italic leading-snug">
                      # {terbilang(parseFloat(multiPayTotalAmount))} Rupiah #
                    </div>
                  )}
                  {multiPayMethod === 'transfer' && multiPayBankStatementId && (
                    <StatementMatchIndicator
                      inputAmount={multiPayTotalAmount}
                      statement={multiPayBankStatementsOptions.find((o) => String(o.value) === String(multiPayBankStatementId))}
                      onSyncAmount={(amt) => setMultiPayTotalAmount(String(amt))}
                      isCompact={true}
                    />
                  )}
                </div>
              </div>

              {/* Opsi Pencatatan Riwayat Saja (Non-Kas) */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                isMultiPayHistoricalOnly
                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/25 shadow-xs'
                  : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isMultiPayHistoricalOnly}
                    onChange={(e) => setIsMultiPayHistoricalOnly(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <History className={`w-3.5 h-3.5 ${isMultiPayHistoricalOnly ? 'text-amber-600' : 'text-slate-500'}`} />
                        Catat Sebagai Riwayat Saja (Non-Kas / Tanpa Mutasi Saldo)
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isMultiPayHistoricalOnly
                          ? 'bg-amber-200 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isMultiPayHistoricalOnly ? '⚡ Mode Riwayat Saja Aktif' : 'Normal (Mutasi Kas Aktif)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Centang opsi ini jika pembayaran telah diselesaikan di masa lalu (misal migrasi data lama) dan transaksi ini hanya untuk <strong>mencatat riwayat pelunasan tagihan calon santri</strong> tanpa memengaruhi saldo akun kas/bank dan tanpa membukukan jurnal baru.
                    </p>
                  </div>
                </label>
              </div>

              {/* Baris 3: Metode Bayar & Akun Kas */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                {isMultiPayHistoricalOnly ? (
                  <div className="p-2.5 bg-amber-100/70 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-medium flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Mode Riwayat Saja: Pembayaran ini akan melunasi tagihan calon santri tanpa memengaruhi saldo buku kas/bank dan tanpa mutasi jurnal berjalan.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-bold text-slate-700">Metode Pembayaran:</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="radio"
                          name="ppdbMultiPayMethod"
                          checked={multiPayMethod === 'cash'}
                          onChange={() => {
                            setMultiPayMethod('cash');
                            const currentAcc = cashAccounts.find((a) => String(a.id) === String(multiPayCashAccountId));
                            if (!currentAcc || currentAcc.account_kind !== 'cash') {
                              const defaultCash = cashAccounts.find((a) => a.account_kind === 'cash' && a.is_active) ||
                                                  cashAccounts.find((a) => a.account_kind === 'cash') ||
                                                  cashAccounts.find((a) => a.name?.toLowerCase().includes('tunai') || a.name?.toLowerCase().includes('kas'));
                              if (defaultCash) setMultiPayCashAccountId(String(defaultCash.id));
                            }
                          }}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Tunai (Kasir Loket)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="radio"
                          name="ppdbMultiPayMethod"
                          checked={multiPayMethod === 'transfer'}
                          onChange={() => {
                            setMultiPayMethod('transfer');
                            const currentAcc = cashAccounts.find((a) => String(a.id) === String(multiPayCashAccountId));
                            if (!currentAcc || currentAcc.account_kind !== 'bank') {
                              const defaultBank = cashAccounts.find((a) => a.account_kind === 'bank' && a.is_active) ||
                                                  cashAccounts.find((a) => a.account_kind === 'bank');
                              if (defaultBank) setMultiPayCashAccountId(String(defaultBank.id));
                            }
                          }}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Non-Tunai (Transfer Bank)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Dropdowns jika Non-Tunai / Tunai */}
                {!isMultiPayHistoricalOnly && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Akun Kas / Bank Tujuan <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        options={multiPayCashAccountOptions}
                        value={multiPayCashAccountId}
                        onChange={(val) => setMultiPayCashAccountId(val)}
                        placeholder="-- Pilih Akun Kas / Bank --"
                        searchPlaceholder="Cari nama akun kas / bank..."
                        accentColor="emerald"
                        allowClear={false}
                      />
                    </div>

                    {/* Referensi Rekening Koran */}
                    {multiPayMethod === 'transfer' && (
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                          <span>Referensi Mutasi Rekening Koran</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Multi-Transaksi / Parsial OK)</span>
                        </label>
                        <SearchableSelect
                          options={multiPayBankStatementsOptions}
                          value={multiPayBankStatementId}
                          onChange={(val) => {
                            setMultiPayBankStatementId(val || '');
                            if (val) {
                              const selectedOpt = multiPayBankStatementsOptions.find((o) => String(o.value) === String(val));
                              if (selectedOpt) {
                                const curTotal = parseFloat(multiPayTotalAmount) || 0;
                                const fillAmount = selectedOpt.remaining_amount !== undefined ? selectedOpt.remaining_amount : selectedOpt.amount;
                                if (curTotal <= 0 && fillAmount > 0) {
                                  setMultiPayTotalAmount(String(fillAmount));
                                }
                                if (selectedOpt.rawDate) {
                                  setMultiPayDate(selectedOpt.rawDate);
                                }
                              }
                            }
                          }}
                          placeholder="-- Pilih Rekening Koran Terkait --"
                          searchPlaceholder="Ketik nominal, no. ref, atau uraian transaksi RK..."
                          accentColor="emerald"
                          allowClear={true}
                          isLoading={loadingMultiPayBankStatements}
                          emptyText="Tidak ada mutasi kredit rekening koran untuk akun bank ini"
                        />
                        {(() => {
                          const selectedOpt = multiPayBankStatementsOptions.find((o) => String(o.value) === String(multiPayBankStatementId));
                          if (!selectedOpt) return null;
                          return (
                            <div className="p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[10.5px] space-y-2 text-slate-700 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between font-semibold gap-2">
                                <span className="text-emerald-900 font-bold flex items-center gap-1 min-w-0">
                                  <span>🔗 RK Terpilih:</span>
                                  <span className="truncate">{selectedOpt.desc}</span>
                                </span>
                                <span className="tnum text-emerald-800 font-bold shrink-0">
                                  Plafon: {formatCurrency(selectedOpt.amount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-500 text-[10px] gap-2">
                                <span>Tgl Mutasi Bank: <b className="text-slate-800 tnum">{selectedOpt.rawDate || '-'}</b> {selectedOpt.refNo ? `• Ref: ${selectedOpt.refNo}` : ''} • Teralokasi: <b>{formatCurrency(selectedOpt.allocated_amount || 0)}</b></span>
                                <span className="text-emerald-700 font-bold tnum shrink-0">
                                  Sisa Plafon: {formatCurrency(selectedOpt.remaining_amount || selectedOpt.amount)}
                                </span>
                              </div>
                              <StatementMatchIndicator
                                inputAmount={multiPayTotalAmount}
                                statement={selectedOpt}
                                onSyncAmount={(amt) => setMultiPayTotalAmount(String(amt))}
                                isCompact={false}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Baris 4: Tabel Rincian Alokasi Tagihan & Diskon Kasuistik */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Rincian Alokasi Tagihan Calon Santri:
                    </label>
                    {multiPayBills.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {multiPayBillsSearch.trim()
                          ? `${filteredMultiPayBills.length} dari ${multiPayBills.length} Tagihan`
                          : `${multiPayBills.length} Tagihan`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {multiPayBills.length > 0 && (
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={multiPayBillsSearch}
                          onChange={(e) => setMultiPayBillsSearch(e.target.value)}
                          placeholder="Cari pos, nama, no reg, fase..."
                          className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 placeholder:text-slate-400"
                        />
                        {multiPayBillsSearch && (
                          <button
                            type="button"
                            onClick={() => setMultiPayBillsSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                            title="Bersihkan pencarian"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {multiPayBills.length > 0 && (
                      <button
                        type="button"
                        onClick={handleMultiPayAutoAllocateFifo}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs whitespace-nowrap"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        <span>⚡ Alokasikan Otomatis (FIFO)</span>
                      </button>
                    )}
                  </div>
                </div>

                {multiPaySelectedCandidateIds.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Silakan pilih calon santri di atas untuk melihat daftar tagihan aktif.
                  </div>
                ) : multiPayBills.length === 0 ? (
                  <div className="p-8 text-center text-emerald-700 text-xs font-semibold bg-emerald-50 rounded-xl border border-emerald-200">
                    Calon santri ini tidak memiliki tagihan aktif.
                  </div>
                ) : filteredMultiPayBills.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
                    <Search className="w-7 h-7 text-slate-300" />
                    <p className="text-xs text-slate-500 font-medium">
                      Tidak ada tagihan yang cocok dengan kata kunci <span className="font-bold text-slate-700">"{multiPayBillsSearch}"</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setMultiPayBillsSearch('')}
                      className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-emerald-600 shadow-2xs cursor-pointer transition"
                    >
                      Reset Filter Pencarian
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[960px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="px-3 py-2.5" style={{ minWidth: '180px' }}>Komponen Tagihan</th>
                          <th className="px-3 py-2.5" style={{ minWidth: '160px' }}>Jalur & No. Reg</th>
                          <th className="px-2.5 py-2.5 text-center" style={{ width: '70px' }}>Diskon</th>
                          <th className="px-3 py-2.5 text-right" style={{ minWidth: '120px' }}>Tagihan</th>
                          <th className="px-3 py-2.5 text-right">Sudah Bayar</th>
                          <th className="px-3 py-2.5 text-right">Sisa Piutang</th>
                          <th className="px-3 py-2.5 text-right" style={{ width: '200px', minWidth: '190px' }}>Bayar Sekarang (Rp)</th>
                          <th className="px-3 py-2.5 text-right">Sisa Setelah Bayar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMultiPayBills.map((bill) => {
                          const billTotal = parseFloat(bill.amount || 0);
                          const billPaid = parseFloat(bill.paid_amount || 0);
                          const discInfo = getMultiPayBillDiscountInfo(bill);
                          const allocated = parseFloat(multiPayAllocations[bill.id] || 0);
                          const remAfter = Math.max(0, discInfo.effectiveRem - allocated);

                          return (
                            <tr key={`rec-bill-row-${bill.id}`} className={`hover:bg-slate-50 transition ${discInfo.enabled ? 'bg-emerald-50/20' : ''}`}>
                              {/* 1. Komponen Tagihan */}
                              <td className="px-3 py-2.5 align-top">
                                <div className="flex flex-col gap-1">
                                  {multiPaySelectedCandidateIds.length > 1 && (
                                    <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      👤 {bill.registrant_name_snapshot || `Santri #${bill.candidate_id}`}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <FeeTypeBadge item={bill} />
                                    <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                      bill.billing_phase === 'registration_fee'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}>
                                      {bill.billing_phase === 'registration_fee' ? 'Biaya Pendaftaran' : 'Uang Pangkal / Daftar Ulang'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Jatuh Tempo: {bill.due_date ? formatDate(bill.due_date) : '-'}
                                  </div>
                                </div>
                              </td>

                              {/* 2. Jalur & No. Reg */}
                              <td className="px-3 py-2.5 align-top">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-semibold text-slate-800 text-[11px]">
                                    {bill.registration_number_snapshot || '-'}
                                  </span>
                                  <span className="text-[10.5px] text-slate-500">
                                    {bill.registrant_name_snapshot}
                                  </span>
                                </div>
                              </td>

                              {/* 3. Diskon Checkbox */}
                              <td className="px-2.5 py-2.5 align-top text-center">
                                <div className="pt-2">
                                  <label className="inline-flex flex-col items-center justify-center cursor-pointer p-1.5 rounded-xl hover:bg-emerald-100/60 transition group">
                                    <input
                                      type="checkbox"
                                      checked={discInfo.enabled}
                                      onChange={() => handleMultiPayToggleDiscount(bill.id)}
                                      className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span className={`text-[9px] font-bold mt-1 transition ${discInfo.enabled ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                      {discInfo.enabled ? 'Aktif' : 'Diskon'}
                                    </span>
                                  </label>
                                </div>
                              </td>

                              {/* 4. Tagihan (Total) & Tagihan Setelah Diskon */}
                              <td className="px-3 py-2.5 align-top text-right num-cell">
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`font-bold ${discInfo.enabled && discInfo.discountAmount > 0 ? 'line-through text-slate-400 text-[11px]' : 'text-slate-800'}`}>
                                    {formatCurrency(billTotal)}
                                  </span>
                                  {discInfo.enabled && discInfo.discountAmount > 0 && (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                        Potongan: -{formatCurrency(discInfo.discountAmount)}
                                      </span>
                                      <div className="text-[11px] font-black text-emerald-950 bg-emerald-50/70 px-1.5 py-0.5 rounded border border-emerald-200">
                                        <span className="text-[9.5px] text-emerald-700 font-sans block font-semibold">Tagihan Bersih:</span>
                                        {formatCurrency(discInfo.netBill)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 5. Sudah Bayar */}
                              <td className="px-3 py-2.5 align-top text-right num-cell text-emerald-700 font-semibold">
                                {formatCurrency(billPaid)}
                              </td>

                              {/* 6. Sisa Piutang (Setelah Diskon) */}
                              <td className="px-3 py-2.5 align-top text-right num-cell font-bold text-rose-600">
                                <div className="flex flex-col items-end">
                                  <span>{formatCurrency(discInfo.effectiveRem)}</span>
                                  {discInfo.enabled && discInfo.discountAmount > 0 && (
                                    <span className="text-[9px] text-slate-400 font-sans font-normal">
                                      (setelah diskon)
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 7. Bayar Sekarang (Rp) & Tombol Penuh di Bawah Input */}
                              <td className="px-3 py-2.5 align-top text-right" style={{ width: '200px', minWidth: '190px' }}>
                                <div className="space-y-1.5">
                                  <input
                                    type="number"
                                    value={multiPayAllocations[bill.id] || ''}
                                    onChange={(e) => handleMultiPayAllocationChange(bill.id, e.target.value)}
                                    placeholder="0"
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-right tnum font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs shadow-2xs"
                                  />

                                  {/* Tombol Penuh tepat di bawah isian nominal */}
                                  <div className="flex items-center justify-between gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleMultiPayPayFullRow(bill)}
                                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded text-[9.5px] font-bold cursor-pointer transition shadow-2xs active:scale-95 flex items-center gap-1"
                                      title="Bayar Penuh Sisa Piutang Pos Ini (Setelah Diskon)"
                                    >
                                      <span>⚡ Penuh</span>
                                    </button>
                                    {allocated > 0 && (
                                      <span className="text-[9.5px] font-semibold text-emerald-600">
                                        {allocated >= discInfo.effectiveRem ? 'Lunas' : 'Sebagian'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Input Diskon jika Checkbox Diskon aktif */}
                                  {discInfo.enabled && (
                                    <div className="p-2 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-1.5 text-left text-[11px] shadow-xs animate-in fade-in slide-in-from-top-1 duration-150">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-emerald-950 text-[10px] flex items-center gap-1">
                                          <span>🏷️ Mode:</span>
                                        </span>
                                        <div className="inline-flex rounded-lg bg-emerald-100/80 p-0.5 text-[9.5px] font-bold">
                                          <button
                                            type="button"
                                            onClick={() => handleMultiPayDiscountTypeChange(bill.id, 'percent')}
                                            className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                                              discInfo.type === 'percent'
                                                ? 'bg-emerald-700 text-white shadow-2xs'
                                                : 'text-emerald-800 hover:bg-emerald-200'
                                            }`}
                                          >
                                            % Persen
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleMultiPayDiscountTypeChange(bill.id, 'nominal')}
                                            className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                                              discInfo.type === 'nominal'
                                                ? 'bg-emerald-700 text-white shadow-2xs'
                                                : 'text-emerald-800 hover:bg-emerald-200'
                                            }`}
                                          >
                                            Rp Nominal
                                          </button>
                                        </div>
                                      </div>

                                      {/* Input Nilai Diskon */}
                                      <div>
                                        {discInfo.type === 'percent' ? (
                                          <div className="relative">
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="any"
                                              value={discInfo.percent}
                                              onChange={(e) => handleMultiPayDiscountValueChange(bill.id, e.target.value)}
                                              placeholder="0"
                                              className="w-full pl-2 pr-6 py-1 bg-white border border-emerald-300 rounded-lg text-right tnum font-bold text-emerald-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none shadow-2xs"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700 pointer-events-none">%</span>
                                          </div>
                                        ) : (
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 pointer-events-none">Rp</span>
                                            <input
                                              type="number"
                                              min="0"
                                              max={billTotal}
                                              value={discInfo.amount}
                                              onChange={(e) => handleMultiPayDiscountValueChange(bill.id, e.target.value)}
                                              placeholder="0"
                                              className="w-full pl-7 pr-2 py-1 bg-white border border-emerald-300 rounded-lg text-right tnum font-bold text-emerald-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none shadow-2xs"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* Alasan Diskon */}
                                      <input
                                        type="text"
                                        value={discInfo.reason}
                                        onChange={(e) => handleMultiPayDiscountReasonChange(bill.id, e.target.value)}
                                        placeholder="Alasan diskon kasuistik..."
                                        className="w-full px-2 py-0.5 bg-white border border-emerald-200 rounded-lg text-[10px] text-slate-700 placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 8. Sisa Setelah Bayar */}
                              <td className="px-3 py-2.5 align-top text-right num-cell font-bold text-slate-800">
                                {formatCurrency(remAfter)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Baris 5: Live Allocation Indicator */}
              <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Total Diterima:</span>
                    <div className="tnum font-black text-slate-800 text-sm">
                      {formatCurrency(multiPayTotalAmount || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Teralokasi:</span>
                    <div className="tnum font-black text-emerald-700 text-sm">
                      {formatCurrency(multiPayTotalAllocated)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Sisa Belum Teralokasi:</span>
                  <div className={`tnum font-black text-sm ${Math.abs(multiPayUnallocated) < 0.01 ? 'text-emerald-700' : multiPayUnallocated > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                    {formatCurrency(multiPayUnallocated)}
                  </div>
                </div>
              </div>

              {/* Baris 6: Keterangan / Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan Transaksi</label>
                <input
                  type="text"
                  placeholder="Contoh: Pembayaran Uang Pangkal dan Formulir PPDB..."
                  value={multiPayNotes}
                  onChange={(e) => setMultiPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs cursor-pointer transition"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submittingMultiPay}
                  onClick={() => handleExecuteMultiPay(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  {submittingMultiPay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submittingMultiPay ? 'Menyimpan...' : 'Simpan Pembayaran Saja'}</span>
                </button>

                <button
                  type="button"
                  disabled={submittingMultiPay}
                  onClick={() => handleExecuteMultiPay(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition flex items-center gap-1.5"
                >
                  {submittingMultiPay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  <span>{submittingMultiPay ? 'Memproses...' : 'Simpan & Cetak Kwitansi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: CREATE EXPENSE PPDB */}
      {/* ============================================================ */}
      {createExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-rose-600">
                  <TrendingDown className="w-4 h-4" />
                  <span>Catat Pengeluaran Program PPDB</span>
                </h3>
                <p className="text-[11px] text-slate-400">Realisasi Anggaran TA {currentTargetAy.name}</p>
              </div>
              <button onClick={() => setCreateExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Tanggal Pengeluaran *</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Kategori / Pos Program PPDB</label>
                <select
                  value={expenseForm.category_name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="Promosi & Iklan PPDB">Promosi, Iklan Digital & Spanduk PPDB</option>
                  <option value="Cetak Formulir & Brosur">Cetak Brosur, Formulir & Map PSB</option>
                  <option value="Konsumsi & Pelaksanaan Tes">Konsumsi & Pelaksanaan Tes Masuk</option>
                  <option value="Pengadaan Seragam Awal">Pengadaan Seragam Awal Calon Santri</option>
                  <option value="Honorarium Tim Penguji">Honorarium Tim Penguji & Panitia PPDB</option>
                  <option value="Operasional Lainnya">Operasional Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Akun Kas / Bank Pengeluaran *</label>
                <select
                  value={expenseForm.cash_account_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, cash_account_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  required
                >
                  <option value="">-- Pilih Akun Kas/Bank --</option>
                  {cashAccounts.map((ca) => (
                    <option key={ca.id} value={ca.id}>
                      {ca.name} ({ca.account_number || ca.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Nominal Pengeluaran (Rp) *</label>
                <input
                  type="number"
                  value={expenseForm.amount || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-rose-600"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Keterangan Pengeluaran:</label>
                <textarea
                  rows="2"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Contoh: Pembayaran cetak 1000 eks brosur dan spanduk PPDB"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-2xs"
                >
                  {submittingExpense && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Pengeluaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CELL EDIT / PUBLISH MODAL (MATRIKS) */}
      {/* ============================================================ */}
      {cellModalOpen && selectedCellInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">
                      {selectedCellInfo.cell.fee_type_name || 'Tagihan Biaya PPDB'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      PPDB TA {currentTargetAy.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {selectedCellInfo.row.full_name} ({selectedCellInfo.row.registration_number || selectedCellInfo.row.nis || '-'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCellModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSavePublishCell} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Status Banner */}
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-medium">Status Tagihan:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                    selectedCellInfo.cell.is_paid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    selectedCellInfo.cell.is_partially_paid ? 'bg-teal-100 text-teal-800 border border-teal-300' :
                    selectedCellInfo.cell.is_published ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedCellInfo.cell.is_paid ? 'LUNAS' : selectedCellInfo.cell.is_partially_paid ? 'BAYAR SEBAGIAN' : selectedCellInfo.cell.is_published ? 'TERBIT (BELUM BAYAR)' : 'DRAF / ACUAN PENETAPAN'}
                  </span>
                </div>
                {selectedCellInfo.cell.paid_amount > 0 && (
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Sudah Terbayar:</span>
                    <span className="font-mono font-bold text-emerald-700">{formatCurrency(selectedCellInfo.cell.paid_amount)}</span>
                  </div>
                )}
              </div>

              {/* Nominal Tagihan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Tagihan Kotor (Rp) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={cellFormData.amount}
                  onChange={(e) => setCellFormData({ ...cellFormData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  placeholder="0"
                  required
                />
              </div>

              {/* Tanggal Penagihan & Jatuh Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Tagihan (DD/MM/YYYY) *</label>
                  <DatePickerField
                    value={cellFormData.bill_date}
                    onChange={(val) => setCellFormData({ ...cellFormData, bill_date: val })}
                    placeholder="DD/MM/YYYY"
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Jatuh Tempo (DD/MM/YYYY)</label>
                  <DatePickerField
                    value={cellFormData.due_date}
                    onChange={(val) => setCellFormData({ ...cellFormData, due_date: val })}
                    placeholder="DD/MM/YYYY"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Pilihan Diskon / Keringanan Khusus */}
              <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cellFormData.has_discount}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setCellFormData({
                          ...cellFormData,
                          has_discount: checked
                        });
                      }}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-700" /> Terapkan Diskon / Keringanan
                    </span>
                  </label>

                  {cellFormData.has_discount && (
                    <div className="flex items-center bg-white border border-amber-200 rounded-lg p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setCellFormData({ ...cellFormData, discount_type: 'amount' })}
                        className={`px-2 py-0.5 rounded-md transition ${cellFormData.discount_type === 'amount' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Nominal (Rp)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCellFormData({ ...cellFormData, discount_type: 'percentage' })}
                        className={`px-2 py-0.5 rounded-md transition ${cellFormData.discount_type === 'percentage' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Persentase (%)
                      </button>
                    </div>
                  )}
                </div>

                {cellFormData.has_discount && (
                  <div className="space-y-3 pt-1 border-t border-amber-100 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        {cellFormData.discount_type === 'percentage' ? (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Persentase Diskon (%)</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={cellFormData.discount_percent}
                                onChange={(e) => {
                                  const p = parseFloat(e.target.value || 0);
                                  const base = parseFloat(cellFormData.amount || 0);
                                  const calcAmount = Math.round((p / 100) * base);
                                  setCellFormData({
                                    ...cellFormData,
                                    discount_percent: e.target.value,
                                    discount_amount: calcAmount
                                  });
                                }}
                                className="w-full pl-3 pr-8 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-xs"
                                placeholder="Contoh: 10"
                              />
                              <span className="absolute right-2.5 top-1.5 font-bold text-slate-400 text-xs">%</span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nominal Diskon (Rp)</label>
                            <input
                              type="number"
                              min="0"
                              value={cellFormData.discount_amount}
                              onChange={(e) => setCellFormData({ ...cellFormData, discount_amount: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold font-mono text-xs"
                              placeholder="0"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Alasan Diskon / Potongan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Keringanan Khusus / Beasiswa"
                          value={cellFormData.discount_reason}
                          onChange={(e) => setCellFormData({ ...cellFormData, discount_reason: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Catatan Tagihan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tagihan</label>
                <input
                  type="text"
                  placeholder="Catatan tagihan calon santri..."
                  value={cellFormData.notes}
                  onChange={(e) => setCellFormData({ ...cellFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {selectedCellInfo.cell.is_published && !selectedCellInfo.cell.is_paid && (
                  <button
                    type="button"
                    onClick={handleOpenCancelModal}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold text-xs transition"
                  >
                    Batalkan Tagihan
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setCellModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCell}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {submittingCell ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Simpan &amp; Terbitkan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: BATALKAN TAGIHAN SEL */}
      {/* ============================================================ */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <Ban className="w-5 h-5 text-rose-600" />
                <span>Konfirmasi Void / Pembatalan Tagihan Resmi</span>
              </h3>
              <button onClick={() => setCancelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteCancelCell} className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Pembatalan tagihan (Void) akan menghapus saldo piutang calon santri ini, menandai status tagihan menjadi <strong>Dibatalkan</strong>, dan mencatat jurnal pembalik pada sistem pembukuan.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Void / Pembatalan *</label>
                <DatePickerField
                  value={cancelFormData.cancel_date}
                  onChange={(val) => setCancelFormData({ ...cancelFormData, cancel_date: val })}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Void (Wajib Audit Trail) *</label>
                <textarea
                  rows="3"
                  required
                  value={cancelFormData.cancel_reason}
                  onChange={(e) => setCancelFormData({ ...cancelFormData, cancel_reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="Contoh: Kesalahan penetapan skema / Calon santri mengundurkan diri resmi..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                >
                  {submittingCancel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Eksekusi Void Tagihan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PENERBITAN MASSAL KOLOM */}
      {/* ============================================================ */}
      {columnPublishModalOpen && targetColumnInfo && (
        <Drawer
          isOpen={columnPublishModalOpen && !!targetColumnInfo}
          onClose={() => setColumnPublishModalOpen(false)}
          title={`Terbitkan Tagihan Massal: ${targetColumnInfo.label}`}
          subtitle={`Komponen ${targetColumnInfo.badge_text || 'Kolom Tagihan'} • TA ${currentTargetAy?.name || ''}`}
          size="2xl"
        >
          <div className="p-5 space-y-4 text-xs">
            {/* Info Target Santri */}
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-indigo-900 block">Sasaran Penerbitan Kolom:</span>
                  <span className="font-bold text-indigo-950 text-sm">
                    {selectedMatrixRowIds.size > 0
                      ? `${selectedMatrixRowIds.size} Calon Santri Terpilih`
                      : `Seluruh Calon Santri (${matrixData.rows?.length || 0} Santri)`}
                  </span>
                </div>
                <Users className="w-8 h-8 text-indigo-400" />
              </div>

              {/* Tanggal Penagihan & Jatuh Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Tagihan (DD/MM/YYYY) *</label>
                  <DatePickerField
                    value={columnPublishFormData.bill_date}
                    onChange={(val) => setColumnPublishFormData({ ...columnPublishFormData, bill_date: val })}
                    placeholder="DD/MM/YYYY"
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Jatuh Tempo (DD/MM/YYYY)</label>
                  <DatePickerField
                    value={columnPublishFormData.due_date}
                    onChange={(val) => setColumnPublishFormData({ ...columnPublishFormData, due_date: val })}
                    placeholder="DD/MM/YYYY"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Diskon Massal Kolom */}
              <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={columnPublishFormData.has_discount}
                      onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, has_discount: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-700" /> Terapkan Diskon Serentak pada Kolom Ini
                    </span>
                  </label>

                  {columnPublishFormData.has_discount && (
                    <div className="flex items-center bg-white border border-amber-200 rounded-lg p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setColumnPublishFormData({ ...columnPublishFormData, discount_type: 'amount' })}
                        className={`px-2 py-0.5 rounded-md transition ${columnPublishFormData.discount_type === 'amount' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Nominal (Rp)
                      </button>
                      <button
                        type="button"
                        onClick={() => setColumnPublishFormData({ ...columnPublishFormData, discount_type: 'percentage' })}
                        className={`px-2 py-0.5 rounded-md transition ${columnPublishFormData.discount_type === 'percentage' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Persentase (%)
                      </button>
                    </div>
                  )}
                </div>

                {columnPublishFormData.has_discount && (
                  <div className="space-y-3 pt-1 border-t border-amber-100 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        {columnPublishFormData.discount_type === 'percentage' ? (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Persentase Diskon (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={columnPublishFormData.discount_percent}
                              onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, discount_percent: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-xs"
                              placeholder="10"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nominal Diskon (Rp)</label>
                            <input
                              type="number"
                              min="0"
                              value={columnPublishFormData.discount_amount}
                              onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, discount_amount: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold font-mono text-xs"
                              placeholder="0"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Alasan Diskon Kolom</label>
                        <input
                          type="text"
                          placeholder="Promo PPDB / Keringanan Masuk"
                          value={columnPublishFormData.discount_reason}
                          onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, discount_reason: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Catatan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Operasional Penerbitan</label>
                <input
                  type="text"
                  placeholder="Catatan penerbitan massal kolom..."
                  value={columnPublishFormData.notes}
                  onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setColumnPublishModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteColumnPublish}
                  disabled={submittingColumnPublish}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingColumnPublish ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>Eksekusi Penerbitan Kolom</span>
                </button>
              </div>
          </div>
        </Drawer>
      )}

      {/* ============================================================ */}
      {/* MODAL: IMPORT EXCEL KOLOM PPDB */}
      {/* ============================================================ */}
      {columnImportModalOpen && targetImportColumnInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800">Import Data Tagihan PPDB (Excel)</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${targetImportColumnInfo.badge_color || 'bg-blue-100 text-blue-800 border-indigo-200'}`}>
                      {targetImportColumnInfo.badge_text || 'Kolom PPDB'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Kolom Target: <span className="font-bold text-slate-700">{targetImportColumnInfo.label}</span> • TA Sasaran {currentTargetAy.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setColumnImportModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Step 1: Download Format */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center">1</span>
                      <h4 className="font-bold text-blue-950 text-xs">Identitas &amp; Unduh Format Excel</h4>
                    </div>
                    <p className="text-[11px] text-blue-900 leading-relaxed">
                      Satu berkas Excel berlaku <b>khusus untuk kolom ini pada Tahun Ajaran Sasaran terkait</b>. Baris 1-5 memuat identitas dokumen verifikasi otomatis.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadColumnTemplate(targetImportColumnInfo)}
                    className="shrink-0 px-4 py-2.5 bg-white border border-blue-300 hover:border-blue-600 hover:bg-indigo-50/70 text-indigo-700 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-2xs hover:shadow-xs"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>Unduh Format Excel (Terisi Data)</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Upload Excel */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white font-bold text-[11px] flex items-center justify-center">2</span>
                    <h4 className="font-bold text-slate-800 text-xs">Unggah Berkas Excel (.xlsx / .xls)</h4>
                  </div>
                  {importFileName && (
                    <button
                      type="button"
                      onClick={() => {
                        setImportParsedRows([]);
                        setImportFileValidation(null);
                        setImportFileName('');
                        if (importFileInputRef.current) importFileInputRef.current.value = '';
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold underline"
                    >
                      Hapus &amp; Unggah Ulang
                    </button>
                  )}
                </div>

                <div
                  onClick={() => importFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-xl p-5 text-center cursor-pointer transition group"
                >
                  <input
                    type="file"
                    ref={importFileInputRef}
                    accept=".xlsx, .xls, .csv"
                    onChange={handleImportFileUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 flex items-center justify-center mb-2 transition">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  {importFileName ? (
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{importFileName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Klik di sini untuk mengganti berkas Excel</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-700 text-xs">Pilih atau Seret Berkas Excel ke Sini</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Mendukung format .xlsx dan .xls (Kolom No. Registrasi, Nama, Nominal, Tgl Tagihan, Jatuh Tempo, Catatan)</p>
                    </div>
                  )}
                </div>

                {importFileValidation && (
                  <div>
                    {importFileValidation.isValid ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Identitas Dokumen &amp; Format Terverifikasi Valid</span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Tahun Ajaran Sasaran: <b>{currentTargetAy.name}</b> • Kolom: <b>{targetImportColumnInfo.label}</b> • Terbaca: <b>{importFileValidation.totalRows} baris ({importFileValidation.validRows} siap diproses: {importFileValidation.newRows} baru, {importFileValidation.updatedRows} ditimpa)</b>
                        </p>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Peringatan Validasi Berkas</span>
                        </div>
                        <p className="text-[11px] text-rose-800 leading-relaxed">
                          {importFileValidation.errorMsg}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Review Data Preview Table (Ketika Data Terbaca) */}
              {importParsedRows.length > 0 && (
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">3</span>
                      <h4 className="font-bold text-slate-800 text-xs">Review Data Calon Santri yang Akan Diinput ({importParsedRows.length} Data)</h4>
                    </div>

                    {/* Filter Status & Search */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setImportStatusFilter('all')}
                          className={`px-2 py-0.5 rounded-md transition ${importStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                        >
                          Semua ({importParsedRows.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportStatusFilter('processable')}
                          className={`px-2 py-0.5 rounded-md transition ${importStatusFilter === 'processable' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}
                          title="Baru atau ada perubahan data yang akan ditimpa"
                        >
                          Baru/Ditimpa ({importParsedRows.filter((r) => r.change_status === 'new' || r.change_status === 'updated').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportStatusFilter('unchanged')}
                          className={`px-2 py-0.5 rounded-md transition ${importStatusFilter === 'unchanged' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600'}`}
                          title="Data sama persis dengan yang ada di sistem (tidak diubah)"
                        >
                          Sama ({importParsedRows.filter((r) => r.change_status === 'unchanged').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportStatusFilter('zero')}
                          className={`px-2 py-0.5 rounded-md transition ${importStatusFilter === 'zero' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'}`}
                          title="Nominal 0 atau kosong (dilewati, tidak diinput)"
                        >
                          Nominal 0 ({importParsedRows.filter((r) => r.change_status === 'skipped_zero').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportStatusFilter('invalid')}
                          className={`px-2 py-0.5 rounded-md transition ${importStatusFilter === 'invalid' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'}`}
                          title="Calon santri tidak ditemukan"
                        >
                          Masalah ({importParsedRows.filter((r) => r.change_status === 'invalid').length})
                        </button>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari santri/No. Reg..."
                          value={importSearchFilter}
                          onChange={(e) => setImportSearchFilter(e.target.value)}
                          className="pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] w-36 focus:w-48 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-[10px] text-slate-500 font-medium">Total Baris</p>
                      <p className="text-sm font-bold text-slate-800">{importParsedRows.length}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <p className="text-[10px] text-emerald-700 font-medium">Baru / Ditimpa</p>
                      <p className="text-sm font-bold text-emerald-800">
                        {importParsedRows.filter((r) => r.change_status === 'new' || r.change_status === 'updated').length}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-100 border border-slate-300 text-center">
                      <p className="text-[10px] text-slate-600 font-medium">Sama (Tidak Diubah)</p>
                      <p className="text-sm font-bold text-slate-700">
                        {importParsedRows.filter((r) => r.change_status === 'unchanged').length}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-center">
                      <p className="text-[10px] text-amber-700 font-medium">Nominal 0 (Dilewati)</p>
                      <p className="text-sm font-bold text-amber-800">
                        {importParsedRows.filter((r) => r.change_status === 'skipped_zero').length}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-center col-span-2 sm:col-span-1">
                      <p className="text-[10px] text-indigo-700 font-medium">Total Akumulasi</p>
                      <p className="text-xs font-bold font-mono text-blue-900 truncate">
                        Rp {importParsedRows.reduce((acc, r) => acc + (r.is_valid && r.amount > 0 ? parseFloat(r.amount || 0) : 0), 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {/* Review Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 text-center w-10">No</th>
                          <th className="p-2.5 w-32">Status Perubahan</th>
                          <th className="p-2.5 w-28">No. Registrasi</th>
                          <th className="p-2.5">Calon Santri</th>
                          <th className="p-2.5 w-24">Jalur</th>
                          <th className="p-2.5 text-right w-28">Nominal (Rp)</th>
                          <th className="p-2.5 text-center w-24">Tgl Tagihan</th>
                          <th className="p-2.5 text-center w-24">Jatuh Tempo</th>
                          <th className="p-2.5 max-w-[140px]">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importParsedRows
                          .filter((r) => {
                            if (importStatusFilter === 'processable' && r.change_status !== 'new' && r.change_status !== 'updated') return false;
                            if (importStatusFilter === 'unchanged' && r.change_status !== 'unchanged') return false;
                            if (importStatusFilter === 'zero' && r.change_status !== 'skipped_zero') return false;
                            if (importStatusFilter === 'invalid' && r.change_status !== 'invalid') return false;
                            if (importSearchFilter.trim()) {
                              const q = importSearchFilter.trim().toLowerCase();
                              const matchReg = String(r.registration_number || '').toLowerCase().includes(q);
                              const matchName = String(r.candidate_name || '').toLowerCase().includes(q);
                              const matchProcess = String(r.process_name || '').toLowerCase().includes(q);
                              if (!matchReg && !matchName && !matchProcess) return false;
                            }
                            return true;
                          })
                          .map((r, idx) => (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50 transition ${
                                r.change_status === 'invalid'
                                  ? 'bg-rose-50/50'
                                  : r.change_status === 'skipped_zero'
                                    ? 'bg-amber-50/30'
                                    : r.change_status === 'updated'
                                      ? 'bg-indigo-50/30'
                                      : idx % 2 === 1
                                        ? 'bg-slate-50/30'
                                        : 'bg-white'
                              }`}
                            >
                              <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{r.rowIdx || idx + 1}</td>
                              <td className="p-2">
                                {r.change_status === 'new' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <Sparkles className="w-3 h-3 text-emerald-600" /> Data Baru
                                  </span>
                                ) : r.change_status === 'updated' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800" title={r.diff_summary}>
                                    <Edit2 className="w-3 h-3 text-indigo-600" /> Ditimpa
                                  </span>
                                ) : r.change_status === 'unchanged' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600" title={r.diff_summary}>
                                    <Check className="w-3 h-3 text-slate-500" /> Tidak Diubah
                                  </span>
                                ) : r.change_status === 'skipped_zero' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800" title="Nominal 0/kosong dilewati">
                                    <Info className="w-3 h-3 text-amber-600" /> Dilewati (0)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800" title={r.validation_error}>
                                    <XCircle className="w-3 h-3 text-rose-600" /> Error
                                  </span>
                                )}
                              </td>
                              <td className="p-2 font-mono text-slate-600 text-[11px]">{r.registration_number || '-'}</td>
                              <td className="p-2 font-bold text-slate-800 truncate max-w-[200px]" title={r.candidate_name}>
                                {r.candidate_name}
                                {r.diff_summary && (
                                  <span className="block text-[10px] text-indigo-600 font-normal truncate">{r.diff_summary}</span>
                                )}
                                {!r.is_valid && r.validation_error && (
                                  <span className="block text-[10px] text-rose-600 font-normal">{r.validation_error}</span>
                                )}
                              </td>
                              <td className="p-2 text-slate-600 text-[11px]">{r.process_name || '-'}</td>
                              <td className={`p-2 text-right font-mono font-bold text-[11px] ${r.amount <= 0 ? 'text-slate-400' : 'text-slate-900'}`}>
                                Rp {parseFloat(r.amount || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="p-2 text-center font-mono text-[11px] text-slate-600">{r.bill_date ? formatDateToDMY(r.bill_date) : '-'}</td>
                              <td className="p-2 text-center font-mono text-[11px] text-slate-600">{r.due_date ? formatDateToDMY(r.due_date) : '-'}</td>
                              <td className="p-2 text-slate-500 text-[11px] max-w-[140px] truncate" title={r.notes}>{r.notes || '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-5 border-t border-slate-100 shrink-0 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setColumnImportModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition"
              >
                Batal
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={
                    submittingImport ||
                    importParsedRows.length === 0 ||
                    !importFileValidation?.isValid ||
                    importParsedRows.filter((r) => r.is_valid && r.amount > 0 && (r.change_status === 'new' || r.change_status === 'updated')).length === 0
                  }
                  className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {submittingImport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4 text-blue-100" />}
                  <span>
                    Eksekusi Import (
                    {importParsedRows.filter((r) => r.is_valid && r.amount > 0 && (r.change_status === 'new' || r.change_status === 'updated')).length} Data: {importParsedRows.filter((r) => r.change_status === 'new').length} Baru, {importParsedRows.filter((r) => r.change_status === 'updated').length} Ditimpa)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DETAIL TAGIHAN PPDB */}
      {/* ============================================================ */}
      {detailModalOpen && selectedBillDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Detail Tagihan PPDB #{selectedBillDetail.id}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedBillDetail.registrant_name_snapshot} ({selectedBillDetail.registration_number_snapshot || '-'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Komponen Biaya:</span>
                  <span className="font-bold text-slate-800">{selectedBillDetail.fee_type_name || 'Uang Pangkal PPDB'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tahun Ajaran Sasaran:</span>
                  <span className="font-bold text-slate-800">T.A. {currentTargetAy.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Tagihan:</span>
                  <span className="font-mono font-bold text-slate-800">{formatDateToDMY(selectedBillDetail.bill_date || selectedBillDetail.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jatuh Tempo:</span>
                  <span className="font-mono font-bold text-rose-600">{formatDateToDMY(selectedBillDetail.due_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Tagihan:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedBillDetail.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                    selectedBillDetail.status === 'partially_paid' ? 'bg-teal-100 text-teal-800' :
                    selectedBillDetail.status === 'draft' ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedBillDetail.status?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>Nominal Kotor:</span>
                  <span className="font-mono font-bold">{formatCurrency(selectedBillDetail.amount)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Diskon / Potongan:</span>
                  <span className="font-mono font-bold">{selectedBillDetail.discount_amount > 0 ? `- ${formatCurrency(selectedBillDetail.discount_amount)}` : 'Rp 0'}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-t border-indigo-200/60 pt-2 text-sm">
                  <span>Total Tagihan Bersih:</span>
                  <span className="font-mono text-indigo-700">
                    {formatCurrency(Math.max(0, (selectedBillDetail.amount || 0) - (selectedBillDetail.discount_amount || 0)))}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Sudah Dibayar:</span>
                  <span className="font-mono">{formatCurrency(selectedBillDetail.paid_amount || 0)}</span>
                </div>
              </div>

              {selectedBillDetail.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Catatan:</span>
                  <p className="text-slate-700">{selectedBillDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: REVISI TAGIHAN PPDB (AUDIT TRAIL) */}
      {/* ============================================================ */}
      {reviseModalOpen && revisingBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-amber-600">
                <Edit2 className="w-4 h-4" />
                <span>Revisi Tagihan PPDB #{revisingBill.id}</span>
              </h3>
              <button onClick={() => setReviseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReviseBill} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">{revisingBill.registrant_name_snapshot}</div>
                <div className="text-[11px] text-slate-500">Komponen: {revisingBill.fee_type_name || 'Uang Pangkal'}</div>
                <div className="text-xs font-mono font-bold text-slate-700">Nominal Awal: {formatCurrency(revisingBill.amount)}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Tagihan Baru (Rp) *</label>
                <input
                  type="number"
                  min="0"
                  value={reviseFormData.new_amount}
                  onChange={(e) => setReviseFormData({ ...reviseFormData, new_amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Jatuh Tempo Baru</label>
                <DatePickerField
                  value={reviseFormData.new_due_date}
                  onChange={(val) => setReviseFormData({ ...reviseFormData, new_due_date: val })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Revisi (Wajib Audit Trail) *</label>
                <textarea
                  rows="3"
                  required
                  value={reviseFormData.revision_reason}
                  onChange={(e) => setReviseFormData({ ...reviseFormData, revision_reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="Contoh: Koreksi nominal tagihan berdasarkan SK keringanan yayasan..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingRevise}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-600/20"
                >
                  {submittingRevise && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Revisi Tagihan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: BROADCAST PENGINGAT TAGIHAN PPDB */}
      {/* ============================================================ */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Broadcast Pengingat Tagihan PPDB</h3>
              </div>
              <button onClick={() => setBroadcastModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Calon Santri Penerima Pengingat</label>
                <select
                  value={broadcastFilterMode}
                  onChange={(e) => setBroadcastFilterMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  <option value="overdue">Tagihan Lewat Jatuh Tempo (Prioritas Utama)</option>
                  <option value="unpaid_all">Semua Calon Santri yang Belum Lunas</option>
                  <option value="selected">Tagihan Terpilih Saja ({broadcastSelectedBillIds.length})</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template / Pesan Pengingat Tagihan</label>
                <textarea
                  rows="4"
                  value={broadcastCustomMessage}
                  onChange={(e) => setBroadcastCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed"
                  placeholder="Isi pesan notifikasi WhatsApp / Portal Orang Tua..."
                />
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Pesan akan dikirimkan ke nomor WhatsApp calon wali santri dan muncul sebagai notifikasi di Portal Orang Tua.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBroadcast}
                  disabled={submittingBroadcast}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submittingBroadcast ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Kirim Broadcast Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL KWITANSI RESMI PPDB */}
      {/* ============================================================ */}
      {receiptModalOpen && receiptData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Kwitansi Resmi Penerimaan Kas PPDB</h3>
                  <p className="text-[11px] font-mono text-indigo-600 font-bold">
                    {receiptData.payment?.receipt_number || receiptData.bill?.receipt_number || 'KWT-PPDB-OFFICIAL'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {Boolean(receiptData.payment?.is_void || receiptData.payment?.status === 'voided') && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-700">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>PERHATIAN: KWITANSI TELAH DIBATALKAN (VOID)</span>
                </div>
                <p className="text-[11px] text-rose-600">
                  Pembayaran ini telah dibatalkan pada <strong>{receiptData.payment?.voided_at || '-'}</strong>.<br />
                  {receiptData.payment?.void_reason && (
                    <span>Alasan: <em>"{receiptData.payment.void_reason}"</em></span>
                  )}
                </p>
              </div>
            )}

            <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Satuan Pendidikan:</span>
                <span className="font-bold text-slate-800 text-right">{receiptData.school_unit?.name || activeSchoolUnit?.name || 'Satuan Pendidikan Aldepos'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Calon Santri:</span>
                <span className="font-bold text-slate-800 text-right">{receiptData.bill?.registrant_name_snapshot || '-'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Nomor Registrasi:</span>
                <span className="font-mono font-bold text-slate-700">{receiptData.bill?.registration_number_snapshot || '-'}</span>
              </div>
              {receiptData.payment?.items && receiptData.payment.items.length > 1 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden my-2">
                  <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] text-slate-700">Rincian Pos Pembayaran Gabungan</div>
                  <table className="w-full text-left text-[11px]">
                    <tbody className="divide-y divide-slate-100">
                      {receiptData.payment.items.map((it, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="px-3 py-1.5 font-semibold text-slate-800">{it.fee_type_name}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-emerald-700 font-bold">{formatCurrency(it.amount_paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Komponen Biaya:</span>
                  <span className="font-semibold text-slate-800">{receiptData.bill?.fee_type_name || 'Uang Pangkal PPDB'}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Tanggal Setor:</span>
                <span className="font-mono">{receiptData.payment?.payment_date ? String(receiptData.payment.payment_date).slice(0, 10) : new Date().toISOString().slice(0, 10)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Metode / Akun Kas:</span>
                <span className="font-semibold text-slate-800">
                  {receiptData.payment?.payment_method === 'cash' ? 'Tunai Loket' : 'Transfer'} ({receiptData.payment?.cash_account_name || 'Kasir PPDB'})
                </span>
              </div>
              {receiptData.payment?.notes && (
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Catatan Transaksi:</span>
                  <span className="italic text-slate-700">{receiptData.payment.notes}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>Nominal Diterima:</span>
                <span className="text-emerald-700 font-mono">
                  {formatCurrency(receiptData.payment?.total_amount || receiptData.payment?.amount_paid || receiptData.bill?.paid_amount || 0)}
                </span>
              </div>
            </div>

            {/* Terbilang */}
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold italic border border-emerald-200">
              Terbilang: # {terbilang(receiptData.payment?.total_amount || receiptData.payment?.amount_paid || receiptData.bill?.paid_amount || 0)} Rupiah #
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => openPpdbReceiptInNewTab(receiptData, receiptData.school_unit?.name || activeSchoolUnit?.name)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Buka & Cetak Kwitansi Resmi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL KONFIRMASI VOID / BATALKAN PEMBAYARAN KASIR PPDB */}
      {/* ============================================================ */}
      {voidModalOpen && selectedPaymentForVoid && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Batalkan Pembayaran (Void) Kasir PPDB</h3>
                  <p className="text-[11px] font-mono text-rose-600 font-bold">
                    Kwitansi: {selectedPaymentForVoid.receipt_number || `KW-PPDB-${selectedPaymentForVoid.id}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoidModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Peringatan Kepatuhan Finansial Core Aldepos */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">Konsekuensi Pembatalan Transaksi:</div>
                <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                  <li>Sisa piutang tagihan calon santri akan otomatis <strong>dipulihkan</strong>.</li>
                  <li>Kwitansi resmi ini akan ditandai sebagai <strong>VOID / TIDAK BERLAKU</strong>.</li>
                  <li>Alasan pembatalan dan identitas kasir dicatat permanen di <strong>Audit Log Keuangan</strong>.</li>
                </ul>
              </div>
            </div>

            {/* Rincian Transaksi */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Calon Santri:</span>
                <span className="font-bold text-slate-800">{selectedPaymentForVoid.registrant_name_snapshot}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Komponen Biaya:</span>
                <span className="font-semibold text-slate-800">{selectedPaymentForVoid.fee_type_name || 'Uang Pangkal PPDB'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tanggal Pembayaran:</span>
                <span className="font-mono">{selectedPaymentForVoid.payment_date ? String(selectedPaymentForVoid.payment_date).slice(0, 10) : '-'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Metode / Kas:</span>
                <span className="font-semibold text-slate-800">
                  {selectedPaymentForVoid.payment_method === 'cash' ? 'Tunai' : 'Transfer'} ({selectedPaymentForVoid.cash_account_name || 'Kasir PPDB'})
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>Nominal Dibatalkan:</span>
                <span className="text-rose-600 font-mono">{formatCurrency(selectedPaymentForVoid.amount_paid)}</span>
              </div>
            </div>

            {/* Form Input Alasan Pembatalan (Wajib Diisi) */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                Alasan Pembatalan Transaksi (Wajib Diisi) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Contoh: Salah input akun transfer kasir, salah nominal, atau wali santri membatalkan pendaftaran..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
              />
              <p className="text-[10.5px] text-slate-400 italic">
                * Minimal 5 karakter. Wajib menjelaskan dasar pembatalan transaksi secara akurat untuk keperluan audit internal yayasan.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVoidModalOpen(false)}
                disabled={submittingVoid}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteVoid}
                disabled={submittingVoid || !voidReason || voidReason.trim().length < 5}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {submittingVoid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>{submittingVoid ? 'Memproses Void...' : 'Konfirmasi Batalkan (Void)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL REFUND 1: AJUKAN PENGEMBALIAN DANA (SISWA MUNDUR) */}
      {/* ============================================================ */}
      {refundRequestModal.open && (
        <Drawer
          isOpen={refundRequestModal.open}
          onClose={() => setRefundRequestModal((prev) => ({ ...prev, open: false }))}
          title={`Ajukan Pengembalian Dana (Refund)`}
          subtitle={refundRequestModal.bill ? `${refundRequestModal.bill.student_name || refundRequestModal.bill.registrant_name} (${refundRequestModal.bill.registration_number})` : ''}
          size="md"
        >
          <form onSubmit={handleSubmitRefundRequest} className="p-6 space-y-4">
            {/* Info Calon Santri & Pembayaran */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Nama Calon Santri:</span>
                <span className="font-bold text-slate-800">
                  {refundRequestModal.bill?.student_name || refundRequestModal.bill?.registrant_name}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>No. Registrasi:</span>
                <span className="font-mono font-semibold text-indigo-600">{refundRequestModal.bill?.registration_number}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Total Biaya Ditagihkan:</span>
                <span className="font-mono">{formatCurrency(refundRequestModal.bill?.total_amount || 0)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-xs font-bold text-emerald-700">
                <span>Total Kas Telah Dibayar:</span>
                <span className="font-mono">{formatCurrency(refundRequestModal.bill?.paid_amount || 0)}</span>
              </div>
            </div>

            {/* Form Rekening Tujuan */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Rekening Tujuan Transfer Wali</h4>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Bank Tujuan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BCA, Mandiri, BRI, BSI, BNI"
                  value={refundRequestModal.bank_name}
                  onChange={(e) => setRefundRequestModal((prev) => ({ ...prev, bank_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Rekening *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1234567890"
                    value={refundRequestModal.account_number}
                    onChange={(e) => setRefundRequestModal((prev) => ({ ...prev, account_number: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Atas Nama Rekening *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama pemilik rekening"
                    value={refundRequestModal.account_holder_name}
                    onChange={(e) => setRefundRequestModal((prev) => ({ ...prev, account_holder_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Santri Mengundurkan Diri *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan alasan pengunduran diri siswa secara jelas untuk audit trail..."
                  value={refundRequestModal.reason}
                  onChange={(e) => setRefundRequestModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
              <span className="font-bold">Perhatian:</span> Pengajuan refund ini akan berstatus <em>Menunggu Persetujuan</em> dan perlu disetujui oleh Bagian Keuangan / Pimpinan sebelum kas keluar dicairkan.
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRefundRequestModal((prev) => ({ ...prev, open: false }))}
                disabled={submittingRefund}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingRefund}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {submittingRefund ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>{submittingRefund ? 'Mengirim...' : 'Kirim Pengajuan Refund'}</span>
              </button>
            </div>
          </form>
        </Drawer>
      )}

      {/* ============================================================ */}
      {/* MODAL REFUND 2: PROSES PENCAIRAN REFUND (KAS KELUAR) */}
      {/* ============================================================ */}
      {refundProcessModal.open && (
        <Drawer
          isOpen={refundProcessModal.open}
          onClose={() => setRefundProcessModal((prev) => ({ ...prev, open: false }))}
          title={`Pencairan Kas Keluar Refund`}
          subtitle={refundProcessModal.bill ? `${refundProcessModal.bill.student_name || refundProcessModal.bill.registrant_name}` : ''}
          size="md"
        >
          <form onSubmit={handleSubmitProcessRefund} className="p-6 space-y-4">
            {/* Info Detail Tagihan & Rekening */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Calon Santri:</span>
                <span className="font-bold text-slate-800">
                  {refundProcessModal.bill?.student_name || refundProcessModal.bill?.registrant_name}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Total Dana Diterima:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatCurrency(refundProcessModal.bill?.paid_amount || 0)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-xs text-slate-700">
                <span>Rekening Tujuan:</span>
                <span className="font-semibold text-right">
                  {refundProcessModal.bill?.refund_bank_name} - {refundProcessModal.bill?.refund_bank_account_number}
                  <br />
                  <span className="text-[11px] text-slate-500 font-normal">a.n. {refundProcessModal.bill?.refund_account_holder_name}</span>
                </span>
              </div>
            </div>

            {/* Form Pilihan Akun Kas / Bank Pengeluaran */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sumber Rekening Kas / Bank Pengeluaran *
                </label>
                <select
                  required
                  value={refundProcessModal.cash_account_id}
                  onChange={(e) => setRefundProcessModal((prev) => ({ ...prev, cash_account_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Akun Kas / Bank Pengeluaran --</option>
                  {(cashAccounts || []).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} ({acc.account_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pencairan Kas *</label>
                <input
                  type="date"
                  required
                  value={refundProcessModal.processed_at}
                  onChange={(e) => setRefundProcessModal((prev) => ({ ...prev, processed_at: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan / No. Bukti Transfer</label>
                <textarea
                  rows={2}
                  placeholder="Masukkan nomor referensi transfer bank atau catatan transaksi..."
                  value={refundProcessModal.notes}
                  onChange={(e) => setRefundProcessModal((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-[11px] text-indigo-800">
              <span className="font-bold">Otomasi Akuntansi:</span> Sistem akan otomatis menghitung potongan pengunduran diri sesuai tanggal pencairan vs batas kebijakan, memotong saldo kas/bank terkait, dan menerbitkan jurnal penyesuaian pendapatan PPDB.
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRefundProcessModal((prev) => ({ ...prev, open: false }))}
                disabled={submittingRefund}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingRefund}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                {submittingRefund ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{submittingRefund ? 'Memproses...' : 'Konfirmasi & Cairkan Dana'}</span>
              </button>
            </div>
          </form>
        </Drawer>
      )}

      {/* ============================================================ */}
      {/* MODAL REFUND 3: TOLAK PENGAJUAN REFUND */}
      {/* ============================================================ */}
      {refundRejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Tolak Permohonan Refund</h3>
                <p className="text-xs text-slate-500">
                  {refundRejectModal.bill?.student_name || refundRejectModal.bill?.registrant_name}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Penolakan (Wajib Diisi) *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Jelaskan alasan penolakan refund..."
                value={refundRejectModal.reason}
                onChange={(e) => setRefundRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRefundRejectModal({ open: false, bill: null, reason: '' })}
                disabled={submittingRefund}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitRejectRefund}
                disabled={submittingRefund || !refundRejectModal.reason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {submittingRefund ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                <span>{submittingRefund ? 'Memproses...' : 'Tolak Pengajuan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL REFUND 4: TAMBAH / EDIT ATURAN KEBIJAKAN POTONGAN */}
      {/* ============================================================ */}
      {refundRuleModal.open && (
        <Drawer
          isOpen={refundRuleModal.open}
          onClose={() => setRefundRuleModal((prev) => ({ ...prev, open: false }))}
          title={refundRuleModal.isEditing ? 'Edit Aturan Potongan Refund' : 'Tambah Aturan Kebijakan Refund'}
          subtitle="Kebijakan potongan pengembalian dana santri mengundurkan diri"
          size="md"
        >
          <form onSubmit={handleSaveRefundRule} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Aturan / Periode *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Pengunduran Diri Sebelum Tes Masuk"
                value={refundRuleModal.form.name}
                onChange={(e) =>
                  setRefundRuleModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, name: e.target.value }
                  }))
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batas Tanggal (Cutoff Date)</label>
              <input
                type="date"
                value={refundRuleModal.form.cutoff_date}
                onChange={(e) =>
                  setRefundRuleModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, cutoff_date: e.target.value }
                  }))
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10.5px] text-slate-400 mt-1">
                Kosongkan jika aturan ini berlaku sebagai aturan umum / tanpa batasan tanggal tertentu.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Persentase Pengembalian (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={refundRuleModal.form.refund_percentage}
                  onChange={(e) =>
                    setRefundRuleModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, refund_percentage: e.target.value }
                    }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">Persen uang yang dikembalikan ke wali.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Potongan Yayasan (%)
                </label>
                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-600">
                  {100 - Number(refundRuleModal.form.refund_percentage || 0)}%
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1">Otomatis dihitung sisa 100%.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Dasar Kebijakan</label>
              <textarea
                rows={2}
                placeholder="Penjelasan aturan atau SK yayasan..."
                value={refundRuleModal.form.description}
                onChange={(e) =>
                  setRefundRuleModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, description: e.target.value }
                  }))
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_active_rule"
                checked={refundRuleModal.form.is_active}
                onChange={(e) =>
                  setRefundRuleModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, is_active: e.target.checked }
                  }))
                }
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="is_active_rule" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Aktifkan Aturan Ini
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRefundRuleModal((prev) => ({ ...prev, open: false }))}
                disabled={submittingRefund}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingRefund}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                {submittingRefund ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{submittingRefund ? 'Menyimpan...' : 'Simpan Aturan'}</span>
              </button>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  );
}

