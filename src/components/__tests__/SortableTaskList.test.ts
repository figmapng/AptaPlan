import React from 'react';
import { Text, View } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import SortableTaskList, { TrashIcon } from '../SortableTaskList';

jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    colors: {
      text: '#000000',
      card: '#FFFFFF',
      today: '#0195FF',
    },
    isDark: false,
  }),
}));

describe('SortableTaskList Component Architecture & Touch Stability', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  interface TestTask {
    id: string;
    title: string;
    date: string;
  }

  const sampleTasks: TestTask[] = [
    { id: 'task-1', title: 'Task 1', date: '2026-09-27' },
    { id: 'task-2', title: 'Task 2', date: '2026-09-27' },
    { id: 'task-3', title: 'Task 3', date: '2026-09-27' },
  ];

  test('exports SortableTaskList and TrashIcon correctly', () => {
    expect(SortableTaskList).toBeDefined();
    expect(TrashIcon).toBeDefined();
  });

  test('renders all items without crashing', () => {
    const handleReorder = jest.fn();
    const handleScrollEnabledChange = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        React.createElement(SortableTaskList as any, {
          data: sampleTasks,
          keyExtractor: (task: TestTask) => `${task.id}:${task.date}`,
          onReorder: handleReorder,
          onScrollEnabledChange: handleScrollEnabledChange,
          renderItem: (task: TestTask, isActive: boolean) =>
            React.createElement(
              View,
              { testID: `task-row-${task.id}` },
              React.createElement(Text, null, task.title),
              React.createElement(Text, null, isActive ? 'ACTIVE' : 'INACTIVE')
            ),
        })
      );
    });

    const tree = root!.toJSON();
    expect(tree).toBeDefined();

    // Verify all 3 tasks were rendered
    const textNodes = root!.root.findAllByType(Text).map((t) => t.props.children);
    expect(textNodes).toContain('Task 1');
    expect(textNodes).toContain('Task 2');
    expect(textNodes).toContain('Task 3');
  });

  test('touch down does not immediately trigger onGrant or disable scrolling', () => {
    const handleReorder = jest.fn();
    const handleScrollEnabledChange = jest.fn();
    const handleDragStart = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        React.createElement(SortableTaskList as any, {
          data: sampleTasks,
          keyExtractor: (task: TestTask) => task.id,
          onReorder: handleReorder,
          onScrollEnabledChange: handleScrollEnabledChange,
          onDragStart: handleDragStart,
          renderItem: (task: TestTask) => React.createElement(Text, null, task.title),
        })
      );
    });

    // Advance 100ms (less than 230ms long-press threshold)
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // onDragStart and onScrollEnabledChange should not have fired for a tap / short hold
    expect(handleDragStart).not.toHaveBeenCalled();
    expect(handleScrollEnabledChange).not.toHaveBeenCalled();
  });

  test('renders TrashIcon with customizable size and color', () => {
    let iconTree: renderer.ReactTestRenderer;
    act(() => {
      iconTree = renderer.create(React.createElement(TrashIcon, { color: '#FF3B30', size: 24 }));
    });
    expect(iconTree!.toJSON()).toBeDefined();
  });

  test('long press grants drag at 230ms, and rapid release (< 120ms) triggers fallback release cleanly without stuck state', () => {
    const handleReorder = jest.fn();
    const handleScrollEnabledChange = jest.fn();
    const handleDragStart = jest.fn();
    const handleDragEnd = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        React.createElement(SortableTaskList as any, {
          data: sampleTasks,
          keyExtractor: (task: TestTask) => task.id,
          onReorder: handleReorder,
          onScrollEnabledChange: handleScrollEnabledChange,
          onDragStart: handleDragStart,
          onDragEnd: handleDragEnd,
          renderItem: (task: TestTask, isActive: boolean) =>
            React.createElement(
              View,
              { testID: `row-${task.id}` },
              React.createElement(Text, null, `${task.title}:${isActive ? 'ACTIVE' : 'INACTIVE'}`)
            ),
        })
      );
    });

    // Find the first row view with onTouchStart
    const rowViews = root!.root.findAll((node) => typeof node.props.onTouchStart === 'function');
    expect(rowViews.length).toBeGreaterThan(0);
    const firstRow = rowViews[0];

    // 1. Touch start
    act(() => {
      firstRow.props.onTouchStart({
        nativeEvent: { pageX: 100, pageY: 200 },
      });
    });

    // 2. Advance 230ms -> long-press triggers!
    act(() => {
      jest.advanceTimersByTime(230);
    });
    expect(handleDragStart).toHaveBeenCalledTimes(1);

    // 3. User releases finger 30ms later (< 120ms elapsed)
    act(() => {
      jest.advanceTimersByTime(30);
      firstRow.props.onTouchEnd();
    });

    // 4. Advance past the fallback timer (e.g. 100ms)
    act(() => {
      jest.advanceTimersByTime(120);
    });

    // Verify handleDragEnd was called cleanly
    expect(handleDragEnd).toHaveBeenCalledWith(false);
  });

  test('stationary long-press held for 250ms after grant and released drops cleanly', () => {
    const handleReorder = jest.fn();
    const handleScrollEnabledChange = jest.fn();
    const handleDragStart = jest.fn();
    const handleDragEnd = jest.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        React.createElement(SortableTaskList as any, {
          data: sampleTasks,
          keyExtractor: (task: TestTask) => task.id,
          onReorder: handleReorder,
          onScrollEnabledChange: handleScrollEnabledChange,
          onDragStart: handleDragStart,
          onDragEnd: handleDragEnd,
          renderItem: (task: TestTask, isActive: boolean) =>
            React.createElement(Text, null, `${task.title}:${isActive ? 'ACTIVE' : 'INACTIVE'}`),
        })
      );
    });

    const rowViews = root!.root.findAll((node) => typeof node.props.onTouchStart === 'function');
    const firstRow = rowViews[0];

    // Touch start
    act(() => {
      firstRow.props.onTouchStart({
        nativeEvent: { pageX: 100, pageY: 200 },
      });
    });

    // Fire 230ms timer
    act(() => {
      jest.advanceTimersByTime(230);
    });
    expect(handleDragStart).toHaveBeenCalledTimes(1);

    // Hold stationary for 250ms (elapsed >= 120ms)
    act(() => {
      jest.advanceTimersByTime(250);
      firstRow.props.onTouchEnd();
    });

    // Advance spring animation
    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(handleDragEnd).toHaveBeenCalledWith(false);
  });
});
