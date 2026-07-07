import { View, Text, TextInput as RNTextInput, StyleSheet, KeyboardTypeOptions } from 'react-native';

interface Props {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
}

export default function TextInput({ label, value, onChange, placeholder, keyboardType, multiline }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <RNTextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#555"
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a2a' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
