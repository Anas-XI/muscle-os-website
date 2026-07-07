import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  step: number;
  total: number;
  title: string;
  canNext: boolean;
  onNext: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}

export default function OnboardingLayout({ step, total, title, canNext, onNext, onBack, children }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.back}>{'< Back'}</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
        <Text style={styles.step}>{step + 1}/{total}</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((step + 1) / total) * 100}%` }]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, !canNext && styles.buttonDisabled]} onPress={onNext} disabled={!canNext}>
          <Text style={styles.buttonText}>{step === total - 1 ? 'Finish' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, marginBottom: 12 },
  back: { color: '#3b82f6', fontSize: 16 },
  step: { color: '#666', fontSize: 14 },
  progressBar: { height: 4, backgroundColor: '#1a1a1a', borderRadius: 2, marginBottom: 24 },
  progressFill: { height: 4, backgroundColor: '#3b82f6', borderRadius: 2 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 24 },
  content: { flex: 1 },
  footer: { paddingVertical: 16 },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
