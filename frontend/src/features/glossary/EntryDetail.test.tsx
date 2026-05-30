import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryDetail } from './EntryDetail';
import i18n from '../../i18n';

describe('EntryDetail', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('fr');
    window.localStorage.clear();
  });

  const onBack = vi.fn();
  const onPractice = vi.fn();
  const onShowDetail = vi.fn();

  it("affiche la fiche d'un caractère avec ses infos clés", async () => {
    // "你" = char_4F60 (présent dans le bundle HSK1)
    render(
      <EntryDetail
        entryId="char_4F60"
        onBack={onBack}
        onPractice={onPractice}
        onShowDetail={onShowDetail}
      />,
    );

    // Le hanzi est affiché en grand
    expect(await screen.findByTestId('detail-hanzi')).toHaveTextContent('你');

    // Le pinyin diacritique est affiché
    expect(screen.getByTestId('detail-pinyin')).toHaveTextContent('nǐ');

    // Section informations (HSK, traits, radicaux)
    expect(screen.getByText(/Informations/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('affiche les sens groupés par langue', async () => {
    render(
      <EntryDetail
        entryId="char_4F60"
        onBack={onBack}
        onPractice={onPractice}
        onShowDetail={onShowDetail}
      />,
    );

    await screen.findByTestId('detail-hanzi');
    expect(screen.getByText(/Sens/i)).toBeInTheDocument();
  });

  it('affiche les mots dans lesquels le caractère apparaît', async () => {
    // "你" apparaît typiquement dans "你好"
    render(
      <EntryDetail
        entryId="char_4F60"
        onBack={onBack}
        onPractice={onPractice}
        onShowDetail={onShowDetail}
      />,
    );

    await screen.findByTestId('detail-hanzi');
    const relatedWords = await screen.findAllByTestId('related-word');
    expect(relatedWords.length).toBeGreaterThan(0);
  });

  it('cliquer sur "Tracer" appelle onPractice avec le hanzi', async () => {
    const onPracticeSpy = vi.fn();
    render(
      <EntryDetail
        entryId="char_4F60"
        onBack={onBack}
        onPractice={onPracticeSpy}
        onShowDetail={onShowDetail}
      />,
    );

    const user = userEvent.setup();
    const practiceBtn = await screen.findByTestId('detail-practice');
    await user.click(practiceBtn);

    expect(onPracticeSpy).toHaveBeenCalledWith('你');
  });

  it('cliquer sur ← appelle onBack', async () => {
    const onBackSpy = vi.fn();
    render(
      <EntryDetail
        entryId="char_4F60"
        onBack={onBackSpy}
        onPractice={onPractice}
        onShowDetail={onShowDetail}
      />,
    );

    const user = userEvent.setup();
    const backBtn = await screen.findByTestId('detail-back');
    await user.click(backBtn);

    expect(onBackSpy).toHaveBeenCalled();
  });

  it('cliquer sur un mot lié appelle onShowDetail avec son id', async () => {
    const onShowDetailSpy = vi.fn();
    render(
      <EntryDetail
        entryId="char_4F60"
        onBack={onBack}
        onPractice={onPractice}
        onShowDetail={onShowDetailSpy}
      />,
    );

    const user = userEvent.setup();
    const related = await screen.findAllByTestId('related-word');
    await user.click(related[0]!);

    expect(onShowDetailSpy).toHaveBeenCalled();
    expect(onShowDetailSpy.mock.calls[0]![0]).toMatch(/^word_/);
  });

  it('pour un mot, affiche les caractères constitutifs cliquables', async () => {
    const onShowDetailSpy = vi.fn();
    // word_4f604eec = "你们" (nǐmen, "vous"), composé de char_4F60 + char_4EEC
    render(
      <EntryDetail
        entryId="word_4f604eec"
        onBack={onBack}
        onPractice={onPractice}
        onShowDetail={onShowDetailSpy}
      />,
    );

    expect(await screen.findByTestId('detail-hanzi')).toHaveTextContent('你们');

    const constituents = await screen.findAllByTestId('constituent-character');
    expect(constituents.length).toBe(2);

    const user = userEvent.setup();
    await user.click(constituents[0]!);
    expect(onShowDetailSpy).toHaveBeenCalledWith('char_4F60');
  });

  it("affiche un message si l'id est introuvable", async () => {
    render(
      <EntryDetail
        entryId="char_DEADBEEF"
        onBack={onBack}
        onPractice={onPractice}
        onShowDetail={onShowDetail}
      />,
    );

    expect(await screen.findByText(/Entrée introuvable/i)).toBeInTheDocument();
  });

  describe('édition des traductions FR (surcharges locales)', () => {
    it('affiche un bouton "Ajouter une traduction" quand FR est absent du bundle', async () => {
      // Le bundle HSK 1 n'a pas de fr pour char_4F60 → on doit voir l'invite
      // d'ajout dans la section français.
      render(
        <EntryDetail
          entryId="char_4F60"
          onBack={onBack}
          onPractice={onPractice}
          onShowDetail={onShowDetail}
        />,
      );

      await screen.findByTestId('detail-hanzi');
      expect(screen.getByTestId('translations-fr')).toBeInTheDocument();
      expect(screen.getByTestId('edit-translations-fr')).toHaveTextContent(/ajouter/i);
    });

    it("permet d'ajouter une traduction FR et de la persister", async () => {
      const user = userEvent.setup();
      render(
        <EntryDetail
          entryId="char_4F60"
          onBack={onBack}
          onPractice={onPractice}
          onShowDetail={onShowDetail}
        />,
      );

      await screen.findByTestId('detail-hanzi');
      await user.click(screen.getByTestId('edit-translations-fr'));

      // Un input vide pré-rempli est présent
      const input = await screen.findByTestId('translation-input');
      await user.type(input, 'tu, toi');
      await user.click(screen.getByTestId('save-translations'));

      // Hors mode édition, la valeur saisie apparaît dans la liste
      expect(await screen.findByText('tu, toi')).toBeInTheDocument();
      // Marqueur de surcharge affiché
      expect(screen.getByTestId('override-marker-fr')).toBeInTheDocument();
      // Et persisté en localStorage (clé versionnée)
      const raw = window.localStorage.getItem('sinogrammes:translation_overrides');
      expect(raw).toContain('tu, toi');
    });

    it('ajoute plusieurs traductions via le bouton + Ajouter', async () => {
      const user = userEvent.setup();
      render(
        <EntryDetail
          entryId="char_4F60"
          onBack={onBack}
          onPractice={onPractice}
          onShowDetail={onShowDetail}
        />,
      );

      await screen.findByTestId('detail-hanzi');
      await user.click(screen.getByTestId('edit-translations-fr'));

      const firstInput = await screen.findByTestId('translation-input');
      await user.type(firstInput, 'tu');
      await user.click(screen.getByTestId('add-translation'));

      const inputs = await screen.findAllByTestId('translation-input');
      expect(inputs).toHaveLength(2);
      await user.type(inputs[1]!, 'toi');
      await user.click(screen.getByTestId('save-translations'));

      expect(await screen.findByText('tu')).toBeInTheDocument();
      expect(screen.getByText('toi')).toBeInTheDocument();
    });

    it("le bouton Annuler revient à l'état initial sans persister", async () => {
      const user = userEvent.setup();
      render(
        <EntryDetail
          entryId="char_4F60"
          onBack={onBack}
          onPractice={onPractice}
          onShowDetail={onShowDetail}
        />,
      );

      await screen.findByTestId('detail-hanzi');
      await user.click(screen.getByTestId('edit-translations-fr'));

      const input = await screen.findByTestId('translation-input');
      await user.type(input, 'devrait disparaître');
      await user.click(screen.getByTestId('cancel-translations'));

      expect(screen.queryByText('devrait disparaître')).not.toBeInTheDocument();
      expect(screen.queryByTestId('override-marker-fr')).not.toBeInTheDocument();
      // Aucune écriture localStorage
      expect(window.localStorage.getItem('sinogrammes:translation_overrides')).toBeNull();
    });
  });
});
