import React from 'react';
import { Building2, MapPin, Receipt, Image as ImageIcon, ChevronRight, Search, CheckCircle2, Info, AlertTriangle, Trash2, Upload } from 'lucide-react';
import Select from "@/shared/components/ui/Select";
import { capitalizeFirstLetter } from '@/shared/utils/stringUtils';
import { toast } from 'sonner';
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";

const countryToCurrencyMap: Record<string, string> = {
  "india": "INR",
  "united states": "USD",
  "usa": "USD",
  "united kingdom": "GBP",
  "uk": "GBP",
  "tanzania": "TZS",
  "singapore": "SGD",
  "canada": "CAD",
  "australia": "AUD",
  "germany": "EUR",
  "france": "EUR",
  "netherlands": "EUR",
  "japan": "JPY",
  "brazil": "BRL",
  "south africa": "ZAR",
  "saudi arabia": "SAR",
  "united arab emirates": "AED",
  "uae": "AED"
};



// Helper component for StatusBadge
const StatusBadge = ({ isComplete, label }: any) => {
  if (isComplete) {
    return (
      <div className="flex items-center gap-[5px] text-[11px] font-semibold text-[#0FA968] dark:text-emerald-400 bg-[#E8F8F1] dark:bg-transparent px-[10px] py-[4px] rounded-full">
        <CheckCircle2 className="w-[11px] h-[11px]" />
        Complete
      </div>
    );
  }
  return (
    <div className="flex items-center gap-[5px] text-[11px] font-semibold text-[#DB8A11] dark:text-amber-400 bg-[#FDF3E2] dark:bg-transparent px-[10px] py-[4px] rounded-full">
      <AlertTriangle className="w-[11px] h-[11px]" />
      {label}
    </div>
  );
};

