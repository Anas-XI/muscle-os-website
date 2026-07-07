import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import * as api from '../../../../services/api';
import { useChatStore } from '../../../../stores/chat-store';
import ChatBubble from '../../../../components/ChatBubble';

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { messages, loading, error, setMessages, addMessage, setLoading, setError } = useChatStore();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { session } } = api.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      loadHistory(session.user.id);
    }
  }, []);

  async function loadHistory(uid: string) {
    const { messages: msgs } = await api.fetchChatHistory(uid, 50);
    setMessages(msgs || []);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !userId) return;
    setInput('');

    const tempId = Date.now().toString();
    addMessage({ id: tempId, role: 'user', content: text, created_at: new Date().toISOString() });
    setLoading(true);
    setError(null);

    try {
      const data = await api.sendChat(userId, text);
      addMessage({ id: Date.now().toString(), role: 'assistant', content: data.response, created_at: new Date().toISOString() });
    } catch (e: any) {
      setError(e.message);
      addMessage({ id: Date.now().toString(), role: 'assistant', content: `Error: ${e.message}. Make sure the Python backend is running.`, created_at: new Date().toISOString() });
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Coach</Text>
        <TouchableOpacity onPress={() => api.authSignOut()}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ChatBubble role={item.role} content={item.content} />}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />
      {loading && <Text style={styles.typing}>Coaching...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your coach anything..."
          placeholderTextColor="#666"
          multiline
        />
        <TouchableOpacity style={[styles.sendButton, !input.trim() && styles.sendDisabled]} onPress={sendMessage} disabled={!input.trim() || loading}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  signOut: { color: '#ef4444', fontSize: 14 },
  list: { padding: 16, paddingBottom: 8 },
  typing: { color: '#666', paddingHorizontal: 16, fontSize: 13, fontStyle: 'italic' },
  error: { color: '#ef4444', paddingHorizontal: 16, fontSize: 13 },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  input: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12, color: '#fff', fontSize: 15, maxHeight: 100 },
  sendButton: { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600' },
});
