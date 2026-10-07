/**
 * Smart UPI & Bank Statement Payee Cleaner & Auto-Categorizer
 * Specially designed for Indian Bank Statements (SBI UPI, ATM, Cash, Charges).
 */

const ALLOWED_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Salary',
  'Freelance',
  'Interest',
  'Bank Charges',
  'Insurance',
  'Cash',
  'Refund',
  'Transfers',
  'Recharge',
  'Groceries',
  'Education',
  'Other',
];

const TOP_30_RULES = [
  { pattern: 'ARULPRAS', display_name: 'Arulpras', category: 'Transfers' },
  { pattern: 'JAI STORES', display_name: 'Jai Stores', category: 'Groceries' },
  { pattern: 'VIJAYALA', display_name: 'Vijayala', category: 'Transfers' },
  { pattern: 'VARADHAR', display_name: 'Varadhar', category: 'Food' },
  { pattern: 'DEEPAK', display_name: 'Deepak', category: 'Transfers' },
  { pattern: 'VASANTH', display_name: 'Vasanth', category: 'Transfers' },
  { pattern: 'VENDOLIT', display_name: 'Vendolit', category: 'Food' },
  { pattern: 'ARUN V', display_name: 'Arun V', category: 'Transfers' },
  { pattern: 'K ANBAR', display_name: 'K Anbar', category: 'Transfers' },
  { pattern: 'PAZHAMUD', display_name: 'Pazhamudir Nilayam', category: 'Groceries' },
  { pattern: 'GOOGLE I', display_name: 'Google India', category: 'Entertainment' },
  { pattern: 'JEYAKUMA', display_name: 'Jeyakumar', category: 'Transfers' },
  { pattern: 'MAHADHEV', display_name: 'Mahadev Bakery', category: 'Food' },
  { pattern: 'OVEYA K A', display_name: 'Oveya K A', category: 'Transfers' },
  { pattern: 'SOMA PRA', display_name: 'Soma Prakash', category: 'Transfers' },
  { pattern: 'MR AKASH', display_name: 'Mr Akash', category: 'Transfers' },
  { pattern: 'ARUNVARS', display_name: 'Arunvarshan', category: 'Transfers' },
  { pattern: 'PARAMESW', display_name: 'Parameswaran', category: 'Transfers' },
  { pattern: 'JIO PREP', display_name: 'Jio Recharge', category: 'Recharge' },
  { pattern: 'BALAMURU', display_name: 'Balamurugan', category: 'Transfers' },
  { pattern: 'MADHAN M', display_name: 'Madhan M', category: 'Transfers' },
  { pattern: 'MADHAN', display_name: 'Madhan', category: 'Transfers' },
  { pattern: 'SOORYA G', display_name: 'Soorya G', category: 'Transfers' },
  { pattern: 'N M BAKERY', display_name: 'N M Bakery', category: 'Food' },
  { pattern: 'S B GIR', display_name: 'S B Gir', category: 'Transfers' },
  { pattern: 'MASTER K', display_name: 'Master Kitchen', category: 'Food' },
  { pattern: 'INTEREST CREDIT', display_name: 'SBI Interest', category: 'Interest' },
  { pattern: 'NPCI BHIM', display_name: 'NPCI BHIM', category: 'Transfers' },
  { pattern: 'RIOTA AGRO', display_name: 'Riota Agro Foods', category: 'Groceries' },
  { pattern: 'EURONETG', display_name: 'Euronet ATM', category: 'Bank Charges' },
  { pattern: 'PSG TECH', display_name: 'PSG College of Technology', category: 'Education' },
  { pattern: 'ZOMATO', display_name: 'Zomato', category: 'Food' },
  { pattern: 'SWIGGY', display_name: 'Swiggy', category: 'Food' },
  { pattern: 'BSNL BIL', display_name: 'BSNL Bill', category: 'Recharge' },
];

