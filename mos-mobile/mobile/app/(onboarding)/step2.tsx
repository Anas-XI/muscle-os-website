import { router } from 'expo-router';
import OnboardingLayout from '../../components/OnboardingLayout';
import TextInput from '../../components/TextInput';
import { useOnboardingStore } from '../../stores/onboarding-store';
import OptionPicker from '../../components/OptionPicker';

export default function Step2() {
  const { data, setData } = useOnboardingStore();
  const hasRequired = !!data.weight && !!data.height && !!data.age;

  return (
    <OnboardingLayout
      step={1} total={8}
      title="Your body metrics"
      canNext={hasRequired}
      onNext={() => router.push('/(onboarding)/step3')}
      onBack={() => router.back()}
    >
      <TextInput label="Weight (kg)" value={data.weight} onChange={(v) => setData({ weight: v })} placeholder="e.g. 80" keyboardType="numeric" />
      <TextInput label="Height (cm)" value={data.height} onChange={(v) => setData({ height: v })} placeholder="e.g. 175" keyboardType="numeric" />
      <TextInput label="Age" value={data.age} onChange={(v) => setData({ age: v })} placeholder="e.g. 28" keyboardType="numeric" />
    </OnboardingLayout>
  );
}
