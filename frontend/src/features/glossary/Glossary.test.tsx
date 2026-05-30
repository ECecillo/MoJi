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
  const onShowDetail = vi.fn();

  it('affiche les caractères par défaut et permet de chercher', async () => {
    render(<Glossary onSelect={onSelect} onShowDetail={onShowDetail} />);
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
    render(<Glossary onSelect={onSelect} onShowDetail={onShowDetail} />);
    const user = userEvent.setup();

    await screen.findByText(/Caractères/i);
    const wordsTab = screen.getByRole('button', { name: /Mots/i });

    await user.click(wordsTab);

    // On doit voir des mots (ex: "你好" si présent, ou au moins le compteur)
    expect(await screen.findByText(/Mots \(\d+\)/)).toBeInTheDocument();
  });

  it('appelle onSelect quand on clique sur Tracer', async () => {
    render(<Glossary onSelect={onSelect} onShowDetail={onShowDetail} />);
    const user = userEvent.setup();

    const practiceButtons = await screen.findAllByRole('button', { name: /Tracer/i });
    await user.click(practiceButtons[0]!);

    expect(onSelect).toHaveBeenCalled();
  });

  it('appelle onShowDetail quand on clique sur Détails', async () => {
    const onShowDetailSpy = vi.fn();
    render(<Glossary onSelect={onSelect} onShowDetail={onShowDetailSpy} />);
    const user = userEvent.setup();

    const detailButtons = await screen.findAllByRole('button', { name: /Détails/i });
    await user.click(detailButtons[0]!);

    expect(onShowDetailSpy).toHaveBeenCalled();
    // L'id passé est bien un id de la forme char_XXXX ou word_XXXX
    const firstArg = onShowDetailSpy.mock.calls[0]![0] as string;
    expect(firstArg).toMatch(/^(char|word)_/);
  });

  it('filtre par nombre de traits via le panneau de filtres', async () => {
    const user = userEvent.setup();
    render(<Glossary onSelect={onSelect} onShowDetail={onShowDetail} />);

    // Attente du chargement
    expect(await screen.findByText(/Caractères/i)).toBeInTheDocument();

    // Le panneau de filtres est replié par défaut
    await user.click(screen.getByTestId('filter-toggle'));

    // Restreindre à 1 trait : seul "一" / "丨" type devraient survivre
    const minInput = screen.getByTestId('filter-stroke-min');
    const maxInput = screen.getByTestId('filter-stroke-max');
    await user.type(minInput, '1');
    await user.type(maxInput, '1');

    // 一 (1 trait) reste visible, 你 (7 traits) doit disparaître
    expect(screen.getByText('一')).toBeInTheDocument();
    expect(screen.queryByText('你')).not.toBeInTheDocument();
  });

  it('le bouton de réinitialisation efface les filtres', async () => {
    const user = userEvent.setup();
    render(<Glossary onSelect={onSelect} onShowDetail={onShowDetail} />);

    expect(await screen.findByText(/Caractères/i)).toBeInTheDocument();
    await user.click(screen.getByTestId('filter-toggle'));

    await user.type(screen.getByTestId('filter-stroke-min'), '1');
    await user.type(screen.getByTestId('filter-stroke-max'), '1');
    expect(screen.queryByText('你')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('filter-reset'));
    expect(screen.getByText('你')).toBeInTheDocument();
  });

  it('cache les filtres caractère-only quand on bascule sur Mots', async () => {
    const user = userEvent.setup();
    render(<Glossary onSelect={onSelect} onShowDetail={onShowDetail} />);

    expect(await screen.findByText(/Caractères/i)).toBeInTheDocument();
    await user.click(screen.getByTestId('filter-toggle'));

    // Sur l'onglet Caractères, les inputs stroke + freq existent
    expect(screen.getByTestId('filter-stroke-min')).toBeInTheDocument();
    expect(screen.getByTestId('filter-frequency-min')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Mots \(\d+\)/ }));

    expect(screen.queryByTestId('filter-stroke-min')).not.toBeInTheDocument();
    expect(screen.queryByTestId('filter-frequency-min')).not.toBeInTheDocument();
  });
});
