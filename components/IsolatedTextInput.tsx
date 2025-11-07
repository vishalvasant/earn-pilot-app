import React, { memo, useState, useEffect } from 'react';
import { TextInput, StyleSheet } from 'react-native';

interface IsolatedTextInputProps {
  initialValue: string;
  onValueChange: (text: string) => void;
  placeholder: string;
  style?: any;
  keyboardType?: any;
  returnKeyType?: any;
  maxLength?: number;
  autoCapitalize?: any;
  autoCorrect?: boolean;
  blurOnSubmit?: boolean;
  textContentType?: any;
  placeholderTextColor?: string;
}

const IsolatedTextInput = memo<IsolatedTextInputProps>(({ 
  initialValue,
  onValueChange,
  style,
  placeholder,
  placeholderTextColor,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(initialValue);

  // Sync with external value changes
  useEffect(() => {
    setInternalValue(initialValue);
  }, [initialValue]);

  const handleTextChange = (text: string) => {
    setInternalValue(text);
    onValueChange(text);
  };

  return (
    <TextInput
      value={internalValue}
      onChangeText={handleTextChange}
      style={style}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      {...props}
    />
  );
});

IsolatedTextInput.displayName = 'IsolatedTextInput';

export default IsolatedTextInput;