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
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Required for web browser redirect
WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

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
  registration: '#7C3AED',
  tracking: '#3B82F6',
  deadline: '#FF6B6B',
  preparation: '#10B981',
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
  const [trackingGoal, setTrackingGoal] = useState('sole_trader');
  const [workType, setWorkType] = useState('content_creation');
  const [customWorkType, setCustomWorkType] = useState('');
  const [receivesGiftedItems, setReceivesGiftedItems] = useState(false);
  const [hasInternationalIncome, setHasInternationalIncome] = useState(false);

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

      items.push({
        id: 'foreign_tax_credit',
        title: 'Claim Foreign Tax Credit Relief',
        description: 'If tax was withheld abroad, you may be able to claim relief on your UK tax return to avoid paying tax twice on the same income.',
        category: 'preparation',
        completed: false,
        relevantTo: ['international'],
        priority: 'medium',
      });

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

    // Set aside money
    const monthlyIncomeVal = userProfile?.monthly_income || 0;
    const yearlyIncome = monthlyIncomeVal * 12;
    let taxBand = '20%';
    let estimatedTax = yearlyIncome * 0.2;

    if (yearlyIncome > 50270) {
      taxBand = '40%';
      estimatedTax = (50270 - 12570) * 0.2 + (yearlyIncome - 50270) * 0.4;
    }
    if (yearlyIncome <= 12570) {
      estimatedTax = 0;
    }

    items.push({
      id: 'set_aside',
      title: 'Set aside money for tax',
      description: `Based on your income, consider saving ~${Math.round(estimatedTax / 12)}/month for tax (${taxBand} bracket).`,
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
      id: 'review_allowances',
      title: 'Check available allowances',
      description: 'Review trading allowance (£1,000), capital allowances, and other deductions you can claim.',
      category: 'preparation',
      completed: false,
      relevantTo: ['all'],
      priority: 'medium',
    });

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
      setTrackingGoal(data.tracking_goal || 'sole_trader');
      setWorkType(data.work_type || 'content_creation');
      setCustomWorkType(data.custom_work_type || '');
      setReceivesGiftedItems(data.receives_gifted_items || false);
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
          tracking_goal: trackingGoal,
          work_type: workType,
          custom_work_type: workType === 'other' ? customWorkType : null,
          receives_gifted_items: receivesGiftedItems,
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
      postgrad: 'Postgraduate',
    };
    return labels[plan] || plan;
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
          <ActivityIndicator size="large" color="#7C3AED" />
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
              minimumTrackTintColor="#7C3AED"
              maximumTrackTintColor="rgba(255,255,255,0.2)"
              thumbTintColor="#FF6B6B"
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
                {!hasOtherEmployment && <Ionicons name="checkmark" size={20} color="#7C3AED" />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionItem, hasOtherEmployment && styles.optionItemActive]}
                onPress={() => setHasOtherEmployment(true)}
              >
                <Text style={[styles.optionText, hasOtherEmployment && styles.optionTextActive]}>
                  Yes, I have a day job
                </Text>
                {hasOtherEmployment && <Ionicons name="checkmark" size={20} color="#7C3AED" />}
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
                        <Ionicons name="card-outline" size={20} color={employmentIsPaye ? '#7C3AED' : '#9CA3AF'} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.optionText, employmentIsPaye && styles.optionTextActive]}>
                            PAYE (employee)
                          </Text>
                          <Text style={styles.optionHint}>Tax deducted from salary automatically</Text>
                        </View>
                      </View>
                      {employmentIsPaye && <Ionicons name="checkmark" size={20} color="#7C3AED" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.optionItem, !employmentIsPaye && styles.optionItemActive]}
                      onPress={() => setEmploymentIsPaye(false)}
                    >
                      <View style={styles.optionWithIcon}>
                        <Ionicons name="document-text-outline" size={20} color={!employmentIsPaye ? '#7C3AED' : '#9CA3AF'} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.optionText, !employmentIsPaye && styles.optionTextActive]}>
                            Contractor/Freelance
                          </Text>
                          <Text style={styles.optionHint}>I invoice and pay my own tax</Text>
                        </View>
                      </View>
                      {!employmentIsPaye && <Ionicons name="checkmark" size={20} color="#7C3AED" />}
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
                    minimumTrackTintColor="#7C3AED"
                    maximumTrackTintColor="rgba(255,255,255,0.2)"
                    thumbTintColor="#FF6B6B"
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
                { value: 'plan2', label: 'Plan 2 (started 2012 or later)' },
                { value: 'plan4', label: 'Plan 4 (Scotland)' },
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
                  {studentLoanPlan === option.value && <Ionicons name="checkmark" size={20} color="#7C3AED" />}
                </TouchableOpacity>
              ))}
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
                    <Ionicons name={option.icon as any} size={20} color={trackingGoal === option.value ? '#7C3AED' : '#9CA3AF'} />
                    <Text style={[styles.optionText, trackingGoal === option.value && styles.optionTextActive]}>
                      {option.label}
                    </Text>
                  </View>
                  {trackingGoal === option.value && <Ionicons name="checkmark" size={20} color="#7C3AED" />}
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
                    <Ionicons name={option.icon as any} size={20} color={workType === option.value ? '#7C3AED' : '#9CA3AF'} />
                    <Text style={[styles.optionText, workType === option.value && styles.optionTextActive]}>
                      {option.label}
                    </Text>
                  </View>
                  {workType === option.value && <Ionicons name="checkmark" size={20} color="#7C3AED" />}
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
                    placeholderTextColor="#64748B"
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
                  {receivesGiftedItems && <Ionicons name="checkmark" size={16} color="#fff" />}
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
                  {hasInternationalIncome && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxLabel}>I have international income</Text>
                  <Text style={styles.checkboxHint}>Income from outside the UK</Text>
                </View>
              </TouchableOpacity>
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
            <Ionicons name="rocket" size={24} color="#7C3AED" />
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
            <View style={[styles.trackingIconContainer, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="trending-up" size={20} color="#10B981" />
            </View>
            <View style={styles.trackingInfo}>
              <Text style={styles.trackingLabel}>Track all income sources</Text>
              <Text style={styles.trackingStatus}>
                {trackingStats.categorizedIncomeCount > 0
                  ? `${trackingStats.categorizedIncomeCount} income transaction${trackingStats.categorizedIncomeCount !== 1 ? 's' : ''} tracked`
                  : 'Start tracking your income'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </View>
          {trackingStats.categorizedIncomeCount > 0 && (
            <View style={styles.trackingProgressContainer}>
              <View style={[styles.trackingProgressBar, { backgroundColor: '#10B98130' }]}>
                <View style={[styles.trackingProgressFill, { width: '100%', backgroundColor: '#10B981' }]} />
              </View>
              <View style={styles.trackingBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
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
            <View style={[styles.trackingIconContainer, { backgroundColor: '#7C3AED20' }]}>
              <Ionicons name="receipt-outline" size={20} color="#7C3AED" />
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
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </View>
          {(trackingStats.uncategorizedCount > 0 || trackingStats.categorizedExpenseCount > 0) && (
            <View style={styles.trackingProgressContainer}>
              <View style={[styles.trackingProgressBar, { backgroundColor: '#7C3AED30' }]}>
                <View
                  style={[
                    styles.trackingProgressFill,
                    {
                      width: trackingStats.totalTransactions > 0
                        ? `${Math.round((trackingStats.categorizedExpenseCount / (trackingStats.categorizedExpenseCount + trackingStats.uncategorizedCount)) * 100)}%`
                        : '0%',
                      backgroundColor: '#7C3AED'
                    }
                  ]}
                />
              </View>
              {trackingStats.uncategorizedCount > 0 ? (
                <View style={[styles.trackingBadge, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="time" size={14} color="#F59E0B" />
                  <Text style={[styles.trackingBadgeText, { color: '#F59E0B' }]}>
                    {trackingStats.uncategorizedCount} pending
                  </Text>
                </View>
              ) : (
                <View style={styles.trackingBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
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
              <View style={[styles.trackingIconContainer, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="document-text-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.trackingInfo}>
                <Text style={styles.trackingLabel}>Add receipts & evidence</Text>
                <Text style={styles.trackingStatus}>
                  {trackingStats.unqualifiedExpenseCount > 0
                    ? `${trackingStats.unqualifiedExpenseCount} expense${trackingStats.unqualifiedExpenseCount !== 1 ? 's' : ''} need evidence`
                    : 'All expenses qualified'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            </View>
            <View style={styles.trackingProgressContainer}>
              <View style={[styles.trackingProgressBar, { backgroundColor: '#F59E0B30' }]}>
                <View
                  style={[
                    styles.trackingProgressFill,
                    {
                      width: `${expenseProgress}%`,
                      backgroundColor: expenseProgress === 100 ? '#10B981' : '#F59E0B'
                    }
                  ]}
                />
              </View>
              {trackingStats.unqualifiedExpenseCount === 0 ? (
                <View style={styles.trackingBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.trackingBadgeText}>HMRC ready</Text>
                </View>
              ) : (
                <View style={[styles.trackingBadge, { backgroundColor: '#F59E0B20' }]}>
                  <Text style={[styles.trackingBadgeText, { color: '#F59E0B' }]}>
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
              <View style={[styles.trackingIconContainer, { backgroundColor: '#EC489920' }]}>
                <Ionicons name="gift-outline" size={20} color="#EC4899" />
              </View>
              <View style={styles.trackingInfo}>
                <Text style={styles.trackingLabel}>Track gifted items</Text>
                <Text style={styles.trackingStatus}>
                  {trackingStats.giftedItemsCount > 0
                    ? `${trackingStats.giftedItemsCount} item${trackingStats.giftedItemsCount !== 1 ? 's' : ''} logged`
                    : 'Log PR packages & gifts'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            </View>
            {trackingStats.giftedItemsCount > 0 && (
              <View style={styles.trackingProgressContainer}>
                <View style={[styles.trackingProgressBar, { backgroundColor: '#EC489930' }]}>
                  <View style={[styles.trackingProgressFill, { width: '100%', backgroundColor: '#EC4899' }]} />
                </View>
                <View style={styles.trackingBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
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
                    {isCompleted && <Ionicons name="checkmark" size={16} color="#fff" />}
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
                        <Ionicons name="calendar-outline" size={12} color="#FF6B6B" />
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
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons
            name="person-outline"
            size={18}
            color={activeTab === 'profile' ? '#7C3AED' : '#9CA3AF'}
          />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'checklist' && styles.tabActive]}
          onPress={() => setActiveTab('checklist')}
        >
          <Ionicons
            name="checkbox-outline"
            size={18}
            color={activeTab === 'checklist' ? '#10B981' : '#9CA3AF'}
          />
          <Text style={[styles.tabText, activeTab === 'checklist' && styles.tabTextActive]}>Tax Checklist</Text>
          {completedCount < totalCount && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{totalCount - completedCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'checklist' ? renderChecklistTab() : (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Profile Completion */}
        {!isProfileComplete && (
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <Ionicons name="person-circle" size={24} color="#7C3AED" />
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
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
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
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
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
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
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
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
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
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
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
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
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
                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
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
                          <Ionicons name="close-circle" size={18} color="#9CA3AF" />
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
                placeholderTextColor="#6B7280"
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
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Save Profile</Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        {/* Connected Services */}
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
              <View style={[styles.accountIcon, { backgroundColor: gmailConnection ? '#10B98120' : '#EA433520' }]}>
                {connectingGmail ? (
                  <ActivityIndicator size="small" color="#EA4335" />
                ) : (
                  <Ionicons
                    name={gmailConnection ? 'checkmark-circle' : 'logo-google'}
                    size={20}
                    color={gmailConnection ? '#10B981' : '#EA4335'}
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
                <Text style={[styles.connectionStatusText, { color: '#10B981' }]}>Connected</Text>
              ) : (
                <Text style={[styles.connectionStatusText, { color: '#9CA3AF' }]}>Connect</Text>
              )}
              <Ionicons
                name={gmailConnection ? 'close-circle-outline' : 'chevron-forward'}
                size={18}
                color={gmailConnection ? '#EF4444' : '#6B7280'}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Outlook - Coming Soon */}
          <View style={[styles.accountRow, { opacity: 0.5 }]}>
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: '#0078D420' }]}>
                <Ionicons name="mail" size={20} color="#0078D4" />
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

        {/* Account Management */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Account</Text>

        {/* Email display */}
        {userEmail && (
          <View style={styles.emailCard}>
            <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
            <Text style={styles.emailText}>{userEmail}</Text>
          </View>
        )}

        <View style={styles.accountCard}>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => setShowChangeEmailModal(true)}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="at-outline" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.accountRowText}>Change Email</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.accountRow}
            onPress={handleResetPassword}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: '#7C3AED20' }]}>
                <Ionicons name="key-outline" size={20} color="#7C3AED" />
              </View>
              <Text style={styles.accountRowText}>Reset Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.accountRow}
            onPress={handleManageSubscription}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="card-outline" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.accountRowText}>Subscription</Text>
                <Text style={styles.accountRowSubtext}>Free Beta</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
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
              <View style={[styles.accountIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.accountRowText}>Contact Support</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.accountRow}
            onPress={handlePrivacyPolicy}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: '#6B728020' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" />
              </View>
              <Text style={styles.accountRowText}>Privacy Policy</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.accountRow}
            onPress={handleTermsOfService}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: '#6B728020' }]}>
                <Ionicons name="document-text-outline" size={20} color="#9CA3AF" />
              </View>
              <Text style={styles.accountRowText}>Terms of Service</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#6B7280" />
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
              <View style={[styles.accountIcon, { backgroundColor: '#6B728020' }]}>
                <Ionicons name="log-out-outline" size={20} color="#9CA3AF" />
              </View>
              <Text style={styles.accountRowText}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.accountRow}
            onPress={handleDeleteAccount}
          >
            <View style={styles.accountRowLeft}>
              <View style={[styles.accountIcon, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.accountRowText, { color: '#EF4444' }]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <Text style={styles.accountHint}>
          Deleting your account will permanently remove all your data including transactions, receipts, and profile information.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
      )}

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
                placeholderTextColor="#64748B"
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
                <Ionicons name="close" size={24} color="#fff" />
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
                      <Ionicons name="checkmark-circle" size={24} color="#7C3AED" />
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
    backgroundColor: '#2E1A47',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 4,
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
    backgroundColor: '#2E1A47',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  completionCard: {
    backgroundColor: '#7C3AED15',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#7C3AED30',
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  completionSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sectionHint: {
    fontSize: 12,
    color: '#7C3AED',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
    marginTop: -4,
  },
  infoCard: {
    backgroundColor: '#1F1333',
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
    backgroundColor: '#1F1333',
  },
  infoLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  // Account management styles
  accountCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
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
    fontWeight: '600',
    color: '#fff',
  },
  accountHint: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  accountRowSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emailCard: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emailText: {
    fontSize: 14,
    color: '#9CA3AF',
    flex: 1,
  },
  questionCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  questionSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
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
    backgroundColor: '#2E1A47',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: '30%',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#7C3AED20',
    borderColor: '#7C3AED',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  optionButtonSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  optionButtonSubtextActive: {
    color: '#9CA3AF',
  },
  saveButton: {
    backgroundColor: '#7C3AED',
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
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F1333',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  modalValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#7C3AED',
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
    color: '#6B7280',
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
    backgroundColor: '#2E1A47',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionItemActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#7C3AED15',
  },
  optionWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  optionHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  subSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  subSectionLabel: {
    fontSize: 14,
    color: '#9CA3AF',
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
    backgroundColor: '#2E1A47',
  },
  confirmButton: {
    backgroundColor: '#7C3AED',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  customInputContainer: {
    marginTop: 8,
  },
  customInput: {
    backgroundColor: '#2E1A47',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 2,
    borderColor: '#7C3AED30',
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
    backgroundColor: '#2E1A47',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#7C3AED',
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  checkboxHint: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  // Checklist tab styles - Achievement Card
  achievementCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#7C3AED40',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2E1A47',
  },
  achievementIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#7C3AED20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementHeaderText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  achievementSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  // Tracking cards within achievement section
  trackingCard: {
    backgroundColor: '#2E1A47',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
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
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  trackingStatus: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  trackingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  // Overall progress card
  progressCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#7C3AED30',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#2E1A47',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#9CA3AF',
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
    fontWeight: '700',
    color: '#fff',
  },
  clItem: {
    flexDirection: 'row',
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  clItemCompleted: {
    opacity: 0.6,
  },
  clCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  clCheckboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
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
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  clItemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  clItemDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  clItemDescriptionCompleted: {
    color: '#6B7280',
  },
  priorityBadge: {
    backgroundColor: '#FF6B6B20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
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
    backgroundColor: '#3C2A52',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#7C3AED',
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Country select styles
  countrySelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3C2A52',
    borderRadius: 12,
    padding: 16,
  },
  countrySelectLabel: {
    fontSize: 15,
    color: '#9CA3AF',
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
    backgroundColor: '#3C2A52',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  selectedCountryFlag: {
    fontSize: 16,
  },
  selectedCountryName: {
    fontSize: 13,
    color: '#fff',
  },
  // Text area input
  inputLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  textAreaInput: {
    backgroundColor: '#3C2A52',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#fff',
    minHeight: 100,
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
    backgroundColor: '#7C3AED20',
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
    color: '#fff',
  },
  countryPickerNameSelected: {
    color: '#7C3AED',
    fontWeight: '600',
  },
});
