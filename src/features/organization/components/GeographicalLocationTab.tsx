import React, { useState, useRef, useEffect } from 'react';
import { MapPin, PlusCircle, Trash2, ChevronRight, Search, Check, Info, AlertTriangle, CheckCircle2, Globe, Lock } from 'lucide-react';
import { ConfirmationDialog } from "@/shared/components/ui/ConfirmationDialog";
import Select from "@/shared/components/ui/Select";
import SearchableSelect from "@/shared/components/ui/SearchableSelect";
import { capitalizeFirstLetter } from '@/shared/utils/stringUtils';



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

const countries = [
  "India", "United States", "United Kingdom", "United Arab Emirates",
  "Singapore", "Canada", "Australia", "Germany", "France",
  "Netherlands", "Saudi Arabia", "South Africa", "Japan",
  "China", "Brazil", "Mexico", "Italy", "Spain", "Malaysia", "Indonesia",
  "Israel", "Ireland", "New Zealand", "Tanzania", "Kenya", "Nigeria", "Other"
];

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

const COUNTRY_STATES_MAP: Record<string, string[]> = {
  "India": indianStates,
  "United States": usStates,
  "USA": usStates,
  "Tanzania": tanzaniaRegions,
};

const stateCities: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati", "Anantapur", "Kadapa", "Kakinada"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Coreba", "Rajnandgaon", "Jagdalpur", "Ambikapur"],
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
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Allahabad", "Bareilly", "Aligarh", "Moradabad"],
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

const getTaxLabelAndPlaceholder = (countryName: string) => {
  const country = (countryName || "").trim().toLowerCase();
  
  if (country === "india") {
    return {
      label: "GSTIN / Tax Number",
      placeholder: "e.g. 29AAAAA1111A1Z1"
    };
  }
  if (country === "united states" || country === "usa" || country === "us") {
    return {
      label: "EIN / Federal Tax ID",
      placeholder: "e.g. 12-3456789"
    };
  }
  if (country === "united kingdom" || country === "uk" || country === "gb") {
    return {
      label: "VAT Registration Number",
      placeholder: "e.g. GB123456789"
    };
  }
  if (country === "canada" || country === "ca") {
    return {
      label: "GST / Business Number (BN)",
      placeholder: "e.g. 123456789 RT0001"
    };
  }
  if (country === "australia" || country === "au") {
    return {
      label: "ABN / GST Number",
      placeholder: "e.g. 12 345 678 901"
    };
  }
  if (country === "singapore" || country === "sg") {
    return {
      label: "UEN / GST Number",
      placeholder: "e.g. 200123456G"
    };
  }
  if (country === "tanzania" || country === "tz") {
    return {
      label: "VRN / TIN Number",
      placeholder: "e.g. 10-123456-A"
    };
  }
  if (country === "germany" || country === "france" || country === "netherlands" || country === "italy" || country === "spain" || country === "ireland") {
    return {
      label: "VAT Registration Number",
      placeholder: "e.g. DE123456789"
    };
  }
  return {
    label: "Tax / VAT Registration Number",
    placeholder: "Enter tax registration number"
  };
};

const getTimeZoneOptions = (countryName: string) => {
  const country = (countryName || "").trim().toLowerCase();
  
  if (country === "india") {
    return [
      { value: "Asia/Kolkata", label: "India (IST)" }
    ];
  }
  if (country === "united states" || country === "usa" || country === "us") {
    return [
      { value: "America/New_York", label: "USA (Eastern)" },
      { value: "America/Chicago", label: "USA (Central)" },
      { value: "America/Denver", label: "USA (Mountain)" },
      { value: "America/Los_Angeles", label: "USA (Pacific)" }
    ];
  }
  if (country === "united kingdom" || country === "uk" || country === "gb") {
    return [
      { value: "Europe/London", label: "UK (GMT/BST)" }
    ];
  }
  if (country === "united arab emirates" || country === "uae") {
    return [
      { value: "Asia/Dubai", label: "Dubai (GST)" }
    ];
  }
  if (country === "tanzania" || country === "tz") {
    return [
      { value: "Africa/Dar_es_Salaam", label: "Tanzania (EAT)" }
    ];
  }
  if (country === "kenya" || country === "ke") {
    return [
      { value: "Africa/Nairobi", label: "Kenya (EAT)" }
    ];
  }
  if (country === "nigeria" || country === "ng") {
    return [
      { value: "Africa/Lagos", label: "Nigeria (WAT)" }
    ];
  }
  
  return [
    { value: "Asia/Kolkata", label: "India (IST)" },
    { value: "America/New_York", label: "USA (Eastern)" },
    { value: "Europe/London", label: "UK (GMT)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Africa/Dar_es_Salaam", label: "Tanzania (EAT)" },
    { value: "Africa/Nairobi", label: "Kenya (EAT)" },
    { value: "Africa/Lagos", label: "Nigeria (WAT)" }
  ];
};

