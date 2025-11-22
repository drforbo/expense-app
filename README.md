# Bopp Onboarding Flow - Implementation Guide

## 🎨 New Design System: Duolingo Energy

This implementation includes a complete redesign with:
- **Colors**: Deep purple (#2E1A47), Electric violet (#7C3AED), Coral (#FF6B6B)
- **Fonts**: Outfit (display), Inter (body)
- **Components**: Glass morphism buttons, gradient backgrounds, progress indicators

---

## 📁 Files Included

1. **theme.ts** - Design system constants (colors, spacing, shadows)
2. **components.tsx** - Reusable UI components
3. **Step1UserType.tsx** - "I'm a..." screen
4. **Step2Employment.tsx** - "You are hustling..." screen
5. **Step3Income.tsx** - "You've hustled..." screen
6. **Step4QuickGuide.tsx** - Personalized tax checklist
7. **Step5ConnectBank.tsx** - Bank connection explanation
8. **Step6Loading.tsx** - AI loading animation
9. **Step7FirstCategorization.tsx** - First expense categorization
10. **Step8MiniWin.tsx** - Day 1 completion celebration
11. **Step9Pricing.tsx** - Pricing selection screen
12. **OnboardingFlow.tsx** - Main orchestrator component

---

## 🚀 Installation Steps

### Step 1: Install Dependencies

```bash
cd expense-app
npm install expo-linear-gradient
npx expo install expo-font @expo-google-fonts/outfit @expo-google-fonts/inter
```

### Step 2: Add Files to Your Project

Copy all the provided files into your project:

```
expense-app/
├── lib/
│   ├── theme.ts
│   └── components.tsx
└── screens/
    ├── onboarding/
    │   ├── Step1UserType.tsx
    │   ├── Step2Employment.tsx
    │   ├── Step3Income.tsx
    │   ├── Step4QuickGuide.tsx
    │   ├── Step5ConnectBank.tsx
    │   ├── Step6Loading.tsx
    │   ├── Step7FirstCategorization.tsx
    │   ├── Step8MiniWin.tsx
    │   └── Step9Pricing.tsx
    └── OnboardingFlow.tsx
```

### Step 3: Update App.tsx

Replace your existing onboarding logic with:

```typescript
import React, { useState } from 'react';
import { OnboardingFlow } from './screens/OnboardingFlow';
import { DashboardScreen } from './screens/DashboardScreen';
// ... other imports

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [userData, setUserData] = useState(null);

  const handleOnboardingComplete = async (data) => {
    console.log('Onboarding complete:', data);
    setUserData(data);
    
    // TODO: Save user data to Supabase
    // await saveUserProfile(data);
    
    setOnboardingComplete(true);
  };

  const handleConnectBank = async () => {
    // Your existing Plaid connection logic
    // This should trigger the Plaid Link UI
    console.log('Opening Plaid Link...');
    
    // Example:
    // const linkToken = await fetchLinkToken();
    // openPlaidLink(linkToken);
  };

  if (!onboardingComplete) {
    return (
      <OnboardingFlow 
        onComplete={handleOnboardingComplete}
        onConnectBank={handleConnectBank}
      />
    );
  }

  return <DashboardScreen />;
}
```

### Step 4: Load Custom Fonts

Update your App.tsx to load Outfit and Inter fonts:

```typescript
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // ... rest of your app
}
```

### Step 5: Update theme.ts Font References

Once fonts are loaded, update `theme.ts`:

```typescript
export const fonts = {
  display: 'Outfit_800ExtraBold',
  body: 'Inter_500Medium',
};
```

---

## 🔗 Plaid Integration Points

The onboarding flow calls your existing Plaid logic at **Step 5**. Make sure your `onConnectBank` function:

1. Fetches a link token from your server
2. Opens the Plaid Link UI
3. Returns a Promise that resolves when connection succeeds
4. Stores the access token in your backend

Example:

```typescript
const handleConnectBank = async () => {
  try {
    // 1. Get link token from your server
    const response = await fetch('http://YOUR_IP:3000/api/create_link_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user-123' }),
    });
    const { link_token } = await response.json();

    // 2. Open Plaid Link (you'll need react-native-plaid-link-sdk)
    // const result = await openPlaidLink({ linkToken: link_token });
    
    // 3. Exchange public token
    // await exchangeToken(result.publicToken);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Plaid connection failed:', error);
    throw error;
  }
};
```

---

## 💾 Data Storage

After onboarding completes, you'll receive:

```typescript
{
  userType: 'content_creator' | 'reseller' | 'freelancer',
  employmentStatus: 'part_time' | 'full_time',
  income: 'over_1000' | 'nearly_1000' | 'over_12500' | 'getting_started',
  selectedPlan: 'week' | 'quarter' | 'year'
}
```

Store this in your Supabase `user_profiles` table.

---

## 🎯 Next Steps After Implementation

1. **Test the flow** - Run through all 9 steps
2. **Connect real Plaid** - Replace mock transaction with actual data
3. **Add payment processing** - Integrate Stripe for the selected plan
4. **Save to Supabase** - Store user profile and preferences
5. **Analytics** - Track drop-off at each step

---

## 🐛 Troubleshooting

**Fonts not loading?**
```bash
npx expo install expo-font
expo prebuild --clean
```

**LinearGradient errors?**
```bash
npm install expo-linear-gradient
```

**Can't find Plaid transactions?**
- Make sure your server is running: `node server.js`
- Check the server URL matches your Mac's IP
- Verify the access token is stored correctly

---

## 📱 Testing Checklist

- [ ] Step 1: Can select user type
- [ ] Step 2: Can select employment status
- [ ] Step 3: Can select income level
- [ ] Step 4: Guide shows personalized checklist
- [ ] Step 5: Connect bank button works
- [ ] Step 6: Loading animation plays
- [ ] Step 7: Can categorize first transaction
- [ ] Step 8: Stats show correctly
- [ ] Step 9: Can select pricing plan
- [ ] Back buttons work
- [ ] Progress bar updates
- [ ] Fonts display correctly
- [ ] Colors match design

---

## 🎨 Customization

Want to tweak colors or spacing? Edit `theme.ts`:

```typescript
export const colors = {
  deepPurple: '#2E1A47',    // Background
  electricViolet: '#7C3AED', // Primary actions
  coral: '#FF6B6B',          // Accents
  // ... etc
};
```

---

**Questions?** The design is modular - each step is independent and can be modified without breaking others.
