import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import type { Priority, Task } from '@/types/task';

export type TaskContextMenuProps = {
  visible: boolean;
  task: Task | null;
  anchorLayout: { x: number; y: number; width: number; height: number } | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onSetPriority?: (task: Task, priority: Priority) => void;
  onChangeDate?: (task: Task) => void;
  onRepeat?: (task: Task) => void;
  onToggleComplete?: (task: Task) => void;
  onPin?: (task: Task) => void;
};

export function TaskContextMenu({
  visible,
  task,
  anchorLayout,
  onClose,
  onEdit,
  onDelete,
  onSetPriority,
  onChangeDate,
  onRepeat,
  onToggleComplete,
  onPin,
}: TaskContextMenuProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const anim = useRef(new Animated.Value(0)).current;
  const [showPrioritySubmenu, setShowPrioritySubmenu] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowPrioritySubmenu(false);
      Animated.spring(anim, {
        toValue: 1,
        tension: 300,
        friction: 24,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, anim]);

  if (!visible || !task) return null;

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(style);
    }
  };

  const handleAction = (callback?: () => void) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    if (callback) {
      setTimeout(() => callback(), 120);
    }
  };

  // Safe coordinates
  const anchorY = anchorLayout ? anchorLayout.y : screenHeight / 2 - 24;
  const anchorX = anchorLayout ? anchorLayout.x : 16;
  const anchorW = anchorLayout ? anchorLayout.width : screenWidth - 32;
  const anchorH = anchorLayout ? anchorLayout.height : 48;

  const menuWidth = Math.min(260, screenWidth - 32);
  const estimatedMenuHeight = 240;

  // Determine smart placement (above or below)
  const spaceBelow = screenHeight - insets.bottom - (anchorY + anchorH);
  const placeAbove = spaceBelow < estimatedMenuHeight + 20 && anchorY > estimatedMenuHeight + insets.top;

  const menuTop = placeAbove
    ? Math.max(insets.top + 10, anchorY - estimatedMenuHeight - 10)
    : Math.min(screenHeight - insets.bottom - estimatedMenuHeight - 10, anchorY + anchorH + 10);

  const menuLeft = Math.max(16, Math.min(screenWidth - menuWidth - 16, anchorX));

  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const menuScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const menuTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [placeAbove ? 10 : -10, 0],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          )}
        </Animated.View>
      </TouchableWithoutFeedback>

      {/* Highlighted Selected Task Card Preview */}
      {anchorLayout && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.highlightedRow,
            {
              top: anchorY,
              left: anchorX,
              width: anchorW,
              opacity: anim,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.02],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.previewCard}>
            <View
              style={[
                styles.previewCheckbox,
                task.isCompleted && styles.previewCheckboxCompleted,
              ]}
            >
              {task.isCompleted && (
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M4.5 12.75l6 6 9-13.5"
                    stroke="#FFFFFF"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.previewTitle,
                task.isCompleted && styles.previewTitleCompleted,
              ]}
            >
              {task.title}
            </Text>
            {task.time && (
              <View style={styles.timeChip}>
                <Text style={styles.timeChipText}>{task.time}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Context Action Menu Card */}
      <Animated.View
        style={[
          styles.menuCard,
          {
            top: menuTop,
            left: menuLeft,
            width: menuWidth,
            opacity: anim,
            transform: [{ scale: menuScale }, { translateY: menuTranslateY }],
          },
        ]}
      >
        {!showPrioritySubmenu ? (
          <View style={styles.menuItemsContainer}>
            {/* ⇡ Бекіту / Pin */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.menuItem}
              onPress={() => handleAction(() => onPin?.(task))}
            >
              <PinIcon color="#1F2937" />
              <Text style={styles.menuItemText}>Бекіту</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* 📅 Дата / Date */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.menuItem}
              onPress={() => handleAction(() => onChangeDate?.(task) || onEdit(task))}
            >
              <CalendarIcon color="#1F2937" />
              <Text style={styles.menuItemText}>Дата</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* ✏️ Өзгерту / Edit */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.menuItem}
              onPress={() => handleAction(() => onEdit(task))}
            >
              <EditIcon color="#1F2937" />
              <Text style={styles.menuItemText}>Өзгерту</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* ⚑ Приоритет / Priority */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.menuItem}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setShowPrioritySubmenu(true);
              }}
            >
              <FlagIcon color={task.priority === 'important' ? '#EF4444' : '#1F2937'} />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Приоритет</Text>
                <Text style={styles.menuItemSubtext}>
                  {task.priority === 'important' ? 'Маңызды' : 'Қалыпты'}
                </Text>
              </View>
              <ChevronRightIcon color="#9CA3AF" />
            </TouchableOpacity>

            {/* 🔁 Қайталау / Repeat */}
            {onRepeat && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.menuItem}
                  onPress={() => handleAction(() => onRepeat(task))}
                >
                  <RepeatIcon color="#1F2937" />
                  <Text style={styles.menuItemText}>Повтор</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider} />

            {/* 🗑️ Өшіру / Delete (Destructive) */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.menuItem}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                onClose();
                setTimeout(() => onDelete(task), 120);
              }}
            >
              <TrashIcon color="#EF4444" />
              <Text style={[styles.menuItemText, styles.destructiveText]}>Удалить</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Priority Submenu */
          <View style={styles.menuItemsContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.menuItem, styles.submenuHeader]}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setShowPrioritySubmenu(false);
              }}
            >
              <ChevronLeftIcon color="#6B7280" />
              <Text style={styles.submenuHeaderText}>Басымдықты таңдау</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.menuItem}
              onPress={() => handleAction(() => onSetPriority?.(task, 'important'))}
            >
              <FlagIcon color="#EF4444" />
              <Text style={[styles.menuItemText, task.priority === 'important' && styles.selectedText]}>
                Маңызды (Important)
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.menuItem}
              onPress={() => handleAction(() => onSetPriority?.(task, 'normal'))}
            >
              <FlagIcon color="#9CA3AF" />
              <Text style={[styles.menuItemText, (task.priority === 'normal' || !task.priority) && styles.selectedText]}>
                Қалыпты (Normal)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ── Icons ─────────────────────────────────────────────────────────

function PinIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.75 3v2.25M17.25 3v2.25M3 8.25h18M4.5 4.5h15a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 18.75v-12A2.25 2.25 0 014.5 4.5z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EditIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4.5 1.05 1.05-4.5L16.862 3.487z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FlagIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v19"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RepeatIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M8.25 4.5l7.5 7.5-7.5 7.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronLeftIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M15.75 19.5L8.25 12l7.5-7.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  highlightedRow: {
    position: 'absolute',
    zIndex: 10001,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
  },
  previewCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  previewCheckboxCompleted: {
    borderColor: colors.checkedCheckboxBg,
    backgroundColor: colors.checkedCheckboxBg,
  },
  previewTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  previewTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  timeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  menuCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 16,
    zIndex: 10002,
    overflow: 'hidden',
  },
  menuItemsContainer: {
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  menuItemSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 4,
  },
  destructiveText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  selectedText: {
    fontWeight: '700',
    color: '#01B7FF',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginLeft: 46,
  },
  submenuHeader: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
  },
  submenuHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
});