export const GeographicalLocationTab = ({
  companyData,
  setCompanyData,
  updateField,
  isReadOnly,
  addLocation,
  updateLocation,
  removeLocation,
  errors,
  setErrors,
  legalEntityCountry
}: any) => {
  const [isRemoveLocationModalOpen, setIsRemoveLocationModalOpen] = useState(false);
  const [locationToRemove, setLocationToRemove] = useState<string | null>(null);
  const [activeLocationCountryDropdown, setActiveLocationCountryDropdown] = useState<string | null>(null);
  const [locCountrySearch, setLocCountrySearch] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let hasMismatches = false;
    const updatedLocations = companyData.locations.map((loc: any) => {
      if (loc.address?.country !== legalEntityCountry) {
        hasMismatches = true;
        return {
          ...loc,
          address: {
            ...loc.address,
            country: legalEntityCountry
          }
        };
      }
      return loc;
    });

    if (hasMismatches) {
      setCompanyData((prev: any) => ({
        ...prev,
        locations: updatedLocations
      }));
    }
  }, [legalEntityCountry, companyData.locations, setCompanyData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.location-country-wrapper')) {
        setActiveLocationCountryDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFieldChange = (locId: string, fieldName: string, value: any, nestedField?: string) => {
    if (isReadOnly) return;
    if (nestedField) {
      const currentLoc = companyData.locations.find((l: any) => String(l.id) === String(locId));
      updateLocation(locId, "address", {
        ...currentLoc?.address,
        [nestedField]: value
      });
    } else {
      updateLocation(locId, fieldName, value);
    }

    // Clear error
    if (errors && errors.locations && errors.locations[locId]) {
      const updatedLocErrors = { ...errors.locations[locId] };
      const errKey = nestedField || fieldName;
      delete updatedLocErrors[errKey];

      const newLocationsErrors = { ...errors.locations };
      if (Object.keys(updatedLocErrors).length === 0) {
        delete newLocationsErrors[locId];
      } else {
        newLocationsErrors[locId] = updatedLocErrors;
      }

      const newErrors = { ...errors };
      if (Object.keys(newLocationsErrors).length === 0) {
        delete newErrors.locations;
      } else {
        newErrors.locations = newLocationsErrors;
      }
      setErrors(newErrors);
    }
  };

  const handleAddressFieldsChange = (locId: string, updates: Record<string, any>) => {
    if (isReadOnly) return;
    const currentLoc = companyData.locations.find((l: any) => String(l.id) === String(locId));
    updateLocation(locId, "address", {
      ...currentLoc?.address,
      ...updates
    });

    // Clear error
    if (errors && errors.locations && errors.locations[locId]) {
      const updatedLocErrors = { ...errors.locations[locId] };
      Object.keys(updates).forEach(key => {
        delete updatedLocErrors[key];
      });

      const newLocationsErrors = { ...errors.locations };
      if (Object.keys(updatedLocErrors).length === 0) {
        delete newLocationsErrors[locId];
      } else {
        newLocationsErrors[locId] = updatedLocErrors;
      }

      const newErrors = { ...errors };
      if (Object.keys(newLocationsErrors).length === 0) {
        delete newErrors.locations;
      } else {
        newErrors.locations = newLocationsErrors;
      }
      setErrors(newErrors);
    }
  };

  const getInputClass = (locId: string, fieldName: string) => {
    return "w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13.5px] h-10 px-[12px] transition-all outline-none hover:border-[#B9BFCC] focus:border-primary";
  };

  const isLocationComplete = (loc: any) => {
    return !!(
      loc.locationName &&
      loc.locationCode &&
      loc.address?.street &&
      loc.address?.city &&
      loc.address?.country &&
      loc.timeZone
    );
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-8 items-start font-['Inter',sans-serif] geographical-location-tab">
      <style>{`
        .geographical-location-tab input,
        .geographical-location-tab .location-country-btn,
        .geographical-location-tab button[aria-haspopup="listbox"] {
          height: 44px !important;
        }
      `}</style>
      {/* Remove Location Confirmation */}
      <ConfirmationDialog
        isOpen={isRemoveLocationModalOpen}
        onClose={() => { setIsRemoveLocationModalOpen(false); setLocationToRemove(null); }}
        onConfirm={() => {
          if (locationToRemove) {
            removeLocation(locationToRemove);
          }
          setIsRemoveLocationModalOpen(false);
          setLocationToRemove(null);
        }}
        title="Remove Location"
        description="Are you sure you want to delete this location? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Main Content Column */}
      <div className="min-w-0">
        {/* Info Banner */}
        <div className="flex items-start gap-[10px] bg-[#E7F6FB] dark:bg-transparent border border-[#C8E9F2] dark:border-border rounded-[10px] p-[13px_16px] mb-6 text-[13.5px] text-[#0D6B87] dark:text-foreground leading-[1.5]">
          <Info className="w-4 h-4 flex-shrink-0 mt-[1px] text-[#1591B8] dark:text-foreground" />
          Add physical office locations for regional compliance, taxation, and employee assignment.
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-['Space_Grotesk'] text-[17px] font-semibold text-[#12131A] dark:text-foreground tracking-[-0.01em]">Office Locations</h2>
            <p className="text-[12px] text-[#9498A6] mt-[2px]">Manage physical operating addresses</p>
          </div>
          {/* Mobile Only Add Location Button */}
          {!isReadOnly && (
            <button
              onClick={addLocation}
              className="md:hidden flex items-center gap-[6px] text-[13px] font-semibold text-white bg-primary hover:bg-primary/80 p-[8px_14px] rounded-[7px] transition-all shadow-[0_2px_8px_rgba(84,87,229,0.25)]"
            >
              <PlusCircle className="w-[14px] h-[14px]" />
              Add Location
            </button>
          )}
        </div>

        {companyData.locations.length === 0 ? (
          <div className="text-center py-16 bg-[#FFFFFF] dark:bg-card rounded-[14px] border border-dashed border-[#D6DAE3] dark:border-border flex flex-col items-center justify-center">
            <div className="w-[50px] h-[50px] bg-[#F1F3F7] rounded-full flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6 text-[#9498A6]" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#12131A] dark:text-foreground mb-1">No locations added yet</h3>
            <p className="text-[12.5px] text-[#9498A6] max-w-[280px] mx-auto">Create your first physical operating address to begin assigning employees.</p>
            {/* Fallback button when empty on desktop */}
            {!isReadOnly && (
              <button
                onClick={addLocation}
                className="hidden md:flex items-center gap-[6px] text-[13px] font-semibold text-white bg-primary hover:bg-[#4548D4] p-[9px_16px] rounded-[7px] transition-all shadow-[0_2px_8px_rgba(84,87,229,0.25)] mt-4"
              >
                <PlusCircle className="w-[14px] h-[14px]" />
                Add First Location
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {companyData.locations.map((loc: any, index: number) => {
              const isComplete = isLocationComplete(loc);
              const taxDetails = getTaxLabelAndPlaceholder(loc.address?.country || companyData.legalAddress?.country || "");
              
              return (
                <div
                  key={loc.id}
                  id={`loc-${loc.id}`}
                  className="bg-[#FFFFFF] dark:bg-card border border-[#E6E8EE] dark:border-border rounded-[14px] overflow-visible shadow-[0_1px_2px_rgba(16,17,26,0.04)] hover:shadow-[0_4px_16px_rgba(16,17,26,0.06),_0_1px_2px_rgba(16,17,26,0.04)] transition-shadow duration-200 scroll-mt-[100px]"
                >
                  <div className="flex items-center justify-between gap-[12px] p-[14px_20px] border-b border-[#E6E8EE] dark:border-border bg-[#F9FAFB] dark:bg-transparent rounded-t-[14px]">
                    <div className="flex items-center gap-[10px] min-w-0">
                      <Globe className="h-5 w-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span className="font-['Space_Grotesk'] text-[14px] font-semibold text-[#12131A] dark:text-foreground truncate">
                        {index === companyData.locations.length - 1 ? "Headquarters" : (loc.locationName || "Office Location")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge isComplete={isComplete} label="Incomplete address" />
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => { setLocationToRemove(loc.id); setIsRemoveLocationModalOpen(true); }}
                          className="w-[30px] h-[30px] rounded-[7px] border border-[#E6E8EE] dark:border-border bg-[#FFFFFF] dark:bg-card text-[#9498A6] flex items-center justify-center hover:text-[#E14B5A] hover:bg-[#FDF2F3] dark:hover:bg-transparent hover:border-[#F3C8CC] dark:hover:border-red-800 transition-all"
                          title="Remove Location"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                      <div>
                        <label className="flex items-center gap-[4px] text-[12.5px] font-medium text-[#5B5F6E] mb-[6px]">
                          Location Name <span className="text-[#E14B5A]">*</span>
                        </label>
                        <input
                          id={`location-name-${loc.id}`}
                          type="text"
                          value={loc.locationName}
                          onChange={(e) =>
                            handleFieldChange(loc.id, "locationName", capitalizeFirstLetter(e.target.value))
                          }
                          readOnly={isReadOnly}
                          className={getInputClass(loc.id, "locationName")}
                          placeholder="e.g. Headquarters"
                        />
                        {errors?.locations?.[loc.id]?.locationName && (
                          <p className="text-[11.5px] text-[#E14B5A] mt-1">{errors.locations[loc.id].locationName}</p>
                        )}
                      </div>
                      <div>
                        <label className="flex items-center gap-[4px] text-[12.5px] font-medium text-[#5B5F6E] mb-[6px]">
                          Location Code <span className="text-[#E14B5A]">*</span>
                        </label>
                        <input
                          type="text"
                          value={loc.locationCode}
                          onChange={(e) =>
                            handleFieldChange(loc.id, "locationCode", e.target.value.toUpperCase())
                          }
                          readOnly={isReadOnly}
                          className={getInputClass(loc.id, "locationCode")}
                          placeholder="e.g. HQ-01"
                        />
                        {errors?.locations?.[loc.id]?.locationCode && (
                          <p className="text-[11.5px] text-[#E14B5A] mt-1">{errors.locations[loc.id].locationCode}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="flex items-center gap-[4px] text-[12.5px] font-medium text-[#5B5F6E] mb-[6px]">
                          Street Address <span className="text-[#E14B5A]">*</span>
                        </label>
                        <input
                          type="text"
                          value={loc.address.street}
                          onChange={(e) =>
                            handleFieldChange(loc.id, "address", capitalizeFirstLetter(e.target.value), "street")
                          }
                          readOnly={isReadOnly}
                          className={getInputClass(loc.id, "street")}
                          placeholder="Enter street address"
                        />
                        {errors?.locations?.[loc.id]?.street && (
                          <p className="text-[11.5px] text-[#E14B5A] mt-1">{errors.locations[loc.id].street}</p>
                        )}
                      </div>

                      <div className="relative">
                        <div className="flex items-center justify-between mb-[6px]">
                          <label className="flex items-center gap-[4px] text-[12.5px] font-medium text-[#5B5F6E] mb-0">
                            Country <span className="text-[#E14B5A]">*</span>
                          </label>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                            <Lock className="h-3 w-3" /> Linked to Legal Entity
                          </span>
                        </div>
                        <input
                          type="text"
                          value={legalEntityCountry || ""}
                          readOnly
                          className="w-full bg-gray-100 dark:bg-gray-800 border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#9498A6] dark:text-muted-foreground text-[13.5px] h-10 px-[12px] cursor-not-allowed outline-none"
                        />
                      </div>

                      <div>
                        {(() => {
                          const statesList = legalEntityCountry ? COUNTRY_STATES_MAP[legalEntityCountry] : null;
                          const showStateSelect = statesList && statesList.length > 0;

                          return (
                            <>
                              <label className="flex items-center gap-[4px] text-[12.5px] font-medium text-[#5B5F6E] mb-[6px]">
                                State/Province <span className="text-[#E14B5A]">*</span>
                              </label>
                              {showStateSelect ? (
                                <SearchableSelect
                                  value={loc.address.state}
                                  onChange={(val: string) => {
                                    if (isReadOnly) return;
                                    handleAddressFieldsChange(loc.id, { state: val, city: "" });
                                  }}
                                  placeholder="Select State"
                                  disabled={isReadOnly}
                                  options={statesList.map(state => ({ value: state, label: state }))}
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={loc.address.state}
                                  onChange={(e) =>
                                    handleAddressFieldsChange(loc.id, { state: capitalizeFirstLetter(e.target.value) })
                                  }
                                  readOnly={isReadOnly}
                                  className={getInputClass(loc.id, "state")}
                                  placeholder="Enter state/province"
                                />
                              )}
                              {errors?.locations?.[loc.id]?.state && (
                                <p className="text-[11.5px] text-[#E14B5A] mt-1">{errors.locations[loc.id].state}</p>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      <div>
                        {(() => {
                          const state = loc.address.state;
                          const citiesForState = state ? stateCities[state] : null;
                          const showCitySelect = citiesForState && citiesForState.length > 0;
                          
                          return (
                            <>
                              {showCitySelect ? (
                                <>
                                  <label className="flex items-center gap-[4px] text-[12.5px] font-medium text-[#5B5F6E] mb-[6px]">
                                    City <span className="text-[#E14B5A]">*</span>
                                  </label>
                                  <SearchableSelect
                                    value={loc.address.city}
                                    onChange={(val: string) => {
                                      handleFieldChange(loc.id, "address", val, "city");
                                    }}
                                    placeholder="Select City"
                                    disabled={isReadOnly}
                                    options={citiesForState.map(c => ({ value: c, label: c }))}
                                  />
                                  {errors?.locations?.[loc.id]?.city && (
                                    <p className="text-[11.5px] text-[#E14B5A] mt-1">{errors.locations[loc.id].city}</p>
                                  )}
                                </>
                              ) : (
                                <>
                                  <label className="flex items-center gap-[4px] text-[12.5px] font-medium text-[#5B5F6E] mb-[6px]">
                                    City <span className="text-[#E14B5A]">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={loc.address.city}
                                    onChange={(e) =>
                                      handleFieldChange(loc.id, "address", capitalizeFirstLetter(e.target.value), "city")
                                    }
                                    readOnly={isReadOnly}
                                    className={getInputClass(loc.id, "city")}
                                    placeholder="Enter city"
                                  />
                                  {errors?.locations?.[loc.id]?.city && (
                                    <p className="text-[11.5px] text-[#E14B5A] mt-1">{errors.locations[loc.id].city}</p>
                                  )}
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="flex items-center gap-[4px] text-[12.5px] font-medium text-[#5B5F6E] mb-[6px]">
                          Zip/Postal Code <span className="text-[#E14B5A]">*</span>
                        </label>
                        <input
                          type="text"
                          value={loc.address.zipCode}
                          onChange={(e) =>
                            handleAddressFieldsChange(loc.id, { zipCode: e.target.value })
                          }
                          readOnly={isReadOnly}
                          className={getInputClass(loc.id, "zipCode")}
                          placeholder="Enter zip code"
                        />
                        {errors?.locations?.[loc.id]?.zipCode && (
                          <p className="text-[11.5px] text-[#E14B5A] mt-1">{errors.locations[loc.id].zipCode}</p>
                        )}
                      </div>

                      <div>
                        <Select
                          value={loc.timeZone}
                          onChange={(val) => handleFieldChange(loc.id, "timeZone", val)}
                          label="Time Zone"
                          placeholder="Select Time Zone"
                          required
                          disabled={isReadOnly}
                          options={getTimeZoneOptions(loc.address?.country || legalEntityCountry || "")}
                        />
                        {errors?.locations?.[loc.id]?.timeZone && (
                          <p className="text-[11.5px] text-[#E14B5A] mt-1">{errors.locations[loc.id].timeZone}</p>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center gap-[4px] text-[12.5px] font-medium text-[#5B5F6E] mb-[6px]">
                          Tax Location/Establishment <span className="text-[#E14B5A]">*</span>
                        </label>
                        <input
                          type="text"
                          value={loc.taxLocation}
                          onChange={(e) =>
                            handleFieldChange(loc.id, "taxLocation", capitalizeFirstLetter(e.target.value))
                          }
                          readOnly={isReadOnly}
                          className={getInputClass(loc.id, "taxLocation")}
                          placeholder="Enter tax location"
                        />
                        {errors?.locations?.[loc.id]?.taxLocation && (
                          <p className="text-[11.5px] text-[#E14B5A] mt-1">{errors.locations[loc.id].taxLocation}</p>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center gap-[4px] text-[12.5px] font-medium text-[#5B5F6E] mb-[6px]">
                          {taxDetails.label}
                        </label>
                        <input
                          type="text"
                          value={loc.gst || ""}
                          onChange={(e) =>
                            handleFieldChange(loc.id, "gst", e.target.value.toUpperCase())
                          }
                          readOnly={isReadOnly}
                          className="w-full bg-[#FFFFFF] dark:bg-card border border-[#D6DAE3] dark:border-border rounded-[7px] text-[#12131A] dark:text-foreground text-[13px] font-['IBM_Plex_Mono',monospace] tracking-[0.02em] p-[10px_12px] transition-all outline-none hover:border-[#B9BFCC] focus:border-primary"
                          placeholder={taxDetails.placeholder}
                        />
                      </div>
                    </div>
                  </div>
                </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Locations Sticky Jump Rail / Side Panel */}
      {(companyData.locations.length > 0 || !isReadOnly) && (
        <div className="hidden md:block sticky top-[96px] w-[220px]">
          {companyData.locations.length > 0 && (
            <>
              <div className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#9498A6] mb-[12px] pl-[2px]">Locations</div>
              <div className="max-h-[350px] overflow-y-auto pr-1 space-y-[2px] mb-4">
                {companyData.locations.map((loc: any, index: number) => {
                  const name = index === companyData.locations.length - 1 ? "Headquarters" : (loc.locationName || "Office Location");
                  const isComplete = isLocationComplete(loc);
                  return (
                    <div
                      key={loc.id}
                      onClick={() => scrollToSection(`loc-${loc.id}`)}
                      className="flex items-center gap-[9px] p-[8px_10px] rounded-[7px] text-[12.5px] text-[#5B5F6E] dark:text-muted-foreground hover:bg-[#F1F3F7] dark:hover:bg-muted hover:text-[#12131A] dark:hover:text-foreground cursor-pointer transition-all"
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-[13px] h-[13px] stroke-[#0FA968] flex-shrink-0" />
                      ) : (
                        <div className="w-[6px] h-[6px] rounded-full bg-[#D6DAE3] dark:bg-border flex-shrink-0 ml-[3px] mr-[4px]"></div>
                      )}
                      <span className="truncate">{name}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {!isReadOnly && (
            <button
              onClick={addLocation}
              className="w-full flex items-center justify-center gap-[6px] text-[13px] font-semibold text-white bg-primary hover:bg-primary/80 p-[9px_16px] rounded-[7px] transition-all shadow-[0_2px_8px_rgba(84,87,229,0.25)] mt-2"
            >
              <PlusCircle className="w-[14px] h-[14px]" />
              Add Location
            </button>
          )}
        </div>
      )}
    </div>
  );
};