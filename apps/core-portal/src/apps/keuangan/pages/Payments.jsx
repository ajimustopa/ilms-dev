import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import DatePickerField from '../../../shared/components/DatePickerField';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  CreditCard,
  Plus,
  Printer,
  Edit2,
  Receipt,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
  Eye,
  AlertCircle,
  RotateCw,
  Building2,
  Calendar,
  Layers,
  TrendingUp,
  FileText,
  History,
  Info,
  GraduationCap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sliders,
  Settings2,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const MONTH_NAMES = {
  1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
  5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
  9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
};

export function formatCurrency(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val || 0);
}

export function formatDateToDMY(dateInput) {
  if (!dateInput) return '-';
  try {
    const clean = typeof dateInput === 'string' ? dateInput.trim().slice(0, 10) : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split('-');
      return `${d}/${m}/${y}`;
    }
    const dObj = new Date(dateInput);
    if (isNaN(dObj.getTime())) return '-';
    const day = String(dObj.getDate()).padStart(2, '0');
    const month = String(dObj.getMonth() + 1).padStart(2, '0');
    const year = dObj.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
}

export function terbilang(n) {
  const bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const num = Math.floor(Math.abs(Number(n) || 0));
  if (num < 12) return bilangan[num];
  if (num < 20) return `${terbilang(num - 10)} Belas`;
  if (num < 100) return `${terbilang(Math.floor(num / 10))} Puluh ${terbilang(num % 10)}`.trim();
  if (num < 200) return `Seratus ${terbilang(num - 100)}`.trim();
  if (num < 1000) return `${terbilang(Math.floor(num / 100))} Ratus ${terbilang(num % 100)}`.trim();
  if (num < 2000) return `Seribu ${terbilang(num - 1000)}`.trim();
  if (num < 1000000) return `${terbilang(Math.floor(num / 1000))} Ribu ${terbilang(num % 1000)}`.trim();
  if (num < 1000000000) return `${terbilang(Math.floor(num / 1000000))} Juta ${terbilang(num % 1000000)}`.trim();
  if (num < 1000000000000) return `${terbilang(Math.floor(num / 1000000000))} Miliar ${terbilang(num % 1000000000)}`.trim();
  return `${terbilang(Math.floor(num / 1000000000000))} Triliun ${terbilang(num % 1000000000000)}`.trim();
}

/**
 * Membuka Kwitansi Resmi Bertanda Tangan Digital di Tab Baru & Auto Print
 */
