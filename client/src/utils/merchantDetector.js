/**
 * Smart Merchant & Category Detection for Frontend
 * Provides real-time suggestions and auto-categorization as the user types.
 */

const KNOWN_MERCHANTS = [
  // Food & Dining
  { keywords: ['swiggy', 'bundl'], payee: 'Swiggy', category: 'Food' },
  { keywords: ['zomato', 'foodpanda'], payee: 'Zomato', category: 'Food' },
  { keywords: ['dominos', 'pizza'], payee: 'Domino\'s Pizza', category: 'Food' },
  { keywords: ['mcdonald', 'mcd'], payee: 'McDonald\'s', category: 'Food' },
  { keywords: ['kfc'], payee: 'KFC', category: 'Food' },
  { keywords: ['burger king'], payee: 'Burger King', category: 'Food' },
  { keywords: ['starbucks', 'cafe coffee day', 'ccd'], payee: 'Starbucks', category: 'Food' },

  // Groceries & Quick Commerce
  { keywords: ['blinkit', 'grofers'], payee: 'Blinkit', category: 'Food' },
  { keywords: ['zepto'], payee: 'Zepto', category: 'Food' },
  { keywords: ['instamart'], payee: 'Instamart', category: 'Food' },
  { keywords: ['bigbasket', 'bb daily'], payee: 'BigBasket', category: 'Food' },
  { keywords: ['dmart', 'supermarket', 'grocery'], payee: 'DMart', category: 'Food' },

  // Shopping & E-Commerce
  { keywords: ['amazon', 'amzn'], payee: 'Amazon', category: 'Shopping' },
  { keywords: ['flipkart', 'fkmp'], payee: 'Flipkart', category: 'Shopping' },
  { keywords: ['myntra'], payee: 'Myntra', category: 'Shopping' },
  { keywords: ['ajio'], payee: 'Ajio', category: 'Shopping' },
  { keywords: ['meesho'], payee: 'Meesho', category: 'Shopping' },
  { keywords: ['nykaa'], payee: 'Nykaa', category: 'Shopping' },

  // Transportation & Travel
  { keywords: ['uber'], payee: 'Uber', category: 'Transport' },
  { keywords: ['ola'], payee: 'Ola', category: 'Transport' },
  { keywords: ['rapido'], payee: 'Rapido', category: 'Transport' },
  { keywords: ['petrol', 'fuel', 'indian oil', 'iocl', 'hpcl', 'bpcl', 'shell'], payee: 'Fuel Station', category: 'Transport' },
  { keywords: ['irctc', 'railway', 'train', 'flight', 'indigo', 'air india'], payee: 'Travel Booking', category: 'Transport' },

  // Bills, Subscriptions & Entertainment
  { keywords: ['netflix'], payee: 'Netflix', category: 'Entertainment' },
  { keywords: ['spotify'], payee: 'Spotify', category: 'Entertainment' },
  { keywords: ['hotstar', 'disney'], payee: 'Disney+ Hotstar', category: 'Entertainment' },
  { keywords: ['prime video', 'prime'], payee: 'Amazon Prime', category: 'Entertainment' },
  { keywords: ['youtube', 'yt premium'], payee: 'YouTube Premium', category: 'Entertainment' },
  { keywords: ['bookmyshow', 'cinema', 'pvr', 'inox'], payee: 'BookMyShow', category: 'Entertainment' },
  { keywords: ['airtel', 'jio', 'vi', 'vodafone', 'wifi', 'broadband', 'electricity', 'bescom', 'water bill'], payee: 'Utility Bill', category: 'Other' },

  // Health & Fitness
  { keywords: ['gym', 'cult.fit', 'cultfit', 'apollo', 'pharmacy', '1mg', 'pharmeasy', 'medplus'], payee: 'Health & Pharmacy', category: 'Health' },

  // Income
  { keywords: ['salary', 'payroll', 'stipend'], payee: 'Employer Salary', category: 'Salary', type: 'income' },
  { keywords: ['freelance', 'client payment', 'upwork', 'fiverr'], payee: 'Freelance Client', category: 'Freelance', type: 'income' },
];

export function detectMerchant(input) {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (raw.length < 2) return null;

  // 1. Check for raw UPI strings: UPI/DR/123/MERCHANT_NAME/PAYTM
  const upiMatch = raw.match(/UPI\/(?:DR|CR)\/\d+\/([^/]+)\//i);
  if (upiMatch && upiMatch[1]) {
    let cleanName = upiMatch[1].replace(/_/g, ' ').trim();
    cleanName = cleanName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    
    // Check if the extracted UPI name matches any known merchant
    const lowerClean = cleanName.toLowerCase();
    for (const m of KNOWN_MERCHANTS) {
      if (m.keywords.some(k => lowerClean.includes(k))) {
        return { payee: m.payee, category: m.category, type: m.type };
      }
    }
    return { payee: cleanName, category: 'Other' };
  }

  // 2. Keyword check
  const lower = raw.toLowerCase();
  for (const m of KNOWN_MERCHANTS) {
    if (m.keywords.some(k => lower.includes(k))) {
      return { payee: m.payee, category: m.category, type: m.type };
    }
  }

  return null;
}
