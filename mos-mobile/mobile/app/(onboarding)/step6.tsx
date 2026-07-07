import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import OnboardingLayout from '../../components/OnboardingLayout';
import Toggle from '../../components/Toggle';
import TextInput from '../../components/TextInput';
import OptionPicker from '../../components/OptionPicker';
import { useOnboardingStore } from '../../stores/onboarding-store';

const edOptions = [
  { value: 'never', label: 'Never' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'often', label: 'Often' },
  { value: 'always', label: 'Always' },
];

export default function Step6() {
  const { data, setData } = useOnboardingStore();

  return (
    <OnboardingLayout
      step={5} total={8}
      title="Medical & screening"
      canNext={true}
      onNext={() => router.push('/(onboarding)/step7')}
      onBack={() => router.back()}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Toggle label="Do you have any medical conditions?" value={data.has_medical} onChange={(v) => setData({ has_medical: v })} />
        {data.has_medical && (
          <TextInput label="Describe" value={data.medical} onChange={(v) => setData({ medical: v })} placeholder="e.g. Type 2 diabetes, asthma" multiline />
        )}
        <OptionPicker label="How often do you feel guilty about eating?" options={edOptions} selected={data.ed_q1} onSelect={(v) => setData({ ed_q1: v })} />
        <OptionPicker label="How often do you worry about losing control over eating?" options={edOptions} selected={data.ed_q2} onSelect={(v) => setData({ ed_q2: v })} />
        <OptionPicker label="How often do you eat in secret?" options={edOptions} selected={data.ed_q3} onSelect={(v) => setData({ ed_q3: v })} />
        <OptionPicker label="How often do you feel preoccupied with food?" options={edOptions} selected={data.ed_q4} onSelect={(v) => setData({ ed_q4: v })} />
      </ScrollView>
    </OnboardingLayout>
  );
}
