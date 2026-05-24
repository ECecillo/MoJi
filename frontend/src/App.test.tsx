import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import i18n from './i18n';

describe('App', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('fr');
  });

  it('affiche le titre et le caractère par défaut', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sinogrammes');
    expect(screen.getByLabelText(/Tracé du caractère 你/i)).toBeInTheDocument();
    expect(screen.getByTestId('current-language')).toHaveTextContent('fr');
  });

  it('bascule vers l’anglais quand on clique sur le bouton de langue', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('language-toggle'));

    expect(screen.getByTestId('current-language')).toHaveTextContent('en');
    expect(screen.getByRole('button', { name: /French/i })).toBeInTheDocument();
  });

  it('revient au français après deux bascules', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('language-toggle'));
    await user.click(screen.getByTestId('language-toggle'));

    expect(screen.getByTestId('current-language')).toHaveTextContent('fr');
  });
});
