const fs = require('fs');
const file = 'src/components/paytoll/PayrollCalculation.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\nimport { useCurrency } from '@/shared/hooks/useCurrency';");

c = c.replace(/export function PayrollCalculation\(\) \{/, 'export function PayrollCalculation() {\n  const { currencySymbol, isTanzania, formatCurrency } = useCurrency();');

c = c.replace(/`₹\$\{/g, '`${currencySymbol}${');
c = c.replace(/₹\$\{/g, '${currencySymbol}${');
c = c.replace(/>₹\{/g, '>{currencySymbol}{');
c = c.replace(/\(₹\)/g, '({currencySymbol})');
c = c.replace(/>₹</g, '>{currencySymbol}<');
c = c.replace(/₹\{/g, '{currencySymbol}{');
c = c.replace(/₹(\d)/g, '{currencySymbol}$1');
c = c.replace(/`₹/g, '`${currencySymbol}');

fs.writeFileSync(file, c);
console.log('Fixed PayrollCalculation');
