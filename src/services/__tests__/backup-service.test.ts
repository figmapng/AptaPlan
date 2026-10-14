import { exportBackup, normalizeBackupSettings, normalizeBackupTask } from '../backup-service';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert.alert = jest.fn((title, msg) => console.log('ALERT:', title, msg));
  RN.Share.share = jest.fn().mockResolvedValue({});
  return RN;
});

describe('backup-service', () => {
  it('should export backup payload format correctly', async () => {
    const mockDb = {
      getAllAsync: jest.fn().mockImplementation((query: string) => {
        if (query.includes('tasks')) return Promise.resolve([{ id: '1', title: 'Test Task' }]);
        if (query.includes('task_occurrences')) return Promise.resolve([]);
        if (query.includes('settings')) return Promise.resolve([{ key: 'haptics', value: 'true' }]);
        return Promise.resolve([]);
      }),
    } as any;

    const result = await exportBackup(mockDb);
    expect(result).toBe(true);
  });
});

describe('backup validation', () => {
  const valid = { id: 't1', title: ' Тапсырма ', date: '2026-03-02', time: '09:30', isCompleted: 1 };

  it('accepts a well-formed task and normalises its fields', () => {
    expect(normalizeBackupTask(valid)).toMatchObject({
      id: 't1',
      title: 'Тапсырма',
      date: '2026-03-02',
      time: '09:30',
      isCompleted: 1,
      priority: 'normal',
      repeatType: 'none',
      repeatInterval: 1,
    });
  });

  it('rejects tasks without id, title or a valid date, and soft-deleted ones', () => {
    expect(normalizeBackupTask({ ...valid, id: undefined })).toBeNull();
    expect(normalizeBackupTask({ ...valid, title: '  ' })).toBeNull();
    expect(normalizeBackupTask({ ...valid, date: '02.03.2026' })).toBeNull();
    expect(normalizeBackupTask({ ...valid, deletedAt: '2026-01-01' })).toBeNull();
    expect(normalizeBackupTask(null)).toBeNull();
  });

  it('drops an invalid time and broken repeatConfig instead of failing', () => {
    const r = normalizeBackupTask({ ...valid, time: '25h', repeatConfig: '{oops' });
    expect(r?.time).toBeNull();
    expect(r?.repeatConfig).toBeNull();
  });

  it('keeps only known, valid settings', () => {
    const rows = normalizeBackupSettings({
      haptics: 'false',
      theme: '"violet"',
      sortMode: 'not json',
      language: '"de"',
      demoSeeded: 'true',
    });
    expect(Object.fromEntries(rows)).toEqual({ haptics: 'false', theme: '"violet"' });
  });
});