export const LegalEntityTaxTab = ({
  companyData,
  setCompanyData,
  updateField,
  isReadOnly,
  panError,
  isCountryDropdownOpen,
  setIsCountryDropdownOpen,
  countrySearch,
  setCountrySearch,
  filteredCountries,
  dropdownRef,
  getCompanyTypesByCountry,
  getTaxFieldsForCompanyType
}: any) => {

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const isIndia = companyData.legalAddress.country === "India";
  const taxFields = getTaxFieldsForCompanyType(companyData.legalAddress.country, companyData.companyType);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large", { description: "Logo file size must be less than 20 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setCompanyData((prev: any) => ({ ...prev, logoUrl: base64String }));
      toast.success("Company logo uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  const [showRemoveLogoDialog, setShowRemoveLogoDialog] = React.useState(false);

  const handleRemoveLogo = () => {
    setShowRemoveLogoDialog(true);
  };

  const confirmRemoveLogo = () => {
    setCompanyData((prev: any) => ({ ...prev, logoUrl: "" }));
    (window as any).temp_company_logo = "";
    window.dispatchEvent(new Event('company-logo-updated'));
    toast.info("Company logo removed");
    setShowRemoveLogoDialog(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-8 items-start font-['Inter',sans-serif]">
      {/* Main Content Column */}
      <div className="min-w-0 space-y-6">
        
        {/* Info Banner */}
        <div className="flex items-start gap-[10px] bg-[#E7F6FB] dark:bg-transparent border border-[#C8E9F2] dark:border-border rounded-[10px] p-[13px_16px] mb-6 text-[13.5px] text-[#0D6B87] dark:text-foreground leading-[1.5]">
          <Info className="w-4 h-4 flex-shrink-0 mt-[1px] text-[#1591B8] dark:text-foreground" />
          Define the legally registered entity, which is critical for taxation and statutory compliance.
        </div>

        {/* Legal Entity Information */}
        <div id="sec-entity" className="bg-[#FFFFFF] dark:bg-card border border-[#E6E8EE] dark:border-border rounded-[14px] overflow-visible shadow-[0_1px_2px_rgba(16,17,26,0.04)] hover:shadow-[0_4px_16px_rgba(16,17,26,0.06),_0_1px_2px_rgba(16,17,26,0.04)] transition-shadow duration-200 scroll-mt-[100px]">
          <div className="flex items-center justify-between gap-[12px] p-[16px_22px] border-b border-[#E6E8EE] dark:border-border">
            <div className="flex items-center gap-[11px]">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h2 className="font-['Space_Grotesk'] text-[14.5px] font-semibold m-0 tracking-[0.005em] text-[#12131A] dark:text-foreground">Legal Entity Information</h2>
                <div className="text-[11.5px] text-[#9498A6] mt-[1px]">Core registration and reporting details</div>
              </div>
            </div>
            <StatusBadge isComplete={!!(companyData.EntityName && companyData.companyCode && companyData.companyType)} />
          </div>
          <div className="p-[22px_22px_4px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="mb-5">
                <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                  Legal Entity Name <span className="text-[#E14B5A]">*</span>
                </label>
                <input
                  value={companyData.EntityName}
                  onChange={(e) => !isReadOnly && setCompanyData({ ...companyData, EntityName: capitalizeFirstLetter(e.target.value) })}
                  readOnly={isReadOnly}
                  className="w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none placeholder:text-[#9498A6] hover:border-[#B9BFCC] focus:border-primary focus:shadow-[0_0_0_3.5px_rgba(84,87,229,0.12)]"
                />
              </div>
              <div className="mb-5">
                <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                  Company Code / ID <span className="text-[#E14B5A]">*</span>
                </label>
                <input
                  value={companyData.companyCode}
                  onChange={(e) => !isReadOnly && setCompanyData({ ...companyData, companyCode: e.target.value })}
                  readOnly={isReadOnly}
                  className="w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13px] font-['IBM_Plex_Mono',monospace] tracking-[0.02em] p-[10px_12px] transition-all outline-none placeholder:text-[#9498A6] hover:border-[#B9BFCC] focus:border-primary focus:shadow-[0_0_0_3.5px_rgba(84,87,229,0.12)]"
                />
              </div>
              
              <div className="mb-5 relative" ref={dropdownRef}>
                <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                  Country of Incorporation <span className="text-[#E14B5A]">*</span>
                </label>
                <div 
                  className="w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none hover:border-[#B9BFCC] focus:border-primary cursor-pointer flex justify-between items-center"
                  onClick={() => !isReadOnly && setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                >
                  <span className={companyData.legalAddress.country ? "text-[#12131A] dark:text-foreground" : "text-[#9498A6]"}>
                    {companyData.legalAddress.country || "Select Country"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#9498A6]" />
                </div>
                {isCountryDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[8px] shadow-lg overflow-hidden">
                    <div className="p-2">
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Search countries..."
                        autoFocus
                        className="w-full bg-[#F9FAFB] dark:bg-muted border border-[#D6DAE3] dark:border-border rounded-[6px] text-[#12131A] dark:text-foreground text-[13px] p-[8px_10px] outline-none focus:border-primary"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((country: string) => (
                          <div
                            key={country}
                            onClick={() => {
                              const normCountry = country.toLowerCase().trim();
                              const mappedCurrency = countryToCurrencyMap[normCountry] || "USD";
                              setCompanyData({
                                ...companyData,
                                currency: mappedCurrency,
                                legalAddress: { ...companyData.legalAddress, country },
                              });
                              setIsCountryDropdownOpen(false);
                              setCountrySearch("");
                            }}
                            className="px-3 py-2 text-[13px] text-[#12131A] dark:text-foreground hover:bg-[#F1F3F7] dark:hover:bg-muted cursor-pointer transition-colors"
                          >
                            {country}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-[13px] text-[#9498A6] text-center">
                          No countries found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-5">
                <Select
                  value={companyData.companyType}
                  onChange={(val) => !isReadOnly && setCompanyData({ ...companyData, companyType: val })}
                  label="Company Type"
                  placeholder="Select type"
                  required
                  disabled={isReadOnly}
                  options={getCompanyTypesByCountry(companyData.legalAddress.country).map((t: string) => ({
                    value: t,
                    label: t,
                  }))}
                />
              </div>

              <div className="mb-5">
                <Select
                  value={companyData.currency || "USD"}
                  onChange={(val) => !isReadOnly && setCompanyData({ ...companyData, currency: val })}
                  label="Base Currency"
                  placeholder="Select currency"
                  required
                  disabled={isReadOnly}
                  options={[
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
                  ]}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Tax Registration Numbers */}
        <div id="sec-tax" className="bg-[#FFFFFF] dark:bg-card border border-[#E6E8EE] dark:border-border rounded-[14px] overflow-hidden shadow-[0_1px_2px_rgba(16,17,26,0.04)] hover:shadow-[0_4px_16px_rgba(16,17,26,0.06),_0_1px_2px_rgba(16,17,26,0.04)] transition-shadow duration-200 scroll-mt-[100px]">
          <div className="flex items-center justify-between gap-[12px] p-[16px_22px] border-b border-[#E6E8EE] dark:border-border">
            <div className="flex items-center gap-[11px]">
              <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h2 className="font-['Space_Grotesk'] text-[14.5px] font-semibold m-0 tracking-[0.005em] text-[#12131A] dark:text-foreground">Tax Registration Numbers</h2>
                <div className="text-[11.5px] text-[#9498A6] mt-[1px]">Statutory identifiers used in filings</div>
              </div>
            </div>
          </div>
          <div className="p-[22px_22px_4px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {taxFields.map((field: any) => (
                <div key={field.key} className="mb-5">
                  <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                    {field.label} {field.required && <span className="text-[#E14B5A]">*</span>}
                  </label>
                  <input
                    value={(companyData.taxRegistrationNumbers as any)[field.key] || ""}
                    onChange={(e) => {
                      if (!isReadOnly) {
                        setCompanyData({
                          ...companyData,
                          taxRegistrationNumbers: { ...companyData.taxRegistrationNumbers, [field.key]: e.target.value.toUpperCase() }
                        });
                      }
                    }}
                    readOnly={isReadOnly}
                    placeholder={field.placeholder}
                    className="w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13px] font-['IBM_Plex_Mono',monospace] tracking-[0.02em] p-[10px_12px] transition-all outline-none placeholder:text-[#9498A6] hover:border-[#B9BFCC] focus:border-primary focus:shadow-[0_0_0_3.5px_rgba(84,87,229,0.12)]"
                  />
                  {field.key === "pan" && panError && <div className="text-[11.5px] text-[#E14B5A] mt-[6px]">{panError}</div>}
                </div>
              ))}
            </div>

            {isIndia && (
              <div className="flex gap-[10px] items-start bg-[#FDF3E2] dark:bg-transparent border border-[#F3DBAE] dark:border-border rounded-[10px] p-[12px_16px] m-[4px_0_22px] text-[12.5px] text-[#8A5A0A] dark:text-foreground leading-[1.55]">
                <AlertTriangle className="w-[15px] h-[15px] flex-shrink-0 mt-[1px] stroke-[#DB8A11] dark:stroke-foreground" />
                <div><strong className="font-semibold text-[#8A5A0A] dark:text-foreground">Statutory note:</strong> Indian entities must provide a valid PAN for corporate tax filings. GST registration details can be added in the locations section.</div>
              </div>
            )}
          </div>
        </div>

        {/* Legal Address */}
        <div id="sec-address" className="bg-[#FFFFFF] dark:bg-card border border-[#E6E8EE] dark:border-border rounded-[14px] overflow-visible shadow-[0_1px_2px_rgba(16,17,26,0.04)] hover:shadow-[0_4px_16px_rgba(16,17,26,0.06),_0_1px_2px_rgba(16,17,26,0.04)] transition-shadow duration-200 scroll-mt-[100px]">
          <div className="flex items-center justify-between gap-[12px] p-[16px_22px] border-b border-[#E6E8EE] dark:border-border">
            <div className="flex items-center gap-[11px]">
              <MapPin className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
              <div>
                <h2 className="font-['Space_Grotesk'] text-[14.5px] font-semibold m-0 tracking-[0.005em] text-[#12131A] dark:text-foreground">Legal Address</h2>
                <div className="text-[11.5px] text-[#9498A6] mt-[1px]">Registered office address on file</div>
              </div>
            </div>
            <StatusBadge isComplete={!!(companyData.legalAddress.street && companyData.legalAddress.city && companyData.legalAddress.state)} />
          </div>
          <div className="p-[22px_22px_4px]">
            <div className="mb-5">
              <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                Street Address <span className="text-[#E14B5A]">*</span>
              </label>
              <input
                value={companyData.legalAddress.street}
                onChange={(e) => !isReadOnly && updateField('legalAddress', 'street', e.target.value)}
                readOnly={isReadOnly}
                className="w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none hover:border-[#B9BFCC] focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="mb-5">
                <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                  City <span className="text-[#E14B5A]">*</span>
                </label>
                <input
                  value={companyData.legalAddress.city}
                  onChange={(e) => !isReadOnly && updateField('legalAddress', 'city', e.target.value)}
                  readOnly={isReadOnly}
                  className="w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none hover:border-[#B9BFCC] focus:border-primary"
                />
              </div>
              <div className="mb-5">
                <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                  State <span className="text-[#E14B5A]">*</span>
                </label>
                <input
                  value={companyData.legalAddress.state}
                  onChange={(e) => !isReadOnly && updateField('legalAddress', 'state', e.target.value)}
                  readOnly={isReadOnly}
                  className="w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none hover:border-[#B9BFCC] focus:border-primary"
                />
              </div>
              <div className="mb-5">
                <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                  PIN Code <span className="text-[#E14B5A]">*</span>
                </label>
                <input
                  value={companyData.legalAddress.zipCode}
                  onChange={(e) => !isReadOnly && updateField('legalAddress', 'zipCode', e.target.value)}
                  readOnly={isReadOnly}
                  className="w-[50%] bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none hover:border-[#B9BFCC] focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Company Logo */}
        <div id="sec-logo" className="bg-[#FFFFFF] dark:bg-card border border-[#E6E8EE] dark:border-border rounded-[14px] overflow-visible shadow-[0_1px_2px_rgba(16,17,26,0.04)] hover:shadow-[0_4px_16px_rgba(16,17,26,0.06),_0_1px_2px_rgba(16,17,26,0.04)] transition-shadow duration-200 scroll-mt-[100px]">
          <div className="flex items-center gap-[11px] p-[16px_22px] border-b border-[#E6E8EE] dark:border-border">
            <ImageIcon className="h-5 w-5 text-pink-600 dark:text-pink-400 shrink-0" />
            <div>
              <h2 className="font-['Space_Grotesk'] text-[14.5px] font-semibold m-0 tracking-[0.005em] text-[#12131A] dark:text-foreground">Company Logo</h2>
              <div className="text-[11.5px] text-[#9498A6] mt-[1px]">Shown across invoices, payslips and the employee portal</div>
            </div>
          </div>
          <div className="p-[22px_22px]">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {companyData.logoUrl ? (
                <div className="w-full max-w-[280px] h-[160px] bg-[#F9FAFB] dark:bg-transparent border border-[#E6E8EE] dark:border-border rounded-[10px] flex flex-col items-center justify-center relative p-3 group shadow-sm">
                  <img
                    src={companyData.logoUrl}
                    alt="Company Logo"
                    className="max-h-[100px] max-w-[240px] object-contain"
                  />
                  {!isReadOnly && (
                    <div className="mt-3 flex items-center gap-4">
                      <label className="text-[12px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        Change Logo
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-[12px] font-semibold text-red-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <label className={`w-full max-w-[280px] h-[160px] bg-[#F9FAFB] dark:bg-transparent border border-dashed border-[#D6DAE3] dark:border-border rounded-[10px] flex flex-col items-center justify-center ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[#F1F3F7] dark:hover:bg-transparent'} transition-all relative`}>
                  {!isReadOnly && (
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  )}
                  <svg className="w-6 h-6 text-[#5B5F6E] dark:text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  <div className="text-[13px] font-semibold text-primary mb-1">Click to add <span className="text-[#5B5F6E] dark:text-muted-foreground font-medium">or drop here</span></div>
                  <div className="text-[11px] text-[#9498A6] text-center">PNG, JPG, SVG, JPEG files only.<br/>Max. 20 MB each.</div>
                </label>
              )}
              <div className="flex-1">
                <h3 className="text-[11px] font-bold text-[#5B5F6E] dark:text-muted-foreground uppercase tracking-[0.04em] mb-3">LOGO REQUIREMENTS</h3>
                <ul className="space-y-[6px] text-[12.5px] text-[#5B5F6E] dark:text-muted-foreground">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div> <strong>Recommended:</strong> Horizontal layout (e.g. 16:9 / 3:1)</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div> <strong>File limit:</strong> 20.0 MB</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div> <strong>Formats:</strong> PNG, JPG, SVG</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Jump Rail */}
      <div className="hidden md:block sticky top-[96px]">
        <div className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#9498A6] dark:text-muted-foreground mb-[12px] pl-[2px]">On this page</div>
        <div onClick={() => scrollToSection('sec-entity')} className="flex items-center gap-[9px] p-[8px_10px] rounded-[7px] text-[12.5px] text-[#12131A] dark:text-foreground bg-[#F1F3F7] dark:bg-muted cursor-pointer transition-all mb-[2px]">
          <CheckCircle2 className="w-[13px] h-[13px] stroke-[#0FA968] dark:stroke-emerald-400 flex-shrink-0" />
          Legal Entity Info
        </div>
        <div onClick={() => scrollToSection('sec-tax')} className="flex items-center gap-[9px] p-[8px_10px] rounded-[7px] text-[12.5px] text-[#5B5F6E] dark:text-muted-foreground hover:bg-[#F1F3F7] dark:hover:bg-muted hover:text-[#12131A] dark:text-foreground cursor-pointer transition-all mb-[2px]">
          <div className="w-[6px] h-[6px] rounded-full bg-[#D6DAE3] dark:bg-border flex-shrink-0"></div>
          Tax Registration
        </div>
        <div onClick={() => scrollToSection('sec-address')} className="flex items-center gap-[9px] p-[8px_10px] rounded-[7px] text-[12.5px] text-[#5B5F6E] dark:text-muted-foreground hover:bg-[#F1F3F7] dark:hover:bg-muted hover:text-[#12131A] dark:text-foreground cursor-pointer transition-all mb-[2px]">
          <div className="w-[6px] h-[6px] rounded-full bg-[#D6DAE3] dark:bg-border flex-shrink-0"></div>
          Legal Address
        </div>
        <div onClick={() => scrollToSection('sec-logo')} className="flex items-center gap-[9px] p-[8px_10px] rounded-[7px] text-[12.5px] text-[#5B5F6E] dark:text-muted-foreground hover:bg-[#F1F3F7] dark:hover:bg-muted hover:text-[#12131A] dark:text-foreground cursor-pointer transition-all mb-[2px]">
          <div className="w-[6px] h-[6px] rounded-full bg-[#D6DAE3] dark:bg-border flex-shrink-0"></div>
          Company Logo
        </div>
      </div>

      <ConfirmDialog
        open={showRemoveLogoDialog}
        title="Remove Company Logo"
        message="Are you sure you want to remove the company logo? This action will remove the logo from invoices, payslips, and the employee portal."
        confirmLabel="Remove Logo"
        cancelLabel="Cancel"
        confirmColor="red"
        onConfirm={confirmRemoveLogo}
        onCancel={() => setShowRemoveLogoDialog(false)}
      />
    </div>
  );
};
