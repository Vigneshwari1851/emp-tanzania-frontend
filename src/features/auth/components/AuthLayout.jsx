import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import mobbg from "@/assets/login/mobbg.png";
import loginImage from "@/assets/login/Login.svg";
import loginDarkImage from "@/assets/login/LoginDark.svg";
import { useTheme } from "@/shared/hooks/useTheme";
import { useTheme as useThemeContext } from "@/shared/context/ThemeContext";
import logoSmall from "@/assets/common/logo-small.png";
import { getOrganizationBySlug } from "@/features/auth/services/auth";

const autofillStyles = `
  @media (max-width: 1023px) {
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-text-fill-color: #000000 !important;
      -webkit-box-shadow: 0 0 0 30px white inset !important;
      box-shadow: 0 0 0 30px white inset !important;
    }
  }
  @media (min-width: 1024px) {
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-text-fill-color: #000000 !important;
      -webkit-box-shadow: 0 0 0 30px white inset !important;
      box-shadow: 0 0 0 30px white inset !important;
    }
  }
`;

// FIX: Added missing return statement and removed stray </> fragment closing tag.
// Previously JSX had no return, causing "Adjacent JSX elements must be wrapped" compile error.
const AuthLayout = ({ children, logoUrl, entityName }) => {
  const theme = useTheme();
  const { resolvedTheme } = useThemeContext();
  const { orgSlug } = useParams();
  const [localOrg, setLocalOrg] = useState(null);

  useEffect(() => {
    if (orgSlug) {
      getOrganizationBySlug(orgSlug)
        .then((res) => {
          if (res.success && res.data) {
            setLocalOrg(res.data);
            if (res.data.logo_url) {
              localStorage.setItem('cached_company_logo', res.data.logo_url);
            }
            if (res.data.entity_name) {
              localStorage.setItem('cached_company_name', res.data.entity_name);
            }
          }
        })
        .catch(() => {});
    }
  }, [orgSlug]);

  const leftImage = resolvedTheme === "dark" ? loginDarkImage : loginImage;
  const textColorClass = resolvedTheme === "dark" ? "text-[#ffffff]" : "text-[#000000]";

  const uploadedLogo = orgSlug ? (logoUrl || localOrg?.logo_url || localStorage.getItem('cached_company_logo') || window.temp_company_logo) : null;
  const displayName = orgSlug ? (entityName || localOrg?.entity_name || localStorage.getItem('cached_company_name') || "") : "";

  return (
    <div className={`relative min-h-screen w-full flex items-center justify-center p-6 ${theme.fontFamily}`}>
      {/* FULLSCREEN BACKGROUND IMAGE */}
      <img
        src={leftImage}
        alt="Login Background"
        className="absolute inset-0 h-full w-full object-cover z-0"
      />

      {/* CONTENT & FORM CONTAINER OVERLAY */}
      <div className="relative z-20 w-full flex flex-col lg:flex-row items-center justify-between gap-12 h-full px-6 lg:pl-[80px] lg:pr-[80px]">
        {/* Left Side: Branding & Content */}
        <div className="flex flex-col items-start gap-6 max-w-xl text-left px-4 lg:py-12">

          <div className="space-y-2">
            {/* <div className="w-16 h-1.5 bg-blue-600 rounded-full"></div> */}
              {uploadedLogo && (
                <div className="flex items-center gap-2 mb-2" style={{ marginTop: '-30px' }}>
                  <img src={uploadedLogo} alt={`${displayName} Logo`} className="w-10 h-10 object-contain" />
                  <p className={`${textColorClass} text-[25px] font-extrabold leading-none`}>
                    {displayName}
                  </p>
                </div>
              )}
            <div className="flex flex-col">
              <p className={`${textColorClass} text-[55px] font-bold leading-[0.85]`}>
               Streamline your 
              </p>
              <p className={`${textColorClass} text-[55px] font-extrabold leading-[0.85] -mt-6`}>
                workflow
              </p>
            </div>
            <p className={`${textColorClass} text-[16px] max-w-[450px]`} style={{ marginTop: '20px' }}>
              Access your personalized dashboard, manage tools <br></br> and collaborate with your team all in one secure portal.
            </p>
          </div>
        </div>

        {/* Right Side: Form Container */}
        <div className="flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
