import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

interface TaskInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
}

export const TaskInput = forwardRef<TextInput, TaskInputProps>(({ value, onChangeText, onSubmit, style, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      value={value}
      onChangeText={onChangeText}
      placeholder="Не істеуіңіз керек?"
      placeholderTextColor="#8E95A2"
      multiline
      autoFocus
      returnKeyType="done"
      blurOnSubmit={false}
      onSubmitEditing={onSubmit}
      style={[styles.input, style]}
      {...props}
    />
  );
});

TaskInput.displayName = 'TaskInput';

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    color: '#23262D',
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    minHeight: 24,
    maxHeight: 100,
    backgroundColor: 'transparent',
    textAlignVertical: 'center',
  },
});
