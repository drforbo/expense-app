import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { supabase } from '../../lib/supabase';
import { API_URL } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Required for web browser redirect
WebBrowser.maybeCompleteAuthSession();
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Feature flag - set to true when Gmail OAuth is verified by Google
const GMAIL_INTEGRATION_ENABLED = false;

interface EmailConnection {
  provider: string;
  email: string;
  connected_at: string;
  is_active: boolean;
}

type ActiveTab = 'profile' | 'checklist';

interface UserProfile {
  work_type: string;
  custom_work_type?: string;
  monthly_income: number;
  receives_gifted_items: boolean;
  has_international_income: boolean;
  tracking_goal: string;
  has_other_employment: boolean;
  employment_income?: number;
  student_loan_plan: string;
  works_from_home?: boolean;
  home_office_percentage?: number;
  uses_vehicle_for_work?: boolean;
  vehicle_business_percentage?: number;
  profile_completed: boolean;
  // Tax residency fields
  tax_residency_country?: string;
  is_digital_nomad?: boolean;
  foreign_income_countries?: string[];
  // UK tax region (different income tax bands)
  tax_region?: string;
}

type WorkFromHomeOption = 'always' | 'mostly' | 'sometimes' | 'rarely' | 'never' | null;
type VehicleUseOption = 'daily' | 'weekly' | 'monthly' | 'rarely' | 'never' | null;

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'registration' | 'tracking' | 'deadline' | 'preparation';
  completed: boolean;
  relevantTo: string[];
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

interface TrackingStats {
  uncategorizedCount: number;
  categorizedIncomeCount: number;
  categorizedExpenseCount: number;
  unqualifiedExpenseCount: number;
  giftedItemsCount: number;
  totalTransactions: number;
}

const CATEGORY_COLORS = {
  registration: colors.ink,
  tracking: colors.tagBlueText,
  deadline: colors.ember,
  preparation: colors.tagGreenText,
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  registration: 'document-text',
  tracking: 'analytics',
  deadline: 'calendar',
  preparation: 'folder-open',
};

