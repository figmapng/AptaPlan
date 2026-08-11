import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

interface TaskInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
}

export const TaskInput = forwardRef<TextInput, TaskInputProps>(({ value, onChangeText, onSubmit, style, ...props }, ref) => {
  const handleChangeText = (text: string) => {
    const cleanText = text.replace(/[\r\n]+/g, ' ');
    onChangeText(cleanText);
  };

  return (
    <TextInput
      ref={ref}
      value={value}
      onChangeText={handleChangeText}
      placeholder="Не істеуіңіз керек?"
      placeholderTextColor="#8E95A2"
      multiline={false}
      autoFocus
      returnKeyType="done"
      blurOnSubmit={false}
      onSubmitEditing={onSubmit}
      selectionColor="#01B7FF"
      cursorColor="#01B7FF"
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
    height: 24,
    backgroundColor: 'transparent',
    textAlignVertical: 'center',
  },
});
