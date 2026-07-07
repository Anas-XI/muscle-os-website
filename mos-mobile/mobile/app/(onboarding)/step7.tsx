import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import OnboardingLayout from '../../components/OnboardingLayout';
import OptionPicker from '../../components/OptionPicker';
import TextInput from '../../components/TextInput';
import { useOnboardingStore } from '../../stores/onboarding-store';

export default function Step7() {
  const { data, setData } = useOnboardingStore();

  return (
    <OnboardingLayout
      step={6} total={8}
      title="Wellness & recovery"
      canNext={true}
      onNext={() => router.push('/(onboarding)/step8')}
      onBack={() => router.back()}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <OptionPicker
          label="Daily water intake (glasses)"
          options={[
            { value: '3', label: '~3 glasses (low)' },
            { value: '5', label: '~5 glasses (moderate)' },
            { value: '8', label: '~8+ glasses (good)' },
          ]}
          selected={data.hydration}
          onSelect={(v) => setData({ hydration: v })}
        />
        <OptionPicker
          label="Weekly alcohol consumption"
          options={[
            { value: '0', label: 'None' },
            { value: '1-2', label: '1-2 drinks' },
            { value: '3-7', label: '3-7 drinks' },
            { value: '8-14', label: '8-14 drinks' },
            { value: '15+', label: '15+ drinks' },
          ]}
          selected={data.alcohol_weekly}
          onSelect={(v) => setData({ alcohol_weekly: v })}
        />
        <TextInput label="Work schedule (e.g. 9-5, shifts, irregular)" value={data.work_schedule} onChange={(v) => setData({ work_schedule: v })} placeholder="Describe your schedule" />
        <TextInput label="Mobility limitations or joint pain" value={data.mobility} onChange={(v) => setData({ mobility: v })} placeholder="e.g. Tight hips, shoulder impingement" multiline />
        <OptionPicker
          label="When was your last bloodwork?"
          options={[
            { value: 'Within 6 months', label: 'Within 6 months' },
            { value: '6-12 months ago', label: '6-12 months' },
            { value: 'Over a year ago', label: 'Over a year' },
            { value: "I don't remember", label: "Don't remember" },
            { value: 'Never', label: 'Never' },
          ]}
          selected={data.bloodwork}
          onSelect={(v) => setData({ bloodwork: v })}
        />
        <TextInput label="Any mental health concerns?" value={data.mental_health} onChange={(v) => setData({ mental_health: v })} placeholder="Optional" multiline />
      </ScrollView>
    </OnboardingLayout>
  );
}
