/**
 * Smart UPI & Bank Statement Payee Cleaner & Auto-Categorizer
 * Parses raw transaction strings and normalizes merchant names & categories.
 */

const MERCHANT_MAP = [
  // Food & Dining
  { keywords: ['SWIGGY', 'SWIGGY_FOOD', 'BUNDL TECHNOLOGIES'], payee: 'Swiggy', category: 'Food & Dining' },
  { keywords: ['ZOMATO', 'ZOMATO MEDIA', 'FOODPANDA'], payee: 'Zomato', category: 'Food & Dining' },
  { keywords: ['DOMINOS', 'JUBILANT FOODWORKS'], payee: 'Domino\'s Pizza', category: 'Food & Dining' },
  { keywords: ['MCDONALDS', 'HARDCASTLE RESTAURANTS'], payee: 'McDonald\'s', category: 'Food & Dining' },
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

  // Bills & Subscriptions & Entertainment
  { keywords: ['CRED', 'DREAMPLUG'], payee: 'CRED Bill Pay', category: 'Bills & Utilities' },
  { keywords: ['AIRTEL', 'BHARTI AIRTEL'], payee: 'Airtel Bill', category: 'Bills & Utilities' },
  { keywords: ['JIO', 'RELIANCE JIO'], payee: 'Jio Recharge', category: 'Bills & Utilities' },
  { keywords: ['BESCOM', 'MSEDCL', 'TATA POWER', 'ELECTRICITY'], payee: 'Electricity Bill', category: 'Bills & Utilities' },
  { keywords: ['NETFLIX'], payee: 'Netflix', category: 'Entertainment' },
  { keywords: ['SPOTIFY'], payee: 'Spotify', category: 'Entertainment' },
  { keywords: ['HOTSTAR', 'DISNEY HOTSTAR', 'NOVI DIGITAL'], payee: 'Disney+ Hotstar', category: 'Entertainment' },
  { keywords: ['BOOKMYSHOW', 'BIGTREE'], payee: 'BookMyShow', category: 'Entertainment' },
  { keywords: ['STEAM', 'VALVE'], payee: 'Steam Games', category: 'Entertainment' },

  // Income / Salary
  { keywords: ['SALARY', 'PAYROLL', 'NEFT SALARY'], payee: 'Employer Salary', category: 'Salary', type: 'income' },
];

/**
 * Cleans a raw transaction description or UPI string into clean payee & category.
 * @param {string} rawDescription 
 * @param {string} [existingCategory]
 * @returns {{ payee: string, category: string, cleanDescription: string, type?: string }}
 */
function cleanPayeeAndCategory(rawDescription, existingCategory) {
  if (!rawDescription || typeof rawDescription !== 'string') {
    return { payee: 'Other Merchant', category: existingCategory || 'Other', cleanDescription: '' };
  }

  const upperStr = rawDescription.toUpperCase();

  // 1. Check against Merchant Mapping rules
  for (const entry of MERCHANT_MAP) {
    if (entry.keywords.some(kw => upperStr.includes(kw))) {
      return {
        payee: entry.payee,
        category: entry.category,
        cleanDescription: rawDescription.trim(),
        type: entry.type,
      };
    }
  }

  // 2. Extract UPI payee patterns: e.g., UPI/DR/4291048/SWIGGY_FOOD/PAYTM -> SWIGGY_FOOD
  const upiMatch = rawDescription.match(/UPI\/(?:DR|CR)\/\d+\/([^/]+)\//i);
  if (upiMatch && upiMatch[1]) {
    let extracted = upiMatch[1].replace(/_/g, ' ').trim();
    // Capitalize words cleanly
    extracted = extracted.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    return {
      payee: extracted,
      category: existingCategory && existingCategory !== 'Other' ? existingCategory : 'General Expenses',
      cleanDescription: rawDescription.trim(),
    };
  }

  // 3. Fallback cleanup: remove POS/ACH prefixes and extraneous spaces
  let cleaned = rawDescription
    .replace(/^(POS|ACH|NEFT|IMPS|UPI)\s*/i, '')
    .replace(/\/\d+.*$/, '')
    .trim();

  cleaned = cleaned ? cleaned.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : 'Other Merchant';

  return {
    payee: cleaned,
    category: existingCategory || 'Other',
    cleanDescription: rawDescription.trim(),
  };
}

module.exports = {
  cleanPayeeAndCategory,
  MERCHANT_MAP,
};
