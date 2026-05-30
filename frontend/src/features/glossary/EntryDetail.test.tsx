import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryDetail } from './EntryDetail';
import i18n from '../../i18n';

describe('EntryDetail', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('fr');
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
});