export function openReceiptInNewTab(receipt, unitName = 'Satuan Pendidikan Aldepos') {
  if (!receipt) return;

  const receiptNo = receipt.receipt_number || `KWT-${Date.now()}`;
  const schoolUnitName = receipt.school_unit?.name || unitName || 'Satuan Pendidikan Aldepos';
  const schoolUnitAddress = receipt.school_unit?.address || 'Jl. Abdul Fatah No.24, Tapos II, Kec. Tenjolaya, Kabupaten Bogor, Jawa Barat 16370';
  const studentName = receipt.student?.name || receipt.student_name || '-';
  const studentNis = receipt.student?.nis || receipt.nis || '-';
  const studentClass = receipt.student?.class_name || receipt.class_name || '-';
  const totalAmount = parseFloat(receipt.amount || 0);
  const words = receipt.amount_in_words || `${terbilang(totalAmount)} Rupiah`;
  const paidDate = receipt.paid_at ? String(receipt.paid_at).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const isHistorical = Boolean(receipt.is_legacy);
  const items = receipt.items && receipt.items.length > 0 ? receipt.items : [
    {
      fee_type_name: receipt.payment_for || receipt.fee_type_name || 'Pembayaran Tagihan Siswa',
      period: (receipt.period_month && Number(receipt.period_month) > 0)
        ? `${MONTH_NAMES[receipt.period_month] || receipt.period_month} ${receipt.academic_year_name || receipt.period_year || ''}`.trim()
        : (receipt.academic_year_name || receipt.period_year || '-'),
      amount: totalAmount
    }
  ];

  const verifyUrl = `https://core.aldepos.sch.id/verify/kwitansi?receipt=${encodeURIComponent(receiptNo)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up terblokir oleh browser. Izinkan pop-up untuk mencetak kwitansi.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Kwitansi Pembayaran - ${receiptNo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 36px; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
        .brand h1 { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
        .brand p { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.4; }
        .receipt-badge { text-align: right; }
        .badge-title { font-size: 16px; font-weight: 800; color: ${isHistorical ? '#d97706' : '#0284c7'}; }
        .badge-no { font-family: monospace; font-size: 13px; font-weight: 700; color: #334155; margin-top: 3px; }
        
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 12px; background: #f8fafc; padding: 14px 18px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .meta-row { display: flex; margin-bottom: 6px; }
        .meta-row:last-child { margin-bottom: 0; }
        .meta-label { width: 110px; color: #64748b; font-weight: 600; }
        .meta-val { font-weight: 700; color: #0f172a; flex: 1; }

        .historical-banner { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 10px 14px; border-radius: 10px; font-size: 11px; margin-bottom: 18px; font-weight: 600; line-height: 1.4; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th { background: #f1f5f9; color: #334155; font-weight: 700; padding: 10px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
        .text-right { text-align: right; }
        .total-row td { font-weight: 800; font-size: 13px; background: #f8fafc; border-top: 2px solid #cbd5e1; }
        
        .terbilang-box { background: #f0fdf4; border: 1px dashed #86efac; border-radius: 10px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; }
        .terbilang-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 0.5px; }
        .terbilang-text { font-weight: 700; color: #15803d; font-style: italic; margin-top: 2px; }

        .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        .digital-box { display: flex; align-items: center; gap: 14px; background: #fafafa; border: 1px solid #e5e7eb; padding: 12px; border-radius: 12px; }
        .qr-img { width: 75px; height: 75px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .digital-text h4 { font-size: 11px; font-weight: 800; color: #0f172a; }
        .digital-text p { font-size: 10px; color: #64748b; line-height: 1.3; margin-top: 2px; }
        .digital-badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-top: 4px; }
        
        .sign-box { text-align: right; font-size: 11px; }
        .sign-date { color: #64748b; }
        .sign-role { font-weight: 700; color: #0f172a; margin-top: 2px; }
        .sign-name { margin-top: 48px; font-weight: 800; color: #0f172a; letter-spacing: 2px; }

        .print-btn-bar { display: flex; justify-content: center; gap: 10px; margin-top: 24px; }
        .btn { padding: 8px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; }
        .btn-primary { background: #0284c7; color: #fff; }
        .btn-secondary { background: #e2e8f0; color: #334155; }

        @media print {
          body { background: #fff; padding: 0; }
          .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
          .print-btn-bar { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">
            <h1>${schoolUnitName}</h1>
            <p>${schoolUnitAddress}</p>
          </div>
          <div class="receipt-badge">
            <div class="badge-title">${isHistorical ? 'KWITANSI CATATAN RIWAYAT (NON-KAS)' : 'KWITANSI PEMBAYARAN RESMI'}</div>
            <div class="badge-no">${receiptNo}</div>
          </div>
        </div>

        ${isHistorical ? `
        <div class="historical-banner">
          ℹ️ <strong>Pencatatan Riwayat Saja (Non-Kas):</strong> Transaksi ini dicatat untuk memperbarui riwayat pelunasan tagihan siswa tanpa memengaruhi saldo kas/bank buku kas aktif.
        </div>
        ` : ''}

        <div class="meta-grid">
          <div>
            <div class="meta-row">
              <span class="meta-label">${receipt.is_multi_student ? 'Nama Siswa:' : 'Nama Siswa:'}</span>
              <span class="meta-val" style="font-weight: 700; color: #1e293b;">${studentName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">NIS / NIPD:</span>
              <span class="meta-val">${studentNis}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Kelas / Rombel:</span>
              <span class="meta-val">${studentClass}</span>
            </div>
          </div>
          <div>
            <div class="meta-row">
              <span class="meta-label">Tanggal Bayar:</span>
              <span class="meta-val">${paidDate}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Metode Bayar:</span>
              <span class="meta-val">${isHistorical ? 'RIWAYAT (NON-KAS)' : (receipt.payment_method || 'Tunai').toUpperCase()}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Akun Kas:</span>
              <span class="meta-val">${receipt.cash_account_name || (isHistorical ? 'Non-Kas (Catatan Riwayat)' : 'Kasir Loket')}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th>Komponen Tagihan & Keterangan</th>
              <th style="width: 140px;">Periode</th>
              <th class="text-right" style="width: 160px;">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td style="font-weight: 600;">
                  ${it.student_name ? `<span style="display:inline-block; font-size:11px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:1px 6px; border-radius:4px; margin-bottom:3px; font-weight:700;">👤 ${it.student_name}${it.student_nis ? ` (${it.student_nis})` : ''}${it.class_name ? ` - ${it.class_name}` : ''}</span><br/>` : ''}
                  ${it.fee_type_name || it.component_name || 'Tagihan Biaya'}
                </td>
                <td>${it.period || '-'}</td>
                <td class="text-right" style="font-weight: 700; font-family: monospace;">Rp ${parseFloat(it.amount || 0).toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" style="text-align: right; text-transform: uppercase;">Total Penerimaan:</td>
              <td class="text-right" style="color: #047857; font-family: monospace;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <div class="terbilang-box">
          <div class="terbilang-label">Terbilang</div>
          <div class="terbilang-text"># ${words} #</div>
        </div>

        <div class="signature-section">
          <div class="digital-box">
            <img src="${qrUrl}" alt="QR Verification" class="qr-img" />
            <div class="digital-text">
              <h4>VERIFIKASI ELEKTRONIK</h4>
              <p>Dokumen ini telah disahkan secara elektronik melalui Sistem Keuangan Aldepos.</p>
              <div class="digital-badge">&#10003; VALID & TERDAFTAR RESMI</div>
            </div>
          </div>
          <div class="sign-box">
            <div class="sign-date">Bogor, ${paidDate}</div>
            <div class="sign-role">Petugas Keuangan / Kasir,</div>
            <div class="sign-name">................................................</div>
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
          }, 600);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function Payments() {
  const { activeSchoolUnit } = useAuth();

  // Top-Level Penerimaan Category: 'payment_receipt' | 'other_income' | 'daily_inflows'
  const [mainTab, setMainTab] = useState('payment_receipt');

  // Sub-tab di dalam Tab 1: 'bills' | 'history' | 'proofs'
  const [receiptSubTab, setReceiptSubTab] = useState('bills');

  // Academic Years Context
  const [academicYears, setAcademicYears] = useState([]);
  const [activeAcademicYearId, setActiveAcademicYearId] = useState('');

  // Master Context
  const [cashAccounts, setCashAccounts] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Tagihan Pembayaran Siswa Aktif States
  const [billsList, setBillsList] = useState([]);
  const [priorArrearsList, setPriorArrearsList] = useState([]);
  const [billsOriginFilter, setBillsOriginFilter] = useState('current'); // 'current' | 'all' | 'prior_arrears'
  const [billsSearch, setBillsSearch] = useState('');
  const [billsStatusFilter, setBillsStatusFilter] = useState('all');
  const [billsClassFilter, setBillsClassFilter] = useState('all');
  const [billsFeeTypeFilter, setBillsFeeTypeFilter] = useState('all');
  const [billsSortConfig, setBillsSortConfig] = useState({ key: 'student_name', direction: 'asc' });

  const handleSortBills = (key) => {
    setBillsSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // 1.5. Tagihan Pembayaran Alumni States (Sub-Tab Baru)
  const [alumniBillsList, setAlumniBillsList] = useState([]);
  const [alumniCohorts, setAlumniCohorts] = useState([]);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [alumniStatusFilter, setAlumniStatusFilter] = useState('with_arrears'); // 'with_arrears' | 'all' | 'unpaid' | 'partially_paid' | 'paid'
  const [alumniCohortFilter, setAlumniCohortFilter] = useState('all');
  const [alumniAcademicYearFilter, setAlumniAcademicYearFilter] = useState('all');
  const [alumniFeeTypeFilter, setAlumniFeeTypeFilter] = useState('all');
  const [loadingAlumniBills, setLoadingAlumniBills] = useState(false);

  // 2. Riwayat Pembayaran States
  const [paymentHistoryList, setPaymentHistoryList] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState('all');
  const [historyFeeTypeFilter, setHistoryFeeTypeFilter] = useState('all');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 3. Bukti Transfer States
  const [proofs, setProofs] = useState([]);
  const [proofFilter, setProofFilter] = useState('pending');
  const [previewProof, setPreviewProof] = useState(null);

  // 4. Modal Catat Pembayaran States
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentTotalAmount, setPaymentTotalAmount] = useState('');
  const [paymentMethodType, setPaymentMethodType] = useState('cash');
  const [isHistoricalOnly, setIsHistoricalOnly] = useState(false);
  const [targetCashAccountId, setTargetCashAccountId] = useState('');
  const [bankStatementId, setBankStatementId] = useState('');
  const [bankStatementsOptions, setBankStatementsOptions] = useState([]);
  const [loadingBankStatements, setLoadingBankStatements] = useState(false);
  const [blockedStatementModal, setBlockedStatementModal] = useState(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [studentBillsForRecord, setStudentBillsForRecord] = useState([]);
  const [recordBillsSearch, setRecordBillsSearch] = useState('');
  const [billAllocations, setBillAllocations] = useState({});
  const [billRuleOverrides, setBillRuleOverrides] = useState({});
  const [loadingStudentBills, setLoadingStudentBills] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Modal Edit Aturan Jurnal Per-Tagihan States
  const [editingBillRule, setEditingBillRule] = useState(null);
  const [billRuleCustomConfigs, setBillRuleCustomConfigs] = useState({});
  const [tempRuleModalState, setTempRuleModalState] = useState({
    ruleId: '',
    debitAccountId: '',
    creditAccountId: '',
    cashAccountId: ''
  });

  // Accounting Rule & Account Override States inside Modal Catat Pembayaran
  const [transactionRules, setTransactionRules] = useState([]);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [showAccountingOverride, setShowAccountingOverride] = useState(false);
  const [overrideRuleId, setOverrideRuleId] = useState('');
  const [overrideDebitAccountId, setOverrideDebitAccountId] = useState('');
  const [overrideCreditAccountId, setOverrideCreditAccountId] = useState('');
  const [overrideAccountReason, setOverrideAccountReason] = useState('');

  // 5. Modal Edit Koreksi States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPaymentToEdit, setSelectedPaymentToEdit] = useState(null);
  const [loadingEditDetails, setLoadingEditDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: '',
    paid_at: '',
    cash_account_id: '',
    payment_method: 'cash',
    is_historical: false,
    notes: '',
    correction_reason: '',
    bank_statement_id: '',
    transaction_mapping_id: '',
    override_debit_account_id: '',
    override_credit_account_id: '',
    override_cash_account_id: ''
  });
  const [editBankStatementsOptions, setEditBankStatementsOptions] = useState([]);
  const [loadingEditBankStatements, setLoadingEditBankStatements] = useState(false);
  const [showEditAccountingOverride, setShowEditAccountingOverride] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Kwitansi Modal
  const [activeReceiptData, setActiveReceiptData] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // 6. Sumber Lain (RAPBS) States
  const [rapbsSources, setRapbsSources] = useState([]);
  const [otherIncomesList, setOtherIncomesList] = useState([]);
  const [loadingOtherIncome, setLoadingOtherIncome] = useState(false);
  const [otherIncomeModalOpen, setOtherIncomeModalOpen] = useState(false);
  const [otherIncomeForm, setOtherIncomeForm] = useState({
    budget_plan_income_item_id: '',
    cash_account_id: '',
    amount: '',
    received_at: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [savingOtherIncome, setSavingOtherIncome] = useState(false);

  // 7. Rekapitulasi Kas Masuk States
  const [inflowsData, setInflowsData] = useState({ summary: {}, inflows: [], pagination: {} });
  const [loadingInflows, setLoadingInflows] = useState(false);
  const [inflowStartDate, setInflowStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [inflowEndDate, setInflowEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [inflowCategoryFilter, setInflowCategoryFilter] = useState('all');
  const [inflowSearch, setInflowSearch] = useState('');

  // Initial Master Data
  useEffect(() => {
    fetchMasterContext();

    const handleReload = () => {
      fetchMasterContext();
      if (receiptSubTab === 'bills') fetchBillsData();
      else if (receiptSubTab === 'alumni_bills') fetchAlumniBillsData();
      else if (receiptSubTab === 'history') fetchPaymentHistoryData();
      else if (receiptSubTab === 'proofs') fetchProofsData();
    };

    window.addEventListener('keuangan:reload', handleReload);
    return () => {
      window.removeEventListener('keuangan:reload', handleReload);
    };
  }, [activeSchoolUnit]);

  // Load section data based on active tab
  useEffect(() => {
    if (mainTab === 'payment_receipt') {
      if (receiptSubTab === 'bills') {
        fetchBillsData();
      } else if (receiptSubTab === 'alumni_bills') {
        fetchAlumniBillsData();
      } else if (receiptSubTab === 'history') {
        fetchPaymentHistoryData();
      } else if (receiptSubTab === 'proofs') {
        fetchProofsData();
      }
      // Always prefetch alumni bills data so the badge count in the sub-tab switcher is always current
      fetchAlumniBillsData();
    } else if (mainTab === 'other_income') {
      fetchOtherIncomeData();
    } else if (mainTab === 'daily_inflows') {
      fetchAllInflowsData();
    }
  }, [
    activeSchoolUnit,
    mainTab,
    receiptSubTab,
    activeAcademicYearId,
    inflowStartDate,
    inflowEndDate,
    inflowCategoryFilter,
    historyStartDate,
    historyEndDate,
    historyMethodFilter
  ]);

  const fetchMasterContext = async () => {
    try {
      let ayParams = {};
      if (activeSchoolUnit && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
        ayParams.satuan_pendidikan_id = activeSchoolUnit.id;
      }

      let stdParams = { limit: 1000 };
      if (activeSchoolUnit && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
        stdParams.satuan_pendidikan_id = activeSchoolUnit.id;
      }

      const [ayRes, cashRes, rulesRes, coaRes, ftRes, stdRes] = await Promise.allSettled([
        api.get('/akademik/academic-years', { params: ayParams }),
        api.get('/keuangan/cash-accounts'),
        api.get('/keuangan/transaction-account-mappings'),
        api.get('/keuangan/chart-of-accounts'),
        api.get('/keuangan/fee-types'),
        api.get('/akademik/students', { params: stdParams })
      ]);

      let yearsList = [];
      if (ayRes.status === 'fulfilled' && ayRes.value?.data) {
        yearsList = ayRes.value.data?.data || ayRes.value.data?.academic_years || (Array.isArray(ayRes.value.data) ? ayRes.value.data : []);
      }

      // Robust fallback jika query dengan satuan_pendidikan_id kosong / gagal
      if (yearsList.length === 0) {
        try {
          const fallback1 = await api.get('/akademik/academic-years').catch(() => null);
          const fallback2 = fallback1 || await api.get('/keuangan/master-data/academic-years').catch(() => null);
          const fallback3 = fallback2 || await api.get('/akademik/internal/academic-years').catch(() => null);
          if (fallback3?.data) {
            yearsList = fallback3.data?.data || fallback3.data?.academic_years || (Array.isArray(fallback3.data) ? fallback3.data : []);
          }
        } catch (e) {
          console.warn('Fallback academic years error:', e);
        }
      }

      // Deduplikasi berdasarkan nama tahun ajaran agar tidak ada nama yang ganda di dropdown
      const uniqueMap = new Map();
      yearsList.forEach((y) => {
        const nameKey = (y.name || '').trim();
        if (!nameKey) return;
        const existing = uniqueMap.get(nameKey);
        if (!existing) {
          uniqueMap.set(nameKey, y);
        } else if (y.is_active && !existing.is_active) {
          uniqueMap.set(nameKey, y);
        }
      });
      const ays = Array.from(uniqueMap.values());
      ays.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

      setAcademicYears(ays);

      if (ays.length > 0) {
        setActiveAcademicYearId(prev => {
          const found = ays.find(y => String(y.id) === String(prev));
          if (found) return String(found.id);
          const currentYear = ays.find(y => y.is_active) || ays[0];
          return String(currentYear.id);
        });
      }

      // Cash accounts
      if (cashRes.status === 'fulfilled') {
        const accs = cashRes.value.data?.data || (Array.isArray(cashRes.value.data) ? cashRes.value.data : []);
        setCashAccounts(accs);
        if (accs.length > 0) {
          setTargetCashAccountId(String(accs[0].id));
          setOtherIncomeForm(prev => ({ ...prev, cash_account_id: accs[0].id }));
        }
      }

      // Transaction Rules
      if (rulesRes.status === 'fulfilled') {
        setTransactionRules(rulesRes.value.data?.data || (Array.isArray(rulesRes.value.data) ? rulesRes.value.data : []));
      }

      // COA
      if (coaRes.status === 'fulfilled') {
        setChartOfAccounts(coaRes.value.data?.data || (Array.isArray(coaRes.value.data) ? coaRes.value.data : []));
      }

      // Fee Types
      if (ftRes.status === 'fulfilled') {
        setFeeTypes(ftRes.value.data?.data || (Array.isArray(ftRes.value.data) ? ftRes.value.data : []));
      }

      // Students
      if (stdRes.status === 'fulfilled' && stdRes.value?.data) {
        const rawStudents = stdRes.value.data?.data || (Array.isArray(stdRes.value.data) ? stdRes.value.data : []);
        const formatted = rawStudents.map(s => ({
          id: s.id,
          name: s.full_name || s.name || `Siswa #${s.id}`,
          nis: s.nipd || s.nis || s.nisn || '-',
          class_name: s.class_name || s.class_group_name || ''
        }));
        setAllStudents(prev => {
          const map = new Map(prev.map(item => [item.id, item]));
          formatted.forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Error fetching master context:', err);
    }
  };

  const activeAyObj = useMemo(() => {
    return academicYears.find(y => String(y.id) === String(activeAcademicYearId));
  }, [academicYears, activeAcademicYearId]);

  // Derived Accounting Rules & Overrides for Modal Catat Pembayaran
  const paymentRulesOptions = useMemo(() => {
    const relevant = transactionRules.filter(r => 
      r.is_active && (
        r.transaction_type === 'penambahan_kas' || 
        (r.transaction_code && (r.transaction_code.includes('payment') || r.transaction_code.includes('piutang') || r.transaction_code.includes('penerimaan'))) ||
        r.transaction_code === 'student_bill_payment'
      )
    );
    return relevant.length > 0 ? relevant : transactionRules;
  }, [transactionRules]);

  const coaOptions = useMemo(() => {
    return chartOfAccounts.map(c => {
      const code = c.account_code || c.account_number || c.code || '';
      const name = c.account_name || c.name || '';
      return {
        value: String(c.id),
        label: `[${code}] ${name}`,
        sublabel: `Grup: ${c.account_group?.toUpperCase() || '-'} | Saldo Normal: ${c.normal_balance?.toUpperCase() || '-'}`,
        badge: c.account_group?.toUpperCase() || 'AKUN',
        badgeClass: c.account_group === 'harta' || c.account_group === 'kas' ? 'bg-blue-100 text-blue-800 font-semibold' : 'bg-slate-100 text-slate-800'
      };
    });
  }, [chartOfAccounts]);

  const cashAccountSelectOptions = useMemo(() => {
    return [
      { value: '', label: '-- Otomatis Sesuai Kas Transaksi Utama --', sublabel: 'Mengikuti akun kas/bank yang dipilih pada form pembayaran utama' },
      ...cashAccounts.map(a => ({
        value: String(a.id),
        label: a.name,
        sublabel: `${a.account_kind === 'bank' ? (a.bank_name || 'Bank') : 'Kas Tunai'} | No: ${a.bank_account_number || a.account_number || '-'}`,
        badge: a.account_kind === 'bank' ? 'BANK' : 'TUNAI',
        badgeClass: a.account_kind === 'bank' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }))
    ];
  }, [cashAccounts]);

  const ruleSelectOptions = useMemo(() => {
    return paymentRulesOptions.map(r => {
      const dCoa = chartOfAccounts.find(c => String(c.id) === String(r.debit_account_id));
      const kCoa = chartOfAccounts.find(c => String(c.id) === String(r.credit_account_id));
      const dLabel = dCoa ? `[${dCoa.account_code || dCoa.account_number}] ${dCoa.account_name || dCoa.name}` : '-';
      const kLabel = kCoa ? `[${kCoa.account_code || kCoa.account_number}] ${kCoa.account_name || kCoa.name}` : '-';
      return {
        value: String(r.id),
        label: r.transaction_label || r.transaction_code,
        sublabel: `Debit: ${dLabel} | Kredit: ${kLabel}`,
        badge: r.transaction_code || 'RULE',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
      };
    });
  }, [paymentRulesOptions, chartOfAccounts]);

  const editCashAccountOptions = useMemo(() => {
    return cashAccounts
      .filter(a => editForm.payment_method === 'cash' ? true : a.account_kind === 'bank')
      .map(a => ({
        value: String(a.id),
        label: a.name,
        sublabel: `${a.account_kind === 'bank' ? (a.bank_name || 'Bank') : 'Kas Tunai'} | No: ${a.bank_account_number || a.account_number || '-'}`,
        badge: a.account_kind === 'bank' ? 'BANK' : 'TUNAI',
        badgeClass: a.account_kind === 'bank' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }));
  }, [cashAccounts, editForm.payment_method]);

  const editActiveDebitCoa = useMemo(() => {
    const id = editForm.override_debit_account_id ||
      (transactionRules.find(r => String(r.id) === String(editForm.transaction_mapping_id))?.debit_account_id);
    return chartOfAccounts.find(c => String(c.id) === String(id));
  }, [editForm.override_debit_account_id, editForm.transaction_mapping_id, transactionRules, chartOfAccounts]);

  const editActiveCreditCoa = useMemo(() => {
    const id = editForm.override_credit_account_id ||
      (transactionRules.find(r => String(r.id) === String(editForm.transaction_mapping_id))?.credit_account_id);
    return chartOfAccounts.find(c => String(c.id) === String(id));
  }, [editForm.override_credit_account_id, editForm.transaction_mapping_id, transactionRules, chartOfAccounts]);

  const getBillAccountingConfig = (bill) => {
    if (!bill) {
      return {
        ruleId: '',
        rule: null,
        debitAccountId: '',
        debitCoa: null,
        creditAccountId: '',
        creditCoa: null,
        cashAccountId: '',
        cashAcc: null,
        feeTypeObj: null,
        isCustomized: false
      };
    }
    const custom = billRuleCustomConfigs[bill.id];

    // 1. Determine Rule ID
    let ruleId = custom?.ruleId;
    if (!ruleId) {
      if (billRuleOverrides[bill.id]) {
        ruleId = String(billRuleOverrides[bill.id]);
      } else if (bill.fee_type_id) {
        const ft = feeTypes.find(f => f.id === bill.fee_type_id);
        if (ft && ft.payment_account_mapping_id) {
          ruleId = String(ft.payment_account_mapping_id);
        } else if (bill.fee_type_code) {
          const matched = transactionRules.find(r =>
            r.transaction_code === `payment_${bill.fee_type_code}` ||
            r.transaction_code.includes(bill.fee_type_code)
          );
          if (matched) ruleId = String(matched.id);
        }
      }
      if (!ruleId && overrideRuleId) ruleId = String(overrideRuleId);
      if (!ruleId) {
        const defaultRule = transactionRules.find(r => r.transaction_code === 'student_bill_payment') || paymentRulesOptions[0];
        if (defaultRule) ruleId = String(defaultRule.id);
      }
    }

    const rule = transactionRules.find(r => String(r.id) === String(ruleId)) || null;

    // 2. Determine Debit Account
    const debitAccountId = (custom?.debitAccountId !== undefined && custom?.debitAccountId !== '')
      ? custom.debitAccountId
      : (rule?.debit_account_id ? String(rule.debit_account_id) : '');
    const debitCoa = chartOfAccounts.find(c => String(c.id) === String(debitAccountId)) || null;

    // 3. Determine Credit Account
    const creditAccountId = (custom?.creditAccountId !== undefined && custom?.creditAccountId !== '')
      ? custom.creditAccountId
      : (rule?.credit_account_id ? String(rule.credit_account_id) : '');
    const creditCoa = chartOfAccounts.find(c => String(c.id) === String(creditAccountId)) || null;

    // 4. Determine Cash Account
    const cashAccountId = (custom?.cashAccountId !== undefined && custom?.cashAccountId !== '')
      ? custom.cashAccountId
      : (rule?.cash_account_id ? String(rule.cash_account_id) : (targetCashAccountId || ''));
    const cashAcc = cashAccounts.find(a => String(a.id) === String(cashAccountId)) || null;

    // 5. Fee Type
    const feeTypeObj = feeTypes.find(f => f.id === bill.fee_type_id) || null;

    const isCustomized = Boolean(custom?.isCustom);

    return {
      ruleId: ruleId || '',
      rule,
      debitAccountId,
      debitCoa,
      creditAccountId,
      creditCoa,
      cashAccountId,
      cashAcc,
      feeTypeObj,
      isCustomized
    };
  };

  const openEditBillRuleModal = (bill) => {
    const cfg = getBillAccountingConfig(bill);
    setEditingBillRule(bill);
    setTempRuleModalState({
      ruleId: cfg.ruleId,
      debitAccountId: cfg.debitAccountId,
      creditAccountId: cfg.creditAccountId,
      cashAccountId: cfg.cashAccountId
    });
  };

  const handleModalRuleChange = (newRuleId) => {
    const r = transactionRules.find(item => String(item.id) === String(newRuleId));
    setTempRuleModalState(prev => ({
      ...prev,
      ruleId: newRuleId || '',
      debitAccountId: r?.debit_account_id ? String(r.debit_account_id) : prev.debitAccountId,
      creditAccountId: r?.credit_account_id ? String(r.credit_account_id) : prev.creditAccountId,
      cashAccountId: r?.cash_account_id ? String(r.cash_account_id) : prev.cashAccountId
    }));
  };

  const handleSaveBillRuleModal = () => {
    if (!editingBillRule) return;
    setBillRuleCustomConfigs(prev => ({
      ...prev,
      [editingBillRule.id]: {
        ruleId: tempRuleModalState.ruleId,
        debitAccountId: tempRuleModalState.debitAccountId,
        creditAccountId: tempRuleModalState.creditAccountId,
        cashAccountId: tempRuleModalState.cashAccountId,
        isCustom: true
      }
    }));
    setEditingBillRule(null);
  };

  const handleResetBillRuleToDefault = () => {
    if (!editingBillRule) return;
    setBillRuleCustomConfigs(prev => {
      const updated = { ...prev };
      delete updated[editingBillRule.id];
      return updated;
    });
    setEditingBillRule(null);
  };

  const getBillDefaultRuleId = (bill) => {
    const cfg = getBillAccountingConfig(bill);
    return cfg?.ruleId || '';
  };

  const targetCashAccountOptions = useMemo(() => {
    return cashAccounts
      .filter(a => paymentMethodType === 'cash' ? true : a.account_kind === 'bank')
      .map(a => ({
        value: String(a.id),
        label: a.name,
        sublabel: `${a.account_kind === 'bank' ? (a.bank_name || 'Bank') : 'Kas Tunai'} | No: ${a.account_number || '-'}`,
        badge: a.account_kind === 'bank' ? 'BANK' : 'TUNAI',
        badgeClass: a.account_kind === 'bank' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }));
  }, [cashAccounts, paymentMethodType]);

  const allocatedBills = useMemo(() => {
    return studentBillsForRecord.filter(b => parseFloat(billAllocations[b.id] || 0) > 0);
  }, [studentBillsForRecord, billAllocations]);

  const filteredStudentBillsForRecord = useMemo(() => {
    if (!recordBillsSearch.trim()) return studentBillsForRecord;
    const q = recordBillsSearch.toLowerCase().trim();
    return studentBillsForRecord.filter((b) => {
      const comp = (b.component_display || b.fee_type_name || '').toLowerCase();
      const sName = (b.student_name || '').toLowerCase();
      const nis = (b.nis || '').toLowerCase();
      const code = (b.fee_type_code || '').toLowerCase();
      const period = (b.period_display || b.period || '').toLowerCase();
      const year = (b.academic_year_name || '').toLowerCase();
      const notes = (b.notes || '').toLowerCase();
      const amt = String(b.amount || '');
      const rem = String(b.remaining_amount || '');
      return (
        comp.includes(q) ||
        sName.includes(q) ||
        nis.includes(q) ||
        code.includes(q) ||
        period.includes(q) ||
        year.includes(q) ||
        notes.includes(q) ||
        amt.includes(q) ||
        rem.includes(q)
      );
    });
  }, [studentBillsForRecord, recordBillsSearch]);

  const detectedRule = useMemo(() => {
    if (overrideRuleId) {
      return transactionRules.find(r => String(r.id) === String(overrideRuleId)) || null;
    }
    if (allocatedBills.length > 0) {
      const primaryRuleId = getBillDefaultRuleId(allocatedBills[0]);
      if (primaryRuleId) {
        const matched = transactionRules.find(r => String(r.id) === String(primaryRuleId));
        if (matched) return matched;
      }
    }
    return (
      transactionRules.find(r => r.transaction_code === 'student_bill_payment') ||
      paymentRulesOptions[0] ||
      null
    );
  }, [overrideRuleId, allocatedBills, billRuleOverrides, billRuleCustomConfigs, feeTypes, transactionRules, paymentRulesOptions]);

  const appliedDebitAccount = useMemo(() => {
    if (overrideDebitAccountId) {
      return chartOfAccounts.find(c => String(c.id) === String(overrideDebitAccountId)) || null;
    }
    const selectedCash = cashAccounts.find(a => String(a.id) === String(targetCashAccountId));
    if (selectedCash && selectedCash.account_id) {
      const matchedCoa = chartOfAccounts.find(c => String(c.id) === String(selectedCash.account_id));
      if (matchedCoa) return matchedCoa;
    }
    if (detectedRule?.debit_account_id) {
      return chartOfAccounts.find(c => String(c.id) === String(detectedRule.debit_account_id)) || null;
    }
    return chartOfAccounts.find(c => c.account_group === 'harta' && c.normal_balance === 'debit') || null;
  }, [overrideDebitAccountId, targetCashAccountId, cashAccounts, chartOfAccounts, detectedRule]);

  const appliedCreditAccount = useMemo(() => {
    if (overrideCreditAccountId) {
      return chartOfAccounts.find(c => String(c.id) === String(overrideCreditAccountId)) || null;
    }
    if (detectedRule?.credit_account_id) {
      return chartOfAccounts.find(c => String(c.id) === String(detectedRule.credit_account_id)) || null;
    }
    return chartOfAccounts.find(c => c.account_group === 'piutang' || c.normal_balance === 'kredit') || null;
  }, [overrideCreditAccountId, detectedRule, chartOfAccounts]);

  const isAccountingOverridden = Boolean(
    overrideRuleId || overrideDebitAccountId || overrideCreditAccountId
  );

  // 1. Fetch Student Bills (Siswa Aktif) & Tunggakan Tahun Ajaran Sebelumnya
  const fetchBillsData = async () => {
    setLoading(true);
    try {
      const [billsRes, arrearsRes] = await Promise.allSettled([
        api.get('/keuangan/student-bills', {
          params: {
            academic_year_id: activeAcademicYearId || undefined,
            exclude_arrears: true
          }
        }),
        api.get('/keuangan/student-bills', {
          params: {
            academic_year_id: activeAcademicYearId || undefined,
            prior_arrears_only: true
          }
        })
      ]);

      const data = (billsRes.status === 'fulfilled' && billsRes.value?.data?.data) || [];
      const arrearsData = (arrearsRes.status === 'fulfilled' && arrearsRes.value?.data?.data) || [];

      setBillsList(data);
      setPriorArrearsList(arrearsData);

      const studentMap = {};
      [...data, ...arrearsData].forEach(b => {
        if (b.student_id && !studentMap[b.student_id]) {
          studentMap[b.student_id] = {
            id: b.student_id,
            name: b.student_name,
            nis: b.nis,
            class_name: b.class_name
          };
        }
      });
      setAllStudents(prev => {
        const map = new Map(prev.map(s => [s.id, s]));
        Object.values(studentMap).forEach(s => map.set(s.id, s));
        return Array.from(map.values());
      });
    } catch (err) {
      console.error('Error fetching bills & arrears:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1.5 Fetch Alumni Bills (Santri Alumni & Tunggakan Kelulusan)
  const fetchAlumniBillsData = async () => {
    setLoadingAlumniBills(true);
    try {
      const res = await api.get('/keuangan/student-bills/alumni', {
        params: {
          academic_year_id: activeAcademicYearId || undefined,
          status: 'all'
        }
      });
      const data = res.data?.data || {};
      const alumniList = data.alumni || [];
      setAlumniCohorts(data.cohorts || []);

      const flatBills = [];
      const studentMap = {};

      alumniList.forEach(alumnus => {
        const studentId = alumnus.id;
        const studentName = alumnus.full_name || alumnus.name || `Siswa ID #${studentId}`;
        const nis = alumnus.nipd || alumnus.nis || '-';
        const gradYear = alumnus.graduation_academic_year_name
          ? `Lulus T.A. ${alumnus.graduation_academic_year_name}`
          : (alumnus.graduation_year || alumnus.cohort_name || (alumnus.last_class_name ? `${alumnus.last_class_name} (Lulus)` : 'Alumni'));
        const lastClass = alumnus.last_class_name || alumnus.class_name || '-';

        if (!studentMap[studentId]) {
          studentMap[studentId] = {
            id: studentId,
            name: studentName,
            nis: nis,
            class_name: `Alumni (${gradYear})`
          };
        }

        const bills = alumnus.bills || [];
        if (bills.length > 0) {
          bills.forEach(b => {
            flatBills.push({
              ...b,
              student_id: studentId,
              student_name: studentName,
              nis: nis,
              graduation_year_display: gradYear,
              last_class_name: lastClass,
              academic_year_name: b.academic_year_name || (b.period_year ? `T.A. ${b.period_year}` : '-')
            });
          });
        }
      });

      setAlumniBillsList(flatBills);

      setAllStudents(prev => {
        const map = new Map(prev.map(s => [s.id, s]));
        Object.values(studentMap).forEach(s => map.set(s.id, s));
        return Array.from(map.values());
      });
    } catch (err) {
      console.error('Error fetching alumni bills data:', err);
    } finally {
      setLoadingAlumniBills(false);
    }
  };

  // 2. Fetch Payment History
  const fetchPaymentHistoryData = async () => {
    setLoadingHistory(true);
    try {
      const params = {
        academic_year_id: activeAcademicYearId || undefined,
        start_date: historyStartDate || undefined,
        end_date: historyEndDate || undefined,
        payment_method: historyMethodFilter !== 'all' ? historyMethodFilter : undefined
      };
      const res = await api.get('/keuangan/bill-payments', { params });
      setPaymentHistoryList(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching payment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 3. Fetch Transfer Proofs
  const fetchProofsData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/keuangan/bill-payment-proofs');
      setProofs(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching proofs:', err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Fetch Other Incomes
  const fetchOtherIncomeData = async () => {
    setLoadingOtherIncome(true);
    try {
      const [rapbsRes, incRes] = await Promise.all([
        api.get(`/keuangan/other-incomes/rapbs-sources${activeAcademicYearId ? `?academic_year_id=${activeAcademicYearId}` : ''}`),
        api.get(`/keuangan/other-incomes${activeAcademicYearId ? `?academic_year_id=${activeAcademicYearId}` : ''}`)
      ]);

      const sources = rapbsRes.data?.data || [];
      setRapbsSources(sources);
      setOtherIncomesList(incRes.data?.data || []);

      if (sources.length > 0 && !otherIncomeForm.budget_plan_income_item_id) {
        setOtherIncomeForm(prev => ({
          ...prev,
          budget_plan_income_item_id: String(sources[0].id)
        }));
      }
    } catch (err) {
      console.error('Error fetching other incomes data:', err);
    } finally {
      setLoadingOtherIncome(false);
    }
  };

  // 5. Fetch Inflows Timeline
  const fetchAllInflowsData = async () => {
    setLoadingInflows(true);
    try {
      const params = {
        start_date: inflowStartDate,
        end_date: inflowEndDate,
        academic_year_id: activeAcademicYearId || undefined,
        category: inflowCategoryFilter !== 'all' ? inflowCategoryFilter : undefined,
        search: inflowSearch || undefined
      };
      const res = await api.get('/keuangan/payments/all-inflows', { params });
      if (res.data?.success) {
        setInflowsData(res.data.data || { summary: {}, inflows: [], pagination: {} });
      }
    } catch (err) {
      console.error('Error fetching all inflows:', err);
    } finally {
      setLoadingInflows(false);
    }
  };

  // Bank Statements Live Search (Saat Non-Tunai)
  useEffect(() => {
    if (paymentMethodType === 'bank_transfer' && targetCashAccountId) {
      fetchBankStatementsForDate(targetCashAccountId, paymentDate);
    } else {
      setBankStatementsOptions([]);
      setBankStatementId('');
    }
  }, [paymentMethodType, targetCashAccountId, paymentDate]);

  const fetchBankStatementsForDate = async (accId, pDate) => {
    setLoadingBankStatements(true);
    try {
      const res = await api.get('/keuangan/bank-statements', {
        params: {
          cash_account_id: accId,
          dc_type: 'credit',
          no_pagination: true,
          sort_by: 'transaction_date',
          sort_dir: 'desc'
        }
      });
      const rows = res.data?.data?.statements || (Array.isArray(res.data?.data) ? res.data.data : []);
      const opts = rows.map(r => {
        const desc = r.description || r.mutation_description || 'Mutasi Masuk';
        const refNo = r.journal_number || r.reference_number || r.reconciliation_notes || r.import_batch_id || '';
        const rkDate = r.transaction_date ? String(r.transaction_date).slice(0, 10) : '';
        const isExactDate = pDate && rkDate === pDate;
        const totalPlafon = parseFloat(r.amount || 0);
        const allocatedAmt = parseFloat(r.allocated_amount || 0);
        const remainingAmt = r.remaining_amount !== undefined ? parseFloat(r.remaining_amount) : Math.max(0, totalPlafon - allocatedAmt);
        const isFullyAllocated = Boolean(r.is_reconciled) || (remainingAmt <= 0.01 && totalPlafon > 0);
        const isPartial = !isFullyAllocated && allocatedAmt > 0 && remainingAmt > 0.01;

        let badgeText = isExactDate ? '⭐ TGL COCOK' : 'KREDIT';
        let badgeStyle = isExactDate ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-blue-50 text-blue-700';

        if (isPartial) {
          badgeText = isExactDate ? '⭐ TGL COCOK | SISA' : '⚡ SISA PLAFON';
          badgeStyle = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
        }

        if (isFullyAllocated) {
          badgeText = '⛔ HABIS TERPAKAI';
          badgeStyle = 'bg-rose-100 text-rose-800 border border-rose-300 font-bold';
        }

        const labelText = isFullyAllocated
          ? `[HABIS TERPAKAI] ${formatCurrency(totalPlafon)} - ${desc}`
          : isPartial
          ? `Sisa: ${formatCurrency(remainingAmt)} (Plafon: ${formatCurrency(totalPlafon)}) - ${desc}`
          : `${formatCurrency(totalPlafon)} - ${desc}`;

        const sublabelText = isFullyAllocated
          ? `Tgl: ${rkDate || '-'} | Ref: ${refNo || '-'} | Plafon: ${formatCurrency(totalPlafon)} (Teralokasi Penuh: ${formatCurrency(allocatedAmt)}) • Saldo Sisa: Rp 0`
          : `Tgl: ${rkDate || '-'} | Ref: ${refNo || '-'} | Plafon: ${formatCurrency(totalPlafon)}${allocatedAmt > 0 ? ` (Teralokasi: ${formatCurrency(allocatedAmt)})` : ''}`;

        const searchTerms = [
          refNo,
          r.journal_number,
          r.reference_number,
          r.reconciliation_notes,
          r.import_batch_id,
          desc,
          r.description,
          r.mutation_description,
          String(r.amount || ''),
          String(totalPlafon),
          String(remainingAmt),
          rkDate
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
          searchTerms: searchTerms,
          isExactDate,
          disabled: isFullyAllocated,
          isFullyAllocated: isFullyAllocated,
          disabledReason: `Mutasi rekening koran (${desc}) sebesar ${formatCurrency(totalPlafon)} sudah habis terpakai (teralokasi penuh ${formatCurrency(allocatedAmt)}). Tidak dapat dipilih untuk pembayaran baru.`
        };
      });

      // Sort: Active ones first (exact date first, then other dates), then disabled/fully used ones at the bottom
      opts.sort((a, b) => {
        if (!a.disabled && b.disabled) return -1;
        if (a.disabled && !b.disabled) return 1;
        if (a.isExactDate && !b.isExactDate) return -1;
        if (!a.isExactDate && b.isExactDate) return 1;
        return (b.rawDate || '').localeCompare(a.rawDate || '');
      });

      setBankStatementsOptions(opts);
    } catch (err) {
      console.error('Error fetching bank statements for date:', err);
      setBankStatementsOptions([]);
    } finally {
      setLoadingBankStatements(false);
    }
  };

  // Memilih Siswa & Memuat Tagihan (Mendukung Multi-Siswa / Saudara dalam 1 Kwitansi)
  const handleStudentChange = async (studentId) => {
    setSelectedStudentId(studentId);
    setSelectedStudentIds(studentId ? [String(studentId)] : []);
    setBillAllocations({});
    setBillRuleOverrides({});
    setRecordBillsSearch('');
    if (!studentId) {
      setStudentBillsForRecord([]);
      return;
    }

    setLoadingStudentBills(true);
    try {
      const studentObj = allStudents.find(s => String(s.id) === String(studentId));
      // Memuat tagihan siswa untuk tahun ajaran terpilih + tunggakan tahun sebelumnya yang belum lunas
      const res = await api.get('/keuangan/student-bills', {
        params: {
          student_id: studentId,
          academic_year_id: activeAcademicYearId || undefined,
          for_payments: true
        }
      });
      const allBills = (res.data?.data || []).map(b => ({
        ...b,
        student_id: b.student_id || parseInt(studentId, 10),
        student_name: b.student_name || studentObj?.name,
        nis: b.nis || studentObj?.nis,
        class_name: b.class_name || studentObj?.class_name
      }));
      const unpaidFirst = allBills.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0));
      setStudentBillsForRecord(unpaidFirst.length > 0 ? unpaidFirst : allBills);
    } catch (err) {
      console.error('Error fetching student bills for record modal:', err);
    } finally {
      setLoadingStudentBills(false);
    }
  };

  // Tambah Siswa Lain / Saudara ke Transaksi yang Sama (1 Kwitansi & 1 Rekening Koran)
  const handleAddAdditionalStudent = async (studentId) => {
    if (!studentId || selectedStudentIds.includes(String(studentId))) return;

    const newStudentIds = [...selectedStudentIds, String(studentId)];
    setSelectedStudentIds(newStudentIds);
    if (!selectedStudentId) {
      setSelectedStudentId(String(studentId));
    }

    setLoadingStudentBills(true);
    try {
      const studentObj = allStudents.find(s => String(s.id) === String(studentId));
      const res = await api.get('/keuangan/student-bills', {
        params: {
          student_id: studentId,
          academic_year_id: activeAcademicYearId || undefined,
          for_payments: true
        }
      });
      const newBills = (res.data?.data || []).map(b => ({
        ...b,
        student_id: b.student_id || parseInt(studentId, 10),
        student_name: b.student_name || studentObj?.name,
        nis: b.nis || studentObj?.nis,
        class_name: b.class_name || studentObj?.class_name
      }));
      const unpaidNewBills = newBills.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0));
      const billsToAdd = unpaidNewBills.length > 0 ? unpaidNewBills : newBills;

      setStudentBillsForRecord(prev => {
        const existingBillIds = new Set(prev.map(b => String(b.id)));
        const filteredNew = billsToAdd.filter(b => !existingBillIds.has(String(b.id)));
        return [...prev, ...filteredNew];
      });
    } catch (err) {
      console.error('Error fetching additional student bills:', err);
    } finally {
      setLoadingStudentBills(false);
    }
  };

  // Hapus Siswa dari Transaksi Pembayaran Bersama
  const handleRemoveStudent = (studentIdToRemove) => {
    const updated = selectedStudentIds.filter(id => String(id) !== String(studentIdToRemove));
    setSelectedStudentIds(updated);
    setSelectedStudentId(updated.length > 0 ? updated[0] : '');

    // Hapus tagihan milik siswa ini dari list dan alokasi
    setStudentBillsForRecord(prev => {
      const remaining = prev.filter(b => String(b.student_id) !== String(studentIdToRemove));
      return remaining;
    });

    setBillAllocations(prev => {
      const next = { ...prev };
      studentBillsForRecord
        .filter(b => String(b.student_id) === String(studentIdToRemove))
        .forEach(b => {
          delete next[b.id];
        });
      return next;
    });
  };

  // Open modal Catat Pembayaran
  const handleOpenRecordModal = (presetStudentId = null, presetBill = null) => {
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethodType('cash');
    setIsHistoricalOnly(false);
    setPaymentNotes('');
    setBankStatementId('');
    setBillRuleOverrides({});
    setBillRuleCustomConfigs({});
    setEditingBillRule(null);
    setRecordBillsSearch('');

    // Reset accounting overrides
    setShowAccountingOverride(false);
    setOverrideRuleId('');
    setOverrideDebitAccountId('');
    setOverrideCreditAccountId('');
    setOverrideAccountReason('');

    const defaultCash = cashAccounts.find(a => a.account_kind === 'cash') || cashAccounts[0];
    if (defaultCash) setTargetCashAccountId(String(defaultCash.id));

    if (presetStudentId) {
      handleStudentChange(String(presetStudentId));
    } else {
      setSelectedStudentId('');
      setSelectedStudentIds([]);
      setStudentBillsForRecord([]);
      setBillAllocations({});
    }

    if (presetBill) {
      const rem = presetBill.remaining_amount !== undefined ? presetBill.remaining_amount : presetBill.amount;
      setPaymentTotalAmount(String(rem));
      setBillAllocations({ [presetBill.id]: rem });
    } else {
      setPaymentTotalAmount('');
    }

    setRecordModalOpen(true);
  };

  // Alokasi Per Baris Tagihan
  const handleAllocationChange = (billId, value) => {
    const num = parseFloat(value) || 0;
    setBillAllocations(prev => ({
      ...prev,
      [billId]: num
    }));
  };

  // Quick Action: Bayar Penuh Baris Tagihan
  const handlePayFullRow = (bill) => {
    const rem = bill.remaining_amount !== undefined ? bill.remaining_amount : bill.amount;
    setBillAllocations(prev => ({
      ...prev,
      [bill.id]: rem
    }));
  };

  // Auto Allocate FIFO
  const handleAutoAllocateFifo = () => {
    const total = parseFloat(paymentTotalAmount) || 0;
    if (total <= 0) {
      alert('Masukkan Total Nominal Pembayaran terlebih dahulu sebelum mengalokasikan otomatis.');
      return;
    }

    let remainingToAllocate = total;
    const newAllocations = {};

    studentBillsForRecord.forEach(bill => {
      if (remainingToAllocate <= 0) return;
      const billRemaining = bill.remaining_amount !== undefined ? bill.remaining_amount : parseFloat(bill.amount || 0);
      if (billRemaining <= 0) return;

      const take = Math.min(billRemaining, remainingToAllocate);
      newAllocations[bill.id] = take;
      remainingToAllocate -= take;
    });

    setBillAllocations(newAllocations);
  };

  // Total Teralokasi
  const totalAllocatedAmount = useMemo(() => {
    return Object.values(billAllocations).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [billAllocations]);

  // Sisa Belum Teralokasi
  const unallocatedAmount = useMemo(() => {
    const total = parseFloat(paymentTotalAmount) || 0;
    return total - totalAllocatedAmount;
  }, [paymentTotalAmount, totalAllocatedAmount]);

  // Submit Catat Pembayaran
  const handleSavePayment = async (printImmediately = false) => {
    if (!selectedStudentId) {
      alert('Silakan pilih Siswa terlebih dahulu.');
      return;
    }

    const total = parseFloat(paymentTotalAmount) || 0;
    if (total <= 0) {
      alert('Masukkan nominal pembayaran yang valid.');
      return;
    }

    if (totalAllocatedAmount <= 0) {
      alert('Silakan alokasikan nominal pembayaran ke setidaknya satu pos tagihan.');
      return;
    }

    if (Math.abs(unallocatedAmount) > 0.01) {
      if (!window.confirm(`Perhatian: Total teralokasi (Rp ${totalAllocatedAmount.toLocaleString('id-ID')}) tidak sama dengan Total Pembayaran (Rp ${total.toLocaleString('id-ID')}). Ada selisih Rp ${unallocatedAmount.toLocaleString('id-ID')}. Tetap lanjutkan penyimpanan?`)) {
        return;
      }
    }

    const allocationsArray = Object.entries(billAllocations)
      .filter(([_, val]) => parseFloat(val) > 0)
      .map(([billId, amount]) => {
        const bill = studentBillsForRecord.find(b => String(b.id) === String(billId));
        const cfg = bill ? getBillAccountingConfig(bill) : null;
        return {
          student_bill_id: parseInt(billId, 10),
          amount: parseFloat(amount),
          transaction_mapping_id: (!isHistoricalOnly && cfg?.ruleId) ? parseInt(cfg.ruleId, 10) : undefined,
          override_debit_account_id: (!isHistoricalOnly && cfg?.debitAccountId) ? parseInt(cfg.debitAccountId, 10) : undefined,
          override_credit_account_id: (!isHistoricalOnly && cfg?.creditAccountId) ? parseInt(cfg.creditAccountId, 10) : undefined,
          override_cash_account_id: (!isHistoricalOnly && cfg?.cashAccountId) ? parseInt(cfg.cashAccountId, 10) : undefined
        };
      });

    if (allocationsArray.length === 0) {
      alert('Tidak ada alokasi tagihan dengan nominal > 0.');
      return;
    }

    setSavingPayment(true);
    try {
      const payload = {
        allocations: allocationsArray,
        student_bill_id: allocationsArray[0].student_bill_id,
        amount: totalAllocatedAmount,
        paid_at: paymentDate,
        cash_account_id: isHistoricalOnly ? undefined : (targetCashAccountId ? parseInt(targetCashAccountId, 10) : undefined),
        payment_method: isHistoricalOnly ? 'historical' : paymentMethodType,
        is_legacy: isHistoricalOnly,
        is_historical_only: isHistoricalOnly,
        historical_cash_note: isHistoricalOnly ? 'Pencatatan Riwayat Saja (Non-Kas / Tanpa Mutasi Saldo)' : undefined,
        notes: paymentNotes || (isHistoricalOnly ? 'Pencatatan Riwayat Saja (Non-Kas)' : undefined),
        bank_statement_id: (!isHistoricalOnly && bankStatementId) ? parseInt(bankStatementId, 10) : undefined,
        transaction_mapping_id: (!isHistoricalOnly && overrideRuleId) ? parseInt(overrideRuleId, 10) : undefined,
        override_debit_account_id: (!isHistoricalOnly && overrideDebitAccountId) ? parseInt(overrideDebitAccountId, 10) : undefined,
        override_credit_account_id: (!isHistoricalOnly && overrideCreditAccountId) ? parseInt(overrideCreditAccountId, 10) : undefined,
        override_reason: (!isHistoricalOnly && isAccountingOverridden) ? (overrideAccountReason || 'Penyesuaian akun transaksi loket kasir') : undefined
      };

      const res = await api.post('/keuangan/bill-payments', payload);
      const createdData = res.data?.data;

      if (isHistoricalOnly) {
        alert(`Pencatatan riwayat pembayaran berhasil disimpan! Tagihan siswa telah diperbarui menjadi LUNAS/terbayar tanpa memengaruhi saldo kas/bank buku kas.`);
      } else {
        alert(`Pembayaran berhasil dicatat! Kwitansi resmi #${createdData?.receipt_number || ''} telah diterbitkan dan jurnal otomatis telah dibukukan.`);
      }
      setRecordModalOpen(false);

      fetchBillsData();
      fetchAlumniBillsData();
      if (receiptSubTab === 'history') fetchPaymentHistoryData();

      if (printImmediately && createdData?.id) {
        handleViewAndPrintReceipt(createdData.id, true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan pembayaran');
    } finally {
      setSavingPayment(false);
    }
  };

  // View & Print Receipt
  const handleViewAndPrintReceipt = async (paymentId, openNewTab = false) => {
    try {
      const res = await api.get(`/keuangan/bill-payments/${paymentId}/receipt`);
      const rData = res.data?.data;
      if (openNewTab) {
        openReceiptInNewTab(rData, activeSchoolUnit?.name);
      } else {
        setActiveReceiptData(rData);
        setReceiptModalOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat kwitansi pembayaran');
    }
  };

  // Fetch Bank Statements for Edit Modal
  const fetchEditBankStatements = async (accId, pDate, currentBsId = '') => {
    if (!accId) {
      setEditBankStatementsOptions([]);
      return;
    }
    setLoadingEditBankStatements(true);
    try {
      const res = await api.get('/keuangan/bank-statements', {
        params: {
          cash_account_id: accId,
          dc_type: 'credit',
          no_pagination: true,
          sort_by: 'transaction_date',
          sort_dir: 'desc'
        }
      });
      const rows = res.data?.data?.statements || (Array.isArray(res.data?.data) ? res.data.data : []);
      
      const opts = rows.map(r => {
        const desc = r.description || r.mutation_description || 'Mutasi Masuk';
        const refNo = r.journal_number || r.reference_number || r.reconciliation_notes || r.import_batch_id || '';
        const rkDate = r.transaction_date ? String(r.transaction_date).slice(0, 10) : '';
        const isExactDate = pDate && rkDate === pDate;
        const isCurrentLinked = String(r.id) === String(currentBsId);
        const totalPlafon = parseFloat(r.amount || 0);
        const allocatedAmt = parseFloat(r.allocated_amount || 0);
        const remainingAmt = r.remaining_amount !== undefined ? parseFloat(r.remaining_amount) : Math.max(0, totalPlafon - allocatedAmt);
        const isFullyAllocated = Boolean(r.is_reconciled) || (remainingAmt <= 0.01 && totalPlafon > 0);
        const isPartial = !isFullyAllocated && allocatedAmt > 0 && remainingAmt > 0.01;

        let badgeText = isCurrentLinked ? '📌 LINKED SAAT INI' : (isExactDate ? '⭐ TGL COCOK' : 'KREDIT');
        let badgeStyle = isCurrentLinked ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold' : (isExactDate ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-blue-50 text-blue-700');

        if (!isCurrentLinked && isPartial) {
          badgeText = isExactDate ? '⭐ TGL COCOK | SISA' : '⚡ SISA PLAFON';
          badgeStyle = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
        }

        if (!isCurrentLinked && isFullyAllocated) {
          badgeText = '⛔ HABIS TERPAKAI';
          badgeStyle = 'bg-rose-100 text-rose-800 border border-rose-300 font-bold';
        }

        const labelText = (!isCurrentLinked && isFullyAllocated)
          ? `[HABIS TERPAKAI] ${formatCurrency(totalPlafon)} - ${desc}`
          : isPartial
          ? `Sisa: ${formatCurrency(remainingAmt)} (Plafon: ${formatCurrency(totalPlafon)}) - ${desc}`
          : `${formatCurrency(totalPlafon)} - ${desc}`;

        const sublabelText = (!isCurrentLinked && isFullyAllocated)
          ? `Tgl: ${rkDate || '-'} | Ref: ${refNo || '-'} | Plafon: ${formatCurrency(totalPlafon)} (Teralokasi Penuh: ${formatCurrency(allocatedAmt)}) • Saldo Sisa: Rp 0`
          : `Tgl: ${rkDate || '-'} | Ref: ${refNo || '-'} | Plafon: ${formatCurrency(totalPlafon)}${allocatedAmt > 0 ? ` (Teralokasi: ${formatCurrency(allocatedAmt)})` : ''}`;

        const searchTerms = [
          refNo,
          r.journal_number,
          r.reference_number,
          r.reconciliation_notes,
          r.import_batch_id,
          desc,
          r.description,
          r.mutation_description,
          String(r.amount || ''),
          String(totalPlafon),
          String(remainingAmt),
          rkDate
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
          searchTerms: searchTerms,
          isExactDate,
          isCurrentLinked,
          disabled: isFullyAllocated && !isCurrentLinked,
          isFullyAllocated: isFullyAllocated && !isCurrentLinked,
          disabledReason: `Mutasi rekening koran (${desc}) sebesar ${formatCurrency(totalPlafon)} sudah habis terpakai (teralokasi penuh ${formatCurrency(allocatedAmt)}). Tidak dapat dipilih.`
        };
      });

      opts.sort((a, b) => {
        if (a.isCurrentLinked && !b.isCurrentLinked) return -1;
        if (!a.isCurrentLinked && b.isCurrentLinked) return 1;
        if (!a.disabled && b.disabled) return -1;
        if (a.disabled && !b.disabled) return 1;
        if (a.isExactDate && !b.isExactDate) return -1;
        if (!a.isExactDate && b.isExactDate) return 1;
        return (b.rawDate || '').localeCompare(a.rawDate || '');
      });

      setEditBankStatementsOptions(opts);
    } catch (err) {
      console.error('Error fetching edit bank statements:', err);
      setEditBankStatementsOptions([]);
    } finally {
      setLoadingEditBankStatements(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = async (payment) => {
    setSelectedPaymentToEdit(payment);
    setShowEditAccountingOverride(false);
    setEditModalOpen(true);
    setLoadingEditDetails(true);

    try {
      const res = await api.get(`/keuangan/bill-payments/${payment.id}`);
      const pData = res.data?.data || payment;
      setSelectedPaymentToEdit(pData);

      const paidIso = pData.paid_at_formatted || (pData.paid_at ? String(pData.paid_at).slice(0, 10) : new Date().toISOString().slice(0, 10));
      const cashAccId = pData.cash_account_id ? String(pData.cash_account_id) : (cashAccounts.length > 0 ? String(cashAccounts[0].id) : '');
      const method = pData.payment_method || 'cash';
      const bsId = pData.bank_statement_id ? String(pData.bank_statement_id) : '';

      let initialRuleId = pData.transaction_mapping_id ? String(pData.transaction_mapping_id) : '';
      if (!initialRuleId && pData.fee_type_id) {
        const ft = feeTypes.find(f => f.id === pData.fee_type_id);
        if (ft && ft.payment_account_mapping_id) {
          initialRuleId = String(ft.payment_account_mapping_id);
        }
      }
      if (!initialRuleId) {
        const defaultRule = transactionRules.find(r => r.transaction_code === 'student_bill_payment') || paymentRulesOptions[0];
        if (defaultRule) initialRuleId = String(defaultRule.id);
      }

      const initialDebitCoa = pData.journal_debit_account_id ? String(pData.journal_debit_account_id) : '';
      const initialCreditCoa = pData.journal_credit_account_id ? String(pData.journal_credit_account_id) : '';

      setEditForm({
        amount: pData.amount !== undefined ? String(pData.amount) : '',
        paid_at: paidIso,
        cash_account_id: cashAccId,
        payment_method: method,
        is_historical: Boolean(pData.is_legacy),
        notes: pData.notes || '',
        correction_reason: '',
        bank_statement_id: bsId,
        transaction_mapping_id: initialRuleId,
        override_debit_account_id: initialDebitCoa,
        override_credit_account_id: initialCreditCoa,
        override_cash_account_id: ''
      });

      if (method === 'bank_transfer' && cashAccId) {
        fetchEditBankStatements(cashAccId, paidIso, bsId);
      }
    } catch (err) {
      console.error('Gagal mengambil detail pembayaran:', err);
      setEditForm({
        amount: String(payment.amount || ''),
        paid_at: payment.paid_at_formatted || String(payment.paid_at).slice(0, 10),
        cash_account_id: String(payment.cash_account_id || (cashAccounts[0]?.id || '')),
        payment_method: payment.payment_method || 'cash',
        is_historical: Boolean(payment.is_legacy),
        notes: payment.notes || '',
        correction_reason: '',
        bank_statement_id: payment.bank_statement_id ? String(payment.bank_statement_id) : '',
        transaction_mapping_id: '',
        override_debit_account_id: '',
        override_credit_account_id: '',
        override_cash_account_id: ''
      });
    } finally {
      setLoadingEditDetails(false);
    }
  };

  const handleEditRuleChange = (newRuleId) => {
    const r = transactionRules.find(item => String(item.id) === String(newRuleId));
    setEditForm(prev => ({
      ...prev,
      transaction_mapping_id: newRuleId || '',
      override_debit_account_id: r?.debit_account_id ? String(r.debit_account_id) : prev.override_debit_account_id,
      override_credit_account_id: r?.credit_account_id ? String(r.credit_account_id) : prev.override_credit_account_id,
      override_cash_account_id: r?.cash_account_id ? String(r.cash_account_id) : prev.override_cash_account_id
    }));
  };

  // Submit Edit Koreksi Pembayaran
  const handleSaveEdit = async (andPrintReceipt = false) => {
    if (!editForm.correction_reason.trim()) {
      alert('Alasan koreksi wajib diisi untuk menjaga integritas audit transaksi.');
      return;
    }
    const numAmount = parseFloat(editForm.amount);
    if (isNaN(numAmount) || numAmount < 0) {
      alert('Nominal pembayaran harus berupa angka valid.');
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        amount: numAmount,
        paid_at: editForm.paid_at,
        cash_account_id: editForm.is_historical ? null : (editForm.cash_account_id || null),
        payment_method: editForm.is_historical ? 'cash' : editForm.payment_method,
        notes: editForm.notes,
        correction_reason: editForm.correction_reason.trim(),
        bank_statement_id: (!editForm.is_historical && editForm.payment_method === 'bank_transfer' && editForm.bank_statement_id) ? editForm.bank_statement_id : null,
        transaction_mapping_id: editForm.transaction_mapping_id || null,
        override_debit_account_id: editForm.override_debit_account_id || null,
        override_credit_account_id: editForm.override_credit_account_id || null,
        override_cash_account_id: editForm.override_cash_account_id || null
      };

      await api.patch(`/keuangan/bill-payments/${selectedPaymentToEdit.id}`, payload);
      alert('Koreksi pembayaran berhasil disimpan & dicatat ke riwayat audit!');
      setEditModalOpen(false);
      fetchPaymentHistoryData();
      fetchBillsData();
      fetchAlumniBillsData();

      if (andPrintReceipt) {
        handleViewAndPrintReceipt(selectedPaymentToEdit.id, true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengoreksi pembayaran');
    } finally {
      setSavingEdit(false);
    }
  };

  // Student Options for SearchableSelect
  const studentSelectOptions = useMemo(() => {
    return allStudents.map(s => ({
      value: String(s.id),
      label: s.name || `Siswa ID #${s.id}`,
      sublabel: `NIS: ${s.nis || '-'} | Rombel: ${s.class_name || '-'}`,
      badge: s.class_name || 'Umum',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
    }));
  }, [allStudents]);

  // Unique Classes for Filter (Active Students)
  const uniqueClasses = useMemo(() => {
    const list = billsList.map(b => b.class_name).filter(Boolean);
    return ['all', ...new Set(list)];
  }, [billsList]);

  // Unique Cohorts / Graduation Years for Filter (Alumni)
  const uniqueAlumniCohorts = useMemo(() => {
    const list = alumniBillsList.map(b => b.graduation_year_display).filter(Boolean);
    return ['all', ...new Set(list)];
  }, [alumniBillsList]);

  // Unique Origin Academic Years for Filter (Alumni Arrears)
  const uniqueAlumniAcademicYears = useMemo(() => {
    const list = alumniBillsList.map(b => b.academic_year_name).filter(Boolean);
    return ['all', ...new Set(list)];
  }, [alumniBillsList]);

  // Combined Bills for Table Display based on Origin Filter
  const combinedBillsList = useMemo(() => {
    if (billsOriginFilter === 'current') return billsList;
    if (billsOriginFilter === 'prior_arrears') return priorArrearsList;
    return [...billsList, ...priorArrearsList];
  }, [billsOriginFilter, billsList, priorArrearsList]);

  // Distinct Fee Types Options for Component Filter
  const feeTypeFilterOptions = useMemo(() => {
    const map = new Map();
    feeTypes.forEach((ft) => {
      if (ft.id && ft.name) {
        map.set(String(ft.id), ft.name);
      }
    });
    [...billsList, ...priorArrearsList].forEach((b) => {
      if (b.fee_type_id && (b.fee_type_name || b.component_display)) {
        map.set(String(b.fee_type_id), b.component_display || b.fee_type_name);
      }
    });
    alumniBillsList.forEach((b) => {
      if (b.fee_type_id && (b.fee_type_name || b.component_display)) {
        map.set(String(b.fee_type_id), b.component_display || b.fee_type_name);
      }
    });
    paymentHistoryList.forEach((p) => {
      if (p.fee_type_id && (p.fee_type_name || p.payment_for)) {
        map.set(String(p.fee_type_id), p.fee_type_name || p.payment_for);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [feeTypes, billsList, priorArrearsList, alumniBillsList, paymentHistoryList]);

  // Filtered Bills List (Active Students)
  const filteredBills = useMemo(() => {
    let list = combinedBillsList.filter(b => {
      if (billsStatusFilter !== 'all') {
        if (billsStatusFilter === 'unpaid' && b.status !== 'unpaid') return false;
        if (billsStatusFilter === 'partially_paid' && b.status !== 'partially_paid') return false;
        if (billsStatusFilter === 'paid' && b.status !== 'paid') return false;
      }
      if (billsClassFilter !== 'all' && b.class_name !== billsClassFilter) return false;
      if (billsFeeTypeFilter !== 'all') {
        const bFtId = String(b.fee_type_id || '');
        const bFtName = String(b.fee_type_name || b.component_display || '').toLowerCase();
        if (bFtId !== String(billsFeeTypeFilter) && bFtName !== String(billsFeeTypeFilter).toLowerCase()) {
          return false;
        }
      }
      if (billsSearch.trim()) {
        const q = billsSearch.toLowerCase();
        const sName = String(b.student_name || '').toLowerCase();
        const nis = String(b.nis || '').toLowerCase();
        const rombel = String(b.class_name || '').toLowerCase();
        const comp = String(b.component_display || b.fee_type_name || '').toLowerCase();
        if (!sName.includes(q) && !nis.includes(q) && !rombel.includes(q) && !comp.includes(q)) {
          return false;
        }
      }
      return true;
    });

    if (billsSortConfig.key) {
      list.sort((a, b) => {
        let aVal = a[billsSortConfig.key];
        let bVal = b[billsSortConfig.key];

        if (['amount', 'total_paid', 'remaining_amount'].includes(billsSortConfig.key)) {
          let aNum = 0;
          let bNum = 0;
          if (billsSortConfig.key === 'remaining_amount') {
            aNum = a.remaining_amount !== undefined ? parseFloat(a.remaining_amount || 0) : parseFloat(a.amount || 0);
            bNum = b.remaining_amount !== undefined ? parseFloat(b.remaining_amount || 0) : parseFloat(b.amount || 0);
          } else if (billsSortConfig.key === 'total_paid') {
            aNum = parseFloat(a.total_paid || a.paid_amount || 0);
            bNum = parseFloat(b.total_paid || b.paid_amount || 0);
          } else {
            aNum = parseFloat(aVal || 0);
            bNum = parseFloat(bVal || 0);
          }
          return billsSortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        if (['bill_date', 'due_date'].includes(billsSortConfig.key)) {
          const aTime = aVal ? new Date(aVal).getTime() : 0;
          const bTime = bVal ? new Date(bVal).getTime() : 0;
          return billsSortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
        }

        if (billsSortConfig.key === 'component_display') {
          aVal = a.component_display || a.fee_type_name || '';
          bVal = b.component_display || b.fee_type_name || '';
        }

        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();
        if (aStr < bStr) return billsSortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return billsSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [combinedBillsList, billsStatusFilter, billsClassFilter, billsFeeTypeFilter, billsSearch, billsSortConfig]);

  // Filtered Alumni Bills List
  const filteredAlumniBills = useMemo(() => {
    return alumniBillsList.filter(b => {
      if (alumniStatusFilter === 'with_arrears') {
        if (b.status === 'paid' || (b.remaining_amount !== undefined && b.remaining_amount <= 0)) return false;
      } else if (alumniStatusFilter !== 'all') {
        if (alumniStatusFilter === 'unpaid' && b.status !== 'unpaid') return false;
        if (alumniStatusFilter === 'partially_paid' && b.status !== 'partially_paid') return false;
        if (alumniStatusFilter === 'paid' && b.status !== 'paid') return false;
      }
      if (alumniCohortFilter !== 'all' && b.graduation_year_display !== alumniCohortFilter) {
        return false;
      }
      if (alumniAcademicYearFilter !== 'all' && b.academic_year_name !== alumniAcademicYearFilter) {
        return false;
      }
      if (alumniFeeTypeFilter !== 'all') {
        const bFtId = String(b.fee_type_id || '');
        const bFtName = String(b.fee_type_name || b.component_display || '').toLowerCase();
        if (bFtId !== String(alumniFeeTypeFilter) && bFtName !== String(alumniFeeTypeFilter).toLowerCase()) {
          return false;
        }
      }
      if (alumniSearch.trim()) {
        const q = alumniSearch.toLowerCase();
        const sName = String(b.student_name || '').toLowerCase();
        const nis = String(b.nis || '').toLowerCase();
        const grad = String(b.graduation_year_display || '').toLowerCase();
        const ay = String(b.academic_year_name || '').toLowerCase();
        const comp = String(b.fee_type_name || b.component_display || '').toLowerCase();
        if (!sName.includes(q) && !nis.includes(q) && !grad.includes(q) && !ay.includes(q) && !comp.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [alumniBillsList, alumniStatusFilter, alumniCohortFilter, alumniAcademicYearFilter, alumniFeeTypeFilter, alumniSearch]);

  // Filtered Payment History
  const filteredHistory = useMemo(() => {
    return paymentHistoryList.filter(p => {
      if (historyFeeTypeFilter !== 'all') {
        const pFtId = String(p.fee_type_id || '');
        const pFtName = String(p.fee_type_name || p.payment_for || '').toLowerCase();
        if (pFtId !== String(historyFeeTypeFilter) && !pFtName.includes(String(historyFeeTypeFilter).toLowerCase())) {
          return false;
        }
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const sName = String(p.student_name || '').toLowerCase();
        const nis = String(p.nis || '').toLowerCase();
        const rec = String(p.receipt_number || '').toLowerCase();
        const rombel = String(p.class_name || '').toLowerCase();
        const notes = String(p.notes || '').toLowerCase();
        const pFor = String(p.payment_for || p.fee_type_name || '').toLowerCase();
        if (!sName.includes(q) && !nis.includes(q) && !rec.includes(q) && !rombel.includes(q) && !notes.includes(q) && !pFor.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [paymentHistoryList, historyFeeTypeFilter, historySearch]);

  // Summary Metrics Active Students (Tahun Ajaran Terkait)
  const billsSummary = useMemo(() => {
    const totalAmount = billsList.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
    const totalPaid = billsList.reduce((acc, b) => acc + parseFloat(b.total_paid || 0), 0);
    const totalRemaining = billsList.reduce((acc, b) => acc + parseFloat(b.remaining_amount || 0), 0);
    const unpaidCount = billsList.filter(b => b.status !== 'paid').length;
    return { totalAmount, totalPaid, totalRemaining, unpaidCount };
  }, [billsList]);

  // Summary Metrics Tunggakan Tahun Ajaran Sebelumnya
  const priorArrearsSummary = useMemo(() => {
    const totalAmount = priorArrearsList.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
    const totalPaid = priorArrearsList.reduce((acc, b) => acc + parseFloat(b.total_paid || 0), 0);
    const totalRemaining = priorArrearsList.reduce((acc, b) => acc + parseFloat(b.remaining_amount || 0), 0);
    const unpaidCount = priorArrearsList.filter(b => b.status !== 'paid').length;
    return { totalAmount, totalPaid, totalRemaining, unpaidCount };
  }, [priorArrearsList]);

  // Summary Metrics Alumni
  const alumniSummary = useMemo(() => {
    const totalAmount = alumniBillsList.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);
    const totalPaid = alumniBillsList.reduce((acc, b) => acc + parseFloat(b.paid_amount || 0), 0);
    const totalRemaining = alumniBillsList.reduce((acc, b) => acc + parseFloat(b.remaining_amount || 0), 0);
    const unpaidCount = alumniBillsList.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0)).length;
    const uniqueAlumniWithArrears = new Set(
      alumniBillsList.filter(b => b.status !== 'paid' && (b.remaining_amount > 0 || b.amount > 0)).map(b => b.student_id)
    ).size;
    return { totalAmount, totalPaid, totalRemaining, unpaidCount, uniqueAlumniWithArrears };
  }, [alumniBillsList]);

  return (
    <div className="space-y-6">
      {/* Header Halaman Utama */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <span className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-600/20 shrink-0">
            <CreditCard className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Penerimaan Pembayaran & Kasir Loket
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Loket penerimaan kas terpadu: Tagihan Siswa Aktif, Riwayat Pembayaran, dan Penerimaan Sumber Lain (RAPBS)
            </p>
          </div>
        </div>

        {/* Multi-Tenant & Dropdown Tahun Ajaran Konteks Operasi */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Satuan Pendidikan Info */}
          <span className="px-3 py-2 bg-slate-100/90 rounded-xl font-semibold text-xs text-slate-700 flex items-center gap-1.5 border border-slate-200/80 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{activeSchoolUnit?.name || 'Seluruh Satuan'}</span>
          </span>

          {/* Dropdown Tahun Ajaran Konteks */}
          <div className="flex items-center bg-blue-50/80 hover:bg-blue-50 border border-blue-200/80 rounded-2xl p-1 shadow-2xs transition">
            <div className="flex items-center gap-1.5 pl-2 pr-1 text-blue-800 font-bold text-xs shrink-0">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">T.A.:</span>
            </div>
            <div className="min-w-[170px] sm:min-w-[195px]">
              <SearchableSelect
                options={academicYears.map((ay) => ({
                  value: String(ay.id),
                  label: `T.A. ${ay.name}`,
                  sublabel: ay.is_active ? 'Tahun Ajaran Berjalan (Aktif)' : 'Tahun Ajaran Arsip',
                  badge: ay.is_active ? 'Aktif' : 'Arsip',
                  badgeClass: ay.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600'
                }))}
                value={String(activeAcademicYearId || '')}
                onChange={(val) => setActiveAcademicYearId(String(val))}
                placeholder="Pilih Tahun Ajaran"
                searchPlaceholder="Cari tahun ajaran..."
                accentColor="blue"
                allowClear={false}
                variant="header-white"
                menuMinWidth="230px"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenRecordModal()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pembayaran</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setMainTab('payment_receipt')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            mainTab === 'payment_receipt'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>1. Penerimaan Pembayaran</span>
          {proofs.filter(p => p.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-400 text-amber-950 rounded-full text-[10px] font-bold">
              {proofs.filter(p => p.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setMainTab('other_income')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            mainTab === 'other_income'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>2. Sumber Lain (RAPBS)</span>
        </button>

        <button
          onClick={() => setMainTab('daily_inflows')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            mainTab === 'daily_inflows'
              ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3. Rekapitulasi Kas Masuk</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PENERIMAAN PEMBAYARAN                                   */}
      {/* ============================================================== */}
      {mainTab === 'payment_receipt' && (
        <div className="space-y-4">
          {/* Sub-tab Switcher */}
          <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center space-x-1 flex-wrap">
              <button
                type="button"
                onClick={() => setReceiptSubTab('bills')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  receiptSubTab === 'bills'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Tagihan Siswa Aktif</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-extrabold">
                  {billsSummary.unpaidCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptSubTab('alumni_bills')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  receiptSubTab === 'alumni_bills'
                    ? 'bg-white text-purple-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span>Tagihan Alumni & Siswa Keluar</span>
                {alumniSummary.unpaidCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    receiptSubTab === 'alumni_bills'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {alumniSummary.unpaidCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setReceiptSubTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  receiptSubTab === 'history'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Pembayaran</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptSubTab('proofs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  receiptSubTab === 'proofs'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Verifikasi Bukti Transfer</span>
                {proofs.filter(p => p.status === 'pending').length > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black">
                    {proofs.filter(p => p.status === 'pending').length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOpenRecordModal()}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Pembayaran Baru</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* SUB-TAB 1.1: TAGIHAN PEMBAYARAN                                */}
          {/* ============================================================== */}
          {receiptSubTab === 'bills' && (
            <div className="space-y-4">
              {/* Macro Summary Cards (5 Cards: Tagihan T.A. Terkait, Sudah Diterima, Sisa Piutang Berjalan, Tunggakan T.A. Lalu, Total Kewajiban) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Tagihan Terbit T.A. Terkait Saja */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tagihan Terbit (T.A. Ini)</span>
                    <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 font-bold rounded text-[9.5px]">
                      {activeAyObj?.name || 'T.A. Aktif'}
                    </span>
                  </div>
                  <p className="text-lg font-black text-slate-900 mt-1 font-mono">{formatCurrency(billsSummary.totalAmount)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{billsList.length} baris tagihan terbit</p>
                </div>

                {/* 2. Sudah Diterima T.A. Terkait */}
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Sudah Diterima (T.A. Ini)</span>
                  <p className="text-lg font-black text-emerald-700 mt-1 font-mono">{formatCurrency(billsSummary.totalPaid)}</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Tercatat di kasir & bank</p>
                </div>

                {/* 3. Sisa Piutang Berjalan T.A. Terkait */}
                <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Sisa Piutang (T.A. Ini)</span>
                  <p className="text-lg font-black text-rose-700 mt-1 font-mono">{formatCurrency(billsSummary.totalRemaining)}</p>
                  <p className="text-[11px] text-rose-600 mt-0.5">{billsSummary.unpaidCount} tagihan belum lunas</p>
                </div>

                {/* 4. Tunggakan Tahun Ajaran Sebelumnya */}
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Tunggakan T.A. Lalu</span>
                    {priorArrearsSummary.unpaidCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 font-extrabold rounded text-[9.5px]">
                        {priorArrearsSummary.unpaidCount} Tagihan
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-black text-amber-900 mt-1 font-mono">{formatCurrency(priorArrearsSummary.totalRemaining)}</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">Sisa belum terbayar siswa aktif</p>
                </div>

                {/* 5. Total Akumulasi Kewajiban Piutang Siswa */}
                <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Total Kewajiban Siswa</span>
                  <p className="text-lg font-black text-indigo-900 mt-1 font-mono">
                    {formatCurrency(billsSummary.totalRemaining + priorArrearsSummary.totalRemaining)}
                  </p>
                  <p className="text-[11px] text-indigo-700 mt-0.5">Piutang T.A. Ini + Tunggakan Lalu</p>
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                {/* Filter & Search Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama siswa, NIS, rombel, atau komponen tagihan..."
                      value={billsSearch}
                      onChange={(e) => setBillsSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Origin Switcher (T.A. Ini / Tunggakan Lalu / Semua) */}
                    <select
                      value={billsOriginFilter}
                      onChange={(e) => setBillsOriginFilter(e.target.value)}
                      className="px-3 py-2 bg-blue-50/80 border border-blue-200 rounded-xl text-xs font-bold text-blue-800 cursor-pointer shadow-2xs"
                    >
                      <option value="current">Tagihan T.A. {activeAyObj?.name || 'Ini'} ({billsList.length})</option>
                      <option value="prior_arrears">Tunggakan T.A. Lalu ({priorArrearsList.length})</option>
                      <option value="all">Semua ({billsList.length + priorArrearsList.length})</option>
                    </select>

                    <select
                      value={billsStatusFilter}
                      onChange={(e) => setBillsStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="all">Semua Status Tagihan</option>
                      <option value="unpaid">Belum Lunas (Unpaid)</option>
                      <option value="partially_paid">Sebagian (Partially Paid)</option>
                      <option value="paid">Lunas (Paid)</option>
                    </select>

                    <select
                      value={billsFeeTypeFilter}
                      onChange={(e) => setBillsFeeTypeFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="all">Semua Komponen Tagihan</option>
                      {feeTypeFilterOptions.map((ft) => (
                        <option key={ft.id} value={ft.id}>{ft.name}</option>
                      ))}
                    </select>

                    <select
                      value={billsClassFilter}
                      onChange={(e) => setBillsClassFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="all">Semua Rombel</option>
                      {uniqueClasses.filter(c => c !== 'all').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={fetchBillsData}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
                      title="Refresh Data"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Table Tagihan */}
                {loading ? (
                  <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span>Memuat daftar tagihan siswa...</span>
                  </div>
                ) : filteredBills.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs italic">
                    Tidak ditemukan data tagihan yang sesuai dengan filter pencarian.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] select-none">
                        <tr>
                          <th
                            onClick={() => handleSortBills('student_name')}
                            className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Nama Siswa</span>
                              {billsSortConfig.key === 'student_name' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('class_name')}
                            className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Rombel</span>
                              {billsSortConfig.key === 'class_name' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('component_display')}
                            className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Komponen Tagihan</span>
                              {billsSortConfig.key === 'component_display' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('bill_date')}
                            className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Tgl Penagihan</span>
                              {billsSortConfig.key === 'bill_date' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('due_date')}
                            className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Jatuh Tempo</span>
                              {billsSortConfig.key === 'due_date' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('amount')}
                            className="px-4 py-3.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Total Tagihan</span>
                              {billsSortConfig.key === 'amount' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('total_paid')}
                            className="px-4 py-3.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Sudah Bayar</span>
                              {billsSortConfig.key === 'total_paid' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('remaining_amount')}
                            className="px-4 py-3.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Sisa Piutang</span>
                              {billsSortConfig.key === 'remaining_amount' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortBills('status')}
                            className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100 transition group"
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <span>Status</span>
                              {billsSortConfig.key === 'status' ? (
                                billsSortConfig.direction === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </div>
                          </th>
                          <th className="px-4 py-3.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredBills.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-800 text-xs">{b.student_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {b.nis || '-'}</div>
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 font-semibold">{b.class_name || '-'}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800">
                                  {b.component_display || b.fee_type_name}
                                </span>
                                {(b.fee_type_code === 'arrears_previous_year' || b.fee_type_name?.toLowerCase().includes('tunggakan') || (activeAyObj && b.academic_year_name && !b.academic_year_name.includes(activeAyObj.name))) && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Tunggakan T.A. Lalu
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                              {formatDateToDMY(b.bill_date || b.created_at)}
                            </td>
                            <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                              {b.due_date ? (
                                <span className={
                                  b.status !== 'paid' && new Date(b.due_date) < new Date()
                                    ? 'text-rose-600 font-bold'
                                    : 'text-slate-600'
                                }>
                                  {formatDateToDMY(b.due_date)}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                              {formatCurrency(b.amount)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(b.total_paid || 0)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-black text-rose-600">
                              {formatCurrency(b.remaining_amount !== undefined ? b.remaining_amount : b.amount)}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {b.status === 'paid' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" /> Lunas
                                </span>
                              ) : b.status === 'partially_paid' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px]">
                                  <Clock className="w-3 h-3" /> Sebagian
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px]">
                                  <AlertCircle className="w-3 h-3" /> Belum Lunas
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              {b.status !== 'paid' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRecordModal(b.student_id, b)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1 ml-auto"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Bayar</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Lunas</span>
                              )}
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

          {/* ============================================================== */}
          {/* SUB-TAB 1.1.5: TAGIHAN ALUMNI & SISWA KELUAR                   */}
          {/* ============================================================== */}
          {receiptSubTab === 'alumni_bills' && (
            <div className="space-y-4">
              {/* Macro Summary Cards Alumni */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tagihan Alumni & Keluar</span>
                  <p className="text-lg font-black text-slate-900 mt-1 font-mono">{formatCurrency(alumniSummary.totalAmount)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{alumniBillsList.length} rincian pos tagihan</p>
                </div>
                <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Sudah Diterima</span>
                  <p className="text-lg font-black text-purple-700 mt-1 font-mono">{formatCurrency(alumniSummary.totalPaid)}</p>
                  <p className="text-[11px] text-purple-600 mt-0.5">Tercatat di kasir &amp; bank</p>
                </div>
                <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Sisa Tunggakan Alumni & Keluar</span>
                  <p className="text-lg font-black text-rose-700 mt-1 font-mono">{formatCurrency(alumniSummary.totalRemaining)}</p>
                  <p className="text-[11px] text-rose-600 mt-0.5">Piutang tertunggak kelulusan / non-aktif</p>
                </div>
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Tagihan Menunggak</span>
                  <p className="text-lg font-black text-amber-900 mt-1 font-mono">{alumniSummary.unpaidCount} Tagihan</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">{alumniSummary.uniqueAlumniWithArrears} santri alumni / keluar menunggak</p>
                </div>
              </div>

              {/* Table Container Alumni */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                {/* Filter & Search Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama alumni / siswa keluar, NIS, tahun lulus, T.A. tunggakan, pos..."
                      value={alumniSearch}
                      onChange={(e) => setAlumniSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={alumniStatusFilter}
                      onChange={(e) => setAlumniStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="with_arrears">★ Menunggak (Sisa &gt; 0)</option>
                      <option value="all">Semua Status Tagihan</option>
                      <option value="unpaid">Belum Lunas (Unpaid)</option>
                      <option value="partially_paid">Sebagian (Partially Paid)</option>
                      <option value="paid">Lunas (Paid)</option>
                    </select>

                    <select
                      value={alumniFeeTypeFilter}
                      onChange={(e) => setAlumniFeeTypeFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="all">Semua Komponen Tagihan</option>
                      {feeTypeFilterOptions.map((ft) => (
                        <option key={ft.id} value={ft.id}>{ft.name}</option>
                      ))}
                    </select>

                    <select
                      value={alumniCohortFilter}
                      onChange={(e) => setAlumniCohortFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer max-w-[170px]"
                    >
                      <option value="all">Semua Tahun Lulus</option>
                      {uniqueAlumniCohorts.filter(c => c !== 'all').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={alumniAcademicYearFilter}
                      onChange={(e) => setAlumniAcademicYearFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer max-w-[170px]"
                    >
                      <option value="all">Semua T.A. Tunggakan</option>
                      {uniqueAlumniAcademicYears.filter(y => y !== 'all').map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={fetchAlumniBillsData}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
                      title="Refresh Data Alumni"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Table Tagihan Alumni */}
                {loadingAlumniBills ? (
                  <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    <span>Memuat rincian tagihan &amp; tunggakan santri alumni / siswa keluar...</span>
                  </div>
                ) : filteredAlumniBills.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2 italic">
                    <GraduationCap className="w-8 h-8 text-slate-300 mb-1" />
                    <span>Tidak ditemukan data tagihan alumni / siswa keluar yang sesuai dengan filter pencarian.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3.5">Nama Siswa</th>
                          <th className="px-4 py-3.5">Tahun Lulus</th>
                          <th className="px-4 py-3.5">Tahun Ajaran</th>
                          <th className="px-4 py-3.5">Komponen Tagihan</th>
                          <th className="px-4 py-3.5 text-right">Total Tagihan</th>
                          <th className="px-4 py-3.5 text-right">Sudah Bayar</th>
                          <th className="px-4 py-3.5 text-right">Sisa Piutang</th>
                          <th className="px-4 py-3.5 text-center">Status</th>
                          <th className="px-4 py-3.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredAlumniBills.map((b) => (
                          <tr key={b.id} className="hover:bg-purple-50/20 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <span>{b.student_name}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  Alumni
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {b.nis || '-'}</div>
                            </td>
                            <td className="px-4 py-3.5 text-purple-800 font-bold">
                              <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-md text-[11px]">
                                {b.graduation_year_display || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-700 font-semibold">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-mono">
                                {b.academic_year_name || (b.period_year ? `T.A. ${b.period_year}` : '-')}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800">
                                  {b.component_display || b.fee_type_name}
                                </span>
                                {(b.fee_type_code === 'arrears_previous_year' || b.fee_type_name?.toLowerCase().includes('tunggakan')) && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Tunggakan TP Lalu
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                              {formatCurrency(b.amount)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(b.paid_amount || b.total_paid || 0)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-black text-rose-600">
                              {formatCurrency(b.remaining_amount !== undefined ? b.remaining_amount : b.amount)}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {b.status === 'paid' || (b.remaining_amount !== undefined && b.remaining_amount <= 0) ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" /> Lunas
                                </span>
                              ) : b.status === 'partially_paid' || (b.paid_amount > 0) ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px]">
                                  <Clock className="w-3 h-3" /> Sebagian
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px]">
                                  <AlertCircle className="w-3 h-3" /> Belum Lunas
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              {b.status !== 'paid' && (b.remaining_amount === undefined || b.remaining_amount > 0) ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRecordModal(b.student_id, b)}
                                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1 ml-auto"
                                  title="Catat Pembayaran Tunggakan Alumni"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Bayar</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Lunas</span>
                              )}
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

          {/* ============================================================== */}
          {/* SUB-TAB 1.2: RIWAYAT PEMBAYARAN                                */}
          {/* ============================================================== */}
          {receiptSubTab === 'history' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              {/* Header & Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    Riwayat Seluruh Pembayaran Tagihan Siswa
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Daftar seluruh transaksi penerimaan kas masuk siswa dengan dukungan cetak ulang kwitansi, detail, dan edit koreksi.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={fetchPaymentHistoryData}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
                    title="Refresh Riwayat"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Pencarian</label>
                  <input
                    type="text"
                    placeholder="No. kwitansi, siswa, NIS..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Komponen Biaya</label>
                  <select
                    value={historyFeeTypeFilter}
                    onChange={(e) => setHistoryFeeTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="all">Semua Komponen Biaya</option>
                    {feeTypeFilterOptions.map((ft) => (
                      <option key={ft.id} value={ft.id}>{ft.name}</option>
                    ))}
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
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Metode Bayar</label>
                  <select
                    value={historyMethodFilter}
                    onChange={(e) => setHistoryMethodFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="all">Semua Metode</option>
                    <option value="cash">Tunai (Cash Loket)</option>
                    <option value="bank_transfer">Non-Tunai (Transfer Bank)</option>
                  </select>
                </div>
              </div>

              {/* Table Riwayat Pembayaran */}
              {loadingHistory ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span>Memuat riwayat pembayaran...</span>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs italic">
                  Belum ada riwayat pembayaran yang tercatat pada kriteria filter ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3.5">Tanggal</th>
                        <th className="px-4 py-3.5">No. Kwitansi</th>
                        <th className="px-4 py-3.5">Nama Siswa</th>
                        <th className="px-4 py-3.5">Rombel</th>
                        <th className="px-4 py-3.5">Komponen Biaya</th>
                        <th className="px-4 py-3.5 text-right">Nominal Bayar</th>
                        <th className="px-4 py-3.5">Metode / Kas</th>
                        <th className="px-4 py-3.5 text-center">Status Koreksi</th>
                        <th className="px-4 py-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredHistory.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-slate-600">{p.paid_at_formatted || String(p.paid_at).slice(0, 10)}</td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                              {p.receipt_number || `ID #${p.id}`}
                            </span>
                            {p.is_legacy ? (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                  <History className="w-2.5 h-2.5 text-amber-700" /> Riwayat (Non-Kas)
                                </span>
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-800">{p.student_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">NIS: {p.nis || '-'}</div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 font-semibold">{p.class_name || '-'}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-800">
                            {p.component_display || p.fee_type_name}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-700 text-sm">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-700 capitalize">
                              {p.is_legacy ? 'Riwayat / Non-Kas' : (p.payment_method === 'bank_transfer' ? 'Non-Tunai' : p.payment_method)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {p.is_legacy ? (p.historical_cash_note || 'Tanpa Mutasi Kas') : (p.cash_account_name || 'Kasir')}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {p.previous_data ? (
                              <span
                                title={`Alasan: ${p.correction_reason || '-'}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold cursor-help"
                              >
                                <Info className="w-3 h-3 text-amber-600" /> Terkoreksi
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleViewAndPrintReceipt(p.id, true)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Cetak Kwitansi di Tab Baru"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                                <span>Cetak</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleViewAndPrintReceipt(p.id, false)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Lihat Rincian Pembayaran"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(p)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="Edit & Koreksi Pembayaran (Wajib Alasan)"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-TAB 1.3: VERIFIKASI BUKTI TRANSFER ORANG TUA               */}
          {/* ============================================================== */}
          {receiptSubTab === 'proofs' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Antrean Verifikasi Bukti Bayar Transfer</h2>
                  <p className="text-xs text-slate-400">Verifikasi setoran bank orang tua, alokasikan pos tagihan, & terbitkan kwitansi resmi</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  {['all', 'pending', 'verified', 'rejected'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setProofFilter(st)}
                      className={`px-3 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                        proofFilter === st ? 'bg-white font-bold text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st === 'all' ? 'Semua' : st === 'pending' ? 'Menunggu' : st === 'verified' ? 'Terverifikasi' : 'Ditolak'}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Memuat antrean transfer...</div>
              ) : proofs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">Tidak ada bukti transfer dalam status ini.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Tgl Upload</th>
                        <th className="px-4 py-3">Nama Siswa</th>
                        <th className="px-4 py-3">Bank Pengirim</th>
                        <th className="px-4 py-3 text-right">Nominal Transfer</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proofs
                        .filter((p) => proofFilter === 'all' || p.status === proofFilter)
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-mono text-slate-600">{p.uploaded_at ? String(p.uploaded_at).slice(0, 10) : '-'}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">{p.student_name || `Siswa ID ${p.student_id}`}</td>
                            <td className="px-4 py-3 text-slate-600">{p.source_bank || '-'} a.n. {p.account_holder_name || '-'}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">{formatCurrency(p.total_transfer_amount || p.amount)}</td>
                            <td className="px-4 py-3 text-center">
                              {p.status === 'pending' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md font-semibold text-[11px]">
                                  <Clock className="w-3 h-3" /> Menunggu
                                </span>
                              ) : p.status === 'verified' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-md font-semibold text-[11px]">
                                  <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-md font-semibold text-[11px]">
                                  <XCircle className="w-3 h-3" /> Ditolak
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewProof(p)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  title="Lihat Bukti Transfer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {p.status === 'verified' && p.bill_payment_id && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewAndPrintReceipt(p.bill_payment_id, true)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>Kwitansi</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PENERIMAAN SUMBER LAIN (RAPBS)                         */}
      {/* ============================================================== */}
      {mainTab === 'other_income' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Penerimaan Sumber Lain Berbasis Mata Anggaran RAPBS
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pencatatan kas masuk non-SPP wajib memilih pos dari rencana pendapatan RAPBS (Subsidi Yayasan, BOS, Hibah, dsb.)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOtherIncomeModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Catat Kas Masuk RAPBS
              </button>
            </div>

            {/* Pagu Rencana vs Realisasi Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Daftar Mata Anggaran Pendapatan RAPBS & Progres Realisasi
              </h3>
              {rapbsSources.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                  Belum ada pos pendapatan RAPBS yang terdaftar pada tahun ajaran ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rapbsSources.map((src) => (
                    <div key={src.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">{src.name}</span>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          {src.realization_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, src.realization_percentage || 0)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Pagu: {formatCurrency(src.planned_amount)}</span>
                        <span className="font-bold text-slate-700">Masuk: {formatCurrency(src.total_realized)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Riwayat Penerimaan Lain */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Riwayat Kas Masuk Sumber Lain
              </h3>
              {otherIncomesList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Belum ada transaksi penerimaan sumber lain yang dicatat.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Pos Pendapatan RAPBS</th>
                        <th className="px-4 py-3">Rekening Kas Masuk</th>
                        <th className="px-4 py-3">Keterangan / Penyetor</th>
                        <th className="px-4 py-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {otherIncomesList.map((inc) => (
                        <tr key={inc.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-600">{inc.received_at}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {inc.budget_income_name || inc.category_name || 'Pendapatan Lain'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{inc.cash_account_name || 'Kasir'}</td>
                          <td className="px-4 py-3 text-slate-600">{inc.notes || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-emerald-700">
                            {formatCurrency(inc.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: REKAPITULASI KAS MASUK GABUNGAN                         */}
      {/* ============================================================== */}
      {mainTab === 'daily_inflows' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800">Buku Kas & Rekapitulasi Penerimaan Gabungan</h2>
            <p className="text-xs text-slate-400">Timeline arus kas masuk terpadu dari seluruh kanal penerimaan sekolah</p>
          </div>

          {/* Macro KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Total Kas Masuk</span>
              <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                {formatCurrency(inflowsData.summary?.total_amount)}
              </p>
              <p className="text-[10px] text-slate-400">{inflowsData.summary?.total_records || 0} transaksi penerimaan</p>
            </div>
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/60">
              <span className="text-[11px] text-blue-700 font-bold uppercase">Penerimaan Siswa</span>
              <p className="text-lg font-bold text-blue-800 mt-1 font-mono">
                {formatCurrency(inflowsData.summary?.student_amount)}
              </p>
              <p className="text-[10px] text-blue-500">SPP & Biaya Pendidikan</p>
            </div>
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/60">
              <span className="text-[11px] text-indigo-700 font-bold uppercase">Penerimaan PPDB</span>
              <p className="text-lg font-bold text-indigo-800 mt-1 font-mono">
                {formatCurrency(inflowsData.summary?.ppdb_amount)}
              </p>
              <p className="text-[10px] text-indigo-500">Calon Murid Baru</p>
            </div>
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
              <span className="text-[11px] text-emerald-700 font-bold uppercase">Sumber Lain (RAPBS)</span>
              <p className="text-lg font-bold text-emerald-800 mt-1 font-mono">
                {formatCurrency(inflowsData.summary?.other_amount)}
              </p>
              <p className="text-[10px] text-emerald-500">Subsidi, BOS & Non-SPP</p>
            </div>
          </div>

          {/* Filter Timeline Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl">
            <div>
              <DatePickerField
                label="Tanggal Mulai"
                value={inflowStartDate}
                onChange={(iso) => setInflowStartDate(iso)}
                placeholder="DD/MM/YYYY"
                inputClassName="bg-white"
              />
            </div>
            <div>
              <DatePickerField
                label="Tanggal Selesai"
                value={inflowEndDate}
                onChange={(iso) => setInflowEndDate(iso)}
                placeholder="DD/MM/YYYY"
                inputClassName="bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kategori Kanal</label>
              <select
                value={inflowCategoryFilter}
                onChange={(e) => setInflowCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
              >
                <option value="all">Semua Penerimaan</option>
                <option value="student">Siswa Aktif</option>
                <option value="ppdb">Calon Murid PPDB</option>
                <option value="other">Sumber Lain (RAPBS)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pencarian</label>
              <input
                type="text"
                placeholder="Cari kwitansi / penyetor..."
                value={inflowSearch}
                onChange={(e) => setInflowSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAllInflowsData()}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Timeline Table */}
          {loadingInflows ? (
            <div className="py-12 text-center text-slate-400 text-xs">Memuat rekapitulasi kas masuk...</div>
          ) : (inflowsData.inflows || []).length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">Tidak ada transaksi penerimaan pada rentang tanggal ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">No. Kwitansi</th>
                    <th className="px-4 py-3">Kanal Penerimaan</th>
                    <th className="px-4 py-3">Penyetor / Siswa</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3">Akun Kas Masuk</th>
                    <th className="px-4 py-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inflowsData.inflows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-600">{row.transaction_date}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{row.receipt_number || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.source_type === 'student_bill_payment'
                            ? 'bg-blue-100 text-blue-800'
                            : row.source_type === 'ppdb_registration_payment'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {row.category_label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{row.payer_info}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{row.description}</td>
                      <td className="px-4 py-3 text-slate-600">{row.cash_account_name}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CATAT PEMBAYARAN SISWA TERPADU                        */}
      {/* ============================================================== */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-6xl xl:max-w-7xl w-full my-auto shadow-2xl border border-slate-100 p-6 space-y-5 max-h-[92vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-800 text-base">Pencatatan Pembayaran Tagihan Siswa</h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Tahun Ajaran: {activeAyObj?.name || 'Semua'}
                      {activeAyObj?.is_active ? (
                        <span className="ml-1 px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[10px] font-semibold">Aktif</span>
                      ) : (
                        <span className="ml-1 px-1.5 py-0.2 bg-slate-500 text-white rounded text-[10px] font-semibold">Arsip</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Konteks Tahun Ajaran: <strong>T.A. {activeAyObj?.name || '-'}</strong> &bull; Memuat tagihan berjalan dan tunggakan tahun sebelumnya yang belum lunas (tagihan tahun setelahnya tidak ditampilkan).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Baris 1: Pilihan Siswa (Mendukung Multi-Siswa / Saudara dalam 1 Kwitansi & 1 Rekening Koran) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Nama Siswa <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    💡 1 Rekening Koran / Transfer untuk &gt;1 Anak tetap diterbitkan <strong>1 Kwitansi Resmi</strong>
                  </span>
                </div>

                {/* Chips Siswa yang Dipilih */}
                {selectedStudentIds.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {selectedStudentIds.map((sid, idx) => {
                      const sObj = allStudents.find(s => String(s.id) === String(sid));
                      const sName = sObj?.name || `Siswa #${sid}`;
                      const sNis = sObj?.nis || '-';
                      const sClass = sObj?.class_name || '';
                      return (
                        <span
                          key={sid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-900 rounded-lg text-xs font-semibold shadow-2xs"
                        >
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span>{sName}</span>
                          {sNis !== '-' && <span className="text-[10px] text-slate-400">({sNis})</span>}
                          {sClass && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">{sClass}</span>}
                          {selectedStudentIds.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStudent(sid)}
                              className="ml-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Hapus siswa dari transaksi ini"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown Pemilihan Siswa Utama / Tambah Siswa */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <div className={selectedStudentIds.length > 0 ? "md:col-span-8" : "md:col-span-12"}>
                    <SearchableSelect
                      options={studentSelectOptions.filter(opt => !selectedStudentIds.includes(opt.value))}
                      value=""
                      onChange={(val) => {
                        if (val) {
                          if (selectedStudentIds.length === 0) {
                            handleStudentChange(val);
                          } else {
                            handleAddAdditionalStudent(val);
                          }
                        }
                      }}
                      placeholder={selectedStudentIds.length === 0 ? "-- Pilih Siswa --" : "+ Tambah Siswa Lain / Saudara Kandung (1 Kwitansi Gabungan) --"}
                      searchPlaceholder="Ketik nama siswa atau NIS..."
                      accentColor="blue"
                      allowClear={false}
                    />
                  </div>
                  {selectedStudentIds.length > 0 && (
                    <div className="md:col-span-4 text-[11px] text-slate-500 italic">
                      {selectedStudentIds.length === 1 ? '1 Siswa Terpilih. Klik dropdown untuk menambah saudara.' : `${selectedStudentIds.length} Siswa Terpilih (Kwitansi & Mutasi Gabungan).`}
                    </div>
                  )}
                </div>
              </div>

              {/* Baris 2: Tanggal & Total Nominal Bayar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <DatePickerField
                    label="Tanggal Pembayaran"
                    value={paymentDate}
                    onChange={(iso) => setPaymentDate(iso)}
                    placeholder="DD/MM/YYYY"
                    required={true}
                    inputClassName="bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Nominal Diterima (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={paymentTotalAmount}
                    onChange={(e) => setPaymentTotalAmount(e.target.value)}
                    placeholder="Contoh: 500000"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Opsi Pencatatan Riwayat Saja (Non-Kas) */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                isHistoricalOnly 
                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/25 shadow-xs' 
                  : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isHistoricalOnly}
                    onChange={(e) => setIsHistoricalOnly(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <History className={`w-3.5 h-3.5 ${isHistoricalOnly ? 'text-amber-600' : 'text-slate-500'}`} />
                        Catat Sebagai Riwayat Saja (Non-Kas / Tanpa Mutasi Saldo)
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isHistoricalOnly 
                          ? 'bg-amber-200 text-amber-900 border border-amber-300' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isHistoricalOnly ? '⚡ Mode Riwayat Saja Aktif' : 'Normal (Mutasi Kas Aktif)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Centang opsi ini jika pembayaran telah diselesaikan di masa lalu dan transaksi ini hanya untuk <strong>mencatat riwayat pelunasan tagihan siswa</strong> tanpa memengaruhi saldo buku kas/bank dan tanpa membukukan jurnal penerimaan baru.
                    </p>
                  </div>
                </label>
              </div>

              {/* Baris 3: Metode Bayar & Akun Kas */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                {isHistoricalOnly ? (
                  <div className="p-2.5 bg-amber-100/70 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-medium flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Mode Riwayat Saja: Pembayaran ini akan melunasi tagihan siswa tanpa memengaruhi saldo akun kas/bank dan tanpa mutasi jurnal buku kas berjalan.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-bold text-slate-700">Metode Pembayaran:</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethodType === 'cash'}
                          onChange={() => setPaymentMethodType('cash')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>Tunai (Kasir Loket)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethodType === 'bank_transfer'}
                          onChange={() => {
                            setPaymentMethodType('bank_transfer');
                            const currentAcc = cashAccounts.find(a => String(a.id) === String(targetCashAccountId));
                            if (!currentAcc || currentAcc.account_kind !== 'bank') {
                              const defaultBank = cashAccounts.find(a => a.account_kind === 'bank' && a.name?.toLowerCase().includes('penerimaan')) ||
                                                  cashAccounts.find(a => a.account_kind === 'bank' && a.is_active) ||
                                                  cashAccounts.find(a => a.account_kind === 'bank');
                              if (defaultBank) {
                                setTargetCashAccountId(String(defaultBank.id));
                              }
                            }
                          }}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>Non-Tunai (Transfer Bank)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Dropdowns jika Non-Tunai / Tunai */}
                {!isHistoricalOnly && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Akun Kas / Bank Tujuan <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        options={targetCashAccountOptions}
                        value={targetCashAccountId}
                        onChange={(val) => setTargetCashAccountId(val)}
                        placeholder="-- Pilih Akun Kas / Bank --"
                        searchPlaceholder="Cari nama akun kas / bank..."
                        accentColor="blue"
                        allowClear={false}
                      />
                    </div>

                    {/* Referensi Rekening Koran */}
                    {paymentMethodType === 'bank_transfer' && (
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                          <span>Referensi Mutasi Rekening Koran</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Multi-Transaksi / Parsial OK)</span>
                        </label>
                        <SearchableSelect
                          options={bankStatementsOptions}
                          value={bankStatementId}
                          onChange={(val) => {
                            setBankStatementId(val || '');
                            if (val) {
                              const selectedOpt = bankStatementsOptions.find(o => String(o.value) === String(val));
                              if (selectedOpt) {
                                const curTotal = parseFloat(paymentTotalAmount) || 0;
                                const fillAmount = selectedOpt.remaining_amount !== undefined ? selectedOpt.remaining_amount : selectedOpt.amount;
                                if (curTotal <= 0 && fillAmount > 0) {
                                  setPaymentTotalAmount(String(fillAmount));
                                }
                                // Auto-sinkronkan tanggal pembayaran dengan tanggal mutasi rekening koran
                                if (selectedOpt.rawDate) {
                                  setPaymentDate(selectedOpt.rawDate);
                                }
                              }
                            }
                          }}
                          onDisabledSelect={(opt) => setBlockedStatementModal(opt)}
                          placeholder="-- Pilih Rekening Koran Terkait --"
                          searchPlaceholder="Ketik nominal, no. ref, atau uraian transaksi RK..."
                          accentColor="emerald"
                          allowClear={true}
                          isLoading={loadingBankStatements}
                          emptyText="Tidak ada mutasi kredit rekening koran untuk akun bank ini"
                        />
                        {(() => {
                          const selectedOpt = bankStatementsOptions.find(o => String(o.value) === String(bankStatementId));
                          if (!selectedOpt) return null;
                          return (
                            <div className="p-2 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[10px] space-y-1 text-slate-700 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-emerald-900 font-bold flex items-center gap-1">
                                  <span>🔗 RK Terpilih:</span>
                                  <span className="truncate max-w-xs">{selectedOpt.desc}</span>
                                </span>
                                <span className="font-mono text-emerald-800 font-bold">
                                  Plafon: {formatCurrency(selectedOpt.amount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-500">
                                <span>Tgl Mutasi Bank: <b className="text-slate-800 font-mono">{selectedOpt.rawDate || '-'}</b> • Teralokasi: <b>{formatCurrency(selectedOpt.allocated_amount || 0)}</b></span>
                                <span className="text-emerald-700 font-bold font-mono">
                                  Sisa Plafon Tersedia: {formatCurrency(selectedOpt.remaining_amount || selectedOpt.amount)}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Baris 4: Tabel Rincian Alokasi Tagihan Siswa */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Rincian Alokasi Tagihan Siswa Terkait:
                    </label>
                    {studentBillsForRecord.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {recordBillsSearch.trim()
                          ? `${filteredStudentBillsForRecord.length} dari ${studentBillsForRecord.length} Tagihan`
                          : `${studentBillsForRecord.length} Tagihan`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {studentBillsForRecord.length > 0 && (
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={recordBillsSearch}
                          onChange={(e) => setRecordBillsSearch(e.target.value)}
                          placeholder="Cari pos, bulan, T.A, nama..."
                          className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 placeholder:text-slate-400"
                        />
                        {recordBillsSearch && (
                          <button
                            type="button"
                            onClick={() => setRecordBillsSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                            title="Bersihkan pencarian"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {studentBillsForRecord.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoAllocateFifo}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs whitespace-nowrap"
                      >
                        <span>⚡ Alokasikan Otomatis (FIFO)</span>
                      </button>
                    )}
                  </div>
                </div>

                {loadingStudentBills ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Memuat daftar tagihan siswa...</span>
                  </div>
                ) : !selectedStudentId ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Silakan pilih siswa di atas untuk melihat daftar tagihan yang belum lunas.
                  </div>
                ) : studentBillsForRecord.length === 0 ? (
                  <div className="p-8 text-center text-emerald-700 text-xs font-semibold bg-emerald-50 rounded-2xl border border-emerald-200">
                    Siswa ini tidak memiliki tagihan aktif yang belum lunas.
                  </div>
                ) : filteredStudentBillsForRecord.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
                    <Search className="w-7 h-7 text-slate-300" />
                    <p className="text-xs text-slate-500 font-medium">
                      Tidak ada tagihan yang cocok dengan kata kunci <span className="font-bold text-slate-700">"{recordBillsSearch}"</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setRecordBillsSearch('')}
                      className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-blue-600 shadow-2xs cursor-pointer transition"
                    >
                      Reset Filter Pencarian
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[850px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="px-3 py-2.5">Komponen Tagihan</th>
                          <th className="px-3 py-2.5" style={{ minWidth: '260px' }}>Aturan Transaksi (Jurnal)</th>
                          <th className="px-3 py-2.5 text-right">Total</th>
                          <th className="px-3 py-2.5 text-right">Sudah Bayar</th>
                          <th className="px-3 py-2.5 text-right">Sisa Piutang</th>
                          <th className="px-3 py-2.5 text-right" style={{ width: '165px', minWidth: '155px' }}>Bayar Sekarang (Rp)</th>
                          <th className="px-3 py-2.5 text-right">Sisa Setelah Bayar</th>
                          <th className="px-3 py-2.5 text-center" style={{ width: '65px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudentBillsForRecord.map((bill) => {
                          const billTotal = parseFloat(bill.amount || 0);
                          const billPaid = parseFloat(bill.total_paid || 0);
                          const billRem = bill.remaining_amount !== undefined ? parseFloat(bill.remaining_amount) : (billTotal - billPaid);
                          const allocated = parseFloat(billAllocations[bill.id] || 0);
                          const remAfter = Math.max(0, billRem - allocated);
                          const currentRuleId = getBillDefaultRuleId(bill);

                          return (
                            <tr key={bill.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2.5">
                                <div className="flex flex-col gap-1">
                                  {selectedStudentIds.length > 1 && (
                                    <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                      👤 {bill.student_name || `Siswa #${bill.student_id}`} {bill.nis && bill.nis !== '-' ? `(${bill.nis})` : ''}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-800">{bill.component_display || bill.fee_type_name}</span>
                                    {bill.academic_year_name && (
                                      <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                        activeAyObj && String(bill.academic_year_id) !== String(activeAyObj.id)
                                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                                      }`}>
                                        T.A. {bill.academic_year_name}
                                        {activeAyObj && String(bill.academic_year_id) !== String(activeAyObj.id) && ' (Tunggakan)'}
                                      </span>
                                    )}
                                    {(bill.fee_type_code === 'arrears_previous_year' || bill.fee_type_name?.toLowerCase().includes('tunggakan')) && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                        Tunggakan TP Lalu
                                      </span>
                                    )}
                                  </div>
                                  {bill.period_display && (
                                    <span className="text-[10.5px] text-slate-500 font-medium">
                                      Periode: {bill.period_display}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                {(() => {
                                  const cfg = getBillAccountingConfig(bill);
                                  const ruleLabel = cfg.rule?.transaction_label || cfg.rule?.transaction_code || 'Aturan Tagihan';
                                  const dCode = cfg.debitCoa ? `[${cfg.debitCoa.account_code || cfg.debitCoa.account_number || ''}] ${cfg.debitCoa.name || cfg.debitCoa.account_name || ''}` : 'Kas Penerimaan';
                                  const kCode = cfg.creditCoa ? `[${cfg.creditCoa.account_code || cfg.creditCoa.account_number || ''}] ${cfg.creditCoa.name || cfg.creditCoa.account_name || ''}` : 'Piutang';
                                  const dShort = cfg.debitCoa ? `${cfg.debitCoa.account_code || cfg.debitCoa.account_number || ''} ${cfg.debitCoa.account_name || cfg.debitCoa.name || ''}`.trim() : 'Kas';
                                  const kShort = cfg.creditCoa ? `${cfg.creditCoa.account_code || cfg.creditCoa.account_number || ''} ${cfg.creditCoa.account_name || cfg.creditCoa.name || ''}`.trim() : 'Piutang';
                                  const cashLabel = cfg.cashAcc?.name || (targetCashAccountId ? (cashAccounts.find(a => String(a.id) === String(targetCashAccountId))?.name || 'Kasir Default') : 'Kasir Default');
                                  const posBiayaLabel = cfg.feeTypeObj?.name || bill.fee_type_name || bill.component_display || 'Pos Alokasi Dana';

                                  return (
                                    <div className="flex flex-col gap-1.5 min-w-[250px] py-0.5">
                                      {/* Baris 1: Nama Aturan Transaksi & Status Badge & Tombol Edit */}
                                      <div className="flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1 min-w-0">
                                          <span className="font-extrabold text-slate-800 text-[11px] truncate" title={ruleLabel}>
                                            {ruleLabel}
                                          </span>
                                          {cfg.isCustomized ? (
                                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold rounded text-[9px] shrink-0">
                                              Custom
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-medium shrink-0">
                                              Default
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => openEditBillRuleModal(bill)}
                                          className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
                                          title="Ubah aturan transaksi, akun debit/kredit, kas terkait, atau pos alokasi dana"
                                        >
                                          <Edit2 className="w-3 h-3 text-indigo-600" />
                                          <span>Edit</span>
                                        </button>
                                      </div>

                                      {/* Baris 2: Akun Debet & Kredit (Double-Entry - Stacked cleanly with distinct badges) */}
                                      <div className="flex flex-col gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200/80 text-[10px] font-mono">
                                        <div className="flex items-center gap-1.5 text-emerald-800 min-w-0" title={`Debit: ${dCode}`}>
                                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold rounded text-[9px] shrink-0 font-sans">D</span>
                                          <span className="font-semibold truncate">{dShort}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-blue-800 min-w-0" title={`Kredit: ${kCode}`}>
                                          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 font-bold rounded text-[9px] shrink-0 font-sans">K</span>
                                          <span className="font-semibold truncate">{kShort}</span>
                                        </div>
                                      </div>

                                      {/* Baris 3: Kas Terkait (Default) & Pos Alokasi Dana Terkait */}
                                      <div className="flex items-center justify-between gap-1 text-[9.5px] leading-tight text-slate-500">
                                        <div className="truncate flex items-center gap-1 max-w-[125px]" title={`Kas Terkait: ${cashLabel}`}>
                                          <span className="text-slate-400 font-bold shrink-0">Kas:</span>
                                          <span className="font-semibold text-slate-700 truncate">{cashLabel}</span>
                                        </div>
                                        <div className="truncate flex items-center gap-1 max-w-[135px]" title={`Pos Alokasi Dana: ${posBiayaLabel}`}>
                                          <span className="text-slate-400 font-bold shrink-0">Pos:</span>
                                          <span className="font-semibold text-indigo-700 truncate">{posBiayaLabel}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-slate-700">{formatCurrency(billTotal)}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-emerald-700">{formatCurrency(billPaid)}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">{formatCurrency(billRem)}</td>
                              <td className="px-3 py-2.5 text-right" style={{ width: '165px', minWidth: '155px' }}>
                                <input
                                  type="number"
                                  value={billAllocations[bill.id] || ''}
                                  onChange={(e) => handleAllocationChange(bill.id, e.target.value)}
                                  placeholder="0"
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-right font-mono font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs shadow-2xs"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                                {formatCurrency(remAfter)}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handlePayFullRow(bill)}
                                  className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded text-[10px] font-bold cursor-pointer transition"
                                  title="Bayar Penuh Sisa Piutang Pos Ini"
                                >
                                  Penuh
                                </button>
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
              <div className="p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Total Diterima:</span>
                    <div className="font-mono font-black text-slate-800 text-sm">
                      {formatCurrency(paymentTotalAmount || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Teralokasi:</span>
                    <div className="font-mono font-black text-blue-700 text-sm">
                      {formatCurrency(totalAllocatedAmount)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Sisa Belum Teralokasi:</span>
                  <div className={`font-mono font-black text-sm ${Math.abs(unallocatedAmount) < 0.01 ? 'text-emerald-700' : unallocatedAmount > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                    {formatCurrency(unallocatedAmount)}
                  </div>
                </div>
              </div>

              {/* Baris 6: Keterangan / Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan Transaksi</label>
                <input
                  type="text"
                  placeholder="Contoh: Pembayaran SPP Juli 2025 via loket..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs cursor-pointer transition"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingPayment}
                  onClick={() => handleSavePayment(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition"
                >
                  {savingPayment ? 'Menyimpan...' : 'Simpan Pembayaran Saja'}
                </button>

                <button
                  type="button"
                  disabled={savingPayment}
                  onClick={() => handleSavePayment(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/25 cursor-pointer transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{savingPayment ? 'Memproses...' : 'Simpan & Cetak Kwitansi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* POPUP MODAL: ATUR ATURAN TRANSAKSI & JURNAL PER-TAGIHAN        */}
      {/* ============================================================== */}
      {editingBillRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-indigo-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    Aturan Transaksi & Jurnal Tagihan
                  </h3>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    Komponen: <span className="font-bold text-amber-300">{editingBillRule.component_display || editingBillRule.fee_type_name}</span>
                    {editingBillRule.student_name ? ` • Siswa: ${editingBillRule.student_name}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBillRule(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[calc(85vh-140px)]">
              {/* 1. Pos Alokasi Dana Terkait & Ringkasan Finansial */}
              {(() => {
                const ftObj = feeTypes.find(f => f.id === editingBillRule.fee_type_id) || null;
                const posBiayaName = ftObj?.name ? `Dana ${ftObj.name}` : (editingBillRule.fee_type_name ? `Dana ${editingBillRule.fee_type_name}` : 'Pos Alokasi Dana Tagihan');
                const posBiayaCode = ftObj?.code || editingBillRule.fee_type_code || '-';
                const posBiayaCategory = ftObj?.category || (posBiayaCode.includes('spp') ? 'Rutin Bulanan' : 'Penerimaan Tagihan Siswa');
                const defaultReceivableCoa = chartOfAccounts.find(c => c.id === ftObj?.receivable_account_id);
                const defaultReceivableLabel = defaultReceivableCoa ? `[${defaultReceivableCoa.account_code || defaultReceivableCoa.account_number}] ${defaultReceivableCoa.account_name || defaultReceivableCoa.name}` : null;
                const defaultRuleObj = transactionRules.find(r => String(r.id) === String(ftObj?.payment_account_mapping_id));

                return (
                  <div className="p-4 bg-gradient-to-br from-indigo-50/90 via-slate-50 to-blue-50/70 border border-indigo-200/80 rounded-2xl space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider">
                              Pos Alokasi Dana Terkait
                            </span>
                            <span className="px-2 py-0.2 bg-indigo-100 text-indigo-800 font-mono font-bold rounded-full text-[9.5px] border border-indigo-200">
                              Kode: {posBiayaCode}
                            </span>
                            <span className="px-2 py-0.2 bg-blue-100 text-blue-800 font-bold rounded-full text-[9.5px] border border-blue-200">
                              {posBiayaCategory}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-900 mt-0.5">
                            {posBiayaName}
                          </h4>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Alokasi Bayar Sekarang</span>
                        <div className="font-mono font-black text-emerald-700 text-sm">
                          {formatCurrency(billAllocations[editingBillRule.id] || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-indigo-100 text-[11px]">
                      <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total / Sisa Piutang</span>
                        <div className="font-mono font-bold text-rose-600 mt-0.5">
                          {formatCurrency(editingBillRule.remaining_amount !== undefined ? editingBillRule.remaining_amount : editingBillRule.amount)}
                        </div>
                        <span className="text-[10px] text-slate-400">Total: {formatCurrency(editingBillRule.amount)}</span>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Akun Piutang Bawaan</span>
                        <div className="font-semibold text-slate-800 mt-0.5 truncate" title={defaultReceivableLabel || 'Sesuai Aturan Jurnal'}>
                          {defaultReceivableLabel || '(Sesuai Aturan Transaksi)'}
                        </div>
                        <span className="text-[10px] text-indigo-600">Master Pos Alokasi Dana</span>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Aturan Bawaan Master</span>
                        <div className="font-semibold text-slate-800 mt-0.5 truncate" title={defaultRuleObj?.transaction_label || defaultRuleObj?.transaction_code || 'Standar Siswa'}>
                          {defaultRuleObj?.transaction_label || defaultRuleObj?.transaction_code || 'Standar Tagihan Siswa'}
                        </div>
                        <span className="text-[10px] text-emerald-700">Mutasi Saldo Dompet Pos Dana</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 2. Pilihan Aturan Transaksi */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Pilihan Aturan Transaksi (Transaction Rule) <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Otomatis tentukan debit & kredit</span>
                </label>
                <SearchableSelect
                  options={ruleSelectOptions}
                  value={tempRuleModalState.ruleId}
                  onChange={handleModalRuleChange}
                  placeholder="-- Pilih Aturan Transaksi --"
                  searchPlaceholder="Cari aturan transaksi..."
                  accentColor="indigo"
                  allowClear={false}
                />
              </div>

              {/* 3. Grid Akun Debet & Kredit (Bisa Diedit Custom) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* Akun Debit */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>Akun Debit (Kas / Penerimaan)</span>
                  </label>
                  <SearchableSelect
                    options={coaOptions}
                    value={tempRuleModalState.debitAccountId}
                    onChange={(val) => setTempRuleModalState(prev => ({ ...prev, debitAccountId: val || '' }))}
                    placeholder="-- Pilih Akun Debit --"
                    searchPlaceholder="Cari nomor atau nama akun COA..."
                    accentColor="emerald"
                    allowClear={false}
                  />
                  <p className="text-[10px] text-slate-400">Default: Kas Bank - Kas Penerimaan</p>
                </div>

                {/* Akun Kredit */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span>Akun Kredit (Piutang / Pendapatan)</span>
                  </label>
                  <SearchableSelect
                    options={coaOptions}
                    value={tempRuleModalState.creditAccountId}
                    onChange={(val) => setTempRuleModalState(prev => ({ ...prev, creditAccountId: val || '' }))}
                    placeholder="-- Pilih Akun Kredit --"
                    searchPlaceholder="Cari nomor atau nama akun COA..."
                    accentColor="blue"
                    allowClear={false}
                  />
                  <p className="text-[10px] text-slate-400">Default: Piutang terkait komponen tagihan</p>
                </div>
              </div>

              {/* 4. Kas Terkait (Default) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kas Terkait (Default)
                </label>
                <SearchableSelect
                  options={cashAccountSelectOptions}
                  value={tempRuleModalState.cashAccountId}
                  onChange={(val) => setTempRuleModalState(prev => ({ ...prev, cashAccountId: val || '' }))}
                  placeholder="-- Pilih Akun Kas Terkait --"
                  searchPlaceholder="Cari nama akun kas..."
                  accentColor="blue"
                  allowClear={true}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Akun kas/bank pembukuan yang terikat ke transaksi ini. Jika kosong, akan otomatis mengikuti akun kas tujuan utama formulir pembayaran.
                </p>
              </div>

              {/* 5. Live Jurnal Entry Visual Preview */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2 font-mono">
                <div className="flex items-center justify-between text-[11px] text-indigo-300 font-bold border-b border-slate-800 pb-1.5 font-sans">
                  <span>Pratinjau Jurnal Ganda (Double Entry):</span>
                  <span>Alokasi: {formatCurrency(billAllocations[editingBillRule.id] || 0)}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="truncate">
                      [D] {chartOfAccounts.find(c => String(c.id) === String(tempRuleModalState.debitAccountId))?.name || chartOfAccounts.find(c => String(c.id) === String(tempRuleModalState.debitAccountId))?.account_name || 'Kas Penerimaan'}
                    </span>
                    <span className="font-bold">{formatCurrency(billAllocations[editingBillRule.id] || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-400 pl-4">
                    <span className="truncate">
                      [K] {chartOfAccounts.find(c => String(c.id) === String(tempRuleModalState.creditAccountId))?.name || chartOfAccounts.find(c => String(c.id) === String(tempRuleModalState.creditAccountId))?.account_name || 'Piutang Tagihan'}
                    </span>
                    <span className="font-bold">{formatCurrency(billAllocations[editingBillRule.id] || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetBillRuleToDefault}
                className="px-3 py-2 text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl font-bold transition-all text-xs cursor-pointer"
              >
                Reset ke Default Komponen
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBillRule(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition-colors text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveBillRuleModal}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-xs shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
                >
                  Simpan & Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT & KOREKSI PEMBAYARAN (AUDIT TRAIL)              */}
      {/* ============================================================== */}
      {editModalOpen && selectedPaymentToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] space-y-4 my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Koreksi & Edit Pembayaran Siswa</h3>
                  <p className="text-xs text-slate-500">
                    Perbarui data transaksi, akun kas/bank, mutasi rekening koran, serta aturan jurnal & akuntansi
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold text-xs">
                  {selectedPaymentToEdit.receipt_number || '-'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Form */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Context Info Banner (Identitas Siswa, Satuan Pendidikan & Tagihan) */}
              <div className="p-3.5 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/50 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  {/* Kolom Kiri: Siswa & Satdik */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-extrabold truncate">
                        {selectedPaymentToEdit.school_unit_name || selectedPaymentToEdit.school_unit?.name || activeSchoolUnit?.name || 'Satuan Pendidikan Aldepos'}
                      </span>
                    </div>
                    {selectedPaymentToEdit.school_unit_address && (
                      <p className="text-[10px] text-slate-500 pl-5 line-clamp-1">
                        {selectedPaymentToEdit.school_unit_address}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 pt-1 text-slate-900 font-semibold">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        👤
                      </span>
                      <span className="font-bold text-slate-900">{selectedPaymentToEdit.student_name || 'Siswa'}</span>
                      <span className="text-slate-400 font-normal">
                        (NIS: {selectedPaymentToEdit.nis || '-'})
                      </span>
                      {selectedPaymentToEdit.class_name && (
                        <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 font-bold rounded text-[9.5px]">
                          {selectedPaymentToEdit.class_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kolom Kanan: Tagihan, Periode & Kwitansi */}
                  <div className="space-y-1 md:text-right flex flex-col md:items-end justify-center">
                    <div className="flex items-center gap-1.5 md:justify-end">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Komponen Tagihan:</span>
                      <span className="font-extrabold text-indigo-900">
                        {selectedPaymentToEdit.component_display || selectedPaymentToEdit.fee_type_name || 'Tagihan Siswa'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 md:justify-end text-[10.5px] text-slate-600">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Periode / TA: <b className="text-slate-800">{selectedPaymentToEdit.period_display || selectedPaymentToEdit.academic_year_name || '-'}</b></span>
                    </div>
                    <div className="flex items-center gap-1.5 md:justify-end text-[10px] text-slate-500 font-mono">
                      <span>No. Kwitansi: <b className="text-slate-700">{selectedPaymentToEdit.receipt_number || '-'}</b></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Baris 1: Tanggal & Nominal Pembayaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <DatePickerField
                    label="Tanggal Pembayaran *"
                    value={editForm.paid_at}
                    onChange={(iso) => {
                      setEditForm(p => ({ ...p, paid_at: iso }));
                      if (editForm.payment_method === 'bank_transfer' && editForm.cash_account_id) {
                        fetchEditBankStatements(editForm.cash_account_id, iso, editForm.bank_statement_id);
                      }
                    }}
                    placeholder="DD/MM/YYYY"
                    required={true}
                    inputClassName="bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Nominal Pembayaran (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="Contoh: 500000"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {/* Terbilang Live Preview */}
                  {parseFloat(editForm.amount) > 0 && (
                    <div className="text-[10.5px] text-indigo-700 font-medium bg-indigo-50/90 px-2.5 py-1 rounded-lg border border-indigo-200/80 italic leading-snug">
                      # {terbilang(parseFloat(editForm.amount))} Rupiah #
                    </div>
                  )}
                </div>
              </div>

              {/* Opsi Pencatatan Riwayat Saja (Non-Kas) */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                editForm.is_historical 
                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/25 shadow-xs' 
                  : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editForm.is_historical}
                    onChange={(e) => setEditForm(p => ({ ...p, is_historical: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <History className={`w-3.5 h-3.5 ${editForm.is_historical ? 'text-amber-600' : 'text-slate-500'}`} />
                        Catat Sebagai Riwayat Saja (Non-Kas / Tanpa Mutasi Saldo)
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        editForm.is_historical 
                          ? 'bg-amber-200 text-amber-900 border border-amber-300' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {editForm.is_historical ? '⚡ Mode Riwayat Saja Aktif' : 'Normal (Mutasi Kas Aktif)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Centang opsi ini jika transaksi ini merupakan <strong>catatan riwayat pelunasan tagihan siswa</strong> tanpa memengaruhi saldo akun kas/bank dan tanpa membukukan mutasi kas berjalan.
                    </p>
                  </div>
                </label>
              </div>

              {/* Baris 2: Metode Bayar & Rekening Kas Masuk / Mutasi Rekening Koran */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                {editForm.is_historical ? (
                  <div className="p-2.5 bg-amber-100/70 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-medium flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Mode Riwayat Saja: Pembayaran ini melunasi tagihan siswa tanpa memengaruhi saldo akun kas/bank.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="text-xs font-bold text-slate-700">Metode Pembayaran:</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="radio"
                          name="editPaymentMethod"
                          checked={editForm.payment_method === 'cash'}
                          onChange={() => setEditForm(p => ({ ...p, payment_method: 'cash' }))}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>Tunai (Kasir Loket)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="radio"
                          name="editPaymentMethod"
                          checked={editForm.payment_method === 'bank_transfer'}
                          onChange={() => {
                            setEditForm(p => {
                              let nextAccId = p.cash_account_id;
                              const currentAcc = cashAccounts.find(a => String(a.id) === String(nextAccId));
                              if (!currentAcc || currentAcc.account_kind !== 'bank') {
                                const defaultBank = cashAccounts.find(a => a.account_kind === 'bank' && a.name?.toLowerCase().includes('penerimaan')) ||
                                                    cashAccounts.find(a => a.account_kind === 'bank' && a.is_active) ||
                                                    cashAccounts.find(a => a.account_kind === 'bank');
                                if (defaultBank) nextAccId = String(defaultBank.id);
                              }
                              if (nextAccId) {
                                fetchEditBankStatements(nextAccId, p.paid_at, p.bank_statement_id);
                              }
                              return { ...p, payment_method: 'bank_transfer', cash_account_id: nextAccId };
                            });
                          }}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>Non-Tunai (Transfer Bank)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Dropdown Akun Kas & Rekening Koran jika Normal */}
                {!editForm.is_historical && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Akun Kas / Bank Masuk <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        options={editCashAccountOptions}
                        value={editForm.cash_account_id}
                        onChange={(val) => {
                          setEditForm(p => ({ ...p, cash_account_id: val || '' }));
                          if (editForm.payment_method === 'bank_transfer' && val) {
                            fetchEditBankStatements(val, editForm.paid_at, editForm.bank_statement_id);
                          }
                        }}
                        placeholder="-- Pilih Akun Kas / Bank --"
                        searchPlaceholder="Cari nama akun kas / bank..."
                        accentColor="blue"
                        allowClear={false}
                      />
                    </div>

                    {/* Referensi Rekening Koran saat Non-Tunai */}
                    {editForm.payment_method === 'bank_transfer' && (
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                          <span>Referensi Mutasi Rekening Koran</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Multi-Transaksi / Parsial OK)</span>
                        </label>
                        <SearchableSelect
                          options={editBankStatementsOptions}
                          value={editForm.bank_statement_id}
                          onChange={(val) => {
                            setEditForm(p => ({ ...p, bank_statement_id: val || '' }));
                            if (val) {
                              const selectedOpt = editBankStatementsOptions.find(o => String(o.value) === String(val));
                              if (selectedOpt && selectedOpt.rawDate) {
                                // Auto sync date to bank statement date
                                setEditForm(p => ({ ...p, paid_at: selectedOpt.rawDate }));
                              }
                            }
                          }}
                          onDisabledSelect={(opt) => setBlockedStatementModal(opt)}
                          placeholder="-- Pilih Rekening Koran Terkait --"
                          searchPlaceholder="Ketik nominal, no. ref, atau uraian transaksi RK..."
                          accentColor="emerald"
                          allowClear={true}
                          isLoading={loadingEditBankStatements}
                          emptyText="Tidak ada mutasi kredit rekening koran untuk akun bank ini"
                        />
                        {(() => {
                          const selectedOpt = editBankStatementsOptions.find(o => String(o.value) === String(editForm.bank_statement_id));
                          if (!selectedOpt) return null;
                          return (
                            <div className="p-2 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[10px] space-y-1 text-slate-700 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-emerald-900 font-bold flex items-center gap-1">
                                  <span>🔗 RK Terpilih:</span>
                                  <span className="truncate max-w-xs">{selectedOpt.desc}</span>
                                </span>
                                <span className="font-mono text-emerald-800 font-bold">
                                  Plafon: {formatCurrency(selectedOpt.amount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-500">
                                <span>Tgl Mutasi Bank: <b className="text-slate-800 font-mono">{selectedOpt.rawDate || '-'}</b> • Teralokasi: <b>{formatCurrency(selectedOpt.allocated_amount || 0)}</b></span>
                                <span className="text-emerald-700 font-bold font-mono">
                                  Sisa Plafon: {formatCurrency(selectedOpt.remaining_amount || selectedOpt.amount)}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Baris 3: Aturan Transaksi & Jurnal Akuntansi (Double Entry) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Aturan Transaksi & Jurnal Akuntansi</h4>
                      <p className="text-[10px] text-slate-500">Otomatis tentukan debit kas/bank dan kredit piutang pendapatan</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEditAccountingOverride(prev => !prev)}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  >
                    <Settings2 className="w-3 h-3 text-indigo-600" />
                    <span>{showEditAccountingOverride ? 'Sembunyikan Kustomisasi COA' : 'Kustomisasi Akun Debit / Kredit'}</span>
                  </button>
                </div>

                {/* Pilihan Aturan Transaksi */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pilihan Aturan Transaksi (Transaction Rule) <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={ruleSelectOptions}
                    value={editForm.transaction_mapping_id}
                    onChange={handleEditRuleChange}
                    placeholder="-- Pilih Aturan Transaksi --"
                    searchPlaceholder="Cari aturan transaksi..."
                    accentColor="indigo"
                    allowClear={false}
                  />
                </div>

                {/* Bagian Kustomisasi Akun COA jika dibuka */}
                {showEditAccountingOverride && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Akun Debit */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          <span>Akun Debit (Kas / Penerimaan)</span>
                        </label>
                        <SearchableSelect
                          options={coaOptions}
                          value={editForm.override_debit_account_id}
                          onChange={(val) => setEditForm(p => ({ ...p, override_debit_account_id: val || '' }))}
                          placeholder="-- Pilih Akun Debit --"
                          searchPlaceholder="Cari nomor atau nama akun COA..."
                          accentColor="emerald"
                          allowClear={false}
                        />
                      </div>

                      {/* Akun Kredit */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          <span>Akun Kredit (Piutang / Pendapatan)</span>
                        </label>
                        <SearchableSelect
                          options={coaOptions}
                          value={editForm.override_credit_account_id}
                          onChange={(val) => setEditForm(p => ({ ...p, override_credit_account_id: val || '' }))}
                          placeholder="-- Pilih Akun Kredit --"
                          searchPlaceholder="Cari nomor atau nama akun COA..."
                          accentColor="blue"
                          allowClear={false}
                        />
                      </div>
                    </div>

                    {/* Akun Kas Terkait (Default Override) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Akun Kas Terkait (Default Jurnal)
                      </label>
                      <SearchableSelect
                        options={cashAccountSelectOptions}
                        value={editForm.override_cash_account_id}
                        onChange={(val) => setEditForm(p => ({ ...p, override_cash_account_id: val || '' }))}
                        placeholder="-- Otomatis Sesuai Kas Transaksi Utama --"
                        searchPlaceholder="Cari nama akun kas..."
                        accentColor="blue"
                        allowClear={true}
                      />
                    </div>
                  </div>
                )}

                {/* Pratinjau Jurnal Ganda Live Box */}
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2 font-mono">
                  <div className="flex items-center justify-between text-[11px] text-indigo-300 font-bold border-b border-slate-800 pb-1.5 font-sans">
                    <span>Pratinjau Jurnal Ganda (Double Entry):</span>
                    <span>Nominal: {formatCurrency(parseFloat(editForm.amount) || 0)}</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="truncate">
                        [D] {editActiveDebitCoa ? `[${editActiveDebitCoa.account_code || editActiveDebitCoa.account_number || ''}] ${editActiveDebitCoa.account_name || editActiveDebitCoa.name || ''}` : 'Kas Penerimaan'}
                      </span>
                      <span className="font-bold">{formatCurrency(parseFloat(editForm.amount) || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-blue-400 pl-4">
                      <span className="truncate">
                        [K] {editActiveCreditCoa ? `[${editActiveCreditCoa.account_code || editActiveCreditCoa.account_number || ''}] ${editActiveCreditCoa.account_name || editActiveCreditCoa.name || ''}` : 'Piutang / Pendapatan'}
                      </span>
                      <span className="font-bold">{formatCurrency(parseFloat(editForm.amount) || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Baris 4: Catatan / Keterangan Transaksi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan Transaksi</label>
                <input
                  type="text"
                  placeholder="Contoh: Pembayaran SPP via loket..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Baris 5: Alasan Koreksi Pembayaran (Audit Trail Wajib) */}
              <div className="p-3.5 bg-amber-50/90 border border-amber-300/80 rounded-2xl space-y-1.5 shadow-2xs">
                <label className="block font-bold text-amber-950 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    Alasan Koreksi Pembayaran (Audit Log) <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold">Wajib Diisi untuk Integritas Finansial</span>
                </label>
                <textarea
                  value={editForm.correction_reason}
                  onChange={(e) => setEditForm(p => ({ ...p, correction_reason: e.target.value }))}
                  placeholder="Contoh: Koreksi nominal setoran siswa (seharusnya Rp 500.000) dan penggantian rekening kas..."
                  required
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/25 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Baris 6: Snapshot Data Sebelum Koreksi Terakhir jika ada */}
              {selectedPaymentToEdit.previous_data && (
                <div className="p-3 bg-slate-100/90 rounded-2xl text-[11px] text-slate-600 space-y-1 border border-slate-200">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Snapshot Data Sebelum Koreksi Terakhir:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10.5px]">
                    <div>Nominal: <b>{formatCurrency(selectedPaymentToEdit.previous_data.amount)}</b></div>
                    <div>Tgl: <b>{selectedPaymentToEdit.previous_data.paid_at}</b></div>
                    <div>Alasan Lalu: <span className="font-sans italic">{selectedPaymentToEdit.correction_reason || '-'}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs cursor-pointer transition"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => handleSaveEdit(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition disabled:opacity-50"
                >
                  {savingEdit ? 'Menyimpan Koreksi...' : 'Simpan Koreksi Saja'}
                </button>

                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => handleSaveEdit(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/25 cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{savingEdit ? 'Memproses...' : 'Simpan & Cetak Ulang Kwitansi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: MODAL KWITANSI RESMI PREVIEW                         */}
      {/* ============================================================== */}
      {receiptModalOpen && activeReceiptData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className={`w-5 h-5 ${activeReceiptData.is_legacy ? 'text-amber-600' : 'text-emerald-600'}`} />
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    {activeReceiptData.is_legacy ? 'Kwitansi Catatan Riwayat (Non-Kas)' : 'Kwitansi Pembayaran Resmi'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeReceiptData.is_legacy && (
              <div className="p-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pembayaran ini adalah <strong>Pencatatan Riwayat Saja (Non-Kas)</strong> dan tidak memengaruhi mutasi kas/bank aktif.</span>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs space-y-2">
              <div className="flex justify-between font-bold text-slate-800">
                <span>No. Kwitansi:</span>
                <span className="text-blue-700 font-black">{activeReceiptData.receipt_number}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Satuan Pendidikan:</span>
                <span className="font-bold text-slate-800">{activeReceiptData.school_unit?.name || activeSchoolUnit?.name || 'Satuan Pendidikan Aldepos'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tanggal Bayar:</span>
                <span>{activeReceiptData.paid_at ? String(activeReceiptData.paid_at).slice(0, 10) : '-'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{activeReceiptData.is_multi_student ? 'Nama Siswa:' : 'Nama Siswa:'}</span>
                <span className="font-bold text-slate-800 text-right max-w-xs">{activeReceiptData.student?.name || activeReceiptData.student_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kelas / Rombel:</span>
                <span className="font-bold text-slate-800">{activeReceiptData.student?.class_name || activeReceiptData.class_name || '-'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pembayaran Untuk:</span>
                <span>{activeReceiptData.payment_for || activeReceiptData.fee_type_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Akun Kas / Status:</span>
                <span className={activeReceiptData.is_legacy ? 'text-amber-800 font-bold' : ''}>
                  {activeReceiptData.cash_account_name || (activeReceiptData.is_legacy ? 'Non-Kas (Riwayat Saja)' : 'Kasir')}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>Nominal Total:</span>
                <span className="text-emerald-700">{formatCurrency(activeReceiptData.amount)}</span>
              </div>
            </div>

            {/* Terbilang */}
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold italic border border-emerald-200">
              Terbilang: # {activeReceiptData.amount_in_words || `${terbilang(activeReceiptData.amount)} Rupiah`} #
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => openReceiptInNewTab(activeReceiptData, activeReceiptData.school_unit?.name || activeSchoolUnit?.name)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Buka & Cetak di Tab Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CATAT PENERIMAAN SUMBER LAIN (RAPBS)                  */}
      {/* ============================================================== */}
      {otherIncomeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Penerimaan Kas Sumber Lain (RAPBS)</h3>
              <button onClick={() => setOtherIncomeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                setSavingOtherIncome(true);
                await api.post('/keuangan/other-incomes', {
                  ...otherIncomeForm,
                  academic_year_id: activeAcademicYearId || 1
                });
                alert('Penerimaan sumber lain RAPBS berhasil dicatat & jurnal otomatis telah dibukukan!');
                setOtherIncomeModalOpen(false);
                fetchOtherIncomeData();
              } catch (err) {
                alert(err.response?.data?.message || 'Gagal mencatat penerimaan');
              } finally {
                setSavingOtherIncome(false);
              }
            }} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nama Sumber Pendapatan (Mata Anggaran RAPBS) *
                </label>
                <select
                  value={otherIncomeForm.budget_plan_income_item_id}
                  onChange={(e) => setOtherIncomeForm(p => ({ ...p, budget_plan_income_item_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Mata Anggaran RAPBS --</option>
                  {rapbsSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Pagu: {formatCurrency(s.planned_amount)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Rekening Kas/Bank Tujuan *</label>
                <select
                  value={otherIncomeForm.cash_account_id}
                  onChange={(e) => setOtherIncomeForm(p => ({ ...p, cash_account_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.account_kind})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <DatePickerField
                    label="Tanggal Diterima"
                    value={otherIncomeForm.received_at}
                    onChange={(iso) => setOtherIncomeForm(p => ({ ...p, received_at: iso }))}
                    placeholder="DD/MM/YYYY"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nominal (Rp) *</label>
                  <input
                    type="number"
                    value={otherIncomeForm.amount}
                    onChange={(e) => setOtherIncomeForm(p => ({ ...p, amount: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Catatan / Penyetor</label>
                <input
                  type="text"
                  placeholder="Contoh: Bantuan Yayasan Tahap 1"
                  value={otherIncomeForm.notes}
                  onChange={(e) => setOtherIncomeForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOtherIncomeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingOtherIncome}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold shadow-2xs"
                >
                  {savingOtherIncome ? 'Memproses...' : 'Simpan Penerimaan RAPBS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: PREVIEW GAMBAR BUKTI TRANSFER                         */}
      {/* ============================================================== */}
      {previewProof && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Gambar Bukti Transfer Bank</h3>
              <button onClick={() => setPreviewProof(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full h-80 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
              {previewProof.file_url ? (
                <img src={previewProof.file_url} alt="Bukti Transfer" className="object-contain w-full h-full" />
              ) : (
                <span className="text-xs text-slate-400 italic">File gambar tidak tersedia</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: PERINGATAN REKENING KORAN HABIS TERPAKAI               */}
      {/* ============================================================== */}
      {blockedStatementModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 text-xl font-bold shrink-0 shadow-xs">
                ⛔
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950">Rekening Koran Habis Terpakai</h3>
                <p className="text-[11px] text-rose-700">Mutasi ini tidak dapat dipilih untuk pembayaran</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 font-mono text-[11px]">
                <div className="flex justify-between border-b border-slate-200 pb-1.5 gap-2">
                  <span className="text-slate-500 font-sans shrink-0">Uraian Mutasi:</span>
                  <span className="font-bold text-slate-800 text-right truncate" title={blockedStatementModal.desc}>
                    {blockedStatementModal.desc}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-sans">Tgl & Ref:</span>
                  <span className="font-semibold text-slate-700">
                    {blockedStatementModal.rawDate || '-'} | Ref: {blockedStatementModal.refNo || '-'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-sans">Total Plafon RK:</span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(blockedStatementModal.amount)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-sans">Sudah Teralokasi:</span>
                  <span className="font-bold text-rose-600">
                    {formatCurrency(blockedStatementModal.allocated_amount || blockedStatementModal.amount)}
                  </span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500 font-sans">Sisa Plafon Tersedia:</span>
                  <span className="font-bold text-slate-500">
                    Rp 0 (Habis)
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-xl text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                <span className="text-amber-600 text-base leading-none shrink-0">💡</span>
                <span>
                  Seluruh nominal plafon mutasi rekening koran ini telah habis dialokasikan ke transaksi pembayaran sebelumnya. Silakan pilih baris rekening koran lain yang masih memiliki sisa saldo plafon.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-3 flex justify-end">
              <button
                type="button"
                onClick={() => setBlockedStatementModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Mengerti & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
