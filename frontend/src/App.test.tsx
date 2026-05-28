import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import i18n from './i18n';

describe('App', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('fr');
  });

  it('affiche le titre et le glossaire par défaut', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sinogrammes');
    expect(await screen.findByPlaceholderText(/Chercher/i)).toBeInTheDocument();
    expect(screen.getByTestId('current-language')).toHaveTextContent('fr');
  });

  it('permet de naviguer vers le tracé depuis le glossaire', async () => {
    render(<App />);
    const user = userEvent.setup();

    // Wait for "Tracer" for "你" (it should be in the list)
    const practiceButtons = await screen.findAllByRole('button', { name: /Tracer/i });
    await user.click(practiceButtons[0]!);

    expect(await screen.findByLabelText(/Tracé du caractère/i)).toBeInTheDocument();

    // Test back button
    await user.click(screen.getByRole('button', { name: /←/i }));
    expect(await screen.findByPlaceholderText(/Chercher/i)).toBeInTheDocument();
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