const MERCHANT_MAP = [
  // Food
  { keywords: ['SWIGGY', 'SWIGGY_FOOD', 'BUNDL TECHNOLOGIES'], payee: 'Swiggy', category: 'Food' },
  { keywords: ['ZOMATO', 'ZOMATO MEDIA', 'FOODPANDA'], payee: 'Zomato', category: 'Food' },
  { keywords: ['DOMINOS', 'JUBILANT FOODWORKS'], payee: "Domino's Pizza", category: 'Food' },
  { keywords: ['MCDONALDS', 'HARDCASTLE RESTAURANTS'], payee: "McDonald's", category: 'Food' },
  { keywords: ['STARBUCKS', 'TATA STARBUCKS'], payee: 'Starbucks', category: 'Food' },
  { keywords: ['KFC', 'DEVYANI INTERNATIONAL'], payee: 'KFC', category: 'Food' },
  { keywords: ['BURGER KING'], payee: 'Burger King', category: 'Food' },

  // Groceries
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
  { keywords: ['UBER', 'UBER INDIA'], payee: 'Uber', category: 'Transport' },
  { keywords: ['OLA', 'ANI TECHNOLOGIES'], payee: 'Ola Cabs', category: 'Transport' },
  { keywords: ['RAPIDO', 'ROPPEN TRANSPORT'], payee: 'Rapido', category: 'Transport' },
  { keywords: ['INDIAN OIL', 'IOCL'], payee: 'Indian Oil Fuel', category: 'Transport' },
  { keywords: ['BHARAT PETROLEUM', 'BPCL'], payee: 'Bharat Petroleum', category: 'Transport' },
  { keywords: ['HINDUSTAN PETROLEUM', 'HPCL'], payee: 'HP Fuel Station', category: 'Transport' },
  { keywords: ['SHELL'], payee: 'Shell Fuel', category: 'Transport' },

  // Recharge & Bills
  { keywords: ['JIO PREP', 'JIO RECHARGE'], payee: 'Jio Recharge', category: 'Recharge' },
  { keywords: ['BSNL BIL'], payee: 'BSNL Bill', category: 'Recharge' },
  { keywords: ['AIRTEL', 'BHARTI AIRTEL'], payee: 'Airtel Bill', category: 'Recharge' },
  { keywords: ['CRED', 'DREAMPLUG'], payee: 'CRED Bill Pay', category: 'Other' },
  { keywords: ['BESCOM', 'MSEDCL', 'TATA POWER', 'ELECTRICITY'], payee: 'Electricity Bill', category: 'Other' },

  // Entertainment
  { keywords: ['NETFLIX'], payee: 'Netflix', category: 'Entertainment' },
  { keywords: ['SPOTIFY'], payee: 'Spotify', category: 'Entertainment' },
  { keywords: ['HOTSTAR', 'DISNEY HOTSTAR', 'NOVI DIGITAL'], payee: 'Disney+ Hotstar', category: 'Entertainment' },
  { keywords: ['BOOKMYSHOW', 'BIGTREE'], payee: 'BookMyShow', category: 'Entertainment' },
  { keywords: ['STEAM', 'VALVE'], payee: 'Steam Games', category: 'Entertainment' },
  { keywords: ['SAAVN', 'JIOSAAVN'], payee: 'JioSaavn', category: 'Entertainment' },
  { keywords: ['GOOGLE I', 'GOOGLE INDIA'], payee: 'Google India', category: 'Entertainment' },

  // Education & Healthcare
  { keywords: ['PSG COLLEGE OF TECHNOL', 'PSG TECH'], payee: 'PSG College of Technology', category: 'Education' },
  { keywords: ['PSG INSTITUTE OF MEDIC', 'PSG HOSPITALS'], payee: 'PSG Institute of Medical Sciences', category: 'Health' },

  // Income / Salary
  { keywords: ['SALARY', 'PAYROLL', 'NEFT SALARY'], payee: 'Employer Salary', category: 'Salary', type: 'income' },
];

/**
 * Normalizes description: removes line breaks, collapses multiple spaces, and strips CIF digits.
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
      category: existingCategory && existingCategory !== 'General' ? existingCategory : 'Other',
      cleanDescription: '',
      type: defaultType || 'expense',
      mode: 'Other',
    };
  }

  const upper = cleanDescription.toUpperCase();

  // 1. Custom User Rules & Top 30 Rules (highest priority)
  const allRules = [...(Array.isArray(customRules) ? customRules : []), ...TOP_30_RULES];
  for (const rule of allRules) {
    if (rule.pattern && upper.includes(rule.pattern.toUpperCase())) {
      const cat = rule.category === 'Food & Dining' ? 'Food' : (rule.category === 'General' ? 'Other' : rule.category);
      return {
        payee: rule.display_name.replace(/\s+/g, ' ').trim(),
        category: cat || (existingCategory && existingCategory !== 'General' ? existingCategory : 'Other'),
        cleanDescription,
        type: defaultType || (upper.includes('/CR/') ? 'income' : 'expense'),
        mode: upper.includes('UPI') ? 'UPI' : 'Other',
      };
    }
  }

  // 2. UPI Lite transactions
  if (upper.includes('UPILITE') || upper.includes('UPILIT E')) {
    const isDebit = upper.includes('/DR/') || defaultType === 'expense';
    return {
      payee: 'UPI Lite',
      category: existingCategory && existingCategory !== 'General' && existingCategory !== 'Other' ? existingCategory : 'Other',
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
      payee: merchant.replace(/\s+/g, ' ').trim(),
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
          payee: m.payee.replace(/\s+/g, ' ').trim(),
          category: m.category,
          cleanDescription,
          type: 'expense',
          mode: 'Card',
        };
      }
    }
    return {
      payee: 'Card Merchant',
      category: existingCategory && existingCategory !== 'General' ? existingCategory : 'Other',
      cleanDescription,
      type: 'expense',
      mode: 'Card',
    };
  }

  // 10. Known Merchant Catalog
  for (const m of MERCHANT_MAP) {
    if (m.keywords.some(kw => upper.includes(kw))) {
      return {
        payee: m.payee.replace(/\s+/g, ' ').trim(),
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
    let rawPayee = upiMatch[1].replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    rawPayee = rawPayee.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const isDebit = upper.includes('/DR/') || defaultType === 'expense';
    return {
      payee: rawPayee,
      category: existingCategory && existingCategory !== 'General' && existingCategory !== 'Other' ? existingCategory : 'Other',
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
      category: existingCategory && existingCategory !== 'General' && existingCategory !== 'Other' ? existingCategory : 'Other',
      cleanDescription,
      type: defaultType || (isDebit ? 'expense' : 'income'),
      mode: 'UPI',
    };
  }

  // 13. General Fallback
  return {
    payee: 'Bank Transaction',
    category: existingCategory && existingCategory !== 'General' ? existingCategory : 'Other',
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
  TOP_30_RULES,
  ALLOWED_CATEGORIES,
};
