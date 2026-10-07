/**
 * Smart UPI & Bank Statement Payee Cleaner & Auto-Categorizer
 * Specially designed for Indian Bank Statements (SBI UPI, ATM, Cash, Charges).
 */

const MERCHANT_MAP = [
  // Food & Dining
  { keywords: ['SWIGGY', 'SWIGGY_FOOD', 'BUNDL TECHNOLOGIES'], payee: 'Swiggy', category: 'Food & Dining' },
  { keywords: ['ZOMATO', 'ZOMATO MEDIA', 'FOODPANDA'], payee: 'Zomato', category: 'Food & Dining' },
  { keywords: ['DOMINOS', 'JUBILANT FOODWORKS'], payee: "Domino's Pizza", category: 'Food & Dining' },
  { keywords: ['MCDONALDS', 'HARDCASTLE RESTAURANTS'], payee: "McDonald's", category: 'Food & Dining' },
  { keywords: ['STARBUCKS', 'TATA STARBUCKS'], payee: 'Starbucks', category: 'Food & Dining' },
  { keywords: ['KFC', 'DEVYANI INTERNATIONAL'], payee: 'KFC', category: 'Food & Dining' },
  { keywords: ['BURGER KING'], payee: 'Burger King', category: 'Food & Dining' },

  // Groceries & Quick Commerce
  { keywords: ['BLINKIT', 'GROFERS'], payee: 'Blinkit', category: 'Groceries' },
  { keywords: ['ZEPTO', 'KIRANAKART'], payee: 'Zepto', category: 'Groceries' },
  { keywords: ['INSTAMART', 'SWIGGY INSTAMART'], payee: 'Swiggy Instamart', category: 'Groceries' },
  { keywords: ['BIGBASKET', 'SUPERMARKET GROCERY'], payee: 'BigBasket', category: 'Groceries' },
  { keywords: ['DMART', 'AVENUE SUPERMARTS'], payee: 'DMart', category: 'Groceries' },

  // Shopping & E-Commerce
  { keywords: ['AMAZON', 'AMZN', 'AMAZON PAY'], payee: 'Amazon', category: 'Shopping' },
  { keywords: ['FLIPKART', 'FKMP'], payee: 'Flipkart', category: 'Shopping' },
  { keywords: ['MYNTRA'], payee: 'Myntra', category: 'Shopping' },
  { keywords: ['AJIO', 'RELIANCE RETAIL'], payee: 'Ajio', category: 'Shopping' },
  { keywords: ['MEESHO'], payee: 'Meesho', category: 'Shopping' },
  { keywords: ['NYKAA'], payee: 'Nykaa', category: 'Shopping' },

  // Transportation & Fuel
  { keywords: ['UBER', 'UBER INDIA'], payee: 'Uber', category: 'Transportation' },
  { keywords: ['OLA', 'ANI TECHNOLOGIES'], payee: 'Ola Cabs', category: 'Transportation' },
  { keywords: ['RAPIDO', 'ROPPEN TRANSPORT'], payee: 'Rapido', category: 'Transportation' },
  { keywords: ['INDIAN OIL', 'IOCL'], payee: 'Indian Oil Fuel', category: 'Fuel & Gas' },
  { keywords: ['BHARAT PETROLEUM', 'BPCL'], payee: 'Bharat Petroleum', category: 'Fuel & Gas' },
  { keywords: ['HINDUSTAN PETROLEUM', 'HPCL'], payee: 'HP Fuel Station', category: 'Fuel & Gas' },
  { keywords: ['SHELL'], payee: 'Shell Fuel', category: 'Fuel & Gas' },

  // Bills, Subscriptions & Entertainment
  { keywords: ['CRED', 'DREAMPLUG'], payee: 'CRED Bill Pay', category: 'Bills & Utilities' },
  { keywords: ['AIRTEL', 'BHARTI AIRTEL'], payee: 'Airtel Bill', category: 'Bills & Utilities' },
  { keywords: ['JIO', 'RELIANCE JIO'], payee: 'Jio Recharge', category: 'Bills & Utilities' },
  { keywords: ['BESCOM', 'MSEDCL', 'TATA POWER', 'ELECTRICITY'], payee: 'Electricity Bill', category: 'Bills & Utilities' },
  { keywords: ['NETFLIX'], payee: 'Netflix', category: 'Entertainment' },
  { keywords: ['SPOTIFY'], payee: 'Spotify', category: 'Entertainment' },
  { keywords: ['HOTSTAR', 'DISNEY HOTSTAR', 'NOVI DIGITAL'], payee: 'Disney+ Hotstar', category: 'Entertainment' },
  { keywords: ['BOOKMYSHOW', 'BIGTREE'], payee: 'BookMyShow', category: 'Entertainment' },
  { keywords: ['STEAM', 'VALVE'], payee: 'Steam Games', category: 'Entertainment' },
  { keywords: ['SAAVN', 'JIOSAAVN'], payee: 'JioSaavn', category: 'Entertainment' },

  // Education / College & Medical
  { keywords: ['PSG COLLEGE OF TECHNOL', 'PSG TECH'], payee: 'PSG College of Technology', category: 'Education' },
  { keywords: ['PSG INSTITUTE OF MEDIC', 'PSG HOSPITALS'], payee: 'PSG Institute of Medical Sciences', category: 'Healthcare' },

  // Income / Salary
  { keywords: ['SALARY', 'PAYROLL', 'NEFT SALARY'], payee: 'Employer Salary', category: 'Salary', type: 'income' },
];

