import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type LayoutChangeEvent, type NativeSyntheticEvent, type TextInputContentSizeChangeEventData, type TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface TaskInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onHeightChange?: (height: number) => void;
}

export const TaskInput = forwardRef<TextInput, TaskInputProps>(({ value, onChangeText, onSubmit, onContentSizeChange, onHeightChange, style, ...props }, ref) => {
  const { colors } = useTheme();
  const [contentHeight, setContentHeight] = useState(24);
  const { colors } = useTheme();

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
        placeholderTextColor={colors.inputPlaceholder}
        multiline
        scrollEnabled={contentHeight >= 128}
        onContentSizeChange={handleContentSizeChange}
        autoFocus
        returnKeyType="default"
        blurOnSubmit={false}
        onSubmitEditing={onSubmit}
        selectionColor={colors.inputCursor}
        cursorColor={colors.inputCursor}
        style={[styles.input, style, { height: contentHeight, textAlign: 'left', color: colors.text }]}
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
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    minHeight: 24,
    backgroundColor: 'transparent',
    textAlign: 'left',
    textAlignVertical: 'center',
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
