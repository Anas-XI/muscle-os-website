import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import OnboardingLayout from '../../components/OnboardingLayout';
import OptionPicker from '../../components/OptionPicker';
import TextInput from '../../components/TextInput';
import { useOnboardingStore } from '../../stores/onboarding-store';

export default function Step5() {
  const { data, setData } = useOnboardingStore();
  const hasRequired = !!data.sleep && !!data.stress;

  return (
    <OnboardingLayout
      step={4} total={8}
      title="Lifestyle"
      canNext={hasRequired}
      onNext={() => router.push('/(onboarding)/step6')}
      onBack={() => router.back()}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <OptionPicker
          label="Average sleep per night"
          options={[
            { value: 'Under 6h', label: 'Under 6h' },
            { value: '6-7h', label: '6-7h' },
            { value: '7-8h', label: '7-8h' },
            { value: '8h+', label: '8h+' },
          ]}
          selected={data.sleep}
          onSelect={(v) => setData({ sleep: v })}
        />
        <OptionPicker
          label="Stress level"
          options={[
            { value: 'Low (1-3)', label: 'Low (1-3)' },
            { value: 'Moderate (4-6)', label: 'Moderate (4-6)' },
            { value: 'High (7-10)', label: 'High (7-10)' },
          ]}
          selected={data.stress}
          onSelect={(v) => setData({ stress: v })}
        />
        <OptionPicker
          label="Daily steps"
          options={[
            { value: 'Under 5,000', label: 'Under 5k' },
            { value: '5,000-10,000', label: '5k-10k' },
            { value: '10,000+', label: '10k+' },
            { value: "I don't track", label: "Don't track" },
          ]}
          selected={data.steps}
          onSelect={(v) => setData({ steps: v })}
        />
        <OptionPicker
          label="Caffeine intake"
          options={[
            { value: 'None', label: 'None' },
            { value: '1 coffee (~100mg)', label: '1 coffee' },
            { value: '2-3 coffees (~200-300mg)', label: '2-3 coffees' },
            { value: '4+ coffees (400mg+)', label: '4+ coffees' },
          ]}
          selected={data.caffeine}
          onSelect={(v) => setData({ caffeine: v })}
        />
        <TextInput label="Supplements you take" value={data.supplements} onChange={(v) => setData({ supplements: v })} placeholder="e.g. Creatine, whey, vitamin D" />
      </ScrollView>
    </OnboardingLayout>
  );
}
