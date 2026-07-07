import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import OnboardingLayout from '../../components/OnboardingLayout';
import OptionPicker from '../../components/OptionPicker';
import { useOnboardingStore } from '../../stores/onboarding-store';

export default function Step1() {
  const { data, setData } = useOnboardingStore();

  return (
    <OnboardingLayout
      step={0} total={8}
      title="Tell us about yourself"
      canNext={!!data.goal && !!data.situation && !!data.experience}
      onNext={() => router.push('/(onboarding)/step2')}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <OptionPicker
          label="What is your main goal?"
          options={[
            { value: 'Build muscle', label: 'Build muscle' },
            { value: 'Lose fat', label: 'Lose fat' },
            { value: 'Get stronger', label: 'Get stronger' },
            { value: 'Recomposition', label: 'Recomp' },
          ]}
          selected={data.goal}
          onSelect={(v) => setData({ goal: v })}
        />
        <OptionPicker
          label="What describes your situation best?"
          options={[
            { value: 'Just getting started', label: 'Just starting' },
            { value: 'Not seeing results', label: 'Plateaued' },
            { value: 'Feeling run down', label: 'Run down' },
            { value: 'Coming back from a break', label: 'Returning' },
          ]}
          selected={data.situation}
          onSelect={(v) => setData({ situation: v })}
        />
        <OptionPicker
          label="Training experience"
          options={[
            { value: 'Less than 1 year', label: '< 1 year' },
            { value: '1-3 years', label: '1-3 years' },
            { value: '3+ years', label: '3+ years' },
          ]}
          selected={data.experience}
          onSelect={(v) => setData({ experience: v })}
        />
      </ScrollView>
    </OnboardingLayout>
  );
}
