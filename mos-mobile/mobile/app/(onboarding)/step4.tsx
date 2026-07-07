import { router } from 'expo-router';
import OnboardingLayout from '../../components/OnboardingLayout';
import Toggle from '../../components/Toggle';
import TextInput from '../../components/TextInput';
import OptionPicker from '../../components/OptionPicker';
import { useOnboardingStore } from '../../stores/onboarding-store';

export default function Step4() {
  const { data, setData } = useOnboardingStore();

  return (
    <OnboardingLayout
      step={3} total={8}
      title="Health screen"
      canNext={!!data.gut_health}
      onNext={() => router.push('/(onboarding)/step5')}
      onBack={() => router.back()}
    >
      <Toggle label="Do you have any injuries?" value={data.has_injuries} onChange={(v) => setData({ has_injuries: v })} />
      {data.has_injuries && (
        <TextInput label="Describe your injuries" value={data.injuries} onChange={(v) => setData({ injuries: v })} placeholder="e.g. Lower back, left knee" multiline />
      )}
      <OptionPicker
        label="Gut health / digestive issues"
        options={[
          { value: 'None', label: 'None' },
          { value: 'Mild', label: 'Mild' },
          { value: 'Significant', label: 'Significant' },
        ]}
        selected={data.gut_health}
        onSelect={(v) => setData({ gut_health: v })}
      />
    </OnboardingLayout>
  );
}
