import { describe, expect, it } from 'vitest';
import { describeColour, parseColourInput } from './pantone.ts';

describe('parseColourInput', () => {
  it('reads hex colours with or without # and in short form', () => {
    expect(parseColourInput('#E4002B')).toEqual({ color: '#e4002b' });
    expect(parseColourInput('e4002b')).toEqual({ color: '#e4002b' });
    expect(parseColourInput('#f0a')).toEqual({ color: '#ff00aa' });
  });

  it('reads Pantone codes written in different ways', () => {
    const expected = { color: '#e4002b', pantone: 'Pantone 185 C' };
    expect(parseColourInput('185 C')).toEqual(expected);
    expect(parseColourInput('pms 185c')).toEqual(expected);
    expect(parseColourInput('Pantone 185')).toEqual(expected);
    expect(parseColourInput('Pantone White')).toEqual({ color: '#ffffff', pantone: 'Pantone WHITE' });
    expect(parseColourInput('cool grey 11')).toEqual({ color: '#53565a', pantone: 'Pantone COOL GRAY 11 C' });
  });

  it('rejects anything else', () => {
    expect(parseColourInput('')).toBeNull();
    expect(parseColourInput('blue-ish')).toBeNull();
    expect(parseColourInput('#12345')).toBeNull();
    expect(parseColourInput('99999 C')).toBeNull();
  });
});

describe('describeColour', () => {
  it('shows the Pantone code first when there is one', () => {
    expect(describeColour({ color: '#e4002b', pantone: 'Pantone 185 C' })).toBe('Pantone 185 C (#E4002B)');
    expect(describeColour({ color: '#0b2545' })).toBe('#0B2545');
  });
});
