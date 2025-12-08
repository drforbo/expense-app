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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { supabase } from '../../lib/supabase';

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
}

type WorkFromHomeOption = 'always' | 'mostly' | 'sometimes' | 'rarely' | 'never' | null;
type VehicleUseOption = 'daily' | 'weekly' | 'monthly' | 'rarely' | 'never' | null;

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Editable core fields
  const [monthlyIncome, setMonthlyIncome] = useState(1000);
  const [hasOtherEmployment, setHasOtherEmployment] = useState(false);
  const [employmentIncome, setEmploymentIncome] = useState(30000);
  const [studentLoanPlan, setStudentLoanPlan] = useState('none');
  const [trackingGoal, setTrackingGoal] = useState('sole_trader');
  const [workType, setWorkType] = useState('content_creation');
  const [customWorkType, setCustomWorkType] = useState('');
  const [receivesGiftedItems, setReceivesGiftedItems] = useState(false);
  const [hasInternationalIncome, setHasInternationalIncome] = useState(false);

  // Work setup fields - using clearer options
  const [workFromHomeOption, setWorkFromHomeOption] = useState<WorkFromHomeOption>(null);
  const [vehicleUseOption, setVehicleUseOption] = useState<VehicleUseOption>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  // Reload when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });
    return unsubscribe;
  }, [navigation]);

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
      setStudentLoanPlan(data.student_loan_plan || 'none');
      setTrackingGoal(data.tracking_goal || 'sole_trader');
      setWorkType(data.work_type || 'content_creation');
      setCustomWorkType(data.custom_work_type || '');
      setReceivesGiftedItems(data.receives_gifted_items || false);
      setHasInternationalIncome(data.has_international_income || false);

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
          student_loan_plan: studentLoanPlan,
          tracking_goal: trackingGoal,
          work_type: workType,
          custom_work_type: workType === 'other' ? customWorkType : null,
          receives_gifted_items: receivesGiftedItems,
          has_international_income: hasInternationalIncome,
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
              <View style={styles.subSection}>
                <Text style={styles.subSectionLabel}>Yearly salary (before tax)</Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Profile</Text>
        <View style={{ width: 40 }} />
      </View>

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
                {hasOtherEmployment ? `Yes (${formatCurrency(employmentIncome)}/yr)` : 'No'}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
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
});
