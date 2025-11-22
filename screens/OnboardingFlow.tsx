import React, { useState } from 'react';
import { Step1UserType } from './onboarding/Step1UserType';
import { Step2Employment } from './onboarding/Step2Employment';
import { Step3Income } from './onboarding/Step3Income';
import { Step4QuickGuide } from './onboarding/Step4QuickGuide';
import { Step5ConnectBank } from './onboarding/Step5ConnectBank';
import { Step6Loading } from './onboarding/Step6Loading';
import { Step7FirstCategorization } from './onboarding/Step7FirstCategorization';
import { Step8MiniWin } from './onboarding/Step8MiniWin';
import { Step9Pricing } from './onboarding/Step9Pricing';
import AuthScreen from './AuthScreen';

interface UserData {
  userType: string;
  employmentStatus: string;
  income: string;
}

interface OnboardingFlowProps {
  onComplete: (data: UserData & { selectedPlan: string }) => void;
  onConnectBank: () => Promise<void>;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ 
  onComplete, 
  onConnectBank 
}) => {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState<UserData>({
    userType: '',
    employmentStatus: '',
    income: '',
  });
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const exampleTransaction = {
    name: 'Sephora',
    amount: 47.99,
    date: '22 Nov 2025',
  };

  const handleUserType = (userType: string) => {
    setUserData({ ...userData, userType });
    setStep(2);
  };

  const handleEmployment = (employmentStatus: string) => {
    setUserData({ ...userData, employmentStatus });
    setStep(3);
  };

  const handleIncome = (income: string) => {
    setUserData({ ...userData, income });
    setStep(4);
  };

  const handleQuickGuideNext = () => {
    setStep(5);
  };

  const handleConnectBank = async () => {
    try {
      await onConnectBank();
      setStep(6);
    } catch (error) {
      console.error('Bank connection failed:', error);
    }
  };

  const handleLoadingComplete = () => {
    setStep(7);
  };

  const handleFirstCategorizationNext = () => {
    setStep(8);
  };

  const handleMiniWinNext = () => {
    setStep(9);
  };

  const handlePlanSelect = (plan: 'week' | 'quarter' | 'year') => {
    setSelectedPlan(plan);
    setStep(10); // Go to auth screen
  };

  const handleAuthComplete = () => {
    // User has signed in/up, now complete onboarding
    onComplete({ ...userData, selectedPlan });
  };

  const goBack = () => {
    if (step > 1 && step !== 10) { // Can't go back from auth
      setStep(step - 1);
    }
  };

  switch (step) {
    case 1:
      return <Step1UserType onNext={handleUserType} />;
    
    case 2:
      return <Step2Employment onNext={handleEmployment} onBack={goBack} />;
    
    case 3:
      return <Step3Income onNext={handleIncome} onBack={goBack} />;
    
    case 4:
      return (
        <Step4QuickGuide 
          userData={userData} 
          onNext={handleQuickGuideNext} 
        />
      );
    
    case 5:
      return <Step5ConnectBank onConnect={handleConnectBank} />;
    
    case 6:
      return <Step6Loading onComplete={handleLoadingComplete} />;
    
    case 7:
      return (
        <Step7FirstCategorization 
          transaction={exampleTransaction}
          onNext={handleFirstCategorizationNext}
        />
      );
    
    case 8:
      return (
        <Step8MiniWin 
          totalSorted={47.99}
          remainingCount={5}
          onNext={handleMiniWinNext}
        />
      );
    
    case 9:
      return <Step9Pricing onSelectPlan={handlePlanSelect} />;
    
    case 10:
      return <AuthScreen onAuthenticated={handleAuthComplete} />;
    
    default:
      return <Step1UserType onNext={handleUserType} />;
  }
};