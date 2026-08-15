import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type LayoutChangeEvent, type NativeSyntheticEvent, type TextInputContentSizeChangeEventData, type TextInputProps } from 'react-native';

interface TaskInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onHeightChange?: (height: number) => void;
}

export const TaskInput = forwardRef<TextInput, TaskInputProps>(({ value, onChangeText, onSubmit, onContentSizeChange, onHeightChange, style, ...props }, ref) => {
  const [contentHeight, setContentHeight] = useState(24);

  const updateHeight = (height: number) => {
    const nextHeight = Math.max(24, Math.min(128, Math.ceil(height)));
    setContentHeight((current) => (current === nextHeight ? current : nextHeight));
    onHeightChange?.(nextHeight);
  };

  const handleContentSizeChange = (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    updateHeight(event.nativeEvent.contentSize.height);
    onContentSizeChange?.(event);
  };

  const handleMeasureLayout = (event: LayoutChangeEvent) => {
    updateHeight(event.nativeEvent.layout.height);
  };

  return (
    <View style={[styles.inputShell, { height: contentHeight }]}>
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
        style={[styles.input, style, { height: contentHeight, textAlign: 'left' }]}
        {...props}
      />
      <Text
        pointerEvents="none"
        accessible={false}
        onLayout={handleMeasureLayout}
        style={styles.measureText}
      >
        {value || ' '}
      </Text>
    </View>
  );
});

TaskInput.displayName = 'TaskInput';

const styles = StyleSheet.create({
  inputShell: {
    width: '100%',
    minHeight: 24,
    position: 'relative',
  },
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
    textAlignVertical: 'top',
  },
  measureText: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    padding: 0,
    color: 'transparent',
  },
});
