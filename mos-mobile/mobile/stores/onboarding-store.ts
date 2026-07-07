import { create } from 'zustand';

interface OnboardingData {
  // Step 1: Goals
  goal: string;
  situation: string;
  experience: string;
  // Step 2: Body
  weight: string;
  height: string;
  age: string;
  // Step 3: Training
  training_days: string;
  session_length: string;
  current_split: string;
  // Step 4: Health
  has_injuries: boolean;
  injuries: string;
  gut_health: string;
  // Step 5: Lifestyle
  sleep: string;
  stress: string;
  steps: string;
  caffeine: string;
  supplements: string;
  // Step 6: Medical
  has_medical: boolean;
  medical: string;
  ed_q1: string;
  ed_q2: string;
  ed_q3: string;
  ed_q4: string;
  // Step 7: Wellness
  hydration: string;
  alcohol_weekly: string;
  work_schedule: string;
  mobility: string;
  bloodwork: string;
  mental_health: string;
}

const defaultData: OnboardingData = {
  goal: '', situation: '', experience: '',
  weight: '', height: '', age: '',
  training_days: '', session_length: '', current_split: '',
  has_injuries: false, injuries: '', gut_health: '',
  sleep: '', stress: '', steps: '', caffeine: '', supplements: '',
  has_medical: false, medical: '',
  ed_q1: '', ed_q2: '', ed_q3: '', ed_q4: '',
  hydration: '', alcohol_weekly: '', work_schedule: '',
  mobility: '', bloodwork: '', mental_health: '',
};

interface OnboardingState {
  data: OnboardingData;
  currentStep: number;
  setData: (partial: Partial<OnboardingData>) => void;
  setStep: (step: number) => void;
  reset: () => void;
  toProfilePayload: () => Record<string, any>;
  toEdScreening: () => boolean;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  data: { ...defaultData },
  currentStep: 0,
  setData: (partial) => set((s) => ({ data: { ...s.data, ...partial } })),
  setStep: (step) => set({ currentStep: step }),
  reset: () => set({ data: { ...defaultData }, currentStep: 0 }),

  toProfilePayload: () => {
    const d = get().data;
    return {
      goal: d.goal, situation: d.situation, experience: d.experience,
      weight: d.weight ? parseFloat(d.weight) : null,
      height: d.height ? parseFloat(d.height) : null,
      age: d.age ? parseInt(d.age) : null,
      training_days: d.training_days ? parseInt(d.training_days) : null,
      session_length: d.session_length ? parseInt(d.session_length) : null,
      current_split: d.current_split,
      injuries: d.has_injuries ? [d.injuries] : [],
      gut_health: d.gut_health,
      sleep: d.sleep, stress: d.stress, steps: d.steps,
      caffeine: d.caffeine, supplements: [d.supplements].filter(Boolean),
      medical_conditions: d.has_medical ? [d.medical] : [],
      ed_screening: { q1: d.ed_q1, q2: d.ed_q2, q3: d.ed_q3, q4: d.ed_q4 },
      hydration: d.hydration, alcohol_weekly: d.alcohol_weekly,
      work_schedule: d.work_schedule, mobility: d.mobility,
      bloodwork: d.bloodwork, mental_health: d.mental_health,
      completed: true,
    };
  },

  toEdScreening: () => {
    const d = get().data;
    const answers = [d.ed_q1, d.ed_q2, d.ed_q3, d.ed_q4].filter(Boolean);
    return answers.length >= 2 && answers.some(a => a === 'often' || a === 'always');
  },
}));
