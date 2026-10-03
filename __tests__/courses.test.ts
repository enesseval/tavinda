import { dedupeShortNames, groupCourses, shortNameFor } from '../src/ui/courseDrafts';

describe('course codes', () => {
  test('similar names get different codes; the same name keeps its code', () => {
    const existing = [{ name: 'Elmak', shortName: 'ELM' }];
    expect(shortNameFor('Elmak', [])).toBe('ELM');
    expect(shortNameFor('Elmak Lab', existing)).toBe('ELML');
    expect(shortNameFor('elmak', existing)).toBe('ELM');
    expect(shortNameFor('Elmalı', [...existing, { name: 'Elmak Lab', shortName: 'ELML' }])).toBe('ELMA');
    expect(shortNameFor('İstatistik', [])).toBe('İST');
  });

  test('older data with shared codes is repaired; first course keeps its code', () => {
    const rows = [
      { id: 1, name: 'Elmak', shortName: 'ELM' },
      { id: 2, name: 'Elmak Lab', shortName: 'ELM' },
      { id: 3, name: 'Elmak', shortName: 'ELM' },
      { id: 4, name: 'Elmak Lab', shortName: 'ELM' },
    ];
    expect(dedupeShortNames(rows)).toEqual([
      { id: 2, shortName: 'ELML' },
      { id: 4, shortName: 'ELML' },
    ]);
    expect(dedupeShortNames([{ id: 1, name: 'Fizik', shortName: 'FİZ' }])).toEqual([]);
  });

  test('a course meeting on several days is one group with its slots in week order', () => {
    const slot = (id: number, weekday: number, startTime: string, name = 'Fizik') => ({
      id,
      name,
      shortName: 'FİZ',
      color: '#000000',
      weekday,
      startTime,
    });
    const groups = groupCourses([slot(1, 5, '13:00'), slot(2, 1, '09:00'), slot(3, 3, '10:00'), slot(4, 2, '08:00', 'Kimya')]);
    expect(groups.map((g) => g.name)).toEqual(['Fizik', 'Kimya']);
    expect(groups[0].slots.map((s) => s.id)).toEqual([2, 3, 1]);
  });
});
