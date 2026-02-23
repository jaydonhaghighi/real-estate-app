import { ForbiddenException } from '@nestjs/common';

import { LeadsService } from './leads.service';

describe('LeadsService raw access', () => {
  it('denies team lead raw access for non-stale lead', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'lead-1', team_id: 'team-1', owner_agent_id: 'agent-1', state: 'Active' }]
      });

    const db = {
      withUserTransaction: async (
        _user: unknown,
        fn: (client: { query: typeof query }) => Promise<unknown>
      ) => fn({ query })
    };

    const crypto = {
      decrypt: jest.fn()
    };

    const service = new LeadsService(db as never, crypto as never);

    await expect(
      service.getRawEvents(
        { userId: 'lead-1', teamId: 'team-1', role: 'TEAM_LEAD' },
        'lead-1',
        'investigate'
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
