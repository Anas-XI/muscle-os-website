import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import * as api from '../../services/api';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'client' | 'coach'>('client');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setLoading(true);
    try {
      await api.authSignUp(email, password, name, role);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    if (role === 'client') {
      router.replace('/(onboarding)');
    } else {
      Alert.alert('Success', 'Account created. You can now log in.', [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#666" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#666" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password (min 6 chars)" placeholderTextColor="#666" value={password} onChangeText={setPassword} secureTextEntry />
        <View style={styles.roleRow}>
          <TouchableOpacity style={[styles.roleButton, role === 'client' && styles.roleActive]} onPress={() => setRole('client')}>
            <Text style={[styles.roleText, role === 'client' && styles.roleTextActive]}>Client</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roleButton, role === 'coach' && styles.roleActive]} onPress={() => setRole('coach')}>
            <Text style={[styles.roleText, role === 'coach' && styles.roleTextActive]}>Coach</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignup} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
        </TouchableOpacity>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 32 },
  form: { gap: 16 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, fontSize: 16, color: '#fff' },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#1a1a1a', alignItems: 'center' },
  roleActive: { backgroundColor: '#3b82f6' },
  roleText: { color: '#666', fontWeight: '600' },
  roleTextActive: { color: '#fff' },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkButton: { alignItems: 'center', padding: 8 },
  linkText: { color: '#3b82f6', fontSize: 14 },
});
