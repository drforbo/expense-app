# Bopp - AI-Powered Expense Tracking for UK Creators

Bopp is a mobile bookkeeping app built for UK content creators, freelancers, and side hustlers. It reads bank statements, uses AI to categorise transactions into HMRC-compliant categories, and helps users build evidence for their tax return — all through simple, jargon-free language.

## What Makes Bopp Different

- **Bank statement upload** — upload PDF statements and Bopp reads them automatically
- **AI categorisation** — Claude classifies transactions into HMRC expense categories with a learning loop
- **Evidence qualification** — guided flow to attach receipts, links, and business-use explanations
- **Tax estimation** — real-time estimated tax bill based on income, expenses, and personal allowance
- **Export for accountants** — ZIP bundle with CSV transactions + receipt images
- **Creator-focused** — built for content creators, freelancers, and resellers earning £1k–50k/year

## Design

- **Style**: Light mode, editorial typography, orange-to-red gradients
- **Fonts**: Poppins (Black, ExtraBold, Bold, SemiBold, Regular)
- **Palette**: White (#FFFFFF) backgrounds, #F9F9F9 surfaces, gradient (#FF8C00 → #FF4500 → #CC1A00)
- **Design system**: See `lib/theme.ts`

## Tech Stack

**App (this repo):**
- React Native / Expo SDK 54
- TypeScript
- Supabase Auth + PostgreSQL
- Poppins custom fonts (in `assets/fonts/`)
- expo-linear-gradient, expo-file-system, expo-sharing
- React Navigation 7

**Server ([expense-app-server](https://github.com/drforbo/expense-app-server)):**
- Node.js / Express
- Claude API (claude-sonnet-4-6) for transaction categorisation
- Supabase Storage for receipt images
- archiver for ZIP export bundling
- Deployed on Railway

## Project Structure

```
expense-app/
├── App.tsx                              # Entry point, font loading
├── AppNavigator.tsx                     # Tab + stack navigation
├── context/
│   └── UploadContext.tsx                 # Upload state management
├── lib/
│   ├── theme.ts                         # Design tokens (colors, fonts, spacing)
│   ├── api.ts                           # API client helpers
│   ├── supabase.ts                      # Supabase client config
│   ├── notifications.ts                 # Push notification setup
│   └── components.tsx                   # Shared UI components
├── assets/fonts/                        # Poppins .ttf files
├── screens/
│   ├── onboarding/
│   │   ├── WelcomeScreen.tsx            # Brand intro
│   │   ├── SimpleOnboarding.tsx         # Multi-step onboarding questions
│   │   ├── OnboardingFlow.tsx           # AI-generated tax guide
│   │   ├── OnboardingStep.tsx           # Guide step component
│   │   ├── QuickGuide.tsx               # Feature showcase
│   │   ├── SignUpScreen.tsx             # Account creation
│   │   ├── PaymentFlow.tsx              # Payment intro
│   │   └── PaymentInfoScreen.tsx        # Card details
│   ├── dashboard/
│   │   └── DashboardScreen.tsx          # Home — tax summary, progress, recent transactions
│   ├── upload/
│   │   ├── BankStatementsScreen.tsx      # Statement management by month
│   │   ├── MonthDetailScreen.tsx         # Transactions for a given month
│   │   └── UploadStatementScreen.tsx     # PDF upload flow
│   ├── transactions/
│   │   ├── TransactionListScreen.tsx     # Uncategorised transaction list
│   │   ├── TransactionCategorizationScreen.tsx  # AI bulk categorisation
│   │   ├── ReviewCategorizationScreen.tsx       # Review AI suggestions
│   │   ├── CategorizedTransactionsScreen.tsx    # All categorised transactions
│   │   ├── EditTransactionScreen.tsx     # Edit single transaction
│   │   ├── QualifyTransactionListScreen.tsx     # Transactions needing evidence
│   │   ├── QualifyTransactionsScreen.tsx        # Guided evidence flow
│   │   ├── AddEvidenceScreen.tsx         # Attach receipts/links
│   │   └── SubscriptionReviewScreen.tsx  # Review recurring expenses
│   ├── gifted/
│   │   └── GiftedTrackerScreen.tsx       # Log PR/gifted items as income
│   ├── tax/
│   │   ├── TaxEstimateScreen.tsx         # Estimated tax breakdown
│   │   └── FilingGuideScreen.tsx         # Step-by-step filing guide
│   ├── overview/
│   │   ├── OverviewScreen.tsx            # Financial overview + export
│   │   └── TaxChecklistScreen.tsx        # Tax return checklist
│   ├── profile/
│   │   └── ProfileScreen.tsx             # Tax profile editor
│   └── settings/
│       └── SettingsScreen.tsx            # Account, export, logout
```

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Expo Go

### Install & Run

```bash
npm install
npx expo start
```

### Environment Variables

Create a `.env` file:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Server

The backend is in a separate repo: [expense-app-server](https://github.com/drforbo/expense-app-server). It handles:
- Bank statement parsing (PDF → transactions)
- AI transaction categorisation
- Batch processing status
- ZIP export (CSV + receipts)

## Key Features

### Bank Statement Upload
Upload PDF bank statements. The server parses them into individual transactions, stored in Supabase.

### AI Categorisation
Transactions are bulk-categorised using Claude into HMRC expense categories (Travel, Office, Software, etc.) with tax-deductible flags and business-use percentages.

### Evidence & Receipts
For tax-deductible expenses, users add receipts (photo/PDF), content links, and business-use explanations to build audit-ready evidence.

### Tax Estimation
Real-time tax calculation based on self-employment income, qualified expenses, personal allowance (£12,570), employment income, and student loan plan.

### Export
ZIP bundle containing `transactions.csv` (with qualification status, business-use explanations, receipt references) and a `receipts/` folder with all uploaded receipt images/PDFs.

## License

Proprietary - All rights reserved
