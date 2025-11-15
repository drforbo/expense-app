# expense-app
# Bopp - AI Bookkeeping for Content Creators

## What is this?
A mobile app that helps UK content creators categorize their business expenses. Uses AI to understand what they buy and asks smart questions to figure out if it's a business expense.

## The Problem
Content creators don't know what counts as a business expense for tax purposes. Traditional bookkeeping apps ask "what % business use?" but creators don't know the answer.

## Our Solution
Ask about actual behavior ("Will you feature this foundation in a video?") instead of tax questions. AI translates their answers into HMRC-compliant categories.

## User Journey
1. **Onboarding** - Tell us what content you create and what products you feature
2. **Bank connects** - Pulls transactions automatically via Plaid
3. **Daily notification** - "You have 3 new expenses to categorize"
4. **Smart survey** - AI recognizes "foundation" and asks relevant questions
5. **Auto-categorization** - Expense is filed with correct business %
6. **Tax estimates** - See weekly/monthly tax liability

## Tech Stack
- **Frontend**: React Native (Expo)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Bank API**: Plaid (UK banks)
- **AI**: Anthropic Claude API
- **Hosting**: Expo/EAS (eventually App Store)

## Key Features Built
✅ Onboarding flow (5 questions about content type and tools)
✅ Survey screen prototype (swipeable questions)
🔨 Database schema (next)
🔨 Plaid integration (next)
🔨 Claude API for expense analysis (next)

## Project Structure
```
expense-app/
├── screens/
│   ├── OnboardingScreen.tsx    # 5-step onboarding
│   └── SurveyScreen.tsx         # Expense categorization survey
├── App.tsx                      # Main app entry
├── package.json
└── README.md                    # This file
```

## Important Design Decisions
- **Mobile-first**: React Native, not web app (need reliable notifications)
- **Product-focused onboarding**: Ask what products they show in content, not general "business use"
- **Behavioral questions**: "Do you visit brands in your car?" not "Business % of car use?"
- **UK-first**: HMRC tax rules, sole trader/limited company setup

## Current Status
Just finished onboarding flow. Next steps:
1. Set up Supabase database
2. Build Plaid bank connection
3. Integrate Claude API for AI categorization
4. Add daily notifications
5. Build streak/gamification features

## Running the App
```bash
npx expo start --tunnel
# Scan QR code with Expo Go app on phone
```

## Notes for Future Me
- Instagram/TikTok APIs are too restricted - went with YouTube API + manual input
- YouTube API is free (10k requests/day)
- Questions ask about behavior, not tax categories
- AI does the HMRC compliance translation