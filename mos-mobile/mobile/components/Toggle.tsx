import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export default function Toggle({ label, value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.option, !value && styles.active]} onPress={() => onChange(false)}>
          <Text style={[styles.text, !value && styles.activeText]}>No</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.option, value && styles.active]} onPress={() => onChange(true)}>
          <Text style={[styles.text, value && styles.activeText]}>Yes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#1a1a1a', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  active: { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' },
  text: { color: '#94a3b8', fontWeight: '600' },
  activeText: { color: '#60a5fa' },
});
