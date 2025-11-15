import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function SurveyScreen() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({
    category: '',
    businessPercent: 100,
    usedInContent: null as boolean | null,
    recurring: null as boolean | null,
  });

  // Mock transaction
  const transaction = {
    merchant: "ADOBE CREATIVE CLOUD",
    amount: 29.99,
    date: "Today",
  };

  const questions = [
    {
      id: 'category',
      question: 'What was this for?',
      options: [
        { label: 'Equipment', value: 'equipment', emoji: '📷' },
        { label: 'Software/Tools', value: 'software', emoji: '💻' },
        { label: 'Travel', value: 'travel', emoji: '✈️' },
        { label: 'Props/Materials', value: 'materials', emoji: '🎨' },
        { label: 'Marketing', value: 'marketing', emoji: '📢' },
        { label: 'Personal', value: 'personal', emoji: '🏠' },
      ],
    },
    {
      id: 'businessPercent',
      question: 'Business use percentage?',
      options: [
        { label: '100%', value: 100, emoji: '' },
        { label: '75%', value: 75, emoji: '' },
        { label: '50%', value: 50, emoji: '' },
        { label: '25%', value: 25, emoji: '' },
      ],
    },

    //This is kind of the same as above - needs to be cleaner
    {
      id: 'usedInContent',
      question: 'Will you use this in a video or content?',
      options: [
        { label: 'Yes', value: true, emoji: '' },
        { label: 'No', value: false, emoji: '' },
        { label: 'Maybe', value: null, emoji: '' },
      ],
    },
    //Why this question
    {
      id: 'recurring',
      question: 'Is this a one-off or recurring?',
      options: [
        { label: 'One-off', value: false, emoji: '' },
        { label: 'Recurring', value: true, emoji: '' },
      ],
    },
  ];

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers({ ...answers, [questionId]: value });
    
    // Move to next question
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      // All done!
      console.log('Survey complete:', answers);
    }
  };

  const currentQ = questions[currentQuestion];

  return (
    <View style={styles.container}>
      {/* Transaction Card */}
      <View style={styles.transactionCard}>
        <Text style={styles.merchant}>{transaction.merchant}</Text>
        <Text style={styles.amount}>£{transaction.amount}</Text>
        <Text style={styles.date}>{transaction.date}</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        {questions.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index <= currentQuestion && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Question */}
      <Text style={styles.question}>{currentQ.question}</Text>

      {/* Options */}
      <ScrollView style={styles.optionsContainer}>
        {currentQ.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionButton}
            onPress={() => handleAnswer(currentQ.id, option.value)}
          >
            {option.emoji && (
              <Text style={styles.emoji}>{option.emoji}</Text>
            )}
            <Text style={styles.optionText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    paddingTop: 60,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  merchant: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366f1',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
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
  question: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
  },
  optionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: {
    fontSize: 24,
    marginRight: 16,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});