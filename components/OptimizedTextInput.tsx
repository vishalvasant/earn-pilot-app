import React, { memo } from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface OptimizedTextInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

const OptimizedTextInput = memo<OptimizedTextInputProps>(({ 
  value, 
  onChangeText, 
  style,
  ...props 
}) => {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      style={style}
      {...props}
    />
  );
});

OptimizedTextInput.displayName = 'OptimizedTextInput';

export default OptimizedTextInput;