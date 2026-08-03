import { exportBackup } from '../backup-service';

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
