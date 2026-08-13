const fs = require('fs');

function fixFile(file, componentName) {
    if (!fs.existsSync(file)) {
        console.error('File not found: ' + file);
        return;
    }
    let content = fs.readFileSync(file, 'utf8');

    // Add import if not present
    if (!content.includes('useCurrency')) {
        content = content.replace('import React', 'import { useCurrency } from "@/shared/hooks/useCurrency";\nimport React');
    }

    // Inject hook into the specific component function
    const regex = new RegExp('(export function ' + componentName + '\\s*\\([^)]*\\)\\s*\\{)\\s*');
    content = content.replace(regex, '$1\n  const { currencySymbol, isTanzania, formatCurrency } = useCurrency();\n  ');

    // Replace ₹ with appropriate syntax
    content = content.replace(/`₹\$\{/g, '`${currencySymbol}${');
    content = content.replace(/₹\$\{/g, '${currencySymbol}${');
    content = content.replace(/>₹\{/g, '>{currencySymbol}{');
    content = content.replace(/\(₹\)/g, '({currencySymbol})');
    content = content.replace(/>₹</g, '>{currencySymbol}<');
    content = content.replace(/₹\{/g, '{currencySymbol}{');
    content = content.replace(/₹(\d)/g, '{currencySymbol}$1');
    content = content.replace(/`₹/g, '`${currencySymbol}');

    fs.writeFileSync(file, content);
    console.log('Fixed ' + file);
}

fixFile('src/features/payroll/components/LoansAndAdvancesSetup.tsx', 'LoansAndAdvancesSetup');
fixFile('src/components/paytoll/PayrollCalculation.tsx', 'PayrollCalculation');
