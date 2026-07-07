import { router } from 'expo-router';
import OnboardingLayout from '../../components/OnboardingLayout';
import OptionPicker from '../../components/OptionPicker';
import TextInput from '../../components/TextInput';
import { useOnboardingStore } from '../../stores/onboarding-store';

export default function Step3() {
  const { data, setData } = useOnboardingStore();
  const hasRequired = !!data.training_days && !!data.session_length;

  return (
    <OnboardingLayout
      step={2} total={8}
      title="Your training"
      canNext={hasRequired}
      onNext={() => router.push('/(onboarding)/step4')}
      onBack={() => router.back()}
    >
      <OptionPicker
        label="Days per week"
        options={[
          { value: '2', label: '1-2 days' },
          { value: '4', label: '3-4 days' },
          { value: '5', label: '5+ days' },
        ]}
        selected={data.training_days}
        onSelect={(v) => setData({ training_days: v })}
      />
      <OptionPicker
        label="Session length"
        options={[
          { value: '35', label: 'Under 45 min' },
          { value: '60', label: '45-75 min' },
          { value: '90', label: '75-100 min' },
          { value: '110', label: '100+ min' },
        ]}
        selected={data.session_length}
        onSelect={(v) => setData({ session_length: v })}
      />
      <TextInput label="Current split (e.g. PPL, Upper/Lower, Bro split)" value={data.current_split} onChange={(v) => setData({ current_split: v })} placeholder="Describe your current routine" />
    </OnboardingLayout>
  );
}
