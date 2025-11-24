export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  color: string;
  taxDeductible: boolean;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: 'mileage',
    name: 'Mileage',
    description: 'Business travel and vehicle expenses',
    icon: 'car',
    color: '#3B82F6',
    taxDeductible: true,
  },
  {
    id: 'supplies',
    name: 'Supplies',
    description: 'Office supplies, materials, and equipment',
    icon: 'briefcase',
    color: '#8B5CF6',
    taxDeductible: true,
  },
  {
    id: 'meals',
    name: 'Meals & Entertainment',
    description: 'Business meals and client entertainment',
    icon: 'restaurant',
    color: '#F59E0B',
    taxDeductible: true,
  },
  {
    id: 'home_office',
    name: 'Home Office',
    description: 'Rent, utilities, internet for home workspace',
    icon: 'home',
    color: '#10B981',
    taxDeductible: true,
  },
  {
    id: 'professional_services',
    name: 'Professional Services',
    description: 'Legal, accounting, consulting fees',
    icon: 'document-text',
    color: '#6366F1',
    taxDeductible: true,
  },
  {
    id: 'software',
    name: 'Software & Subscriptions',
    description: 'Business software, tools, and subscriptions',
    icon: 'laptop',
    color: '#EC4899',
    taxDeductible: true,
  },
  {
    id: 'marketing',
    name: 'Marketing & Advertising',
    description: 'Ads, promotions, and marketing expenses',
    icon: 'megaphone',
    color: '#EF4444',
    taxDeductible: true,
  },
  {
    id: 'training',
    name: 'Training & Education',
    description: 'Courses, books, and professional development',
    icon: 'school',
    color: '#14B8A6',
    taxDeductible: true,
  },
  {
    id: 'insurance',
    name: 'Insurance',
    description: 'Business insurance premiums',
    icon: 'shield-checkmark',
    color: '#06B6D4',
    taxDeductible: true,
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Non-business, personal expenses',
    icon: 'person',
    color: '#94A3B8',
    taxDeductible: false,
  },
  {
    id: 'uncategorized',
    name: 'Uncategorized',
    description: 'Needs review',
    icon: 'help-circle',
    color: '#64748B',
    taxDeductible: false,
  },
];

export const getCategoryById = (id: string): ExpenseCategory | undefined => {
  return EXPENSE_CATEGORIES.find(cat => cat.id === id);
};

export const getTaxDeductibleCategories = (): ExpenseCategory[] => {
  return EXPENSE_CATEGORIES.filter(cat => cat.taxDeductible);
};
