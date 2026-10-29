import { expect, it } from 'vitest';

import { GENDERS } from '@/lib/types';

it('GENDERS matches the backend Gender enum', () => {
  // Update api/models.py and this list together; the stats keys depend on both.
  expect(GENDERS).toEqual(['male', 'female', 'other']);
});
