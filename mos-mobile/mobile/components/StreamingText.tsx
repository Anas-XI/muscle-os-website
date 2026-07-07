import { useState, useEffect } from 'react';
import { Text } from 'react-native';

interface Props {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export default function StreamingText({ text, speed = 20, onComplete }: Props) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  return <Text>{displayed}</Text>;
}
