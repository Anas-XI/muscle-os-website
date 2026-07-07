import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  label: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

export default function OptionPicker({ label, options, selected, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.option, selected === opt.value && styles.selected]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[styles.optionText, selected === opt.value && styles.selectedText]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' },
  selected: { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' },
  optionText: { color: '#94a3b8', fontSize: 14 },
  selectedText: { color: '#60a5fa', fontWeight: '600' },
});
