import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CharacterGrid } from './CharacterGrid';

describe('CharacterGrid', () => {
  it('renders nothing when type is "none"', () => {
    const { container } = render(<CharacterGrid type="none" size={300} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Tian Zi Ge (cross)', () => {
    const { container } = render(<CharacterGrid type="tian" size={300} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    
    const lines = container.querySelectorAll('line');
    expect(lines).toHaveLength(2); // Vertical and horizontal mid lines
  });

  it('renders Mi Zi Ge (cross + diagonals)', () => {
    const { container } = render(<CharacterGrid type="mi" size={300} />);
    const lines = container.querySelectorAll('line');
    expect(lines).toHaveLength(4); // Vertical, horizontal, and 2 diagonals
  });

  it('renders Hui Zi Ge (cross + inner square)', () => {
    const { container } = render(<CharacterGrid type="hui" size={300} />);
    const lines = container.querySelectorAll('line');
    const rects = container.querySelectorAll('rect');
    
    expect(lines).toHaveLength(2); // Central cross
    // One for the outer border (always present) and one for the inner square
    expect(rects).toHaveLength(2); 
  });

  it('applies the provided className', () => {
    const { container } = render(
      <CharacterGrid type="tian" size={300} className="custom-class" />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('sets the correct size', () => {
    const size = 450;
    const { container } = render(<CharacterGrid type="tian" size={size} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', size.toString());
    expect(svg).toHaveAttribute('height', size.toString());
  });
});
