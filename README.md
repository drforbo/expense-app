# Bopp - AI-Powered Expense Tracking for UK Creators

Bopp is a gamified mobile bookkeeping app designed specifically for UK content creators and freelancers. It uses AI to categorize expenses by asking behavioral questions instead of confusing tax jargon.

## 🎯 What Makes Bopp Different

- **Behavioral Questions**: Instead of "Is this a business expense?", we ask "What did you film with this?"
- **AI-Powered Categorization**: Automatic HMRC-compliant tax categorization
- **Gamified Experience**: Duolingo-style streaks and rewards for staying on top of expenses
- **Creator-Focused**: Built specifically for content creators, freelancers, and side hustlers

## 🎨 Brand

- **Colors**: Deep purple (#2E1A47), Electric violet (#7C3AED), Bright coral (#FF6B6B)
- **Vibe**: Duolingo-inspired gamified energy
- **Target**: UK content creators earning £1k-50k/year

## ✅ Current Features (Working)

### Onboarding Flow
- Welcome screen with brand intro
- 5-question personalized onboarding:
  - Work type (content creation, freelancing, side hustle)
  - Time commitment
  - Monthly income slider
  - Gifted items tracking
  - International income
  - Business registration status
- AI-generated personalized tax guide (via Claude API)
- "How Bopp Helps" feature showcase

### Payment Flow
- £2.99 first month intro offer
- Supabase authentication (email/password)
- Payment info collection (ready for RevenueCat)
- Completion screen with profile summary

### Tech Infrastructure
- React Native (Expo)
- TypeScript
- Supabase for auth and database
- Express.js backend for AI guide generation
- React Navigation for app structure

## 🏗️ Project Structure

```
expense-app/
├── App.tsx                          # Entry point
├── AppNavigator.tsx                 # Navigation configuration
├── OnboardingFlowScreen.tsx         # Onboarding wrapper
│
├── screens/
│   ├── dashboard/
│   │   └── DashboardScreen.tsx      # Main app (in progress)
│   └── onboarding/
│       ├── WelcomeScreen.tsx        # Brand introduction
│       ├── OnboardingFlow.tsx       # 5 questions + AI guides
│       ├── PaymentFlow.tsx          # Payment intro screen
│       ├── SignUpScreen.tsx         # Create account
│       └── PaymentInfoScreen.tsx    # Payment details
│
├── lib/
│   ├── supabase.ts                  # Supabase client config
│   └── components.tsx               # Shared components
│
└── archive/                         # Old/unused files
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js 16+
- Expo CLI
- iOS Simulator or Android Emulator (or Expo Go app)

### 1. Install Dependencies

```bash
cd ~/Desktop/expense-app
npm install
```

### 2. Environment Variables

Create a `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start Backend Server

```bash
cd ~/Desktop/expense-app-server
node server.js
# Server runs on http://localhost:3000
```

Update your local IP in `OnboardingFlow.tsx` (line ~111):
```typescript
const API_URL = 'http://YOUR_IP:3000';
```

### 4. Start Expo App

```bash
cd ~/Desktop/expense-app
npx expo start
```

Scan QR code with Expo Go app or press `i` for iOS simulator.

## 🎮 Testing the Flow

1. **Welcome Screen** → Tap "Get Started"
2. **Onboarding Questions** → Answer 5 questions about your work
3. **AI Personalized Guide** → See your custom tax guidance
4. **How Bopp Helps** → Feature showcase
5. **Payment Intro** → £2.99 offer screen
6. **Create Account** → Sign up with email/password
7. **Payment Info** → Enter payment details (not processed yet)
8. **Dashboard** → Main app (placeholder for now)

### Dev Tools

- **Reset Onboarding**: In DashboardScreen, tap "Reset Onboarding", then restart app

## 🛠️ Tech Stack

**Frontend:**
- React Native (Expo SDK 52)
- TypeScript
- React Navigation 7
- Expo Vector Icons
- React Native Markdown Display
- AsyncStorage

**Backend:**
- Express.js
- Anthropic Claude API (for personalized guides)
- Supabase (auth + database)

**Payment (Planned):**
- RevenueCat for subscriptions
- Apple Pay / Google Pay integration

## 📱 Screens Overview

| Screen | Status | Description |
|--------|--------|-------------|
| Welcome | ✅ Done | Brand intro with rocket animation |
| Onboarding | ✅ Done | 5 behavioral questions |
| AI Guide 1 | ✅ Done | Personalized tax guidance |
| AI Guide 2 | ✅ Done | How Bopp helps you |
| Payment Intro | ✅ Done | £2.99 first month offer |
| Sign Up | ✅ Done | Email/password creation |
| Payment Info | ✅ Done | Card details collection |
| Complete | ✅ Done | Success + profile summary |
| Dashboard | 🚧 In Progress | Main app home |
| Add Expense | ⏳ To Do | Receipt scanning |
| Expense List | ⏳ To Do | View all expenses |
| Reports | ⏳ To Do | Tax reports |
| Settings | ⏳ To Do | Account settings |

## 🎯 Next Steps

### Phase 1: Core Expense Tracking
- [ ] Dashboard home screen design
- [ ] Camera integration for receipt scanning
- [ ] Manual expense entry
- [ ] Expense list view
- [ ] Basic categorization

### Phase 2: Bank Integration
- [ ] Plaid integration
- [ ] Automatic transaction import
- [ ] Transaction categorization

### Phase 3: AI & Gamification
- [ ] AI-powered expense categorization
- [ ] Streak system
- [ ] Badges and achievements
- [ ] Daily reminders

### Phase 4: Tax & Compliance
- [ ] HMRC-compliant reports
- [ ] Tax estimation
- [ ] Quarterly reminders
- [ ] Export to accountant format

## 🔐 Environment Setup

### Supabase Tables

**users** table (managed by Supabase Auth)

**onboarding_data** table:
```sql
create table onboarding_data (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  work_type text not null,
  custom_work_type text,
  time_commitment text not null,
  monthly_income integer not null,
  receives_gifted_items boolean not null,
  has_international_income boolean not null,
  tracking_goal text not null,
  created_at timestamp default now()
);
```

## 📝 Notes

- **iOS Autofill**: Password fields use light purple background to work with iOS autofill styling
- **Payment Processing**: Not yet integrated - card details are collected but not processed
- **Onboarding Persistence**: Uses AsyncStorage to remember completion status
- **AI Guide**: Requires backend server running for personalized tax guidance

## 🐛 Known Issues

- [ ] iOS password autofill creates yellow highlight (mitigated with light purple inputs)
- [ ] Payment intro screen needs to fit without scrolling on smaller devices
- [ ] Backend server needs environment variable for local IP (not hardcoded)

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ for UK content creators**