/**
 * Normalizes description: removes line breaks, multiple spaces, and masks/removes CIF digits.
 */
function normalizeDescription(desc) {
  if (!desc || typeof desc !== 'string') return '';
  return desc
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/CIF:\s*\d+/gi, '')
    .trim();
}

/**
 * Computes deterministic deduplication key for transactions.
 */
function getDedupKey(date, amount, type, rawDesc) {
  const norm = normalizeDescription(rawDesc);
  const upiMatch = norm.match(/UPI\/(?:DR|CR|REF|REVERSAL)\/(\d+)/i);
  const upiRef = upiMatch ? upiMatch[1] : '';
  return `${date}|${amount}|${type}|${upiRef || norm}`;
}

/**
 * Cleans a raw transaction description into payee, category, type, and payment mode.
 * @param {string} rawDescription 
 * @param {string} [existingCategory]
 * @param {Array} [customRules=[]]
 * @param {string} [defaultType]
 * @returns {{ payee: string, category: string, cleanDescription: string, type: string, mode: string }}
 */
function cleanPayeeAndCategory(rawDescription, existingCategory, customRules = [], defaultType = null) {
  const cleanDescription = normalizeDescription(rawDescription);
  if (!cleanDescription) {
    return {
      payee: 'Other Merchant',
      category: existingCategory || 'Other',
      cleanDescription: '',
      type: defaultType || 'expense',
      mode: 'Other',
    };
  }

  const upper = cleanDescription.toUpperCase();

  // 1. Custom User Rules (highest priority)
  if (Array.isArray(customRules) && customRules.length > 0) {
    for (const rule of customRules) {
      if (rule.pattern && upper.includes(rule.pattern.toUpperCase())) {
        return {
          payee: rule.display_name,
          category: rule.category || existingCategory || 'Other',
          cleanDescription,
          type: defaultType || (upper.includes('/CR/') ? 'income' : 'expense'),
          mode: upper.includes('UPI') ? 'UPI' : 'Other',
        };
      }
    }
  }

  // 2. UPI Lite transactions
  if (upper.includes('UPILITE') || upper.includes('UPILIT E')) {
    const isDebit = upper.includes('/DR/') || defaultType === 'expense';
    return {
      payee: 'UPI Lite',
      category: existingCategory && existingCategory !== 'Other' ? existingCategory : 'General',
      cleanDescription,
      type: defaultType || (isDebit ? 'expense' : 'income'),
      mode: 'UPI',
    };
  }

  // 3. UPI Refund / Reversals
  if (upper.includes('UPI/REF/') || upper.includes('UPI/REVERSAL/') || upper.includes('/REFUND')) {
    let merchant = 'Refund';
    for (const m of MERCHANT_MAP) {
      if (m.keywords.some(kw => upper.includes(kw))) {
        merchant = `${m.payee} (Refund)`;
        break;
      }
    }
    return {
      payee: merchant,
      category: 'Refund',
      cleanDescription,
      type: 'income',
      mode: 'UPI',
    };
  }

  // 4. Bank Interest
  if (upper.includes('INTEREST CREDIT') || upper.includes('INTERES T CREDIT')) {
    return {
      payee: 'SBI Interest',
      category: 'Interest',
      cleanDescription,
      type: 'income',
      mode: 'Other',
    };
  }

  // 5. Cash Deposit (Self / CDM)
  if (upper.includes('CSH DEP') || upper.includes('CASH DEPOSIT')) {
    return {
      payee: 'Cash Deposit (Self/CDM)',
      category: 'Cash',
      cleanDescription,
      type: 'income',
      mode: 'Cash',
    };
  }

  // 6. ATM Cash Withdrawal
  if (upper.includes('ATM WDL') || upper.includes('ATM CASH')) {
    return {
      payee: 'ATM Cash Withdrawal',
      category: 'Cash',
      cleanDescription,
      type: 'expense',
      mode: 'Cash',
    };
  }

  // 7. Bank Charges & Card AMC
  if (upper.includes('CDM CHARGE') || upper.includes('CDM CH ARGE') || upper.includes('ATMCARD AMC')) {
    const isAmc = upper.includes('AMC');
    return {
      payee: isAmc ? 'SBI ATM Card AMC' : 'SBI CDM Charges',
      category: 'Bank Charges',
      cleanDescription,
      type: 'expense',
      mode: 'Other',
    };
  }

  // 8. Social Security / Government Insurance Schemes
  if (upper.includes('PMJJBY') || upper.includes('PMSBY')) {
    const isPmjjby = upper.includes('PMJJBY');
    return {
      payee: isPmjjby ? 'PMJJBY Life Insurance' : 'PMSBY Accident Insurance',
      category: 'Insurance',
      cleanDescription,
      type: 'expense',
      mode: 'Other',
    };
  }

  // 9. POS Card Purchases
  if (upper.startsWith('POS ATM PURCH') || upper.includes('POS ')) {
    for (const m of MERCHANT_MAP) {
      if (m.keywords.some(kw => upper.includes(kw))) {
        return {
          payee: m.payee,
          category: m.category,
          cleanDescription,
          type: 'expense',
          mode: 'Card',
        };
      }
    }
    return {
      payee: 'Card Merchant',
      category: existingCategory || 'General',
      cleanDescription,
      type: 'expense',
      mode: 'Card',
    };
  }

  // 10. Known Merchant Catalog
  for (const m of MERCHANT_MAP) {
    if (m.keywords.some(kw => upper.includes(kw))) {
      return {
        payee: m.payee,
        category: m.category,
        cleanDescription,
        type: m.type || defaultType || 'expense',
        mode: upper.includes('UPI') ? 'UPI' : 'Other',
      };
    }
  }

  // 11. Standard UPI extraction: UPI/DR/<ref>/<payee>/<bank>/... or UPI/CR/...
  const upiMatch = cleanDescription.match(/UPI\/(?:DR|CR)\/\d+\/([^\/]+)\//i);
  if (upiMatch && upiMatch[1]) {
    let rawPayee = upiMatch[1].replace(/_/g, ' ').trim();
    // Title Case
    rawPayee = rawPayee.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const isDebit = upper.includes('/DR/') || defaultType === 'expense';
    return {
      payee: rawPayee,
      category: existingCategory && existingCategory !== 'Other' ? existingCategory : 'General',
      cleanDescription,
      type: defaultType || (isDebit ? 'expense' : 'income'),
      mode: 'UPI',
    };
  }

  // 12. Fallback for UPI without standard pattern
  if (upper.includes('UPI/')) {
    const isDebit = upper.includes('/DR/') || defaultType === 'expense';
    return {
      payee: 'UPI Transfer',
      category: existingCategory || 'General',
      cleanDescription,
      type: defaultType || (isDebit ? 'expense' : 'income'),
      mode: 'UPI',
    };
  }

  // 13. General Fallback
  return {
    payee: 'Bank Transaction',
    category: existingCategory || 'Other',
    cleanDescription,
    type: defaultType || 'expense',
    mode: 'Other',
  };
}

module.exports = {
  cleanPayeeAndCategory,
  normalizeDescription,
  getDedupKey,
  MERCHANT_MAP,
};
