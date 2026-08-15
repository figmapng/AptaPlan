import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, type NativeSyntheticEvent, type TextInputContentSizeChangeEventData, type TextInputProps } from 'react-native';

interface TaskInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onHeightChange?: (height: number) => void;
}

export const TaskInput = forwardRef<TextInput, TaskInputProps>(({ value, onChangeText, onSubmit, onContentSizeChange, onHeightChange, style, ...props }, ref) => {
  const [contentHeight, setContentHeight] = useState(24);

  const handleContentSizeChange = (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    const nextHeight = Math.max(24, Math.min(128, Math.ceil(event.nativeEvent.contentSize.height)));
    setContentHeight(nextHeight);
    onHeightChange?.(nextHeight);
    onContentSizeChange?.(event);
  };

  return (
    <TextInput
      ref={ref}
      value={value}
      onChangeText={onChangeText}
      placeholder="Не істеуіңіз керек?"
      placeholderTextColor="#8E95A2"
      multiline
      scrollEnabled={contentHeight >= 128}
      onContentSizeChange={handleContentSizeChange}
      autoFocus
      returnKeyType="default"
      blurOnSubmit={false}
      onSubmitEditing={onSubmit}
      selectionColor="#01B7FF"
      cursorColor="#01B7FF"
      // Keep the native multiline input unconstrained so iOS can calculate
      // the wrapped content height. The measured value is a minimum, not a
      // fixed height, otherwise the text view can remain stuck on one line.
      style={[styles.input, style, { minHeight: contentHeight, textAlign: 'left' }]}
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
    backgroundColor: 'transparent',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
