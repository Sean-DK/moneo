import { useEffect, useState } from 'react';
import { db } from '../../lib/db/db';
import { QUESTIONS, type Question } from './questions';
import {
  getOrCreateMoodEntry, answerQuestion, setActivities, setActivitiesChaotic,
  finishCheckIn, resumeStep,
} from './actions';
import { pickClosingMessage } from './closingMessages';
import { type MoodEntry } from '../../lib/db/types';
import { useNav } from '../../app/navStore';
import { ChevronLeft, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const CHAOTIC_LABEL = 'Everything, and more';

export function CheckInFlow({ moodDate }: { moodDate: string }) {
  const { closeCheckIn } = useNav();
  const [entry, setEntry] = useState<MoodEntry | null>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<{ closing: string } | null>(null);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Anchor the entry and resume at the first unanswered question.
  useEffect(() => {
    void getOrCreateMoodEntry(moodDate).then((e) => {
      setEntry(e);
      setStep(resumeStep(e));
    });
  }, [moodDate]);

  if (!entry) return <p className="p-4 text-muted">Loading…</p>;

  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-[18px] font-medium text-ink">{done.closing}</p>
        <button
          onClick={closeCheckIn}
          className="rounded-14 bg-accent px-6 py-2.5 font-bold text-ink-on-accent"
        >
          Done
        </button>
      </div>
    );
  }

  const total = QUESTIONS.length;

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    } else {
      closeCheckIn();
    }
  };

  const advance = async (refreshed: MoodEntry) => {
    setEntry(refreshed);
    if (step + 1 < QUESTIONS.length) {
      setDirection(1);
      setStep(step + 1);
    } else {
      await finishCheckIn(refreshed, null);
      setDone({ closing: pickClosingMessage(refreshed.laughed === true) });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <CheckInHeader onBack={goBack} onClose={closeCheckIn} canGoBack={step > 0} />
      <ProgressBar step={step} total={total} />

      <div className="relative flex-1">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 flex flex-col"
          >
            <QuestionStep
              question={QUESTIONS[step]}
              entry={entry}
              onAnswered={advance}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

function QuestionStep({ question, entry, onAnswered }: {
  question: Question; entry: MoodEntry; onAnswered: (e: MoodEntry) => void;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const [pending, setPending] = useState<number | null>(null); // the just-tapped value

  useEffect(() => {
    if (!question.autoInfoKey) return;
    void db.meta.get(`seen.${question.autoInfoKey}`).then((row) => {
      if (!row) {
        setShowInfo(true);
        void db.meta.put({ key: `seen.${question.autoInfoKey}`, value: 'true' });
      }
    });
  }, [question.autoInfoKey]);

  const commitSingle = (value: number) => {
    if (pending !== null) return;        // ignore taps during the confirmation beat
    setPending(value);                   // instant visual feedback

    void (async () => {
      await answerQuestion(entry.id, question.field, value);
      const refreshed = await db.moodEntries.get(entry.id);
      // Hold the highlight briefly, then advance.
      setTimeout(() => {
        if (refreshed) onAnswered(refreshed);
      }, 280);
    })();
  };

  const currentValue = entry[question.field] as number | boolean | null;

  return (
    <>
      <QuestionCard
        prompt={question.prompt}
        info={question.info ? () => setShowInfo(true) : undefined}
      >
        {question.kind === 'multi' ? (
          <ActivitiesPicker entry={entry} question={question} onAnswered={onAnswered} />
        ) : (
          <div className="flex flex-col gap-2">
            {question.options.map((o) => {
              const isSelected = pending !== null ? pending === o.value : currentValue === o.value;
              const isDimmed = pending !== null && pending !== o.value;
              return (
                <OptionButton
                  key={o.value}
                  label={o.label}
                  selected={isSelected}
                  dimmed={isDimmed}
                  onClick={() => commitSingle(o.value)}
                />
              );
            })}
          </div>
        )}
      </QuestionCard>

      {showInfo && question.info && (
        <InfoPopup text={question.info} onClose={() => setShowInfo(false)} />
      )}
    </>
  );
}

function ActivitiesPicker({ entry, question, onAnswered }: {
  entry: MoodEntry; question: Question; onAnswered: (e: MoodEntry) => void;
}) {
  const [selected, setSelected] = useState<number>(entry.activities ?? 0);
  const [chaotic, setChaotic] = useState<boolean>(entry.activitiesChaotic ?? false);

  const toggleFlag = (bit: number) => {
    if (chaotic) return;
    setSelected((s) => (s & bit ? s & ~bit : s | bit));
  };

  const commit = async () => {
    if (chaotic) await setActivitiesChaotic(entry.id);
    else await setActivities(entry.id, selected);
    const refreshed = await db.moodEntries.get(entry.id);
    if (refreshed) onAnswered(refreshed);
  };

  return (
    <div className="flex flex-col gap-2">
      {question.options.map((o) => (
        <OptionButton
          key={o.value}
          label={o.label}
          selected={!chaotic && (selected & o.value) !== 0}
          disabled={chaotic}
          onClick={() => toggleFlag(o.value)}
          multi
        />
      ))}
      <OptionButton
        label={CHAOTIC_LABEL}
        selected={chaotic}
        onClick={() => { setChaotic((c) => !c); setSelected(0); }}
        multi
      />
      <button
        onClick={() => void commit()}
        disabled={!chaotic && selected === 0}
        className="mt-2 rounded-14 bg-accent py-2.5 font-bold text-ink-on-accent disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

// --- Small presentational pieces (style to your design system) ---

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-4 h-1 w-full rounded-full bg-white/10">
      <div
        className="h-1 rounded-full bg-accent transition-all"
        style={{ width: `${((step + 1) / total) * 100}%` }}
      />
    </div>
  );
}

function QuestionCard({ prompt, info, children }: {
  prompt: string; info?: () => void; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <div className="flex items-center justify-center gap-2 text-center">
        <h2 className="text-[22px] font-bold text-ink">{prompt}</h2>
        {info && (
          <button onClick={info} aria-label="More info" className="text-muted">ⓘ</button>
        )}
      </div>
      {children}
    </div>
  );
}

function OptionButton({ label, onClick, selected, disabled, multi, dimmed }: {
  label: string; onClick: () => void; selected?: boolean;
  disabled?: boolean; multi?: boolean; dimmed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-14 border py-3.5 text-[16px] font-semibold disabled:opacity-40"
      style={{
        borderColor: selected ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
        background: selected ? 'var(--accent)' : 'var(--surface)',
        color: selected ? 'var(--ink-on-accent)' : 'var(--ink)',
        opacity: dimmed ? 0.35 : 1,
        transform: selected ? 'scale(1.02)' : 'scale(1)',
        transition: 'background-color 140ms, border-color 140ms, color 140ms, opacity 180ms, transform 140ms',
      }}
    >
      {label}{multi && selected ? ' ✓' : ''}
    </button>
  );
}

function InfoPopup({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div className="max-w-sm rounded-2xl bg-base p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-[15px] text-ink">{text}</p>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-14 bg-accent py-2.5 font-bold text-ink-on-accent"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function CheckInHeader({ onBack, onClose, canGoBack }: {
  onBack: () => void; onClose: () => void; canGoBack: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <button
        onClick={onBack}
        aria-label={canGoBack ? 'Previous question' : 'Close'}
        className="p-1 text-muted"
      >
        <ChevronLeft size={22} />
      </button>
      <button onClick={onClose} aria-label="Close check-in" className="p-1 text-muted">
        <X size={22} />
      </button>
    </div>
  );
}