import { View, Text, StyleSheet } from 'react-native';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBubble({ role, content }: Props) {
  const isUser = role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
        {content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginVertical: 4 },
  userBubble: { backgroundColor: '#3b82f6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: '#1e293b', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  text: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#fff' },
  assistantText: { color: '#e2e8f0' },
});
