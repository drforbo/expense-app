import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Linking
} from 'react-native';

export default function OnboardingScreen({ onComplete }: { onComplete: (profile: any) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState({
    contentType: '',
    typicalProducts: '',
    creationMethod: [] as string[],
    toolsUsed: [] as string[],
    businessStructure: '',
  });

  const contentTypes = [
    { label: '💄 Beauty & Fashion', value: 'beauty' },
    { label: '🎮 Gaming', value: 'gaming' },
    { label: '🍳 Food & Cooking', value: 'food' },
    { label: '✈️ Travel & Lifestyle', value: 'travel' },
    { label: '💻 Tech Reviews', value: 'tech' },
    { label: '🏋️ Fitness & Wellness', value: 'fitness' },
    { label: '💰 Finance & Business', value: 'finance' },
    { label: '🎨 Art & Crafts', value: 'art' },
    { label: '📚 Education', value: 'education' },
  ];

  const getProductSuggestion = (type: string) => {
    const suggestions: { [key: string]: string } = {
      beauty: 'Makeup I apply on camera, skincare I review, beauty tools I demonstrate',
      gaming: 'Games I play, controllers I use, gaming chairs, streaming equipment',
      food: 'Ingredients I cook with, kitchen tools I use on camera, tableware',
      travel: 'Hotels I stay in, activities I try, camera gear for filming',
      tech: 'Gadgets I review, software I test, computer equipment',
      fitness: 'Workout equipment I use, supplements I try, activewear I wear',
      finance: 'Books I reference, courses I take, software for analysis',
      art: 'Art supplies I use, tools I demonstrate, materials I work with',
      education: 'Books, courses, teaching materials, presentation software',
    };
    return suggestions[type] || '';
  };

  const creationMethods = [
    { label: 'I film myself at home', value: 'home' },
    { label: 'I travel to locations to film', value: 'travel' },
    { label: 'I visit brands/shops for content', value: 'brands' },
    { label: 'I film in a rented studio', value: 'studio' },
    { label: 'I work with a team/crew', value: 'team' },
  ];

  const tools = [
    { label: 'My phone (to film/edit)', value: 'phone' },
    { label: 'My computer/laptop (to edit)', value: 'computer' },
    { label: 'My car (to visit locations/brands)', value: 'car' },
    { label: 'My home internet (to upload videos)', value: 'internet' },
    { label: 'A dedicated space in my home', value: 'homeSpace' },
  ];

  const businessStructures = [
    { label: 'Sole trader (self-employed)', value: 'soleTrader' },
    { label: 'Limited company', value: 'limitedCompany' },
    { label: 'Not registered yet', value: 'notRegistered' },
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(profile);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return profile.contentType !== '';
      case 1: return profile.typicalProducts.length > 0;
      case 2: return profile.creationMethod.length > 0;
      case 3: return profile.toolsUsed.length > 0;
      case 4: return profile.businessStructure !== '';
      default: return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>What type of content do you create?</Text>
            <ScrollView style={styles.optionsContainer}>
              {contentTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.optionButton,
                    profile.contentType === type.value && styles.optionButtonSelected
                  ]}
                  onPress={() => {
                    setProfile({ 
                      ...profile, 
                      contentType: type.value,
                      typicalProducts: getProductSuggestion(type.value)
                    });
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    profile.contentType === type.value && styles.optionTextSelected
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>
              What products do you show, review, or use on camera?
            </Text>
            <Text style={styles.helpText}>
              Edit this to match what you actually feature in your content
            </Text>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={4}
              value={profile.typicalProducts}
              onChangeText={(text) => setProfile({ ...profile, typicalProducts: text })}
              placeholder="e.g., Makeup I apply, skincare I review..."
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>How do you create your content?</Text>
            <Text style={styles.helpText}>Select all that apply</Text>
            <ScrollView style={styles.optionsContainer}>
              {creationMethods.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.checkboxButton,
                    profile.creationMethod.includes(method.value) && styles.checkboxButtonSelected
                  ]}
                  onPress={() => {
                    setProfile({
                      ...profile,
                      creationMethod: toggleArrayItem(profile.creationMethod, method.value)
                    });
                  }}
                >
                  <View style={[
                    styles.checkbox,
                    profile.creationMethod.includes(method.value) && styles.checkboxChecked
                  ]}>
                    {profile.creationMethod.includes(method.value) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxText}>{method.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>
              Which of these do you use to make your content?
            </Text>
            <Text style={styles.helpText}>Select all that apply</Text>
            <ScrollView style={styles.optionsContainer}>
              {tools.map((tool) => (
                <TouchableOpacity
                  key={tool.value}
                  style={[
                    styles.checkboxButton,
                    profile.toolsUsed.includes(tool.value) && styles.checkboxButtonSelected
                  ]}
                  onPress={() => {
                    setProfile({
                      ...profile,
                      toolsUsed: toggleArrayItem(profile.toolsUsed, tool.value)
                    });
                  }}
                >
                  <View style={[
                    styles.checkbox,
                    profile.toolsUsed.includes(tool.value) && styles.checkboxChecked
                  ]}>
                    {profile.toolsUsed.includes(tool.value) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxText}>{tool.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>Are you registered with HMRC?</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.gov.uk/register-for-self-assessment')}
              style={styles.helpLink}
            >
              <Text style={styles.helpLinkText}>
                Not sure? Read our guide on when and how to register →
              </Text>
            </TouchableOpacity>
            <ScrollView style={styles.optionsContainer}>
              {businessStructures.map((structure) => (
                <TouchableOpacity
                  key={structure.value}
                  style={[
                    styles.optionButton,
                    profile.businessStructure === structure.value && styles.optionButtonSelected
                  ]}
                  onPress={() => {
                    setProfile({ ...profile, businessStructure: structure.value });
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    profile.businessStructure === structure.value && styles.optionTextSelected
                  ]}>
                    {structure.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {profile.businessStructure === 'notRegistered' && (
              <View style={styles.reminderBox}>
                <Text style={styles.reminderText}>
                  ⚠️ Reminder: Register with HMRC once you earn over £1,000/year
                </Text>
              </View>
            )}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              step <= currentStep && styles.progressDotActive
            ]}
          />
        ))}
      </View>

      {/* Current step */}
      {renderStep()}

      {/* Navigation buttons */}
      <View style={styles.buttonContainer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 4 ? "Let's go!" : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 60,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  progressDotActive: {
    backgroundColor: '#6366f1',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  helpLink: {
    marginBottom: 20,
  },
  helpLinkText: {
    fontSize: 14,
    color: '#6366f1',
    textDecorationLine: 'underline',
  },
  optionsContainer: {
    flex: 1,
  },
  optionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  optionTextSelected: {
    color: '#6366f1',
  },
  checkboxButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  checkboxButtonSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    textAlignVertical: 'top',
    minHeight: 120,
  },
  reminderBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  reminderText: {
    fontSize: 14,
    color: '#92400e',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});