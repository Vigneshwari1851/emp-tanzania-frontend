import { useState, useEffect } from 'react';
import { getOrganizations } from '@/features/organization/services/organizations';

const currencyConfig: Record<string, { symbol: string; locale: string; code: string }> = {
  // Currency Codes
  INR: { symbol: '₹', locale: 'en-IN', code: 'INR' },
  TZS: { symbol: 'TZS', locale: 'en-TZ', code: 'TZS' },
  USD: { symbol: '$', locale: 'en-US', code: 'USD' },
  AED: { symbol: 'AED', locale: 'ar-AE', code: 'AED' },
  GBP: { symbol: '£', locale: 'en-GB', code: 'GBP' },
  SGD: { symbol: 'SGD', locale: 'en-SG', code: 'SGD' },
  CAD: { symbol: 'CAD', locale: 'en-CA', code: 'CAD' },
  AUD: { symbol: 'AUD', locale: 'en-AU', code: 'AUD' },
  EUR: { symbol: '€', locale: 'de-DE', code: 'EUR' },
  JPY: { symbol: '¥', locale: 'ja-JP', code: 'JPY' },
  BRL: { symbol: 'R$', locale: 'pt-BR', code: 'BRL' },
  ZAR: { symbol: 'R', locale: 'en-ZA', code: 'ZAR' },
  SAR: { symbol: 'SAR', locale: 'ar-SA', code: 'SAR' },

  // Countries (for backward compatibility / fallback)
  india: { symbol: '₹', locale: 'en-IN', code: 'INR' },
  tanzania: { symbol: 'TZS', locale: 'en-TZ', code: 'TZS' },
  usa: { symbol: '$', locale: 'en-US', code: 'USD' },
  'united states': { symbol: '$', locale: 'en-US', code: 'USD' },
  uae: { symbol: 'AED', locale: 'ar-AE', code: 'AED' },
  'united arab emirates': { symbol: 'AED', locale: 'ar-AE', code: 'AED' },
  uk: { symbol: '£', locale: 'en-GB', code: 'GBP' },
  'united kingdom': { symbol: '£', locale: 'en-GB', code: 'GBP' },
  singapore: { symbol: 'SGD', locale: 'en-SG', code: 'SGD' },
  canada: { symbol: 'CAD', locale: 'en-CA', code: 'CAD' },
  australia: { symbol: 'AUD', locale: 'en-AU', code: 'AUD' },
  germany: { symbol: '€', locale: 'de-DE', code: 'EUR' },
  france: { symbol: '€', locale: 'fr-FR', code: 'EUR' },
  netherlands: { symbol: '€', locale: 'nl-NL', code: 'EUR' },
  japan: { symbol: '¥', locale: 'ja-JP', code: 'JPY' },
  brazil: { symbol: 'R$', locale: 'pt-BR', code: 'BRL' },
  'south africa': { symbol: 'R', locale: 'en-ZA', code: 'ZAR' },
  'saudi arabia': { symbol: 'SAR', locale: 'ar-SA', code: 'SAR' },
};

