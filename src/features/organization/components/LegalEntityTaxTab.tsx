import React from 'react';
import { Building2, MapPin, Receipt, Image as ImageIcon, ChevronRight, Search, CheckCircle2, Info, AlertTriangle, Trash2, Upload, Landmark } from 'lucide-react';
import Select from "@/shared/components/ui/Select";
import SearchableSelect from "@/shared/components/ui/SearchableSelect";
import { capitalizeFirstLetter } from '@/shared/utils/stringUtils';
import { toast } from 'sonner';
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Andaman and Nicobar Islands", 
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Puducherry", "Ladakh", "Jammu and Kashmir"
];

const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", 
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", 
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", 
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", 
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const tanzaniaRegions = [
  "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", 
  "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza", 
  "Njombe", "Pemba North", "Pemba South", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", 
  "Simiyu", "Singida", "Songwe", "Tabora", "Tanga", "Zanzibar North", "Zanzibar South", "Zanzibar Urban/West"
];

const stateCities: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati", "Anantapur", "Kadapa", "Kakinada"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Jagdalpur", "Ambikapur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Morbi", "Anand", "Vapi"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Nahan", "Baddi"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Hazaribagh", "Giridih"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi", "Davangere", "Ballari", "Shivamogga", "Tumakuru"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Alappuzha", "Palakkad", "Kannur", "Kottayam"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Navi Mumbai", "Amravati", "Kolhapur", "Kalyan-Dombivli"],
  "Manipur": ["Imphal", "Thoubal", "Kakching"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
  "Nagaland": ["Dimapur", "Kohima", "Mokokchung"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Pathankot"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Udaipur", "Bikaner", "Ajmer", "Bhilwara", "Alwar", "Sikar"],
  "Sikkim": ["Gangtok", "Namchi", "Geyzing"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Nagercoil"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam", "Khammam", "Mahabubnagar"],
  "Tripura": ["Agartala", "Dharmanagar", "Udaipur"],
  "Uttar Pradesh": ["Middleton", "Lucknow", "Kanpur", "Noida", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Allahabad", "Bareilly", "Aligarh", "Moradabad"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Haldwani", "Roorkee", "Rudrapur", "Kashipur"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Asansol", "Durgapur", "Bardhaman", "Kharagpur", "Darjeeling"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Dwarka"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Lakshadweep": ["Kavaratti"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  "Ladakh": ["Leh", "Kargil"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
  "Arusha": ["Arusha", "Karatu", "Mto wa Mbu", "Monduli"],
  "Dar es Salaam": ["Dar es Salaam", "Kinondoni", "Ilala", "Temeke", "Ubungo", "Kigamboni"],
  "Dodoma": ["Dodoma", "Kondoa", "Mpwapwa", "Kongwa"],
  "Geita": ["Geita", "Chato"],
  "Iringa": ["Iringa", "Mafinga", "Ruaha Mbuyuni"],
  "Kagera": ["Bukoba", "Biharamulo", "Ngara"],
  "Katavi": ["Mpanda"],
  "Kigoma": ["Kigoma", "Kasulu", "Kibondo"],
  "Kilimanjaro": ["Moshi", "Same", "Mwanga", "Hai"],
  "Lindi": ["Lindi", "Ruangwa", "Nachingwea"],
  "Manyara": ["Babati", "Mbulu", "Simanjiro"],
  "Mara": ["Musoma", "Bunda", "Tarime"],
  "Mbeya": ["Mbeya", "Tunduma", "Mbarali", "Chunya"],
  "Morogoro": ["Morogoro", "Ifakara", "Kilosa", "Mikumi"],
  "Mtwara": ["Mtwara", "Masasi", "Newala"],
  "Mwanza": ["Mwanza", "Sengerema", "Nansio", "Geita"],
  "Njombe": ["Njombe", "Makambako"],
  "Pemba North": ["Wete"],
  "Pemba South": ["Mkoani"],
  "Pwani": ["Kibaha", "Bagamoyo", "Kisarawe", "Chalinze"],
  "Rukwa": ["Sumbawanga"],
  "Ruvuma": ["Songea", "Mbinga", "Tunduru"],
  "Shinyanga": ["Shinyanga", "Kahama"],
  "Simiyu": ["Bariadi", "Maswa"],
  "Singida": ["Singida", "Manyoni"],
  "Songwe": ["Vwawa", "Mlowo"],
  "Tabora": ["Tabora", "Nzega", "Igunga"],
  "Tanga": ["Tanga", "Korogwe", "Muheza", "Lushoto"],
  "Zanzibar North": ["Mkokotoni"],
  "Zanzibar South": ["Koani"],
  "Zanzibar Urban/West": ["Zanzibar City", "Mwanakwerekwe"]
};

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
  getTaxFieldsForCompanyType,
  errors
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
                  className={`w-full bg-[#FFFFFF] dark:bg-card border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none placeholder:text-[#9498A6] hover:border-[#B9BFCC] focus:border-primary focus:shadow-[0_0_0_3.5px_rgba(84,87,229,0.12)] ${errors?.EntityName ? 'border-red-500' : 'border-[#D6DAE3] dark:border-border'}`}
                />
                {errors?.EntityName && <p className="text-[11.5px] text-red-500 mt-1">{errors.EntityName}</p>}
              </div>
              <div className="mb-5">
                <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                  Company Code / ID <span className="text-[#E14B5A]">*</span>
                </label>
                <input
                  value={companyData.companyCode}
                  onChange={(e) => !isReadOnly && setCompanyData({ ...companyData, companyCode: e.target.value })}
                  readOnly={isReadOnly}
                  className={`w-full bg-[#FFFFFF] dark:bg-card border rounded-[7px] text-[#12131A] dark:text-foreground text-[13px] font-['IBM_Plex_Mono',monospace] tracking-[0.02em] p-[10px_12px] transition-all outline-none placeholder:text-[#9498A6] hover:border-[#B9BFCC] focus:border-primary focus:shadow-[0_0_0_3.5px_rgba(84,87,229,0.12)] ${errors?.companyCode ? 'border-red-500' : 'border-[#D6DAE3] dark:border-border'}`}
                />
                {errors?.companyCode && <p className="text-[11.5px] text-red-500 mt-1">{errors.companyCode}</p>}
              </div>
              
              <div className="mb-5">
                <SearchableSelect
                  value={companyData.legalAddress.country}
                  onChange={(val: string) => {
                    const normCountry = val.toLowerCase().trim();
                    const mappedCurrency = countryToCurrencyMap[normCountry] || "USD";
                    setCompanyData({
                      ...companyData,
                      currency: mappedCurrency,
                      legalAddress: { 
                        ...companyData.legalAddress, 
                        country: val,
                        state: "",
                        city: ""
                      },
                    });
                  }}
                  label="Country of Incorporation"
                  required
                  disabled={isReadOnly}
                  placeholder="Select Country"
                  error={errors?.country}
                  options={[
                    "India", "United States", "United Kingdom", "United Arab Emirates",
                    "Singapore", "Canada", "Australia", "Germany", "France",
                    "Netherlands", "Saudi Arabia", "South Africa", "Japan",
                    "China", "Brazil", "Mexico", "Italy", "Spain", "Malaysia", "Indonesia",
                    "Israel", "Ireland", "New Zealand", "Tanzania", "Kenya", "Nigeria", "Other"
                  ].map(c => ({ value: c, label: c }))}
                />
              </div>

              <div className="mb-5">
                <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                  Company Type <span className="text-[#E14B5A]">*</span>
                </label>
                <Select
                  value={companyData.companyType}
                  onChange={(val) => !isReadOnly && setCompanyData({ ...companyData, companyType: val })}
                  placeholder="Select type"
                  disabled={isReadOnly}
                  buttonClassName={`!h-[41px] text-[13.5px] rounded-[7px] border hover:border-[#B9BFCC] focus:border-primary px-3 text-[#12131A] dark:text-foreground font-normal shadow-none ${errors?.companyType ? 'border-red-500' : 'border-[#D6DAE3] dark:border-border'}`}
                  options={getCompanyTypesByCountry(companyData.legalAddress.country).map((t: string) => ({
                    value: t,
                    label: t,
                  }))}
                />
                {errors?.companyType && <p className="text-[11.5px] text-red-500 mt-1">{errors.companyType}</p>}
              </div>

              <div className="mb-5">
                <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                  Base Currency <span className="text-[#E14B5A]">*</span>
                </label>
                <Select
                  value={companyData.currency || "USD"}
                  onChange={(val) => !isReadOnly && setCompanyData({ ...companyData, currency: val })}
                  placeholder="Select currency"
                  disabled={isReadOnly}
                  buttonClassName="!h-[41px] text-[13.5px] rounded-[7px] border-[#D6DAE3] dark:border-border hover:border-[#B9BFCC] focus:border-primary px-3 text-[#12131A] dark:text-foreground font-normal shadow-none"
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
                    className={`w-full bg-[#FFFFFF] dark:bg-card border rounded-[7px] text-[#12131A] dark:text-foreground text-[13px] font-['IBM_Plex_Mono',monospace] tracking-[0.02em] p-[10px_12px] transition-all outline-none placeholder:text-[#9498A6] focus:shadow-[0_0_0_3.5px_rgba(84,87,229,0.12)] ${errors?.[field.key] ? 'border-red-500' : 'border-[#D6DAE3] dark:border-border focus:border-primary'}`}
                  />
                  {errors?.[field.key] && <div className="text-[11.5px] text-red-500 mt-[6px]">{errors[field.key]}</div>}
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
                className={`w-full bg-[#FFFFFF] dark:bg-card border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none focus:shadow-[0_0_0_3.5px_rgba(84,87,229,0.12)] ${errors?.street ? 'border-red-500' : 'border-[#D6DAE3] dark:border-border focus:border-primary'}`}
              />
              {errors?.street && <p className="text-[11.5px] text-red-500 mt-1">{errors.street}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="mb-5">
                {companyData.legalAddress.country === 'India' ? (
                  <SearchableSelect
                    value={companyData.legalAddress.state}
                    onChange={(val: string) => {
                      updateField('legalAddress', 'state', val);
                      updateField('legalAddress', 'city', ''); // Reset city on state change
                    }}
                    label="State"
                    required
                    disabled={isReadOnly}
                    placeholder="Select State"
                    error={errors?.state}
                    options={indianStates.map(state => ({ value: state, label: state }))}
                  />
                ) : companyData.legalAddress.country === 'United States' || companyData.legalAddress.country === 'USA' ? (
                  <SearchableSelect
                    value={companyData.legalAddress.state}
                    onChange={(val: string) => {
                      updateField('legalAddress', 'state', val);
                      updateField('legalAddress', 'city', ''); // Reset city on state change
                    }}
                    label="State"
                    required
                    disabled={isReadOnly}
                    placeholder="Select State"
                    error={errors?.state}
                    options={usStates.map(state => ({ value: state, label: state }))}
                  />
                ) : companyData.legalAddress.country === 'Tanzania' ? (
                  <SearchableSelect
                    value={companyData.legalAddress.state}
                    onChange={(val: string) => {
                      updateField('legalAddress', 'state', val);
                      updateField('legalAddress', 'city', ''); // Reset city on state change
                    }}
                    label="Region"
                    required
                    disabled={isReadOnly}
                    placeholder="Select Region"
                    error={errors?.state}
                    options={tanzaniaRegions.map(state => ({ value: state, label: state }))}
                  />
                ) : (
                  <>
                    <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                      {companyData.legalAddress.country === 'Tanzania' ? 'Region' : companyData.legalAddress.country === 'United Kingdom' ? 'County' : 'State/Province'} <span className="text-[#E14B5A]">*</span>
                    </label>
                    <input
                      value={companyData.legalAddress.state}
                      onChange={(e) => !isReadOnly && updateField('legalAddress', 'state', e.target.value)}
                      readOnly={isReadOnly}
                      className={`w-full bg-[#FFFFFF] dark:bg-card border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none focus:shadow-[0_0_0_3.5px_rgba(84,87,229,0.12)] ${errors?.state ? 'border-red-500' : 'border-[#D6DAE3] dark:border-border focus:border-primary'}`}
                    />
                    {errors?.state && <p className="text-[11.5px] text-red-500 mt-1">{errors.state}</p>}
                  </>
                )}
              </div>
              <div className="mb-5">
                {(() => {
                  const state = companyData.legalAddress.state;
                  const citiesForState = state ? stateCities[state] : null;
                  const showCitySelect = citiesForState && citiesForState.length > 0;
                  const isCustomCity = companyData.legalAddress.city && showCitySelect && !citiesForState.includes(companyData.legalAddress.city);

                  return showCitySelect ? (
                    <SearchableSelect
                      value={isCustomCity || companyData.legalAddress.city === "Other" ? "Other" : companyData.legalAddress.city}
                      onChange={(val: string) => {
                        updateField('legalAddress', 'city', val);
                      }}
                      label="City"
                      required
                      disabled={isReadOnly || !companyData.legalAddress.state}
                      placeholder="Select City"
                      error={errors?.city}
                      options={[
                        ...citiesForState.map(c => ({ value: c, label: c })),
                        { value: "Other", label: "Other (Enter Manually)" }
                      ]}
                    />
                  ) : (
                    <>
                      <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                        City <span className="text-[#E14B5A]">*</span>
                      </label>
                      <input
                        value={companyData.legalAddress.city}
                        onChange={(e) => !isReadOnly && updateField('legalAddress', 'city', e.target.value)}
                        readOnly={isReadOnly}
                        className={`w-full bg-[#FFFFFF] dark:bg-card border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none focus:shadow-[0_0_0_3.5px_rgba(84,87,229,0.12)] ${errors?.city ? 'border-red-500' : 'border-[#D6DAE3] dark:border-border focus:border-primary'}`}
                      />
                      {errors?.city && <p className="text-[11.5px] text-red-500 mt-1">{errors.city}</p>}
                    </>
                  );
                })()}
              </div>

              {(() => {
                const state = companyData.legalAddress.state;
                const citiesForState = state ? stateCities[state] : null;
                const showCitySelect = citiesForState && citiesForState.length > 0;
                const isCustomCity = companyData.legalAddress.city && showCitySelect && !citiesForState.includes(companyData.legalAddress.city);

                if (showCitySelect && (isCustomCity || companyData.legalAddress.city === "Other")) {
                  return (
                    <div className="mb-5 animate-in fade-in slide-in-from-top-1 md:col-span-2">
                      <label className="flex items-center gap-[5px] text-[11.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                        Specify City Name <span className="text-[#E14B5A]">*</span>
                      </label>
                      <input
                        value={companyData.legalAddress.city === "Other" ? "" : companyData.legalAddress.city}
                        onChange={(e) => !isReadOnly && updateField('legalAddress', 'city', e.target.value)}
                        readOnly={isReadOnly}
                        className={`w-full bg-[#FFFFFF] dark:bg-card border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none focus:shadow-[0_0_0_3.5px_rgba(84,87,229,0.12)] ${errors?.city ? 'border-red-500' : 'border-[#D6DAE3] dark:border-border focus:border-primary'}`}
                        placeholder="Type city name"
                      />
                      {errors?.city && <p className="text-[11.5px] text-red-500 mt-1">{errors.city}</p>}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="mb-5">
                <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                  {(() => {
                    const c = companyData.legalAddress.country;
                    return c === 'India' ? 'PIN Code' : c === 'United States' || c === 'USA' ? 'Zip Code' : c === 'United Kingdom' ? 'Postcode' : 'ZIP/Postal Code';
                  })()} <span className="text-[#E14B5A]">*</span>
                </label>
                <input
                  value={companyData.legalAddress.zipCode}
                  onChange={(e) => !isReadOnly && updateField('legalAddress', 'zipCode', e.target.value)}
                  readOnly={isReadOnly}
                  className={`w-[50%] bg-[#FFFFFF] dark:bg-card border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none focus:shadow-[0_0_0_3.5px_rgba(84,87,229,0.12)] ${errors?.zipCode ? 'border-red-500' : 'border-[#D6DAE3] dark:border-border focus:border-primary'}`}
                  placeholder={`Enter ${(() => {
                    const c = companyData.legalAddress.country;
                    return c === 'India' ? 'PIN Code' : c === 'United States' || c === 'USA' ? 'Zip Code' : c === 'United Kingdom' ? 'Postcode' : 'ZIP/Postal Code';
                  })()}`}
                />
                {errors?.zipCode && <p className="text-[11.5px] text-red-500 mt-1">{errors.zipCode}</p>}
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

        {companyData.legalAddress.country === 'Tanzania' && (
          <div id="sec-statutory" className="bg-[#FFFFFF] dark:bg-card border border-[#E6E8EE] dark:border-border rounded-[14px] overflow-visible shadow-[0_1px_2px_rgba(16,17,26,0.04)] hover:shadow-[0_4px_16px_rgba(16,17,26,0.06),_0_1px_2px_rgba(16,17,26,0.04)] transition-shadow duration-200 scroll-mt-[100px]">
            <div className="flex items-center gap-[11px] p-[16px_22px] border-b border-[#E6E8EE] dark:border-border">
              <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <h2 className="font-['Space_Grotesk'] text-[14.5px] font-semibold m-0 tracking-[0.005em] text-[#12131A] dark:text-foreground">Employer Statutory Registration</h2>
                <div className="text-[11.5px] text-[#9498A6] mt-[1px]">Required for TRA, NSSF, and WCF compliance reporting</div>
              </div>
            </div>
            <div className="p-[22px_22px]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="mb-0">
                  <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                    TRA TIN
                  </label>
                  <input
                    value={companyData.traTin}
                    onChange={(e) => !isReadOnly && setCompanyData((prev: any) => ({ ...prev, traTin: e.target.value }))}
                    readOnly={isReadOnly}
                    className="w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none hover:border-[#B9BFCC] focus:border-primary"
                    placeholder="e.g. 123456789"
                  />
                </div>
                <div className="mb-0">
                  <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                    NSSF Employer Number
                  </label>
                  <input
                    value={companyData.nssfEmployerNumber}
                    onChange={(e) => !isReadOnly && setCompanyData((prev: any) => ({ ...prev, nssfEmployerNumber: e.target.value }))}
                    readOnly={isReadOnly}
                    className="w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none hover:border-[#B9BFCC] focus:border-primary"
                    placeholder="e.g. NSSF-001234"
                  />
                </div>
                <div className="mb-0">
                  <label className="flex items-center gap-[5px] text-[12.5px] font-medium text-[#5B5F6E] dark:text-muted-foreground mb-[7px] tracking-[0.01em]">
                    WCF Employer Number
                  </label>
                  <input
                    value={companyData.wcfEmployerNumber}
                    onChange={(e) => !isReadOnly && setCompanyData((prev: any) => ({ ...prev, wcfEmployerNumber: e.target.value }))}
                    readOnly={isReadOnly}
                    className="w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] p-[10px_12px] transition-all outline-none hover:border-[#B9BFCC] focus:border-primary"
                    placeholder="e.g. WCF-001234"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
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
