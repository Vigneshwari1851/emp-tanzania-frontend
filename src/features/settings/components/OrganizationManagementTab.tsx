import { useState, useCallback, useRef, useEffect } from "react";
import {
  Building2, Plus, Trash2, Loader2, CheckCircle2,
  ArrowLeft, Palette, Users, CreditCard, Shield, Bell,
  Puzzle, Wrench, HardDrive, FileText, Settings,
  ChevronRight, Save, Upload, X, File, Pencil, MapPin,
  Kanban, Mail, MessageSquare, ShieldCheck
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { useTheme } from '@/shared/context/ThemeContext';
import { useAuth } from '@/shared/context/AuthContext';
import { useTolgee } from '@tolgee/react';
import { tolgee as tolgeeInstance } from '@/shared/i18n/tolgee';
import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  type Organization,
} from "@/features/organization/services/organizations";
import { ConfirmationDialog } from "@/shared/components/ui/ConfirmationDialog";
import Select from "@/shared/components/ui/Select";
import { applyBrandTheme } from "@/shared/utils/theme";
import { toast } from 'sonner';

// ─── Static data ─────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SG", name: "Singapore" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
];

const COUNTRY_STATES: Record<string, string[]> = {
  "India": [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Chandigarh", "Puducherry", "Ladakh", "Jammu and Kashmir",
  ],
  "United States": [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
    "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
    "Washington", "West Virginia", "Wisconsin", "Wyoming",
  ],
  "United Arab Emirates": ["Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah", "Umm Al Quwain"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  "Saudi Arabia": ["Riyadh", "Makkah", "Madinah", "Eastern Province", "Jizan", "Asir", "Tabuk", "Ha'il", "Qassim", "Najran", "Al Bahah", "Al Jouf", "Northern Borders"],
  "Singapore": ["Central Region", "East Region", "North Region", "North-East Region", "West Region"],
  "Australia": ["New South Wales", "Victoria", "Queensland", "South Australia", "Western Australia", "Tasmania", "Australian Capital Territory", "Northern Territory"],
  "Germany": ["Bavaria", "Baden-Württemberg", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia"],
};

const countryToTimezoneMap: Record<string, string> = {
  "India": "Asia/Kolkata",
  "United States": "America/New_York",
  "United Arab Emirates": "Asia/Dubai",
  "United Kingdom": "Europe/London",
  "Saudi Arabia": "Asia/Riyadh",
  "Singapore": "Asia/Singapore",
  "Australia": "Australia/Sydney",
  "Germany": "Europe/Berlin",
};

const countryToCurrencyMap: Record<string, string> = {
  "India": "INR",
  "United States": "USD",
  "United Arab Emirates": "AED",
  "United Kingdom": "GBP",
  "Saudi Arabia": "SAR",
  "Singapore": "SGD",
  "Australia": "AUD",
  "Germany": "EUR",
};

const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "Europe/London", "Asia/Dubai",
  "Asia/Singapore", "Australia/Sydney", "Europe/Berlin", "Asia/Riyadh",
];

const ORG_TYPES = [
  { value: "enterprise", label: "Enterprise" },
  { value: "startup", label: "Startup" },
  { value: "individual", label: "Individual" },
];

const CURRENCIES = [
  { value: "INR", label: "INR (₹) - Indian Rupee" },
  { value: "USD", label: "USD ($) - US Dollar" },
  { value: "GBP", label: "GBP (£) - British Pound" },
  { value: "EUR", label: "EUR (€) - Euro" },
  { value: "TZS", label: "TZS - Tanzanian Shilling" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY (¥) - Japanese Yen" },
  { value: "BRL", label: "BRL (R$) - Brazilian Real" },
  { value: "ZAR", label: "ZAR (R) - South African Rand" },
  { value: "SAR", label: "SAR - Saudi Riyal" },
  { value: "AED", label: "AED - UAE Dirham" }
];

const getCompanyTypesByCountryName = (name: string) => {
  const n = (name || "").toLowerCase().trim();
  if (n === "india") {
    return [
      "Private Limited Company (Pvt Ltd)",
      "Public Limited Company",
      "Limited Liability Partnership (LLP)",
      "One Person Company (OPC)",
      "Partnership Firm",
      "Sole Proprietorship"
    ];
  }
  if (n === "united states" || n === "usa" || n === "us") {
    return [
      "Limited Liability Company (LLC)",
      "C Corporation (C-Corp)",
      "S Corporation (S-Corp)",
      "Partnership",
      "Sole Proprietorship"
    ];
  }
  if (n === "united kingdom" || n === "uk" || n === "gb") {
    return [
      "Private Limited Company (Ltd)",
      "Public Limited Company (Plc)",
      "Limited Liability Partnership (LLP)",
      "Sole Trader",
      "Partnership"
    ];
  }
  if (n === "australia" || n === "au") {
    return [
      "Proprietary Limited Company (Pty Ltd)",
      "Public Company",
      "Partnership",
      "Sole Trader"
    ];
  }
  if (n === "singapore" || n === "sg") {
    return [
      "Private Limited Company (Pte Ltd)",
      "Public Limited Company",
      "Limited Liability Partnership (LLP)",
      "Sole Proprietorship",
      "Partnership"
    ];
  }
  if (n === "germany" || n === "de") {
    return [
      "GmbH",
      "AG",
      "GbR",
      "OHG",
      "KG",
      "Einzelunternehmen"
    ];
  }
  if (n === "united arab emirates" || n === "uae" || n === "ae") {
    return [
      "Limited Liability Company (LLC)",
      "Private Joint Stock Company",
      "Public Joint Stock Company",
      "Sole Proprietorship",
      "Branch of a Foreign Company"
    ];
  }
  return [
    "Private Limited Company",
    "Public Limited Company",
    "Limited Liability Company (LLC)",
    "Corporation",
    "Sole Proprietorship",
    "Partnership",
    "Other"
  ];
};

const getTaxFieldsForCountryName = (name: string, type: string) => {
  const n = (name || "").toLowerCase().trim();
  const t = (type || "").toLowerCase();

  // ── India ──
  if (n === "india") {
    const base = [
      { key: "pan", label: "Permanent Account Number (PAN)", placeholder: "e.g. ABCDE1234F", required: true },
    ];
    if (t.includes("private limited") || t.includes("public limited") || t.includes("opc") || t.includes("one person")) {
      base.push(
        { key: "cin", label: "Corporate Identification Number (CIN)", placeholder: "e.g. U12345MH2020PTC123456", required: true },
        { key: "tan", label: "Tax Deduction Account Number (TAN)", placeholder: "e.g. MUMB12345A", required: false },
        { key: "other", label: "GSTIN (If Registered)", placeholder: "e.g. 29AAAAA1111A1Z1", required: false }
      );
    } else if (t.includes("llp") || t.includes("limited liability partnership")) {
      base.push(
        { key: "cin", label: "LLPIN (LLP Identification Number)", placeholder: "e.g. AAA-1234", required: true },
        { key: "tan", label: "Tax Deduction Account Number (TAN)", placeholder: "e.g. MUMB12345A", required: false },
        { key: "other", label: "GSTIN (If Registered)", placeholder: "e.g. 29AAAAA1111A1Z1", required: false }
      );
    } else if (t.includes("partnership") || t.includes("sole proprietorship")) {
      base.push(
        { key: "tan", label: "Tax Deduction Account Number (TAN)", placeholder: "e.g. MUMB12345A", required: false },
        { key: "other", label: "Udyam / MSME Registration No.", placeholder: "e.g. UDYAM-MH-01-0012345", required: false }
      );
    } else {
      base.push(
        { key: "tan", label: "Tax Deduction Account Number (TAN)", placeholder: "e.g. MUMB12345A", required: false },
        { key: "other", label: "Other Tax ID", placeholder: "Enter additional tax ID", required: false }
      );
    }
    return base;
  }

  // ── United States ──
  if (n === "united states" || n === "usa" || n === "us") {
    const base = [
      { key: "ein", label: "Employer Identification Number (EIN)", placeholder: "e.g. 12-3456789", required: true },
    ];
    if (t.includes("c corporation") || t.includes("c-corp")) {
      base.push({ key: "other", label: "State Charter / Incorporation Number", placeholder: "e.g. C1234567", required: false });
    } else if (t.includes("s corporation") || t.includes("s-corp")) {
      base.push({ key: "other", label: "State Charter / Incorporation Number", placeholder: "e.g. S1234567", required: false });
    } else if (t.includes("llc")) {
      base.push({ key: "other", label: "State LLC Filing Number", placeholder: "e.g. LLC-123456", required: false });
    } else {
      base.push({ key: "other", label: "State Business Registration No.", placeholder: "Enter state registration number", required: false });
    }
    return base;
  }

  // ── United Kingdom ──
  if (n === "united kingdom" || n === "uk" || n === "gb") {
    const base = [
      { key: "tin", label: "Unique Taxpayer Reference (UTR)", placeholder: "e.g. 12345 67890", required: true },
    ];
    if (t.includes("ltd") || t.includes("plc") || t.includes("limited")) {
      base.push(
        { key: "cin", label: "Company Registration Number (CRN)", placeholder: "e.g. 12345678", required: true },
        { key: "other", label: "VAT Registration Number", placeholder: "e.g. GB123456789", required: false }
      );
    } else if (t.includes("llp")) {
      base.push(
        { key: "cin", label: "LLP Registration Number", placeholder: "e.g. OC123456", required: true },
        { key: "other", label: "VAT Registration Number", placeholder: "e.g. GB123456789", required: false }
      );
    } else {
      base.push({ key: "other", label: "VAT Registration Number (Optional)", placeholder: "e.g. GB123456789", required: false });
    }
    return base;
  }

  // ── Germany ──
  if (n === "germany" || n === "de") {
    return [
      { key: "tin", label: "Steuernummer (Tax Number)", placeholder: "e.g. 123/456/78901", required: true },
      { key: "other", label: "USt-IdNr (VAT ID)", placeholder: "e.g. DE123456789" },
      { key: "cin", label: "Handelsregisternummer (HRB)", placeholder: "e.g. HRB 12345" },
    ];
  }

  // ── France ──
  if (n === "france" || n === "fr") {
    return [
      { key: "siret", label: "SIRET Number", placeholder: "e.g. 12345678901234", required: true },
      { key: "tin", label: "SIREN Number", placeholder: "e.g. 123456789", required: true },
      { key: "other", label: "TVA Intracommunautaire (VAT)", placeholder: "e.g. FR12345678901" },
    ];
  }

  // ── UAE ──
  if (n === "united arab emirates" || n === "uae" || n === "ae") {
    return [
      { key: "tin", label: "Tax Registration Number (TRN)", placeholder: "e.g. 100123456789003", required: true },
      { key: "cin", label: "Commercial License Number", placeholder: "e.g. 12345" },
      { key: "other", label: "Chamber of Commerce No.", placeholder: "Enter chamber number" },
    ];
  }

  // ── Canada ──
  if (n === "canada" || n === "ca") {
    return [
      { key: "sin", label: "Business Number (BN)", placeholder: "e.g. 123456789RC0001", required: true },
      { key: "other", label: "GST/HST Registration Number", placeholder: "e.g. 123456789RT0001" },
    ];
  }

  // ── Australia ──
  if (n === "australia" || n === "au") {
    return [
      { key: "tin", label: "Australian Business Number (ABN)", placeholder: "e.g. 12 345 678 901", required: true },
      { key: "cin", label: "Australian Company Number (ACN)", placeholder: "e.g. 123 456 789" },
      { key: "other", label: "GST Registration", placeholder: "Enter GST number if registered" },
    ];
  }

  // ── Singapore ──
  if (n === "singapore" || n === "sg") {
    return [
      { key: "tin", label: "Unique Entity Number (UEN)", placeholder: "e.g. 202012345A", required: true },
      { key: "other", label: "GST Registration Number", placeholder: "e.g. M90012345X" },
    ];
  }

  return [
    { key: "tin", label: "Tax Identification Number (TIN)", placeholder: "Enter primary tax ID", required: true },
    { key: "other", label: "Secondary Tax / Registration ID", placeholder: "Enter additional ID" },
  ];
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const IDENTITY_PROVIDERS = [
  { value: "local", label: "Local (Email / Password)" },
  { value: "google", label: "Google" },
  { value: "microsoft", label: "Microsoft Entra ID" },
  { value: "okta", label: "Okta" },
  { value: "ldap", label: "LDAP" },
];

// ─── Section definition ───────────────────────────────────────────────────────

type Section =
  | "basic"
  | "branding"
  | "identity"
  | "billing"
  | "preferences"
  | "notifications"
  | "legal"
  | "maintenance"
  | "backup"
  | "integrations";

const SECTIONS: { id: Section; label: string; icon: any }[] = [
  { id: "basic",         label: "Business & Identity",      icon: Building2 },
  { id: "branding",      label: "Branding",                 icon: Palette },
  { id: "identity",      label: "Security & SSO",           icon: Shield },
  { id: "billing",       label: "Billing Contacts",         icon: Users },
  { id: "preferences",   label: "Preferences",              icon: Settings },
  { id: "notifications", label: "Notifications",            icon: Bell },
  { id: "legal",         label: "Legal & Compliance",       icon: FileText },
  { id: "maintenance",   label: "Maintenance Windows",      icon: Wrench },
  { id: "backup",        label: "Backup",                   icon: HardDrive },
  { id: "integrations",  label: "External Integrations",    icon: Puzzle },
];

// ─── File drop zone ───────────────────────────────────────────────────────────

interface DropZoneProps {
  onFile: (result: { fileUrl: string; fileName: string }) => void;
  label?: string;
  accept?: string;
}

function DropZone({ onFile, label, accept }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(async (file: globalThis.File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onFile({ fileUrl: e.target?.result as string, fileName: file.name });
    };
    reader.readAsDataURL(file);
  }, [onFile]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed cursor-pointer transition-all group ${
        dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-accent/50"
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleSelect} />
      <div className="h-8 w-8 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-primary">
        <Upload className="h-4 w-4" />
      </div>
      <p className="text-xs font-semibold text-foreground text-center mb-0.5">{label || "Click or drag file to upload"}</p>
      <p className="text-[10px] text-muted-foreground text-center">Supports PDF, JPG, PNG</p>
    </div>
  );
}

// ─── Default form state ───────────────────────────────────────────────────────

const defaultForm = () => ({
  // Basic
  entity_name: "",
  company_code: "",
  company_type: "Private Limited Company (Pvt Ltd)",
  currency: "INR",
  address: "",
  city: "",
  state: "",
  country: "India",
  zip: "",
  standard_working_hours_per_week: 40,
  branch_name: "",
  branch_code: "",
  timezone: "Asia/Kolkata",
  industry: "",
  website: "",
  jurisdiction: "",
  fiscal_year_end: "",
  pan: "",
  tin: "",
  sin: "",
  ein: "",
  siret: "",
  cin: "",
  tan: "",
  other: "",
  other_tax_id: "",
  logo_url: "",
  // Branding
  primaryColor: "#3B82F6",
  secondaryColor: "#1E40AF",
  customDomain: "",
  // Identity
  identityProvider: "local",
  mfaPolicy: "email_otp",
  mfaRequiredAdmins: true,
  // Billing contacts
  billingContact: "",
  financeContact: "",
  technicalContact: "",
  legalContact: "",
  // Preferences
  theme: "light",
  language: "en-IN",
  dateFormat: "DD/MM/YYYY",
  weekStartDay: "monday",
  defaultLandingPage: "dashboard",
  // Notifications
  emailNotifications: true,
  smsNotifications: false,
  inAppNotifications: true,
  webhooksEnabled: false,
  notificationFrequency: "daily",
  // Legal
  companyRegistration: "",
  companyRegistrationProof: "",
  companyRegistrationProofName: "",
  taxIdentifier: "",
  taxIdentifierProof: "",
  taxIdentifierProofName: "",
  acceptedTermsVersion: "1.0",
  privacyPolicyVersion: "1.0",
  // Maintenance
  maintenanceDay: "Saturday",
  maintenanceStart: "02:00",
  maintenanceEnd: "06:00",
  // Backup
  backupFrequency: "daily",
  backupRetentionDays: 30,
  backupRetentionWeeks: 4,
  backupRetentionMonths: 12,
  backupRetentionYears: 1,
  backupNotificationsEnabled: true,
  rpoMinutes: 60,
  rtoMinutes: 240,
  // Integrations
  externalSystems: [],
  jiraHost: "",
  jiraProjectKey: "",
  smtpHost: "",
  smtpPort: "",
  smtpFromEmail: "",
  slackWebhookUrl: "",
  ssoDomain: "",
});

// ─── Main component ───────────────────────────────────────────────────────────

export function OrganizationManagementTab() {
  const { setTheme } = useTheme();
  const { user, setUser } = useAuth();
  const tolgee = useTolgee(['language']);
  // List state
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteOrgTarget, setDeleteOrgTarget] = useState<Organization | null>(null);

  // Form mode
  const [showForm, setShowForm] = useState(false);
  const [editOrgId, setEditOrgId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("basic");
  const [form, setForm] = useState(defaultForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [adminCredentials, setAdminCredentials] = useState<{ email: string; password: string; username: string } | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  useEffect(() => {
    if (showForm && (form.primaryColor || form.secondaryColor)) {
      applyBrandTheme(form.primaryColor, form.secondaryColor);
    }
  }, [showForm, form.primaryColor, form.secondaryColor]);

  const resetForm = () => {
    setShowForm(false);
    setEditOrgId(null);
    setForm(defaultForm());
    setActiveSection("basic");
    setFormError("");
  };

  const handleEditClick = (org: Organization) => {
    const rawCountry = org.country ?? "India";
    const mappedCountry = rawCountry.length === 2 
      ? (COUNTRIES.find(c => c.code === rawCountry.toUpperCase())?.name || rawCountry)
      : rawCountry;

    let cin = "";
    let tan = "";
    let other = "";
    try {
      if (org.other_tax_id && org.other_tax_id.startsWith("{")) {
        const extra = JSON.parse(org.other_tax_id);
        cin = extra.cin ?? "";
        tan = extra.tan ?? "";
        other = extra.other ?? "";
      } else {
        other = org.other_tax_id ?? "";
      }
    } catch (e) {
      other = org.other_tax_id ?? "";
    }

    const cfg = (org as any).config || {};

    setEditOrgId(org.id);
    setForm({
      ...defaultForm(),
      entity_name: org.entity_name ?? "",
      company_code: org.company_code ?? "",
      company_type: org.company_type ?? "Private Limited Company (Pvt Ltd)",
      currency: org.currency ?? "INR",
      address: org.address ?? "",
      city: org.city ?? "",
      state: org.state ?? "",
      country: mappedCountry,
      zip: org.zip ?? "",
      standard_working_hours_per_week: org.standard_working_hours_per_week ?? 40,
      branch_name: org.branch?.[0]?.branch_name ?? org.branches?.[0]?.branch_name ?? "",
      branch_code: org.branch?.[0]?.branch_code ?? org.branches?.[0]?.branch_code ?? "",
      timezone: org.branch?.[0]?.time_zone ?? org.branches?.[0]?.time_zone ?? "Asia/Kolkata",
      companyRegistration: org.pan ?? "",
      taxIdentifier: org.other_tax_id ?? "",
      jurisdiction: org.jurisdiction ?? "",
      fiscal_year_end: org.fiscal_year_end ?? "",
      pan: org.pan ?? "",
      tin: org.tin ?? "",
      sin: org.sin ?? "",
      ein: org.ein ?? "",
      siret: org.siret ?? "",
      cin,
      tan,
      other,
      other_tax_id: org.other_tax_id ?? "",
      logo_url: org.logo_url ?? "",
      // Branding
      primaryColor: cfg.primary_color ?? "#3B82F6",
      secondaryColor: cfg.secondary_color ?? "#1E40AF",
      customDomain: cfg.custom_domain ?? "",
      // Identity
      identityProvider: cfg.sso_provider ?? "local",
      mfaPolicy: cfg.mfa_policy ?? "email_otp",
      mfaRequiredAdmins: cfg.mfa_required_admins ?? true,
      // Billing contacts
      billingContact: cfg.billing_contact ?? "",
      financeContact: cfg.finance_contact ?? "",
      technicalContact: cfg.technical_contact ?? "",
      legalContact: cfg.legal_contact ?? "",
      // Preferences
      theme: cfg.theme ?? "light",
      language: cfg.language ?? "en-IN",
      dateFormat: cfg.date_format ?? "DD/MM/YYYY",
      weekStartDay: cfg.week_start_day ?? "monday",
      defaultLandingPage: cfg.default_landing_page ?? "dashboard",
      // Notifications
      emailNotifications: cfg.email_notifications ?? true,
      smsNotifications: cfg.sms_notifications ?? false,
      inAppNotifications: cfg.in_app_notifications ?? true,
      webhooksEnabled: cfg.webhooks_enabled ?? false,
      notificationFrequency: cfg.notification_frequency ?? "daily",
      // Maintenance
      maintenanceDay: cfg.maintenance_day ?? "Saturday",
      maintenanceStart: cfg.maintenance_start ?? "02:00",
      maintenanceEnd: cfg.maintenance_end ?? "06:00",
      // Backup
      backupFrequency: cfg.backup_frequency ?? "daily",
      backupRetentionDays: cfg.backup_retention_days ?? 30,
      rpoMinutes: cfg.rpo_minutes ?? 60,
      rtoMinutes: cfg.rto_minutes ?? 240,
    });
    setShowForm(true);
    setActiveSection("basic");
  };

  const loadOrgs = async () => {
    setIsLoading(true);
    try {
      const data = await getOrganizations();
      setOrgs(data);
    } catch {
      toast.error("Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadOrgs(); }, []);

  const update = (field: string, value: string | boolean | number) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  // Section completion status
  const sectionStatus = (id: Section): "complete" | "empty" => {
    if (id === "basic")
      return form.entity_name && form.city && form.address ? "complete" : "empty";
    if (id === "branding")
      return form.primaryColor || form.customDomain ? "complete" : "empty";
    if (id === "identity")
      return form.identityProvider ? "complete" : "empty";
    if (id === "billing")
      return form.billingContact || form.financeContact || form.technicalContact || form.legalContact ? "complete" : "empty";
    if (id === "preferences")
      return form.theme && form.language && form.dateFormat ? "complete" : "empty";
    if (id === "notifications")
      return form.emailNotifications || form.smsNotifications || form.inAppNotifications ? "complete" : "empty";
    if (id === "legal")
      return form.companyRegistration || form.taxIdentifier ? "complete" : "empty";
    if (id === "maintenance")
      return form.maintenanceDay && form.maintenanceStart && form.maintenanceEnd ? "complete" : "empty";
    if (id === "backup")
      return form.backupFrequency && form.backupRetentionDays ? "complete" : "empty";
    if (id === "integrations") return "complete";
    return "empty";
  };

  const completedCount = SECTIONS.filter((s) => sectionStatus(s.id) === "complete").length;
  const currentIdx = SECTIONS.findIndex((s) => s.id === activeSection);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError("");
    if (!form.entity_name.trim() || !form.city.trim() || !form.address.trim()) {
      setFormError("Organization Name, Address and City are required.");
      setActiveSection("basic");
      return;
    }
    setIsSubmitting(true);
    try {
      const extraFields: Record<string, string> = {};
      if (form.cin) extraFields.cin = form.cin.trim().toUpperCase();
      if (form.tan) extraFields.tan = form.tan.trim().toUpperCase();
      if (form.other) extraFields.other = form.other.trim().toUpperCase();

      let otherTaxId = "";
      if (Object.keys(extraFields).length === 1 && extraFields.other !== undefined) {
        otherTaxId = extraFields.other;
      } else if (Object.keys(extraFields).length > 0) {
        otherTaxId = JSON.stringify(extraFields);
      } else {
        otherTaxId = form.other_tax_id.trim();
      }

      if (editOrgId) {
        // ── Edit mode: update existing org ──────────────────────────────
        const newSlug = (form.customDomain || form.company_code || form.entity_name)
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9.-]/g, '');

        await updateOrganization(editOrgId, {
          entity_name: form.entity_name.trim(),
          company_code: form.company_code.trim() || undefined,
          slug: newSlug || undefined,
          company_type: form.company_type,
          currency: form.currency,
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          country: form.country,
          zip: form.zip,
          standard_working_hours_per_week: 40,
          jurisdiction: form.jurisdiction.trim() || undefined,
          fiscal_year_end: form.fiscal_year_end.trim() || undefined,
          logo_url: form.logo_url || undefined,
          pan: form.pan.trim() || undefined,
          tin: form.tin.trim() || undefined,
          sin: form.sin.trim() || undefined,
          ein: form.ein.trim() || undefined,
          siret: form.siret.trim() || undefined,
          other_tax_id: otherTaxId || undefined,
          org_config: {
            primary_color: form.primaryColor,
            secondary_color: form.secondaryColor,
            custom_domain: form.customDomain || null,
            sso_provider: form.identityProvider,
            mfa_policy: form.mfaPolicy,
            mfa_required_admins: form.mfaRequiredAdmins,
            billing_contact: form.billingContact || null,
            finance_contact: form.financeContact || null,
            technical_contact: form.technicalContact || null,
            legal_contact: form.legalContact || null,
            theme: form.theme,
            language: form.language,
            date_format: form.dateFormat,
            week_start_day: form.weekStartDay,
            default_landing_page: form.defaultLandingPage,
            email_notifications: form.emailNotifications,
            sms_notifications: form.smsNotifications,
            in_app_notifications: form.inAppNotifications,
            webhooks_enabled: form.webhooksEnabled,
            notification_frequency: form.notificationFrequency,
            maintenance_day: form.maintenanceDay,
            maintenance_start: form.maintenanceStart,
            maintenance_end: form.maintenanceEnd,
            backup_frequency: form.backupFrequency,
            backup_retention_days: form.backupRetentionDays,
            rpo_minutes: form.rpoMinutes,
            rto_minutes: form.rtoMinutes,
          }
        });

        // Sync active user session if editing active tenant
        if (user && newSlug && (user.orgSlug === form.company_code || user.orgSlug !== newSlug)) {
          const updatedUser = { ...user, orgSlug: newSlug };
          setUser(updatedUser);
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          window.history.replaceState(null, '', `/${newSlug}/system-settings`);
        }

        toast.success("Tenant updated successfully");
        resetForm();
        loadOrgs();
      } else {
        // ── Create mode: provision new tenant ───────────────────────────
        const result = await createOrganization({
          // Core fields → organizations table
          entity_name: form.entity_name.trim(),
          company_code: form.company_code.trim() || form.entity_name.slice(0, 4).toUpperCase(),
          company_type: form.company_type,
          currency: form.currency,
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          country: form.country,
          zip: form.zip,
          standard_working_hours_per_week: 40,
          working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          public_holidays: [],
          jurisdiction: form.jurisdiction.trim() || undefined,
          fiscal_year_end: form.fiscal_year_end.trim() || undefined,
          logo_url: form.logo_url || undefined,
          pan: form.pan.trim() || undefined,
          tin: form.tin.trim() || undefined,
          sin: form.sin.trim() || undefined,
          ein: form.ein.trim() || undefined,
          siret: form.siret.trim() || undefined,
          other_tax_id: otherTaxId || undefined,
          branch: [{
            branch_name: "Headquarters",
            branch_code: (form.company_code.trim() || form.entity_name.slice(0, 4)).toUpperCase() + "-HQ",
            address: form.address.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            country: form.country,
            zip: form.zip,
            time_zone: countryToTimezoneMap[form.country] || "Asia/Kolkata",
            tax_location: form.state.trim() || form.city.trim(),
          }],
          // Config fields → organization_config table
          org_config: {
            primary_color: form.primaryColor,
            secondary_color: form.secondaryColor,
            custom_domain: form.customDomain || null,
            sso_provider: form.identityProvider,
            mfa_policy: form.mfaPolicy,
            mfa_required_admins: form.mfaRequiredAdmins,
            billing_contact: form.billingContact || null,
            finance_contact: form.financeContact || null,
            technical_contact: form.technicalContact || null,
            legal_contact: form.legalContact || null,
            theme: form.theme,
            language: form.language,
            date_format: form.dateFormat,
            week_start_day: form.weekStartDay,
            default_landing_page: form.defaultLandingPage,
            email_notifications: form.emailNotifications,
            sms_notifications: form.smsNotifications,
            in_app_notifications: form.inAppNotifications,
            webhooks_enabled: form.webhooksEnabled,
            notification_frequency: form.notificationFrequency,
            maintenance_day: form.maintenanceDay,
            maintenance_start: form.maintenanceStart,
            maintenance_end: form.maintenanceEnd,
            backup_frequency: form.backupFrequency,
            backup_retention_days: form.backupRetentionDays,
            rpo_minutes: form.rpoMinutes,
            rto_minutes: form.rtoMinutes,
          },
        });
        if ((result as any)?.admin_credentials) {
          setAdminCredentials((result as any).admin_credentials);
        }
        toast.success("Tenant created successfully");
        resetForm();
        loadOrgs();
      }
    } catch (err: any) {
      toast.error(err?.message || (editOrgId ? "Failed to update tenant" : "Failed to create tenant"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteOrgTarget) return;
    try {
      await deleteOrganization(deleteOrgTarget.id);
      toast.success("Organization deleted");
      loadOrgs();
    } catch {
      toast.error("Failed to delete organization");
    } finally {
      setDeleteOrgTarget(null);
    }
  };

  // ── Shared input styles ──────────────────────────────────────────────────

  const inputCls =
    "w-full h-9 px-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs font-medium transition-all text-foreground";

  const Label = ({
    text,
    required = false,
  }: {
    text: string;
    required?: boolean;
  }) => (
    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
      {text}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  );

  // ─── List view ─────────────────────────────────────────────────────────────

  if (!showForm) {
    return (
      <div className="space-y-6">
      {/* Admin credentials banner (shown after creation) */}
        {adminCredentials && (
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">✅ Tenant Created — Admin Credentials</p>
              <button
                onClick={() => setAdminCredentials(null)}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Share these credentials with the tenant admin to log in:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: "Email", value: adminCredentials.email },
                { label: "Username", value: adminCredentials.username },
                { label: "Password", value: adminCredentials.password },
              ].map(({ label, value }) => (
                <div key={label} className="bg-card border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">{label}</p>
                  <p className="text-xs font-mono font-semibold text-foreground break-all">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Tenants</h3>

            <p className="text-sm text-muted-foreground mt-0.5">
              Manage organizations and their basic configuration
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Tenant
          </Button>
        </div>

        {/* Org list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading organizations…
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No organizations found
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-sm">
            <Table className="min-w-[800px] border-collapse">
              <TableHeader className="bg-muted border-b border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Code</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">City</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Country</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Currency</TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="px-4 py-3 text-sm font-bold text-foreground">{org.entity_name || "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-foreground">{org.company_code || "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{org.city || "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{org.country || "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{org.currency || "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditClick(org)}
                          className="p-1.5 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteOrgTarget(org)}
                          className="p-1.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <ConfirmationDialog
          isOpen={deleteOrgTarget !== null}
          title="Delete Tenant?"
          description={`Are you sure you want to delete the tenant "${deleteOrgTarget?.entity_name || deleteOrgTarget?.company_code}"? This will soft-delete it from the system.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteOrgTarget(null)}
          variant="danger"
          confirmText="Delete Tenant"
          cancelText="Cancel"
        />
      </div>
    );
  }

  // ─── Create form view ─────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Top Header */}
      <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCancelConfirmOpen(true)}
              className="p-2 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  {editOrgId ? "Edit Tenant" : "New Tenant"}
                </h2>
                {!editOrgId && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 rounded-md">
                    STEP {currentIdx + 1} OF {SECTIONS.length}
                  </span>
                )}
              </div>
              {!editOrgId && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {completedCount} of {SECTIONS.length} sections completed
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCancelConfirmOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isSubmitting
                ? (editOrgId ? "Saving…" : "Creating…")
                : (editOrgId ? "Save Changes" : "Create Tenant")}
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {formError && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span> {formError}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          {/* Progress bar */}
          <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-foreground">Completion</span>
              <span className="text-[11px] text-primary font-bold tabular-nums">
                {Math.round((completedCount / SECTIONS.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / SECTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Section nav */}
          <div className="bg-card border border-border/60 rounded-xl p-1.5 shadow-sm flex flex-col gap-0.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const status = sectionStatus(s.id);
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{s.label}</span>
                  {status === "complete" && (
                    <CheckCircle2
                      className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary-foreground" : "text-emerald-500"}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section content */}
        <div className="flex-1 space-y-5">

          {/* ── Basic ─────────────────────────────────────────────────────── */}
          {activeSection === "basic" && (
            <div className="space-y-6">
              {/* Group 1: Legal Entity Information */}
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-primary">
                    <Building2 className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-tight tracking-[0.01em]">Legal Entity Information</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Core registration and reporting details</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label text="Legal Entity Name" required />
                    <input
                      type="text"
                      value={form.entity_name}
                      onChange={(e) => update("entity_name", e.target.value)}
                      className={inputCls}
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label text="Country of Incorporation" required />
                        <Select
                          value={form.country}
                          onChange={(val) => {
                            setForm(f => ({
                              ...f,
                              country: val,
                              state: "",
                              currency: countryToCurrencyMap[val] || "USD",
                              company_type: "",
                              pan: "",
                              tin: "",
                              sin: "",
                              ein: "",
                              siret: "",
                              other_tax_id: "",
                            }));
                          }}
                          placeholder="— Select Country —"
                          options={COUNTRIES.map(c => ({ value: c.name, label: c.name }))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label text="Base Currency" required />
                        <Select
                          value={form.currency}
                          onChange={(val) => update("currency", val)}
                          placeholder="— Select Currency —"
                          options={CURRENCIES.map(c => ({ value: c.value, label: c.label }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label text="Company Type" required />
                      <Select
                        value={form.company_type}
                        onChange={(val) => {
                          setForm(f => ({
                            ...f,
                            company_type: val,
                            pan: "",
                            tin: "",
                            sin: "",
                            ein: "",
                            siret: "",
                            other_tax_id: "",
                          }));
                        }}
                        placeholder="— Select Type —"
                        options={getCompanyTypesByCountryName(form.country).map(t => ({ value: t, label: t }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label text="Company Code / ID" required />
                      <input
                        type="text"
                        value={form.company_code}
                        onChange={(e) => update("company_code", e.target.value)}
                        className={inputCls}
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label text="Jurisdiction" />
                      <input
                        type="text"
                        value={form.jurisdiction}
                        onChange={(e) => update("jurisdiction", e.target.value)}
                        className={inputCls}
                        placeholder="e.g. State of Delaware"
                      />
                    </div>
                    <div>
                      <Label text="Fiscal Year End" />
                      <input
                        type="text"
                        value={form.fiscal_year_end}
                        onChange={(e) => update("fiscal_year_end", e.target.value)}
                        className={inputCls}
                        placeholder="e.g. March 31 or December 31"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Tax Registration Numbers */}
              {getTaxFieldsForCountryName(form.country, form.company_type).length > 0 && (
                <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400">
                    <FileText className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-tight tracking-[0.01em]">Tax Registration Numbers</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Statutory identifiers used in filings</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {getTaxFieldsForCountryName(form.country, form.company_type).map((field) => (
                      <div key={field.key}>
                        <Label text={field.label} required={field.required} />
                        <input
                          type="text"
                          value={(form as any)[field.key] || ""}
                          onChange={(e) => update(field.key, e.target.value.toUpperCase())}
                          className={inputCls}
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group 3: Legal Address */}
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-cyan-600 dark:text-cyan-400">
                    <MapPin className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-tight tracking-[0.01em]">Legal Address</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Registered office address on file</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label text="Street Address" required />
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      className={inputCls}
                      placeholder="Street address"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label text="City" required />
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        className={inputCls}
                        placeholder="Bangalore"
                      />
                    </div>
                    <div>
                      <Label text="State" required />
                      <Select
                        value={form.state}
                        onChange={(val) => update("state", val)}
                        placeholder="— Select State —"
                        options={(COUNTRY_STATES[form.country] || []).map(s => ({ value: s, label: s }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label text="PIN Code" required />
                      <input
                        type="text"
                        value={form.zip}
                        onChange={(e) => update("zip", e.target.value)}
                        className={inputCls}
                        placeholder="560001"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 4: Company Logo */}
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-pink-600 dark:text-pink-400">
                    <Palette className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-tight tracking-[0.01em]">Company Logo</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Shown across payslips, invoices and portals</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {form.logo_url ? (
                    <div className="relative w-32 h-20 bg-muted/20 border border-border rounded-lg flex items-center justify-center p-2">
                      <img
                        src={form.logo_url}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => update("logo_url", "")}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full sm:w-64 h-20 bg-muted/10 border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/50 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                               toast.error("Logo file size must be less than 2 MB.");
                               return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              update("logo_url", reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                      <span className="text-xs font-semibold text-primary">Upload logo</span>
                      <span className="text-[10px] text-muted-foreground">PNG, JPG, SVG up to 2MB</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Branding ──────────────────────────────────────────────────── */}
          {activeSection === "branding" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Settings Card */}
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400">
                    <Palette className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-tight tracking-[0.01em]">Branding Customization</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Customize the color scheme and access domain</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label text="Primary Brand Color" />
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.primaryColor}
                          onChange={(e) => update("primaryColor", e.target.value)}
                          className="h-9 w-9 rounded-lg border border-border cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={form.primaryColor}
                          onChange={(e) => update("primaryColor", e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <Label text="Secondary Brand Color" />
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.secondaryColor}
                          onChange={(e) => update("secondaryColor", e.target.value)}
                          className="h-9 w-9 rounded-lg border border-border cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={form.secondaryColor}
                          onChange={(e) => update("secondaryColor", e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label text="Custom Domain Alias" />
                    <input
                      type="text"
                      value={form.customDomain}
                      onChange={(e) => update("customDomain", e.target.value)}
                      className={inputCls}
                      placeholder="e.g. portal.acmecorp.com"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Card */}
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm flex flex-col space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Portal Preview</h4>
                
                {/* Mock Browser window */}
                <div className="flex-1 border border-border rounded-lg overflow-hidden flex flex-col bg-background text-[11px] select-none min-h-[220px] shadow-sm">
                  {/* Browser Header */}
                  <div className="bg-muted/50 border-b border-border px-3 py-1.5 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex-1 max-w-xs mx-auto bg-card border border-border rounded px-2 py-0.5 text-[10px] text-muted-foreground font-mono truncate flex items-center gap-1">
                      <span className="text-emerald-600 dark:text-emerald-400">https://</span>
                      <span>{form.customDomain || `${form.entity_name.toLowerCase().replace(/\s+/g, "") || "tenant"}.socedge.com`}</span>
                    </div>
                  </div>

                  {/* Browser Body / Portal Mockup */}
                  <div className="flex-1 flex bg-muted/50 dark:bg-muted/20">
                    {/* Mock Sidebar */}
                    <div className="w-20 bg-card border-r border-border p-2 flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* Mock logo area */}
                        <div className="h-6 flex items-center justify-center border-b border-border/50 pb-1.5">
                          {form.logo_url ? (
                            <img src={form.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="font-bold text-[9px] text-foreground tracking-tight truncate">
                              {form.entity_name || "Tenant"}
                            </span>
                          )}
                        </div>

                        {/* Navigation items with primary color hover/active */}
                        <div className="space-y-1">
                          <div className="p-1 rounded text-white flex items-center gap-1" style={{ backgroundColor: form.primaryColor }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-card/80" />
                            <span className="text-[8px] font-bold">Home</span>
                          </div>
                          <div className="p-1 rounded text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                            <span className="text-[8px] font-semibold">Directory</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[7px] text-muted-foreground text-center border-t border-border/50 pt-1">
                        v1.0.0
                      </div>
                    </div>

                    {/* Mock Portal Content */}
                    <div className="flex-1 p-3 space-y-3">
                      {/* Top Bar */}
                      <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                        <span className="font-bold text-foreground">Welcome back, User</span>
                        <div className="w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-[7px]" style={{ color: form.primaryColor }}>
                          U
                        </div>
                      </div>

                      {/* Content Cards */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-card p-2 rounded border border-border shadow-sm space-y-1">
                          <span className="text-muted-foreground text-[8px]">Primary Action</span>
                          <button type="button" className="w-full py-1 text-[8px] text-white font-bold rounded shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: form.primaryColor }}>
                            Click Me
                          </button>
                        </div>
                        <div className="bg-card p-2 rounded border border-border shadow-sm space-y-1">
                          <span className="text-muted-foreground text-[8px]">Secondary Action</span>
                          <button type="button" className="w-full py-1 text-[8px] text-white font-bold rounded shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: form.secondaryColor }}>
                            Explore
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Security & SSO ─────────────────────────────────────────────── */}
          {activeSection === "identity" && (
            <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border/50">
                <Shield className="h-4 w-4 text-primary" /> Security & Single Sign-On
              </h3>
              <div className="space-y-5">
                {/* Authentication Provider */}
                  <div>
                    <Label text="Authentication Provider" />
                    <Select
                      value={form.identityProvider}
                      onChange={(val) => update("identityProvider", val)}
                      placeholder="— Select Provider —"
                      options={IDENTITY_PROVIDERS.map(ip => ({ value: ip.value, label: ip.label }))}
                      className="w-full"
                    />
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Local authentication is active by default. SSO credentials can be configured post-creation under security settings.
                  </p>
                </div>

                {/* MFA Divider */}
                <div className="border-t border-border/50 pt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Multi-Factor Authentication (MFA)</span>
                  </div>

                  {/* MFA Policy */}
                  <div>
                    <Label text="MFA Policy" />
                    <Select
                      value={form.mfaPolicy}
                      onChange={(val) => update("mfaPolicy", val)}
                      placeholder="— Select MFA Policy —"
                      options={[
                        { value: "disabled", label: "Disabled – No MFA required" },
                        { value: "email_otp", label: "Email OTP – One-time code via email" },
                        { value: "totp", label: "Authenticator App (TOTP) – Google / Authy" },
                        { value: "sms_otp", label: "SMS OTP – One-time code via SMS" },
                      ]}
                      className="w-full"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Choose how users verify their identity as a second factor after login.
                    </p>
                  </div>

                  {/* Enforce MFA for Admins toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/50 rounded-lg">
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">Enforce MFA for Administrators</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Admin & HR roles must complete MFA even if global policy is disabled</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => update("mfaRequiredAdmins", !form.mfaRequiredAdmins)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        form.mfaRequiredAdmins ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow transition-transform ${
                        form.mfaRequiredAdmins ? "translate-x-4" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>

                  {/* Active MFA status indicator */}
                  {form.mfaPolicy !== "disabled" && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                      <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        MFA is active — users will be prompted for a second factor on login
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Billing Contacts ─────────────────────────────────────────── */}
          {activeSection === "billing" && (
            <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border/50">
                <Users className="h-4 w-4 text-primary" /> Administrative Contacts
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label text="Billing Contact Email" />
                    <input type="email" value={form.billingContact} onChange={(e) => update("billingContact", e.target.value)} className={inputCls} placeholder="billing@acme.com" />
                  </div>
                  <div>
                    <Label text="Finance Representative Email" />
                    <input type="email" value={form.financeContact} onChange={(e) => update("financeContact", e.target.value)} className={inputCls} placeholder="finance@acme.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label text="Technical Support Lead Email" />
                    <input type="email" value={form.technicalContact} onChange={(e) => update("technicalContact", e.target.value)} className={inputCls} placeholder="support@acme.com" />
                  </div>
                  <div>
                    <Label text="Legal Compliance Contact Email" />
                    <input type="email" value={form.legalContact} onChange={(e) => update("legalContact", e.target.value)} className={inputCls} placeholder="compliance@acme.com" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Preferences ──────────────────────────────────────────────── */}
          {activeSection === "preferences" && (
            <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border/50">
                <Settings className="h-4 w-4 text-primary" /> Configuration Preferences
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label text="Default Theme" />
                    <Select
                      value={form.theme}
                      onChange={(val) => update("theme", val)}
                      placeholder="— Select Theme —"
                      options={[
                        { value: "light", label: "Light Mode" },
                        { value: "dark", label: "Dark Mode" },
                        { value: "system", label: "System Default" },
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label text="Locale Language" />
                    <Select
                      value={form.language}
                      onChange={(val) => {
                        update("language", val);
                        const langCode = val.includes('-') ? val.split('-')[0] : val;
                        try {
                          if (tolgee) {
                            tolgee.changeLanguage(langCode);
                          } else {
                            tolgeeInstance.changeLanguage(langCode);
                          }
                        } catch (e) {
                          console.error("Failed to switch locale language:", e);
                        }
                        localStorage.setItem('app_language', langCode);
                      }}
                      placeholder="— Select Language —"
                      options={[
                        { value: "en", label: "🇺🇸 English (US)" },
                        { value: "en-IN", label: "🇮🇳 English (India)" },
                        { value: "es", label: "🇪🇸 Español (Spanish)" },
                        { value: "fr", label: "🇫🇷 Français (French)" },
                        { value: "de", label: "🇩🇪 Deutsch (German)" },
                        { value: "hi", label: "🇮🇳 हिन्दी (Hindi)" },
                        { value: "ar", label: "🇸🇦 العربية (Arabic)" },
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label text="Default Landing Page" />
                    <Select
                      value={form.defaultLandingPage}
                      onChange={(val) => update("defaultLandingPage", val)}
                      placeholder="— Select Page —"
                      options={[
                        { value: "dashboard", label: "Dashboard Overview" },
                        { value: "employees", label: "Employees Directory" },
                        { value: "leaves", label: "Leave Management" },
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Notifications ─────────────────────────────────────────────── */}
          {activeSection === "notifications" && (
            <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border/50">
                <Bell className="h-4 w-4 text-primary" /> Notification Channels
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: "emailNotifications", label: "Email Alerts" },
                    { key: "smsNotifications", label: "SMS Gateway" },
                    { key: "inAppNotifications", label: "In-App Alerts" },
                    { key: "webhooksEnabled", label: "Webhooks" },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={(form as any)[key]}
                        onChange={(e) => update(key, e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary accent-primary focus:ring-primary cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
                <div className="max-w-xs">
                  <Label text="Dispatch Frequency" />
                  <Select
                    value={form.notificationFrequency}
                    onChange={(val) => update("notificationFrequency", val)}
                    placeholder="— Select Frequency —"
                    options={[
                      { value: "realtime", label: "Real-time" },
                      { value: "daily", label: "Daily summary" },
                      { value: "weekly", label: "Weekly digest" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Legal ─────────────────────────────────────────────────────── */}
          {activeSection === "legal" && (
            <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border/50">
                <FileText className="h-4 w-4 text-primary" /> Legal & Regulatory Identifiers
              </h3>
              <div className="space-y-4">
                <div>
                  <Label text="Company Registration (CIN)" />
                  <input
                    type="text"
                    value={form.companyRegistration}
                    onChange={(e) => update("companyRegistration", e.target.value)}
                    className={inputCls}
                    placeholder="e.g. U74999KA2021PTC150000"
                  />
                  <div className="mt-2">
                    <Label text="Company Registration Proof" />
                    {form.companyRegistrationProof ? (
                      <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center gap-2">
                          <File className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-[11px] font-medium truncate max-w-xs">{form.companyRegistrationProofName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { update("companyRegistrationProof", ""); update("companyRegistrationProofName", ""); }}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <DropZone
                        onFile={(res) => { update("companyRegistrationProof", res.fileUrl); update("companyRegistrationProofName", res.fileName); }}
                        label="Upload company registration proof"
                        accept="application/pdf,image/*"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <Label text="GSTIN / Tax Registration ID" />
                  <input
                    type="text"
                    value={form.taxIdentifier}
                    onChange={(e) => update("taxIdentifier", e.target.value)}
                    className={inputCls}
                    placeholder="e.g. 29AABCD1234A1Z5"
                  />
                  <div className="mt-2">
                    <Label text="Tax Registration Proof" />
                    {form.taxIdentifierProof ? (
                      <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center gap-2">
                          <File className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-[11px] font-medium truncate max-w-xs">{form.taxIdentifierProofName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { update("taxIdentifierProof", ""); update("taxIdentifierProofName", ""); }}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <DropZone
                        onFile={(res) => { update("taxIdentifierProof", res.fileUrl); update("taxIdentifierProofName", res.fileName); }}
                        label="Upload tax identification proof"
                        accept="application/pdf,image/*"
                      />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label text="Terms of Service Version" />
                    <input type="text" value={form.acceptedTermsVersion} onChange={(e) => update("acceptedTermsVersion", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <Label text="Privacy Policy Version" />
                    <input type="text" value={form.privacyPolicyVersion} onChange={(e) => update("privacyPolicyVersion", e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Maintenance ───────────────────────────────────────────────── */}
          {activeSection === "maintenance" && (
            <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border/50">
                <Wrench className="h-4 w-4 text-primary" /> Preferred Maintenance Windows
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label text="Maintenance Day" />
                    <Select
                      value={form.maintenanceDay}
                      onChange={(val) => update("maintenanceDay", val)}
                      placeholder="— Select Day —"
                      options={DAYS.map(d => ({ value: d, label: d }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label text="Start Time (UTC)" />
                    <input type="time" value={form.maintenanceStart} onChange={(e) => update("maintenanceStart", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <Label text="End Time (UTC)" />
                    <input type="time" value={form.maintenanceEnd} onChange={(e) => update("maintenanceEnd", e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Backup & DR ───────────────────────────────────────────────── */}
          {activeSection === "backup" && (
            <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border/50">
                <HardDrive className="h-4 w-4 text-primary" /> Backup & Recovery Standards
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label text="Snapshot Frequency" />
                    <Select
                      value={form.backupFrequency}
                      onChange={(val) => update("backupFrequency", val)}
                      placeholder="— Select Frequency —"
                      options={[
                        { value: "hourly", label: "Hourly incremental" },
                        { value: "daily", label: "Daily full" },
                        { value: "weekly", label: "Weekly snapshot" },
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label text="Retention Lifetime (days)" />
                    <input type="number" value={form.backupRetentionDays} onChange={(e) => update("backupRetentionDays", parseInt(e.target.value) || 30)} className={inputCls} min={1} max={365} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label text="RPO Threshold (minutes)" />
                    <input type="number" value={form.rpoMinutes} onChange={(e) => update("rpoMinutes", parseInt(e.target.value) || 60)} className={inputCls} min={1} />
                  </div>
                  <div>
                    <Label text="RTO Recovery Threshold (minutes)" />
                    <input type="number" value={form.rtoMinutes} onChange={(e) => update("rtoMinutes", parseInt(e.target.value) || 240)} className={inputCls} min={1} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── External Integrations ─────────────────────────────────────── */}
          {activeSection === "integrations" && (
            <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-5">
              <div className="border-b border-border/50 pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Puzzle className="h-4 w-4 text-primary" /> External App Integrations
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure external enterprise app integrations, mail gateways, and developer webhooks for this tenant.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Jira Integration */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <Kanban className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Atlassian Jira</h4>
                        <p className="text-[11px] text-muted-foreground">Sync tickets & task status</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="space-y-2 pt-1">
                    <div>
                      <Label text="Jira Domain URL" />
                      <input
                        type="text"
                        placeholder="https://company.atlassian.net"
                        value={form.jiraHost || ''}
                        onChange={(e) => update('jiraHost', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <Label text="Default Project Key" />
                      <input
                        type="text"
                        placeholder="e.g. PROJ"
                        value={form.jiraProjectKey || ''}
                        onChange={(e) => update('jiraProjectKey', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* Custom SMTP Mail Server */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Custom SMTP Mail Server</h4>
                        <p className="text-[11px] text-muted-foreground">Send transactional emails & alerts</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Label text="SMTP Host" />
                        <input
                          type="text"
                          placeholder="smtp.mailgun.org"
                          value={form.smtpHost || ''}
                          onChange={(e) => update('smtpHost', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <Label text="Port" />
                        <input
                          type="text"
                          placeholder="587"
                          value={form.smtpPort || ''}
                          onChange={(e) => update('smtpPort', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <Label text="Sender Email (From)" />
                      <input
                        type="email"
                        placeholder="noreply@tenant.com"
                        value={form.smtpFromEmail || ''}
                        onChange={(e) => update('smtpFromEmail', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* Slack & Webhooks */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Slack & Teams Webhooks</h4>
                        <p className="text-[11px] text-muted-foreground">Broadcast notifications to channel</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="space-y-2 pt-1">
                    <div>
                      <Label text="Webhook Endpoint URL" />
                      <input
                        type="text"
                        placeholder="https://hooks.slack.com/services/..."
                        value={form.slackWebhookUrl || ''}
                        onChange={(e) => update('slackWebhookUrl', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* Google Workspace & MS 365 */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Google / Microsoft 365 SSO</h4>
                        <p className="text-[11px] text-muted-foreground">Single Sign-On & Directory Sync</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="space-y-2 pt-1">
                    <div>
                      <Label text="Allowed Corporate Domain" />
                      <input
                        type="text"
                        placeholder="e.g. company.com"
                        value={form.ssoDomain || ''}
                        onChange={(e) => update('ssoDomain', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Prev / Next navigation */}
          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={() => setActiveSection(SECTIONS[currentIdx - 1].id)}
              disabled={currentIdx === 0}
              className="px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              ← Previous
            </button>
            {currentIdx < SECTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveSection(SECTIONS[currentIdx + 1].id)}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {isSubmitting
                  ? (editOrgId ? "Saving…" : "Creating…")
                  : (editOrgId ? "Save Changes" : "Create Tenant")}
              </button>
            )}
          </div>
        </div>
      </div>
      <ConfirmationDialog
        isOpen={isCancelConfirmOpen}
        title="Discard Changes?"
        description="Are you sure you want to discard all changes? Any unsaved information will be lost."
        onConfirm={() => {
          setIsCancelConfirmOpen(false);
          resetForm();
        }}
        onClose={() => setIsCancelConfirmOpen(false)}
        variant="danger"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
      />
    </form>
  );
}