export function useCurrency(orgCountryOverride?: string) {
    const [orgCountry, setOrgCountry] = useState<string>('');
    const [orgCurrencyCode, setOrgCurrencyCode] = useState<string>('');

    useEffect(() => {
        if (orgCountryOverride) {
            const override = orgCountryOverride.trim();
            // If it's a 3-letter currency code, or has brackets/parentheses like "INR (₹)", extract code
            const match = override.match(/^[A-Z]{3}/i) || override.match(/\(([A-Z]{3})\)/i);
            const extracted = match ? (match[1] || match[0]).toUpperCase() : override;
            
            if (extracted.length === 3) {
                setOrgCurrencyCode(extracted);
                setOrgCountry('');
            } else {
                setOrgCountry(extracted.toLowerCase());
                setOrgCurrencyCode('');
            }
            return;
        }

        const fetchOrg = () => {
            getOrganizations().then((orgRes: any) => {
                const org = Array.isArray(orgRes) ? orgRes[0] : orgRes?.data || orgRes;
                console.log('[useCurrency] org data:', org);
                if (org) {
                    if (org.currency) {
                        // Extract 3 letter currency code in case it's stored as e.g. "INR (₹)" or similar
                        const match = org.currency.trim().match(/^[A-Z]{3}/i);
                        setOrgCurrencyCode(match ? match[0].toUpperCase() : org.currency.toUpperCase());
                    }
                    if (org.country) {
                        setOrgCountry(org.country.toLowerCase());
                    }
                }
            }).catch((err) => {
                console.error('[useCurrency] failed to fetch org:', err);
            });
        };

        fetchOrg();

        // Listen for changes
        window.addEventListener('org-country-changed', fetchOrg);
        return () => {
            window.removeEventListener('org-country-changed', fetchOrg);
        };
    }, [orgCountryOverride]);

    // Resolve config
    let config = orgCurrencyCode ? currencyConfig[orgCurrencyCode] : undefined;
    if (!config && orgCountry) {
        config = currencyConfig[orgCountry];
    }
    if (!config) {
        config = { symbol: '$', locale: 'en-US', code: 'USD' };
    }

    const currencySymbol = config.symbol;
    const currencyCode = config.code;

    const resolvedCountry = orgCountry || '';
    const resolvedCurrency = orgCurrencyCode || '';
    const isTanzania = resolvedCountry.toLowerCase() === 'tanzania' || resolvedCurrency.toUpperCase() === 'TZS';
    const isIndia = resolvedCountry.toLowerCase() === 'india' || resolvedCurrency.toUpperCase() === 'INR';
    const isUSA = resolvedCountry.toLowerCase() === 'usa' || resolvedCountry.toLowerCase() === 'united states' || resolvedCurrency.toUpperCase() === 'USD';
    const isSingapore = resolvedCountry.toLowerCase() === 'singapore' || resolvedCurrency.toUpperCase() === 'SGD';
    const isUAE = resolvedCountry.toLowerCase() === 'uae' || resolvedCountry.toLowerCase() === 'united arab emirates' || resolvedCurrency.toUpperCase() === 'AED';

    const formatCurrency = (amount: number | string | undefined | null) => {
        if (amount === undefined || amount === null) return `${currencySymbol}0`;
        const num = Number(amount);
        if (isNaN(num)) return `${currencySymbol}0`;

        try {
            return `${currencySymbol}${num.toLocaleString(config.locale)}`;
        } catch {
            return `${currencySymbol}${num.toLocaleString('en-US')}`;
        }
    };

    const formatCurrencyAbbr = (amount: number | string | undefined | null, includeSymbol = true) => {
        if (amount === undefined || amount === null) return includeSymbol ? `${currencySymbol}0` : '0';
        const val = Number(amount);
        if (isNaN(val)) return includeSymbol ? `${currencySymbol}0` : '0';

        const sym = includeSymbol ? (isIndia ? '₹' : currencySymbol) : '';

        if (isIndia) {
            if (val >= 10000000) { // 1 Crore
                return `${sym}${(val / 10000000).toFixed(2)}Cr`;
            } else if (val >= 100000) { // 1 Lakh
                return `${sym}${(val / 100000).toFixed(2)}L`;
            } else if (val >= 1000) {
                return `${sym}${(val / 1000).toFixed(1)}K`;
            } else {
                return `${sym}${Math.round(val).toLocaleString('en-IN')}`;
            }
        } else {
            if (val >= 1000000) { // 1 Million
                return `${sym}${(val / 1000000).toFixed(2)}M`;
            } else if (val >= 1000) { // 1 Thousand
                return `${sym}${(val / 1000).toFixed(1)}K`;
            } else {
                return `${sym}${Math.round(val).toLocaleString()}`;
            }
        }
    };

    return { currencySymbol, currencyCode, formatCurrency, formatCurrencyAbbr, country: resolvedCountry, config, isTanzania, isIndia, isUSA, isSingapore, isUAE };
}