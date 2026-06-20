import { nextPosition } from '../src/dnd';

describe('nextPosition', () => {
  it('드래그 델타 적용', () => {
    expect(nextPosition({ posX: 100, posY: 50 }, { x: 20, y: -10 })).toEqual({
      posX: 120,
      posY: 40,
    });
  });

  it('음수 좌표 방지(0 하한)', () => {
    expect(nextPosition({ posX: 5, posY: 5 }, { x: -100, y: -100 })).toEqual({
      posX: 0,
      posY: 0,
    });
  });

  it('소수 델타 반올림', () => {
    expect(nextPosition({ posX: 0, posY: 0 }, { x: 10.6, y: 3.2 })).toEqual({
      posX: 11,
      posY: 3,
    });
  });
});