const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴' },
  { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'CI', name: 'Ivory Coast', flag: '🇨🇮' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KP', name: 'North Korea', flag: '🇰🇵' },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳' },
  { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲' },
  { code: 'ST', name: 'Sao Tome and Principe', flag: '🇸🇹' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
];

export default function ProfileScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [trackingStats, setTrackingStats] = useState<TrackingStats>({
    uncategorizedCount: 0,
    categorizedIncomeCount: 0,
    categorizedExpenseCount: 0,
    unqualifiedExpenseCount: 0,
    giftedItemsCount: 0,
    totalTransactions: 0,
  });

  // Editable core fields
  const [monthlyIncome, setMonthlyIncome] = useState(1000);
  const [hasOtherEmployment, setHasOtherEmployment] = useState(false);
  const [employmentIncome, setEmploymentIncome] = useState(30000);
  const [employmentIsPaye, setEmploymentIsPaye] = useState(true);
  const [studentLoanPlan, setStudentLoanPlan] = useState('none');
  const [taxRegion, setTaxRegion] = useState('england');
  const [trackingGoal, setTrackingGoal] = useState('sole_trader');
  const [workType, setWorkType] = useState('content_creation');
  const [customWorkType, setCustomWorkType] = useState('');
  const [receivesGiftedItems, setReceivesGiftedItems] = useState(false);
  const [hasInternationalIncome, setHasInternationalIncome] = useState(false);
  const [bankAccountCount, setBankAccountCount] = useState(1);
  const [jobRole, setJobRole] = useState('');
  const [mainClients, setMainClients] = useState<string[]>(['', '', '']);
  const [workLocationVal, setWorkLocationVal] = useState('home');

  // Tax residency fields
  const [taxResidencyCountry, setTaxResidencyCountry] = useState<string>('GB');
  const [isDigitalNomad, setIsDigitalNomad] = useState<boolean>(false);
  const [foreignIncomeCountries, setForeignIncomeCountries] = useState<string[]>([]);

  // Work setup fields - using clearer options
  const [workFromHomeOption, setWorkFromHomeOption] = useState<WorkFromHomeOption>(null);
  const [vehicleUseOption, setVehicleUseOption] = useState<VehicleUseOption>(null);

  // Travel and international fields
  const [travelsForWork, setTravelsForWork] = useState<boolean>(false);
  const [travelDetails, setTravelDetails] = useState<string>('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Account info
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  // Email connections state
  const [gmailConnection, setGmailConnection] = useState<EmailConnection | null>(null);
  const [connectingGmail, setConnectingGmail] = useState(false);

  // Google OAuth discovery document
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

  // Create redirect URI for OAuth
  // On native, this will be: exp://192.168.x.x:8081/--/oauth (in Expo Go)
  // Or the custom scheme: bopp://oauth (in standalone builds)
  const redirectUri = AuthSession.makeRedirectUri({
    native: 'bopp://oauth',
  });

  // Log redirect URI for debugging
  console.log('OAuth Redirect URI:', redirectUri);

  useEffect(() => {
    loadProfile();
    loadCompletedItems();
    loadTrackingStats();
    loadUserEmail();
    loadEmailConnections();
  }, []);

  // Reload when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
      loadCompletedItems();
      loadTrackingStats();
    });
    return unsubscribe;
  }, [navigation]);

  const loadCompletedItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_checklist_progress')
        .select('item_id')
        .eq('user_id', user.id);

      if (data) {
        setCompletedItems(new Set(data.map(item => item.item_id)));
      }
    } catch (error) {
      console.error('Error loading checklist progress:', error);
    }
  };

  const loadTrackingStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current tax year dates
      const now = new Date();
      const currentYear = now.getFullYear();
      const taxYearStart = now.getMonth() >= 3 && now.getDate() >= 6
        ? new Date(currentYear, 3, 6)
        : new Date(currentYear - 1, 3, 6);
      const taxYearEnd = new Date(taxYearStart.getFullYear() + 1, 3, 5);

      // Count uncategorized transactions
      const { count: uncategorizedCount } = await supabase
        .from('uploaded_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Count categorized income
      const { count: categorizedIncomeCount } = await supabase
        .from('categorized_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('transaction_type', 'income')
        .gte('transaction_date', taxYearStart.toISOString().split('T')[0])
        .lte('transaction_date', taxYearEnd.toISOString().split('T')[0]);

      // Count categorized expenses
      const { count: categorizedExpenseCount } = await supabase
        .from('categorized_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('transaction_type', 'expense')
        .gte('transaction_date', taxYearStart.toISOString().split('T')[0])
        .lte('transaction_date', taxYearEnd.toISOString().split('T')[0]);

      // Count unqualified expenses
      const { count: unqualifiedExpenseCount } = await supabase
        .from('categorized_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('transaction_type', 'expense')
        .eq('qualified', false)
        .gte('transaction_date', taxYearStart.toISOString().split('T')[0])
        .lte('transaction_date', taxYearEnd.toISOString().split('T')[0]);

      // Count gifted items
      const { count: giftedItemsCount } = await supabase
        .from('gifted_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('received_date', taxYearStart.toISOString().split('T')[0])
        .lte('received_date', taxYearEnd.toISOString().split('T')[0]);

      setTrackingStats({
        uncategorizedCount: uncategorizedCount || 0,
        categorizedIncomeCount: categorizedIncomeCount || 0,
        categorizedExpenseCount: categorizedExpenseCount || 0,
        unqualifiedExpenseCount: unqualifiedExpenseCount || 0,
        giftedItemsCount: giftedItemsCount || 0,
        totalTransactions: (uncategorizedCount || 0) + (categorizedIncomeCount || 0) + (categorizedExpenseCount || 0),
      });
    } catch (error) {
      console.error('Error loading tracking stats:', error);
    }
  };

  const generateChecklist = (userProfile: UserProfile | null) => {
    const items: ChecklistItem[] = [];

    // Registration items
    if (!userProfile || userProfile.tracking_goal === 'not_registered') {
      items.push({
        id: 'register_hmrc',
        title: 'Register for Self Assessment',
        description: 'Register with HMRC as self-employed. This is required if you earn over £1,000 from self-employment.',
        category: 'registration',
        completed: false,
        relevantTo: ['all'],
        priority: 'high',
      });

      items.push({
        id: 'get_utr',
        title: 'Get your UTR number',
        description: 'You\'ll receive your Unique Taxpayer Reference (UTR) within 10 days of registering.',
        category: 'registration',
        completed: false,
        relevantTo: ['all'],
        priority: 'high',
      });
    }

    // Always relevant tracking items
    items.push({
      id: 'track_income',
      title: 'Track all income sources',
      description: 'Keep records of all money you earn, including payments from brands, affiliate income, and product sales.',
      category: 'tracking',
      completed: false,
      relevantTo: ['all'],
      priority: 'high',
    });

    items.push({
      id: 'track_expenses',
      title: 'Categorize business expenses',
      description: 'Sort your expenses into HMRC categories. Bopp helps automate this!',
      category: 'tracking',
      completed: false,
      relevantTo: ['all'],
      priority: 'high',
    });

    items.push({
      id: 'keep_receipts',
      title: 'Save receipts & invoices',
      description: 'Keep receipts for at least 5 years. Digital copies are acceptable.',
      category: 'tracking',
      completed: false,
      relevantTo: ['all'],
      priority: 'medium',
    });

    // Gifted items specific
    if (userProfile?.receives_gifted_items) {
      items.push({
        id: 'track_gifted',
        title: 'Record gifted items',
        description: 'Track PR packages and gifted products with their retail value. These count as income!',
        category: 'tracking',
        completed: false,
        relevantTo: ['content_creation'],
        priority: 'high',
      });
    }

    // International income specific
    if (userProfile?.has_international_income) {
      items.push({
        id: 'foreign_income',
        title: 'Declare foreign income',
        description: 'Report income from overseas sources like international brand deals or foreign platforms. All foreign income must be declared on your Self Assessment.',
        category: 'tracking',
        completed: false,
        relevantTo: ['international'],
        priority: 'high',
      });

      // Get foreign income countries from profile
      const foreignCountries = userProfile?.foreign_income_countries || [];

      // US-specific guidance (common for creators)
      if (foreignCountries.includes('US')) {
        items.push({
          id: 'us_tax_treaty',
          title: 'Complete W-8BEN form for US income',
          description: 'Submit a W-8BEN to US companies to reduce withholding tax from 30% to 0% under the UK-US tax treaty. This applies to YouTube, TikTok, and US brand deals.',
          category: 'preparation',
          completed: false,
          relevantTo: ['international'],
          priority: 'high',
        });
      }

      // Digital nomad specific
      if (userProfile?.is_digital_nomad) {
        items.push({
          id: 'tax_residency',
          title: 'Confirm your tax residency status',
          description: 'As a digital nomad, your tax residency affects where you pay tax. Consider consulting an accountant about the Statutory Residence Test.',
          category: 'preparation',
          completed: false,
          relevantTo: ['international'],
          priority: 'high',
        });
      }
    }

    // Tax deadline items
    const now = new Date();
    const currentYear = now.getFullYear();
    const taxDeadline = new Date(currentYear, 0, 31);
    if (now > taxDeadline) {
      taxDeadline.setFullYear(currentYear + 1);
    }

    items.push({
      id: 'file_return',
      title: 'File your tax return',
      description: `Submit your Self Assessment by ${taxDeadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      category: 'deadline',
      completed: false,
      relevantTo: ['all'],
      priority: 'high',
      dueDate: taxDeadline.toISOString(),
    });

    items.push({
      id: 'pay_tax',
      title: 'Pay your tax bill',
      description: 'Pay any tax owed by January 31st to avoid penalties.',
      category: 'deadline',
      completed: false,
      relevantTo: ['all'],
      priority: 'high',
      dueDate: taxDeadline.toISOString(),
    });

    // Set aside money - CONSERVATIVE calculation
    const monthlyIncomeVal = userProfile?.monthly_income || 0;
    const yearlyIncome = monthlyIncomeVal * 12;
    let estimatedTax = 0;

    if (yearlyIncome > 12570) {
      if (yearlyIncome > 50270) {
        estimatedTax = (50270 - 12570) * 0.2 + (yearlyIncome - 50270) * 0.4;
      } else {
        estimatedTax = (yearlyIncome - 12570) * 0.2;
      }
    }

    // Apply 5% conservative buffer
    estimatedTax = estimatedTax * 1.05;

    items.push({
      id: 'set_aside',
      title: 'Set aside money for tax',
      description: `Consider saving ~£${Math.round(estimatedTax / 12)}/month (conservative estimate, actual may be lower).`,
      category: 'preparation',
      completed: false,
      relevantTo: ['all'],
      priority: 'high',
    });

    // High income specific
    if (yearlyIncome > 50000) {
      items.push({
        id: 'payments_on_account',
        title: 'Prepare for payments on account',
        description: 'Once your tax bill exceeds £1,000, you\'ll need to make advance payments.',
        category: 'preparation',
        completed: false,
        relevantTo: ['high_income'],
        priority: 'medium',
      });
    }

    // Preparation items
    items.push({
      id: 'export_records',
      title: 'Export your records',
      description: 'Download your categorized expenses ready for your tax return.',
      category: 'preparation',
      completed: false,
      relevantTo: ['all'],
      priority: 'medium',
    });

    // Sort by priority
    items.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    setChecklist(items);
  };

  const toggleChecklistItem = async (itemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isCompleted = completedItems.has(itemId);

      if (isCompleted) {
        await supabase
          .from('user_checklist_progress')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', itemId);

        setCompletedItems(prev => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      } else {
        await supabase
          .from('user_checklist_progress')
          .upsert({
            user_id: user.id,
            item_id: itemId,
            completed_at: new Date().toISOString(),
          });

        setCompletedItems(prev => new Set([...prev, itemId]));
      }
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      Alert.alert('Error', 'Failed to update checklist');
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setMonthlyIncome(data.monthly_income || 1000);
      setHasOtherEmployment(data.has_other_employment || false);
      setEmploymentIncome(data.employment_income || 30000);
      setEmploymentIsPaye(data.employment_is_paye !== false); // Default to true
      setStudentLoanPlan(data.student_loan_plan || 'none');
      setTaxRegion(data.tax_region || 'england');
      setTrackingGoal(data.tracking_goal || 'sole_trader');
      setWorkType(data.work_type || 'content_creation');
      setCustomWorkType(data.custom_work_type || '');
      setReceivesGiftedItems(data.receives_gifted_items || false);
      setBankAccountCount(data.bank_account_count || 1);
      setJobRole(data.job_role || '');
      setMainClients(data.main_clients?.length ? [...data.main_clients, ...Array(3 - data.main_clients.length).fill('')].slice(0, 3) : ['', '', '']);
      setWorkLocationVal(data.work_location || 'home');
      setHasInternationalIncome(data.has_international_income || false);
      setTaxResidencyCountry(data.tax_residency_country || 'GB');
      setIsDigitalNomad(data.is_digital_nomad || false);
      setForeignIncomeCountries(data.foreign_income_countries || []);
      setTravelsForWork(data.travels_for_work || false);
      setTravelDetails(data.travel_details || '');

      // Generate checklist based on profile
      generateChecklist(data);

      // Convert percentage to option
      if (data.works_from_home === false) {
        setWorkFromHomeOption('never');
      } else if (data.home_office_percentage) {
        if (data.home_office_percentage >= 80) setWorkFromHomeOption('always');
        else if (data.home_office_percentage >= 50) setWorkFromHomeOption('mostly');
        else if (data.home_office_percentage >= 25) setWorkFromHomeOption('sometimes');
        else setWorkFromHomeOption('rarely');
      }

      if (data.uses_vehicle_for_work === false) {
        setVehicleUseOption('never');
      } else if (data.vehicle_business_percentage) {
        if (data.vehicle_business_percentage >= 80) setVehicleUseOption('daily');
        else if (data.vehicle_business_percentage >= 50) setVehicleUseOption('weekly');
        else if (data.vehicle_business_percentage >= 25) setVehicleUseOption('monthly');
        else setVehicleUseOption('rarely');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHomeOfficePercentage = (option: WorkFromHomeOption): number | null => {
    switch (option) {
      case 'always': return 80;
      case 'mostly': return 50;
      case 'sometimes': return 25;
      case 'rarely': return 10;
      case 'never': return 0;
      default: return null;
    }
  };

  const getVehiclePercentage = (option: VehicleUseOption): number | null => {
    switch (option) {
      case 'daily': return 80;
      case 'weekly': return 50;
      case 'monthly': return 25;
      case 'rarely': return 10;
      case 'never': return 0;
      default: return null;
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const homePercent = getHomeOfficePercentage(workFromHomeOption);
      const vehiclePercent = getVehiclePercentage(vehicleUseOption);
      const isComplete = workFromHomeOption !== null && vehicleUseOption !== null;

      const { error } = await supabase
        .from('user_profiles')
        .update({
          monthly_income: monthlyIncome,
          has_other_employment: hasOtherEmployment,
          employment_income: hasOtherEmployment ? employmentIncome : null,
          employment_is_paye: hasOtherEmployment ? employmentIsPaye : null,
          student_loan_plan: studentLoanPlan,
          tax_region: taxRegion,
          tracking_goal: trackingGoal,
          work_type: workType,
          custom_work_type: workType === 'other' ? customWorkType : null,
          receives_gifted_items: receivesGiftedItems,
          bank_account_count: bankAccountCount,
          job_role: jobRole.trim() || null,
          main_clients: mainClients.filter(c => c.trim()).map(c => c.trim()),
          work_location: workLocationVal,
          has_international_income: hasInternationalIncome,
          foreign_income_countries: foreignIncomeCountries,
          travels_for_work: travelsForWork,
          travel_details: travelsForWork ? travelDetails : null,
          works_from_home: workFromHomeOption !== 'never' && workFromHomeOption !== null,
          home_office_percentage: homePercent,
          uses_vehicle_for_work: vehicleUseOption !== 'never' && vehicleUseOption !== null,
          vehicle_business_percentage: vehiclePercent,
          profile_completed: isComplete,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Reload profile to update local state
      await loadProfile();
      setShowEditModal(false);
      setEditingField(null);
      Alert.alert('Saved', 'Your profile has been updated');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const getWorkTypeLabel = (type: string, custom?: string) => {
    const labels: Record<string, string> = {
      content_creation: 'Content Creator',
      freelancing: 'Freelancer',
      side_hustle: 'Reseller',
      other: custom || 'Other',
    };
    return labels[type] || type;
  };

  const getRegistrationLabel = (goal: string) => {
    const labels: Record<string, string> = {
      sole_trader: 'Sole Trader',
      limited_company: 'Limited Company',
      not_registered: 'Not Yet Registered',
    };
    return labels[goal] || goal;
  };

  const getStudentLoanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      none: 'None',
      plan1: 'Plan 1',
      plan2: 'Plan 2',
      plan4: 'Plan 4 (Scotland)',
      plan5: 'Plan 5',
      postgrad: 'Postgraduate',
    };
    return labels[plan] || plan;
  };

  const getTaxRegionLabel = (region: string) => {
    const labels: Record<string, string> = {
      england: 'England',
      wales: 'Wales',
      scotland: 'Scotland',
      northern_ireland: 'Northern Ireland',
    };
    return labels[region] || region;
  };

  const getWorkFromHomeLabel = (option: WorkFromHomeOption) => {
    const labels: Record<string, string> = {
      always: 'Always (full-time)',
      mostly: 'Most of the time',
      sometimes: 'A few days a week',
      rarely: 'Occasionally',
      never: 'Never',
    };
    return option ? labels[option] : 'Not set';
  };

  const getVehicleUseLabel = (option: VehicleUseOption) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'A few times a week',
      monthly: 'A few times a month',
      rarely: 'Occasionally',
      never: 'Never',
    };
    return option ? labels[option] : 'Not set';
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
    return `£${value}`;
  };

  const openEditModal = (field: string) => {
    console.log('Opening edit modal for:', field);
    setEditingField(field);
    setShowEditModal(true);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              // Navigation will be handled by auth state listener in AppNavigator
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Type "DELETE" to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I understand, delete my account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;

                      // Delete user data from all tables
                      await supabase.from('categorized_transactions').delete().eq('user_id', user.id);
                      await supabase.from('uploaded_transactions').delete().eq('user_id', user.id);
                      await supabase.from('bank_statements').delete().eq('user_id', user.id);
                      await supabase.from('gifted_items').delete().eq('user_id', user.id);
                      await supabase.from('user_checklist_progress').delete().eq('user_id', user.id);
                      await supabase.from('user_profiles').delete().eq('user_id', user.id);

                      // Sign out (account deletion requires admin privileges in Supabase)
                      await supabase.auth.signOut();
                      Alert.alert('Account Deleted', 'Your account and all associated data have been deleted.');
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const loadUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
      }
    } catch (error) {
      console.error('Error loading user email:', error);
    }
  };

  // Email connection functions
  const loadEmailConnections = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/api/gmail/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'bypass-tunnel-reminder': 'true',
        },
        body: JSON.stringify({ user_id: session.user.id }),
      });

      const data = await response.json();
      if (data.connected) {
        setGmailConnection({
          provider: 'gmail',
          email: data.email,
          connected_at: data.connected_at,
          is_active: true,
        });
      } else {
        setGmailConnection(null);
      }
    } catch (error) {
      console.error('Error loading email connections:', error);
    }
  };

  const handleConnectGmail = async () => {
    if (!discovery) {
      Alert.alert('Error', 'Google authentication is not ready. Please try again.');
      return;
    }

    setConnectingGmail(true);

    try {
      // Always use Web Client ID for expo-auth-session (opens browser)
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_WEB_CLIENT_ID!,
        redirectUri: redirectUri,
        scopes: [
          'openid',
          'profile',
          'email',
          'https://www.googleapis.com/auth/gmail.readonly',
        ],
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.params.code) {
        // Exchange code for tokens on the server
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          Alert.alert('Error', 'Not logged in');
          return;
        }

        const response = await fetch(`${API_URL}/api/gmail/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify({
            user_id: session.user.id,
            code: result.params.code,
            redirect_uri: redirectUri,
            code_verifier: request.codeVerifier,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setGmailConnection({
            provider: 'gmail',
            email: data.email,
            connected_at: new Date().toISOString(),
            is_active: true,
          });
          Alert.alert('Connected', `Gmail connected successfully for ${data.email}`);
        } else {
          Alert.alert('Error', data.error || 'Failed to connect Gmail');
        }
      } else if (result.type === 'cancel') {
        // User cancelled, do nothing
      } else {
        Alert.alert('Error', 'Failed to authenticate with Google');
      }
    } catch (error: any) {
      console.error('Gmail connection error:', error);
      Alert.alert('Error', error.message || 'Failed to connect Gmail');
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = () => {
    Alert.alert(
      'Disconnect Gmail',
      'Are you sure you want to disconnect your Gmail account? This will remove access to email hints during transaction qualification.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              const response = await fetch(`${API_URL}/api/gmail/disconnect`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                  'bypass-tunnel-reminder': 'true',
                },
                body: JSON.stringify({ user_id: session.user.id }),
              });

              if (response.ok) {
                setGmailConnection(null);
                Alert.alert('Disconnected', 'Gmail has been disconnected');
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Failed to disconnect Gmail');
              }
            } catch (error) {
              console.error('Error disconnecting Gmail:', error);
              Alert.alert('Error', 'Failed to disconnect Gmail');
            }
          },
        },
      ]
    );
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      Alert.alert(
        'Verification Email Sent',
        `We've sent a verification link to ${newEmail}. Please check your inbox and click the link to confirm your new email address.`
      );
      setShowChangeEmailModal(false);
      setNewEmail('');
    } catch (error: any) {
      console.error('Error changing email:', error);
      Alert.alert('Error', error.message || 'Failed to change email');
    }
  };

  const handleResetPassword = async () => {
    if (!userEmail) {
      Alert.alert('Error', 'No email address found');
      return;
    }

    Alert.alert(
      'Reset Password',
      `We'll send a password reset link to ${userEmail}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
              if (error) throw error;
              Alert.alert('Email Sent', 'Check your inbox for the password reset link');
            } catch (error: any) {
              console.error('Error sending reset email:', error);
              Alert.alert('Error', error.message || 'Failed to send reset email');
            }
          },
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    // TODO: Replace with actual subscription management URL
    Alert.alert(
      'Manage Subscription',
      'Subscription management coming soon! bopp is currently free during beta.',
      [{ text: 'OK' }]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@bopp.app?subject=Support%20Request');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://bopp.app/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://bopp.app/terms');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  const isProfileComplete = workFromHomeOption !== null && vehicleUseOption !== null;

  // Checklist calculations
  const completedCount = checklist.filter(item => completedItems.has(item.id)).length;
  const totalCount = checklist.length;
  const checklistProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Group checklist items by category
  const groupedItems = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Remove 'tracking' since it's covered by "In Progress with bopp" section
  const categoryOrder: Array<'registration' | 'tracking' | 'deadline' | 'preparation'> =
    ['registration', 'deadline', 'preparation'];

  const categoryLabels = {
    registration: 'Registration',
    tracking: 'Record Keeping',
    deadline: 'Key Deadlines',
    preparation: 'Tax Preparation',
  };

  const renderEditModal = () => {
    switch (editingField) {
      case 'income':
        return (
          <>
            <Text style={styles.modalTitle}>Monthly Side Hustle Income</Text>
            <Text style={styles.modalSubtitle}>Approximate monthly income from your side hustle</Text>
            <Text style={styles.modalValue}>{formatCurrency(monthlyIncome)}</Text>
            <Slider
              style={styles.modalSlider}
              minimumValue={0}
              maximumValue={15000}
              step={100}
              value={monthlyIncome}
              onValueChange={setMonthlyIncome}
              minimumTrackTintColor={colors.ink}
              maximumTrackTintColor={colors.mist}
              thumbTintColor={colors.ember}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>£0</Text>
              <Text style={styles.sliderLabelText}>£15k+</Text>
            </View>
          </>
        );

      case 'employment':
        return (
          <>
            <Text style={styles.modalTitle}>Other Employment</Text>
            <Text style={styles.modalSubtitle}>Do you have income from a day job?</Text>
            <View style={styles.optionsList}>
              <TouchableOpacity
                style={[styles.optionItem, !hasOtherEmployment && styles.optionItemActive]}
                onPress={() => setHasOtherEmployment(false)}
              >
                <Text style={[styles.optionText, !hasOtherEmployment && styles.optionTextActive]}>
                  No, just my side hustle
                </Text>
                {!hasOtherEmployment && <Ionicons name="checkmark" size={20} color={colors.ink} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionItem, hasOtherEmployment && styles.optionItemActive]}
                onPress={() => setHasOtherEmployment(true)}
              >
                <Text style={[styles.optionText, hasOtherEmployment && styles.optionTextActive]}>
                  Yes, I have a day job
                </Text>
                {hasOtherEmployment && <Ionicons name="checkmark" size={20} color={colors.ink} />}
              </TouchableOpacity>
            </View>
            {hasOtherEmployment && (
              <>
                <View style={styles.subSection}>
                  <Text style={styles.subSectionLabel}>How are you paid?</Text>
                  <View style={styles.optionsList}>
                    <TouchableOpacity
                      style={[styles.optionItem, employmentIsPaye && styles.optionItemActive]}
                      onPress={() => setEmploymentIsPaye(true)}
                    >
                      <View style={styles.optionWithIcon}>
                        <Ionicons name="card-outline" size={20} color={employmentIsPaye ? colors.ink : colors.midGrey} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.optionText, employmentIsPaye && styles.optionTextActive]}>
                            PAYE (employee)
                          </Text>
                          <Text style={styles.optionHint}>Tax deducted from salary automatically</Text>
                        </View>
                      </View>
                      {employmentIsPaye && <Ionicons name="checkmark" size={20} color={colors.ink} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.optionItem, !employmentIsPaye && styles.optionItemActive]}
                      onPress={() => setEmploymentIsPaye(false)}
                    >
                      <View style={styles.optionWithIcon}>
                        <Ionicons name="document-text-outline" size={20} color={!employmentIsPaye ? colors.ink : colors.midGrey} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.optionText, !employmentIsPaye && styles.optionTextActive]}>
                            Contractor/Freelance
                          </Text>
                          <Text style={styles.optionHint}>I invoice and pay my own tax</Text>
                        </View>
                      </View>
                      {!employmentIsPaye && <Ionicons name="checkmark" size={20} color={colors.ink} />}
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.subSection}>
                  <Text style={styles.subSectionLabel}>Yearly income (before tax)</Text>
                  <Text style={styles.modalValue}>{formatCurrency(employmentIncome)}</Text>
                  <Slider
                    style={styles.modalSlider}
                    minimumValue={10000}
                    maximumValue={150000}
                    step={5000}
                    value={employmentIncome}
                    onValueChange={setEmploymentIncome}
                    minimumTrackTintColor={colors.ink}
                    maximumTrackTintColor={colors.mist}
                    thumbTintColor={colors.ember}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>£10k</Text>
                    <Text style={styles.sliderLabelText}>£150k+</Text>
                  </View>
                </View>
              </>
            )}
          </>
        );

      case 'studentLoan':
        return (
          <>
            <Text style={styles.modalTitle}>Student Loan</Text>
            <Text style={styles.modalSubtitle}>Which student loan plan do you have?</Text>
            <View style={styles.optionsList}>
              {[
                { value: 'none', label: 'No student loan' },
                { value: 'plan1', label: 'Plan 1 (started before 2012)' },
                { value: 'plan2', label: 'Plan 2 (started 2012-2023)' },
                { value: 'plan4', label: 'Plan 4 (Scotland)' },
                { value: 'plan5', label: 'Plan 5 (started 2023 or later)' },
                { value: 'postgrad', label: 'Postgraduate loan' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionItem, studentLoanPlan === option.value && styles.optionItemActive]}
                  onPress={() => setStudentLoanPlan(option.value)}
                >
                  <Text style={[styles.optionText, studentLoanPlan === option.value && styles.optionTextActive]}>
                    {option.label}
                  </Text>
                  {studentLoanPlan === option.value && <Ionicons name="checkmark" size={20} color={colors.ink} />}
                </TouchableOpacity>
              ))}
            </View>
          </>
        );

      case 'taxRegion':
        return (
          <>
            <Text style={styles.modalTitle}>Tax Region</Text>
            <Text style={styles.modalSubtitle}>Where do you live for tax purposes?</Text>
            <View style={styles.optionsList}>
              {[
                { value: 'england', label: 'England' },
                { value: 'wales', label: 'Wales' },
                { value: 'scotland', label: 'Scotland' },
                { value: 'northern_ireland', label: 'Northern Ireland' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionItem, taxRegion === option.value && styles.optionItemActive]}
                  onPress={() => setTaxRegion(option.value)}
                >
                  <Text style={[styles.optionText, taxRegion === option.value && styles.optionTextActive]}>
                    {option.label}
                  </Text>
                  {taxRegion === option.value && <Ionicons name="checkmark" size={20} color={colors.ink} />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.taxDisclaimerBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.midGrey} />
              <Text style={styles.taxDisclaimerText}>
                Tax estimates are intentionally conservative based on student loan and tax region only. Other factors (pension contributions, marriage allowance, etc.) could reduce your actual liability - you may owe less than shown.
              </Text>
            </View>
          </>
        );

      case 'registration':
        return (
          <>
            <Text style={styles.modalTitle}>HMRC Registration</Text>
            <Text style={styles.modalSubtitle}>What's your current registration status?</Text>
            <View style={styles.optionsList}>
              {[
                { value: 'sole_trader', label: 'Sole Trader', icon: 'person' },
                { value: 'limited_company', label: 'Limited Company', icon: 'business' },
                { value: 'not_registered', label: 'Not yet registered', icon: 'help-circle' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionItem, trackingGoal === option.value && styles.optionItemActive]}
                  onPress={() => setTrackingGoal(option.value)}
                >
                  <View style={styles.optionWithIcon}>
                    <Ionicons name={option.icon as any} size={20} color={trackingGoal === option.value ? colors.ink : colors.midGrey} />
                    <Text style={[styles.optionText, trackingGoal === option.value && styles.optionTextActive]}>
                      {option.label}
                    </Text>
                  </View>
                  {trackingGoal === option.value && <Ionicons name="checkmark" size={20} color={colors.ink} />}
                </TouchableOpacity>
              ))}
            </View>
          </>
        );

      case 'workType':
        return (
          <>
            <Text style={styles.modalTitle}>Side Hustle Type</Text>
            <Text style={styles.modalSubtitle}>What best describes your work?</Text>
            <View style={styles.optionsList}>
              {[
                { value: 'content_creation', label: 'Content Creation', icon: 'videocam' },
                { value: 'freelancing', label: 'Freelancing', icon: 'briefcase' },
                { value: 'side_hustle', label: '(Re)selling Products', icon: 'cart' },
                { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionItem, workType === option.value && styles.optionItemActive]}
                  onPress={() => setWorkType(option.value)}
                >
                  <View style={styles.optionWithIcon}>
                    <Ionicons name={option.icon as any} size={20} color={workType === option.value ? colors.ink : colors.midGrey} />
                    <Text style={[styles.optionText, workType === option.value && styles.optionTextActive]}>
                      {option.label}
                    </Text>
                  </View>
                  {workType === option.value && <Ionicons name="checkmark" size={20} color={colors.ink} />}
                </TouchableOpacity>
              ))}
            </View>
            {workType === 'other' && (
              <View style={styles.subSection}>
                <Text style={styles.subSectionLabel}>Describe your work</Text>
                <View style={styles.customInputContainer}>
                  <TextInput
                    style={styles.customInput}
                    value={customWorkType}
                    onChangeText={setCustomWorkType}
                    placeholder="e.g., dog walking, consulting"
                    placeholderTextColor={colors.midGrey}
                  />
                </View>
              </View>
            )}
          </>
        );

      case 'incomeOptions':
        return (
          <>
            <Text style={styles.modalTitle}>Income Details</Text>
            <Text style={styles.modalSubtitle}>Additional income information</Text>
            <View style={styles.checkboxList}>
              <TouchableOpacity
                style={styles.checkboxItem}
                onPress={() => setReceivesGiftedItems(!receivesGiftedItems)}
              >
                <View style={[styles.checkbox, receivesGiftedItems && styles.checkboxChecked]}>
                  {receivesGiftedItems && <Ionicons name="checkmark" size={16} color={colors.white} />}
                </View>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxLabel}>I receive gifted items/products</Text>
                  <Text style={styles.checkboxHint}>PR products, review items, etc.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxItem}
                onPress={() => setHasInternationalIncome(!hasInternationalIncome)}
              >
                <View style={[styles.checkbox, hasInternationalIncome && styles.checkboxChecked]}>
                  {hasInternationalIncome && <Ionicons name="checkmark" size={16} color={colors.white} />}
                </View>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxLabel}>I have international income</Text>
                  <Text style={styles.checkboxHint}>Income from outside the UK</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        );

      case 'bankAccounts':
        return (
          <>
            <Text style={styles.modalTitle}>Bank Accounts</Text>
            <Text style={styles.modalSubtitle}>How many bank accounts do you use for your side hustle income or expenses?</Text>
            <View style={styles.optionsList}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.optionItem, bankAccountCount === n && styles.optionItemActive]}
                  onPress={() => setBankAccountCount(n)}
                >
                  <Text style={[styles.optionText, bankAccountCount === n && styles.optionTextActive]}>
                    {n === 5 ? '5 or more' : `${n}`}
                  </Text>
                  {bankAccountCount === n && <Ionicons name="checkmark" size={20} color={colors.ink} />}
                </TouchableOpacity>
              ))}
            </View>
          </>
        );

      case 'jobRole':
        return (
          <>
            <Text style={styles.modalTitle}>Job Role</Text>
            <Text style={styles.modalSubtitle}>What exactly do you do? This helps categorize expenses more accurately.</Text>
            <TextInput
              style={styles.modalInput}
              value={jobRole}
              onChangeText={setJobRole}
              placeholder="e.g., freelance photographer, UGC creator"
              placeholderTextColor={colors.midGrey}
              autoFocus
            />
          </>
        );

      case 'mainClients':
        return (
          <>
            <Text style={styles.modalTitle}>Main Clients</Text>
            <Text style={styles.modalSubtitle}>Who pays you? Helps spot your income automatically.</Text>
            {mainClients.map((client, index) => (
              <TextInput
                key={index}
                style={[styles.modalInput, { marginBottom: spacing.sm }]}
                value={client}
                onChangeText={(text) => {
                  const updated = [...mainClients];
                  updated[index] = text;
                  setMainClients(updated);
                }}
                placeholder={index === 0 ? 'Client 1' : index === 1 ? 'Client 2' : 'Client 3'}
                placeholderTextColor={colors.midGrey}
                autoFocus={index === 0}
              />
            ))}
          </>
        );

      case 'workLocation':
        return (
          <>
            <Text style={styles.modalTitle}>Work Location</Text>
            <Text style={styles.modalSubtitle}>Where do you mainly work?</Text>
            <View style={styles.optionsList}>
              {[
                { value: 'home', label: 'From home' },
                { value: 'office', label: 'Rented office' },
                { value: 'coworking', label: 'Co-working space' },
                { value: 'client_sites', label: 'Client sites' },
                { value: 'on_the_road', label: 'On the road' },
                { value: 'mixed', label: 'Mixed / varies' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionItem, workLocationVal === opt.value && styles.optionItemActive]}
                  onPress={() => setWorkLocationVal(opt.value)}
                >
                  <Text style={[styles.optionText, workLocationVal === opt.value && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                  {workLocationVal === opt.value && <Ionicons name="checkmark" size={20} color={colors.ink} />}
                </TouchableOpacity>
              ))}
            </View>
          </>
        );

      default:
        return null;
    }
  };

  // Calculate progress percentages
  const categorizedTotal = trackingStats.categorizedIncomeCount + trackingStats.categorizedExpenseCount;
  const expenseProgress = trackingStats.categorizedExpenseCount > 0
    ? Math.round(((trackingStats.categorizedExpenseCount - trackingStats.unqualifiedExpenseCount) / trackingStats.categorizedExpenseCount) * 100)
    : 0;

  const renderChecklistTab = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      {/* In Progress with bopp - Achievement Card */}
      <View style={styles.achievementCard}>
        <View style={styles.achievementHeader}>
          <View style={styles.achievementIconContainer}>
            <Ionicons name="rocket" size={24} color={colors.background} />
          </View>
          <View style={styles.achievementHeaderText}>
            <Text style={styles.achievementTitle}>In Progress with bopp</Text>
            <Text style={styles.achievementSubtitle}>Tax Year 2024/25</Text>
          </View>
        </View>

        {/* Track Income Card */}
        <TouchableOpacity
          style={styles.trackingCard}
          onPress={() => navigation.navigate('CategorizedTransactions', { filterType: 'income' })}
        >
          <View style={styles.trackingHeader}>
            <View style={[styles.trackingIconContainer, { backgroundColor: colors.tagGreenBg }]}>
              <Ionicons name="trending-up" size={20} color={colors.tagGreenText} />
            </View>
            <View style={styles.trackingInfo}>
              <Text style={styles.trackingLabel}>Track all income sources</Text>
              <Text style={styles.trackingStatus}>
                {trackingStats.categorizedIncomeCount > 0
                  ? `${trackingStats.categorizedIncomeCount} income transaction${trackingStats.categorizedIncomeCount !== 1 ? 's' : ''} tracked`
                  : 'Start tracking your income'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
          </View>
          {trackingStats.categorizedIncomeCount > 0 && (
            <View style={styles.trackingProgressContainer}>
              <View style={[styles.trackingProgressBar, { backgroundColor: colors.tagGreenBg }]}>
                <View style={[styles.trackingProgressFill, { width: '100%', backgroundColor: colors.tagGreenText }]} />
              </View>
              <View style={styles.trackingBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.tagGreenText} />
                <Text style={styles.trackingBadgeText}>Active</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Categorize Expenses Card */}
        <TouchableOpacity
          style={styles.trackingCard}
          onPress={() => {
            if (trackingStats.uncategorizedCount > 0) {
              navigation.navigate('TransactionList');
            } else {
              navigation.navigate('CategorizedTransactions', { filterType: 'expense' });
            }
          }}
        >
          <View style={styles.trackingHeader}>
            <View style={[styles.trackingIconContainer, { backgroundColor: colors.parchment }]}>
              <Ionicons name="receipt-outline" size={20} color={colors.ink} />
            </View>
            <View style={styles.trackingInfo}>
              <Text style={styles.trackingLabel}>Categorize business expenses</Text>
              <Text style={styles.trackingStatus}>
                {trackingStats.uncategorizedCount > 0
                  ? `${trackingStats.uncategorizedCount} pending • ${trackingStats.categorizedExpenseCount} done`
                  : trackingStats.categorizedExpenseCount > 0
                    ? `${trackingStats.categorizedExpenseCount} expense${trackingStats.categorizedExpenseCount !== 1 ? 's' : ''} categorized`
                    : 'Upload transactions to get started'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
          </View>
          {(trackingStats.uncategorizedCount > 0 || trackingStats.categorizedExpenseCount > 0) && (
            <View style={styles.trackingProgressContainer}>
              <View style={[styles.trackingProgressBar, { backgroundColor: colors.mist }]}>
                <View
                  style={[
                    styles.trackingProgressFill,
                    {
                      width: trackingStats.totalTransactions > 0
                        ? `${Math.round((trackingStats.categorizedExpenseCount / (trackingStats.categorizedExpenseCount + trackingStats.uncategorizedCount)) * 100)}%`
                        : '0%',
                      backgroundColor: colors.ink
                    }
                  ]}
                />
              </View>
              {trackingStats.uncategorizedCount > 0 ? (
                <View style={[styles.trackingBadge, { backgroundColor: colors.tagEmberBg }]}>
                  <Ionicons name="time" size={14} color={colors.ember} />
                  <Text style={[styles.trackingBadgeText, { color: colors.tagEmberText }]}>
                    {trackingStats.uncategorizedCount} pending
                  </Text>
                </View>
              ) : (
                <View style={styles.trackingBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.tagGreenText} />
                  <Text style={styles.trackingBadgeText}>All done</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Qualify Expenses Card */}
        {trackingStats.categorizedExpenseCount > 0 && (
          <TouchableOpacity
            style={styles.trackingCard}
            onPress={() => navigation.navigate('QualifyTransactionList')}
          >
            <View style={styles.trackingHeader}>
              <View style={[styles.trackingIconContainer, { backgroundColor: colors.tagEmberBg }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.ember} />
              </View>
              <View style={styles.trackingInfo}>
                <Text style={styles.trackingLabel}>Add receipts & evidence</Text>
                <Text style={styles.trackingStatus}>
                  {trackingStats.unqualifiedExpenseCount > 0
                    ? `${trackingStats.unqualifiedExpenseCount} expense${trackingStats.unqualifiedExpenseCount !== 1 ? 's' : ''} need evidence`
                    : 'All expenses qualified'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
            </View>
            <View style={styles.trackingProgressContainer}>
              <View style={[styles.trackingProgressBar, { backgroundColor: colors.tagEmberBg }]}>
                <View
                  style={[
                    styles.trackingProgressFill,
                    {
                      width: `${expenseProgress}%`,
                      backgroundColor: expenseProgress === 100 ? colors.tagGreenText : colors.ember
                    }
                  ]}
                />
              </View>
              {trackingStats.unqualifiedExpenseCount === 0 ? (
                <View style={styles.trackingBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.tagGreenText} />
                  <Text style={styles.trackingBadgeText}>HMRC ready</Text>
                </View>
              ) : (
                <View style={[styles.trackingBadge, { backgroundColor: colors.tagEmberBg }]}>
                  <Text style={[styles.trackingBadgeText, { color: colors.tagEmberText }]}>
                    {expenseProgress}% qualified
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Gifted Items Card - if user receives gifted items */}
        {receivesGiftedItems && (
          <TouchableOpacity
            style={styles.trackingCard}
            onPress={() => navigation.navigate('GiftedTracker')}
          >
            <View style={styles.trackingHeader}>
              <View style={[styles.trackingIconContainer, { backgroundColor: colors.tagEmberBg }]}>
                <Ionicons name="gift-outline" size={20} color={colors.ember} />
              </View>
              <View style={styles.trackingInfo}>
                <Text style={styles.trackingLabel}>Track gifted items</Text>
                <Text style={styles.trackingStatus}>
                  {trackingStats.giftedItemsCount > 0
                    ? `${trackingStats.giftedItemsCount} item${trackingStats.giftedItemsCount !== 1 ? 's' : ''} logged`
                    : 'Log PR packages & gifts'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
            </View>
            {trackingStats.giftedItemsCount > 0 && (
              <View style={styles.trackingProgressContainer}>
                <View style={[styles.trackingProgressBar, { backgroundColor: colors.tagEmberBg }]}>
                  <View style={[styles.trackingProgressFill, { width: '100%', backgroundColor: colors.ember }]} />
                </View>
                <View style={styles.trackingBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.tagGreenText} />
                  <Text style={styles.trackingBadgeText}>Active</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Overall Checklist Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Tax Checklist Progress</Text>
          <Text style={styles.progressCount}>{completedCount}/{totalCount}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${checklistProgress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {completedCount === totalCount
            ? "All done! You're on top of your taxes."
            : `${totalCount - completedCount} item${totalCount - completedCount !== 1 ? 's' : ''} remaining`}
        </Text>
      </View>

      {categoryOrder.map(category => {
        const items = groupedItems[category];
        if (!items || items.length === 0) return null;

        return (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryIcon, { backgroundColor: `${CATEGORY_COLORS[category]}20` }]}>
                <Ionicons name={CATEGORY_ICONS[category]} size={20} color={CATEGORY_COLORS[category]} />
              </View>
              <Text style={styles.categoryTitle}>{categoryLabels[category]}</Text>
            </View>

            {items.map(item => {
              const isCompleted = completedItems.has(item.id);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.clItem, isCompleted && styles.clItemCompleted]}
                  onPress={() => toggleChecklistItem(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.clCheckbox, isCompleted && styles.clCheckboxChecked]}>
                    {isCompleted && <Ionicons name="checkmark" size={16} color={colors.white} />}
                  </View>
                  <View style={styles.clItemContent}>
                    <View style={styles.clItemHeader}>
                      <Text style={[styles.clItemTitle, isCompleted && styles.clItemTitleCompleted]}>
                        {item.title}
                      </Text>
                      {item.priority === 'high' && !isCompleted && (
                        <View style={styles.priorityBadge}>
                          <Text style={styles.priorityText}>Important</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.clItemDescription, isCompleted && styles.clItemDescriptionCompleted]}>
                      {item.description}
                    </Text>
                    {item.dueDate && !isCompleted && (
                      <View style={styles.dueDateContainer}>
                        <Ionicons name="calendar-outline" size={12} color={colors.ember} />
                        <Text style={styles.dueDateText}>
                          Due: {new Date(item.dueDate).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}

      {/* Personalized Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoCardHeader}>
          <View style={styles.infoCardIcon}>
            <Ionicons name="information-circle" size={24} color={colors.tagBlueText} />
          </View>
          <Text style={styles.infoCardTitle}>Other things on your tax return</Text>
        </View>
        <Text style={styles.infoCardDescription}>
          Depending on your situation, you may also see these on your Self Assessment:
        </Text>

        <View style={styles.infoLinks}>
          {studentLoanPlan && studentLoanPlan !== 'none' && (
            <TouchableOpacity
              style={styles.infoLink}
              onPress={() => Linking.openURL('https://www.gov.uk/repaying-your-student-loan/what-you-pay')}
            >
              <Text style={styles.infoLinkText}>Student loan repayments</Text>
              <Ionicons name="open-outline" size={14} color={colors.ink} />
            </TouchableOpacity>
          )}

          {hasInternationalIncome && (
            <TouchableOpacity
              style={styles.infoLink}
              onPress={() => Linking.openURL('https://www.gov.uk/tax-foreign-income/taxed-twice')}
            >
              <Text style={styles.infoLinkText}>Foreign tax relief</Text>
              <Ionicons name="open-outline" size={14} color={colors.ink} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.infoLink}
            onPress={() => Linking.openURL('https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025')}
          >
            <Text style={styles.infoLinkText}>National Insurance contributions</Text>
            <Ionicons name="open-outline" size={14} color={colors.ink} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoLink}
            onPress={() => Linking.openURL('https://www.gov.uk/self-assessment-tax-returns')}
          >
            <Text style={styles.infoLinkText}>Self Assessment overview</Text>
            <Ionicons name="open-outline" size={14} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Profile Completion */}
        {!isProfileComplete && (
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <Ionicons name="person-circle" size={24} color={colors.ink} />
              <Text style={styles.completionTitle}>Complete Your Profile</Text>
            </View>
            <Text style={styles.completionSubtitle}>
              Answer a few more questions below for more accurate tax estimates
            </Text>
          </View>
        )}

        {/* Your Details (Editable) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Details</Text>
          <Text style={styles.sectionHint}>Tap to edit</Text>
        </View>

        <View style={styles.infoCard}>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal('workType')}
            activeOpacity={0.6}
          >
            <Text style={styles.infoLabel}>Side Hustle</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue}>{getWorkTypeLabel(workType, customWorkType)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal('income')}
            activeOpacity={0.6}
          >
            <Text style={styles.infoLabel}>Monthly Income</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue}>{formatCurrency(monthlyIncome)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal('registration')}
            activeOpacity={0.6}
          >
            <Text style={styles.infoLabel}>Registration</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue}>{getRegistrationLabel(trackingGoal)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal('employment')}
            activeOpacity={0.6}
          >
            <Text style={styles.infoLabel}>Other Employment</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue}>
                {hasOtherEmployment
                  ? `${employmentIsPaye ? 'PAYE' : 'Contractor'} (${formatCurrency(employmentIncome)}/yr)`
                  : 'No'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal('studentLoan')}
            activeOpacity={0.6}
          >
            <Text style={styles.infoLabel}>Student Loan</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue}>{getStudentLoanLabel(studentLoanPlan)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal('taxRegion')}
            activeOpacity={0.6}
          >
            <Text style={styles.infoLabel}>Tax Region</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue}>{getTaxRegionLabel(taxRegion)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal('incomeOptions')}
            activeOpacity={0.6}
          >
            <Text style={styles.infoLabel}>Income Details</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue}>
                {receivesGiftedItems || hasInternationalIncome
                  ? [
                      receivesGiftedItems && 'Gifted items',
                      hasInternationalIncome && 'International',
                    ].filter(Boolean).join(', ')
                  : 'None'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal('bankAccounts')}
            activeOpacity={0.6}
          >
            <Text style={styles.infoLabel}>Bank Accounts</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue}>{bankAccountCount}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal('jobRole')}
            activeOpacity={0.6}
          >
            <Text style={styles.infoLabel}>Job Role</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue} numberOfLines={1}>{jobRole || 'Not set'}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal('mainClients')}
            activeOpacity={0.6}
          >
            <Text style={styles.infoLabel}>Main Clients</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue} numberOfLines={1}>
                {mainClients.filter(c => c.trim()).join(', ') || 'Not set'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal('workLocation')}
            activeOpacity={0.6}
          >
            <Text style={styles.infoLabel}>Work Location</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue}>
                {workLocationVal === 'home' ? 'From home'
                  : workLocationVal === 'office' ? 'Rented office'
                  : workLocationVal === 'coworking' ? 'Co-working space'
                  : workLocationVal === 'client_sites' ? 'Client sites'
                  : workLocationVal === 'on_the_road' ? 'On the road'
                  : workLocationVal === 'mixed' ? 'Mixed / varies'
                  : 'Not set'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Work Setup */}
        <Text style={styles.sectionTitle}>Work Setup</Text>
        <Text style={styles.sectionSubtitle}>Helps us suggest relevant expense categories</Text>

        {/* Work from home */}
        <View style={styles.questionCard}>
          <Text style={styles.questionTitle}>How often do you work from home?</Text>
          <Text style={styles.questionSubtitle}>
            You may be able to claim a portion of household bills
          </Text>

          <View style={styles.optionButtonsGrid}>
            {[
              { value: 'always', label: 'Always', sublabel: 'Full-time' },
              { value: 'mostly', label: 'Mostly', sublabel: '3-4 days/week' },
              { value: 'sometimes', label: 'Sometimes', sublabel: '1-2 days/week' },
              { value: 'rarely', label: 'Rarely', sublabel: 'Occasionally' },
              { value: 'never', label: 'Never', sublabel: '' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  workFromHomeOption === option.value && styles.optionButtonActive
                ]}
                onPress={() => setWorkFromHomeOption(option.value as WorkFromHomeOption)}
              >
                <Text style={[
                  styles.optionButtonText,
                  workFromHomeOption === option.value && styles.optionButtonTextActive
                ]}>
                  {option.label}
                </Text>
                {option.sublabel && (
                  <Text style={[
                    styles.optionButtonSubtext,
                    workFromHomeOption === option.value && styles.optionButtonSubtextActive
                  ]}>
                    {option.sublabel}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Vehicle use */}
        <View style={styles.questionCard}>
          <Text style={styles.questionTitle}>How often do you drive for work?</Text>
          <Text style={styles.questionSubtitle}>
            Business mileage can be claimed as an expense (45p/mile)
          </Text>

          <View style={styles.optionButtonsGrid}>
            {[
              { value: 'daily', label: 'Daily', sublabel: 'Every day' },
              { value: 'weekly', label: 'Weekly', sublabel: 'Few times/week' },
              { value: 'monthly', label: 'Monthly', sublabel: 'Few times/month' },
              { value: 'rarely', label: 'Rarely', sublabel: 'Occasionally' },
              { value: 'never', label: 'Never', sublabel: '' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  vehicleUseOption === option.value && styles.optionButtonActive
                ]}
                onPress={() => setVehicleUseOption(option.value as VehicleUseOption)}
              >
                <Text style={[
                  styles.optionButtonText,
                  vehicleUseOption === option.value && styles.optionButtonTextActive
                ]}>
                  {option.label}
                </Text>
                {option.sublabel && (
                  <Text style={[
                    styles.optionButtonSubtext,
                    vehicleUseOption === option.value && styles.optionButtonSubtextActive
                  ]}>
                    {option.sublabel}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Travel & International */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Travel & International</Text>
        <Text style={styles.sectionSubtitle}>International income and business travel</Text>

        {/* Foreign Income */}
        <View style={styles.questionCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.questionTitle}>Do you receive foreign income?</Text>
              <Text style={styles.questionSubtitle}>
                Income from clients or platforms based outside the UK
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, hasInternationalIncome && styles.toggleActive]}
              onPress={() => {
                setHasInternationalIncome(!hasInternationalIncome);
                if (hasInternationalIncome) {
                  setForeignIncomeCountries([]);
                }
              }}
            >
              <View style={[styles.toggleThumb, hasInternationalIncome && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          {hasInternationalIncome && (
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity
                style={styles.countrySelectButton}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.countrySelectLabel}>
                  {foreignIncomeCountries.length > 0
                    ? `${foreignIncomeCountries.length} ${foreignIncomeCountries.length === 1 ? 'country' : 'countries'} selected`
                    : 'Select countries'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.midGrey} />
              </TouchableOpacity>

              {foreignIncomeCountries.length > 0 && (
                <View style={styles.selectedCountriesContainer}>
                  {foreignIncomeCountries.map((code) => {
                    const country = ALL_COUNTRIES.find(c => c.code === code);
                    return country ? (
                      <View key={code} style={styles.selectedCountryChip}>
                        <Text style={styles.selectedCountryFlag}>{country.flag}</Text>
                        <Text style={styles.selectedCountryName}>{country.name}</Text>
                        <TouchableOpacity
                          onPress={() => setForeignIncomeCountries(prev => prev.filter(c => c !== code))}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="close-circle" size={18} color={colors.midGrey} />
                        </TouchableOpacity>
                      </View>
                    ) : null;
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Travel for Work */}
        <View style={styles.questionCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.questionTitle}>Do you travel a lot for work?</Text>
              <Text style={styles.questionSubtitle}>
                Business trips, attending events, meeting clients
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, travelsForWork && styles.toggleActive]}
              onPress={() => {
                setTravelsForWork(!travelsForWork);
                if (travelsForWork) {
                  setTravelDetails('');
                }
              }}
            >
              <View style={[styles.toggleThumb, travelsForWork && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          {travelsForWork && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.inputLabel}>Tell us more about your work travel</Text>
              <TextInput
                style={styles.textAreaInput}
                value={travelDetails}
                onChangeText={setTravelDetails}
                placeholder="e.g., I travel to London monthly for client meetings, attend 2-3 conferences per year..."
                placeholderTextColor={colors.midGrey}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Save Profile</Text>
              <Ionicons name="checkmark" size={20} color={colors.white} />
            </>
          )}
        </TouchableOpacity>

        {/* Connected Services - Hidden until Gmail OAuth is verified */}
        {GMAIL_INTEGRATION_ENABLED && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Connected Services</Text>
            <Text style={styles.sectionSubtitle}>Connect your email to help identify transactions</Text>

            <View style={styles.accountCard}>
              {/* Gmail Connection */}
              <TouchableOpacity
                style={styles.accountRow}
                onPress={gmailConnection ? handleDisconnectGmail : handleConnectGmail}
                disabled={connectingGmail}
              >
                <View style={styles.accountRowLeft}>
                  <View style={[styles.accountIcon, { backgroundColor: gmailConnection ? colors.tagGreenBg : colors.tagEmberBg }]}>
                    {connectingGmail ? (
                      <ActivityIndicator size="small" color={colors.ember} />
                    ) : (
                      <Ionicons
                        name={gmailConnection ? 'checkmark-circle' : 'logo-google'}
                        size={20}
                        color={gmailConnection ? colors.tagGreenText : colors.ember}
                      />
                    )}
                  </View>
                  <View>
                    <Text style={styles.accountRowText}>Gmail</Text>
                    {gmailConnection ? (
                      <Text style={styles.accountRowSubtext}>{gmailConnection.email}</Text>
                    ) : (
                      <Text style={styles.accountRowSubtext}>Not connected</Text>
                    )}
                  </View>
                </View>
                <View style={styles.connectionStatus}>
                  {gmailConnection ? (
                    <Text style={[styles.connectionStatusText, { color: colors.tagGreenText }]}>Connected</Text>
                  ) : (
                    <Text style={[styles.connectionStatusText, { color: colors.midGrey }]}>Connect</Text>
                  )}
                  <Ionicons
                    name={gmailConnection ? 'close-circle-outline' : 'chevron-forward'}
                    size={18}
                    color={gmailConnection ? colors.ember : colors.midGrey}
                  />
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Outlook - Coming Soon */}
              <View style={[styles.accountRow, { opacity: 0.5 }]}>
                <View style={styles.accountRowLeft}>
                  <View style={[styles.accountIcon, { backgroundColor: colors.parchment }]}>
                    <Ionicons name="mail" size={20} color={colors.ink} />
                  </View>
                  <View>
                    <Text style={styles.accountRowText}>Outlook</Text>
                    <Text style={styles.accountRowSubtext}>Coming soon</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.accountHint}>
              Connected email accounts help bopp find receipts and invoices to jog your memory when categorizing transactions.
            </Text>
          </>
        )}

        {/* Account Management */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Account</Text>

        {/* Email display */}
        {userEmail && (
          <View style={styles.emailCard}>
            <Ionicons name="mail-outline" size={18} color={colors.midGrey} />
            <Text style={styles.emailText}>{userEmail}</Text>
          </View>
        )}

        <View style={styles.accountCard}>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => setShowChangeEmailModal(true)}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: colors.parchment }]}>
                <Ionicons name="at-outline" size={20} color={colors.tagBlueText} />
              </View>
              <Text style={styles.accountRowText}>Change Email</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.accountRow}
            onPress={handleResetPassword}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: colors.parchment }]}>
                <Ionicons name="key-outline" size={20} color={colors.ink} />
              </View>
              <Text style={styles.accountRowText}>Reset Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.accountRow}
            onPress={handleManageSubscription}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: colors.tagGreenBg }]}>
                <Ionicons name="card-outline" size={20} color={colors.tagGreenText} />
              </View>
              <View>
                <Text style={styles.accountRowText}>Subscription</Text>
                <Text style={styles.accountRowSubtext}>Free Beta</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
          </TouchableOpacity>
        </View>

        {/* Support & Legal */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Support & Legal</Text>

        <View style={styles.accountCard}>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={handleContactSupport}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: colors.tagEmberBg }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.ember} />
              </View>
              <Text style={styles.accountRowText}>Contact Support</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.midGrey} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.accountRow}
            onPress={handlePrivacyPolicy}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: colors.mist }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.midGrey} />
              </View>
              <Text style={styles.accountRowText}>Privacy Policy</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.midGrey} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.accountRow}
            onPress={handleTermsOfService}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: colors.mist }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.midGrey} />
              </View>
              <Text style={styles.accountRowText}>Terms of Service</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.midGrey} />
          </TouchableOpacity>
        </View>

        {/* Sign Out & Delete */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Session</Text>

        <View style={styles.accountCard}>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={handleSignOut}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: colors.mist }]}>
                <Ionicons name="log-out-outline" size={20} color={colors.midGrey} />
              </View>
              <Text style={styles.accountRowText}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.accountRow}
            onPress={handleDeleteAccount}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: colors.tagEmberBg }]}>
                <Ionicons name="trash-outline" size={20} color={colors.ember} />
              </View>
              <Text style={[styles.accountRowText, { color: colors.ember }]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.ember} />
          </TouchableOpacity>
        </View>

        <Text style={styles.accountHint}>
          Deleting your account will permanently remove all your data including transactions, receipts, and profile information.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {renderEditModal()}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  loadProfile(); // Reset to saved values
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.confirmButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Email Modal */}
      <Modal
        visible={showChangeEmailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChangeEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Email</Text>
            <Text style={styles.modalSubtitle}>
              Enter your new email address. We'll send a verification link to confirm.
            </Text>
            <View style={styles.customInputContainer}>
              <TextInput
                style={styles.customInput}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="new@email.com"
                placeholderTextColor={colors.midGrey}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowChangeEmailModal(false);
                  setNewEmail('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleChangeEmail}
              >
                <Text style={styles.confirmButtonText}>Send Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.countryPickerHeader}>
              <Text style={styles.modalTitle}>Select Countries</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Choose the countries where your foreign income comes from
            </Text>
            <ScrollView style={styles.countryPickerList} showsVerticalScrollIndicator={false}>
              {ALL_COUNTRIES.map((country) => {
                const isSelected = foreignIncomeCountries.includes(country.code);
                return (
                  <TouchableOpacity
                    key={country.code}
                    style={[styles.countryPickerItem, isSelected && styles.countryPickerItemSelected]}
                    onPress={() => {
                      if (isSelected) {
                        setForeignIncomeCountries(prev => prev.filter(c => c !== country.code));
                      } else {
                        setForeignIncomeCountries(prev => [...prev, country.code]);
                      }
                    }}
                  >
                    <View style={styles.countryPickerItemLeft}>
                      <Text style={styles.countryPickerFlag}>{country.flag}</Text>
                      <Text style={[styles.countryPickerName, isSelected && styles.countryPickerNameSelected]}>
                        {country.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.ink} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, { marginTop: 16 }]}
              onPress={() => setShowCountryPicker(false)}
            >
              <Text style={styles.confirmButtonText}>Done ({foreignIncomeCountries.length} selected)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#141414',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.mist,
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.midGrey,
  },
  tabTextActive: {
    color: colors.ink,
  },
  tabBadge: {
    backgroundColor: colors.tagGreenText,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: fonts.display,
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  completionCard: {
    backgroundColor: colors.tagEmberBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  completionSubtitle: {
    fontSize: 14,
    color: colors.midGrey,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.ink,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.midGrey,
    marginBottom: 16,
    marginTop: -4,
  },
  infoCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#141414',
  },
  infoLabel: {
    fontSize: 14,
    color: colors.midGrey,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
  },
  // Account management styles
  accountCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accountRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountRowText: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  accountHint: {
    fontSize: 12,
    color: colors.midGrey,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  accountRowSubtext: {
    fontSize: 12,
    color: colors.midGrey,
    marginTop: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionStatusText: {
    fontSize: 13,
    fontFamily: fonts.body,
  },
  emailCard: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emailText: {
    fontSize: 14,
    color: colors.midGrey,
    flex: 1,
  },
  questionCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  questionTitle: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 4,
  },
  questionSubtitle: {
    fontSize: 13,
    color: colors.midGrey,
    marginBottom: 16,
  },
  optionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#141414',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: '30%',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  optionButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.midGrey,
  },
  optionButtonTextActive: {
    color: colors.white,
  },
  optionButtonSubtext: {
    fontSize: 11,
    color: colors.midGrey,
    marginTop: 2,
  },
  optionButtonSubtextActive: {
    color: colors.mist,
  },
  saveButton: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.midGrey,
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.body,
    marginBottom: spacing.md,
  },
  modalValue: {
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalSlider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabelText: {
    fontSize: 12,
    color: colors.midGrey,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#141414',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionItemActive: {
    borderColor: colors.ink,
    backgroundColor: '#0A0A0A',
  },
  optionWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 15,
    color: colors.midGrey,
  },
  optionTextActive: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
  },
  optionHint: {
    fontSize: 12,
    color: colors.midGrey,
    marginTop: 2,
  },
  subSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  subSectionLabel: {
    fontSize: 14,
    color: colors.midGrey,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.mist,
  },
  confirmButton: {
    backgroundColor: colors.ink,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.midGrey,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
  customInputContainer: {
    marginTop: 8,
  },
  customInput: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  checkboxList: {
    gap: 12,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.ink,
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 2,
  },
  checkboxHint: {
    fontSize: 13,
    color: colors.midGrey,
  },
  // Checklist tab styles - Achievement Card
  achievementCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  achievementIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.volt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementHeaderText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 2,
  },
  achievementSubtitle: {
    fontSize: 13,
    color: colors.midGrey,
  },
  // Tracking cards within achievement section
  trackingCard: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackingInfo: {
    flex: 1,
  },
  trackingLabel: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 2,
  },
  trackingStatus: {
    fontSize: 12,
    color: colors.midGrey,
  },
  trackingProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  trackingProgressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackingProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tagGreenBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  trackingBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: colors.tagGreenText,
  },
  // Overall progress card
  progressCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  progressCount: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.tagGreenText,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: colors.midGrey,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  clItem: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  clItemCompleted: {
    opacity: 0.6,
  },
  clCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.midGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  clCheckboxChecked: {
    backgroundColor: colors.tagGreenText,
    borderColor: colors.tagGreenText,
  },
  clItemContent: {
    flex: 1,
  },
  clItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  clItemTitle: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    flex: 1,
  },
  clItemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.midGrey,
  },
  clItemDescription: {
    fontSize: 13,
    color: colors.midGrey,
    lineHeight: 18,
  },
  clItemDescriptionCompleted: {
    color: colors.midGrey,
  },
  priorityBadge: {
    backgroundColor: colors.tagEmberBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    color: colors.ember,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: colors.ember,
    fontFamily: fonts.body,
  },
  // Toggle styles
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: colors.mist,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.ink,
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Country select styles
  countrySelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  countrySelectLabel: {
    fontSize: 15,
    color: colors.midGrey,
  },
  selectedCountriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectedCountryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  selectedCountryFlag: {
    fontSize: 16,
  },
  selectedCountryName: {
    fontSize: 13,
    color: colors.ink,
  },
  // Text area input
  inputLabel: {
    fontSize: 14,
    color: colors.midGrey,
    marginBottom: 8,
  },
  textAreaInput: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.ink,
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  // Country picker modal
  countryPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  countryPickerList: {
    maxHeight: 400,
  },
  countryPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  countryPickerItemSelected: {
    backgroundColor: '#141414',
  },
  countryPickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryPickerFlag: {
    fontSize: 24,
  },
  countryPickerName: {
    fontSize: 15,
    color: colors.ink,
  },
  countryPickerNameSelected: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
  },
  taxDisclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  taxDisclaimerText: {
    flex: 1,
    fontSize: 12,
    color: colors.midGrey,
    lineHeight: 18,
  },
  // Info Card Styles
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.tagBlueBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCardTitle: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ink,
    flex: 1,
  },
  infoCardDescription: {
    fontSize: 13,
    color: colors.midGrey,
    lineHeight: 18,
    marginBottom: 16,
  },
  infoLinks: {
    gap: 8,
  },
  infoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoLinkText: {
    fontSize: 14,
    color: colors.ink,
    fontFamily: fonts.bodyBold,
  },
});
