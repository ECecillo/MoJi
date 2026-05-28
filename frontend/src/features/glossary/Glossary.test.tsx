import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Glossary } from './Glossary';
import i18n from '../../i18n';

describe('Glossary', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('fr');
  });

  const onSelect = vi.fn();

  it('affiche les caractères par défaut et permet de chercher', async () => {
    render(<Glossary onSelect={onSelect} />);
    const user = userEvent.setup();

    // Attendre le chargement
    expect(await screen.findByText(/Caractères/i)).toBeInTheDocument();

    // Vérifier la présence de "你" (doit être dans HSK1)
    expect(screen.getByText('你')).toBeInTheDocument();

    // Chercher "ni"
    const input = screen.getByPlaceholderText(/Chercher/i);
    await user.type(input, 'ni');

    // "你" doit toujours être là (il y a plusieurs matches pour "ni" mais "你" est garanti)
    expect(screen.getByText('你')).toBeInTheDocument();
    expect(screen.getAllByText('nǐ').length).toBeGreaterThan(0);

    // Chercher un truc inexistant
    await user.clear(input);
    await user.type(input, 'xyz123');
    expect(await screen.findByText(/Aucun résultat/i)).toBeInTheDocument();
  });

  it('permet de basculer entre caractères et mots', async () => {
    render(<Glossary onSelect={onSelect} />);
    const user = userEvent.setup();

    await screen.findByText(/Caractères/i);
    const wordsTab = screen.getByRole('button', { name: /Mots/i });

    await user.click(wordsTab);

    // On doit voir des mots (ex: "你好" si présent, ou au moins le compteur)
    expect(await screen.findByText(/Mots \(\d+\)/)).toBeInTheDocument();
  });

  it('appelle onSelect quand on clique sur Tracer', async () => {
    render(<Glossary onSelect={onSelect} />);
    const user = userEvent.setup();

    const practiceButtons = await screen.findAllByRole('button', { name: /Tracer/i });
    await user.click(practiceButtons[0]!);

    expect(onSelect).toHaveBeenCalled();
  });
});
