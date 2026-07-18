import { useEffect, useState, type ReactNode } from 'react';
import { db } from '../../lib/db/db';
import { QUESTIONS, chaoticActivityIcon, type Question } from './questions';
import {
  getOrCreateMoodEntry, answerQuestion, setActivities, setActivitiesChaotic,
  finishCheckIn, resumeStep,
} from './actions';
import { pickClosingMessage } from './closingMessages';
import { type MoodEntry } from '../../lib/db/types';
import { useNav } from '../../app/navStore';
import { ChevronLeft, X, Check, Info, Moon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CHECKIN_CANVAS, GHOST_TEXT, GHOST_DIVIDER, SECTION_ACCENT,
  optionRampColor, hexToRgba,
} from './checkInTheme';

const CHAOTIC_LABEL = 'Everything, and more';

export function CheckInFlow({ moodDate }: { moodDate: string }) {
  const { closeCheckIn } = useNav();
  const [entry, setEntry] = useState<MoodEntry | null>(null);
  const [step, setStep] = useState(0);
  const [showGreeting, setShowGreeting] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [closingMessage, setClosingMessage] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    void getOrCreateMoodEntry(moodDate).then((e) => {
      setEntry(e);
      const s = resumeStep(e);
      setStep(s);
      if (s === 0) setShowGreeting(true); // greeting only on a fresh start
    });
  }, [moodDate]);

  // Reset the info popup and auto-open it once per question that has one.
  useEffect(() => {
    setShowInfo(false);
    const q = QUESTIONS[step];
    if (!q?.autoInfoKey) return;
    void db.meta.get(`seen.${q.autoInfoKey}`).then((row) => {
      if (!row) {
        setShowInfo(true);
        void db.meta.put({ key: `seen.${q.autoInfoKey}`, value: 'true' });
      }
    });
  }, [step]);

  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: CHECKIN_CANVAS }}>
        <p style={{ color: GHOST_TEXT }}>Loading…</p>
      </div>
    );
  }

  if (closingMessage) {
    return <ClosingScreen message={closingMessage} onDone={closeCheckIn} reducedMotion={reducedMotion} />;
  }

  const total = QUESTIONS.length;
  const question = QUESTIONS[step];
  const { accent, orb: orbColor } = SECTION_ACCENT[question.group];

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
    if (step + 1 < total) {
      setDirection(1);
      setStep(step + 1);
    } else {
      await finishCheckIn(refreshed, null);
      setClosingMessage(pickClosingMessage(refreshed.laughed === true));
    }
  };

  return (
    <div className="relative h-full overflow-hidden" style={{ background: CHECKIN_CANVAS }}>
      <Orb
        orbColor={orbColor}
        size={300}
        duration={7}
        reducedMotion={reducedMotion}
        style={{ top: 120, left: '50%', transform: 'translateX(-50%)' }}
      />

      <TopControls onBack={goBack} onClose={closeCheckIn} />

      <AnimatePresence>
        {!showGreeting && (
          <motion.div
            key="content"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <ProgressRow
              step={step}
              total={total}
              group={question.group}
              accent={accent}
              onInfo={question.info ? () => setShowInfo(true) : undefined}
            />
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0"
              >
                <QuestionStep
                  question={question}
                  entry={entry}
                  accent={accent}
                  onAnswered={(e) => void advance(e)}
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGreeting && (
          <GreetingBeat
            key="greeting"
            reducedMotion={reducedMotion}
            onDone={() => setShowGreeting(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInfo && question.info && (
          <InfoSheet
            key="info"
            title={question.prompt}
            text={question.info}
            accent={accent}
            onClose={() => setShowInfo(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

// --- The orb: a breathing, per-section glow that cross-fades on chapter change ---

function Orb({ orbColor, size, duration, reducedMotion, style }: {
  orbColor: string; size: number; duration: number; reducedMotion: boolean; style: React.CSSProperties;
}) {
  return (
    <div className="pointer-events-none absolute" style={{ ...style, width: size, height: size }}>
      <AnimatePresence>
        <motion.div
          key={orbColor}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 rounded-full"
          style={{ filter: 'blur(10px)' }}
        >
          <motion.div
            className="h-full w-full rounded-full"
            style={{ background: `radial-gradient(circle, ${orbColor}, transparent 68%)` }}
            animate={reducedMotion
              ? { opacity: 0.675, scale: 1 }
              : { opacity: [0.5, 0.85, 0.5], scale: [1, 1.08, 1] }}
            transition={reducedMotion
              ? { duration: 0 }
              : { duration, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function GreetingBeat({ reducedMotion, onDone }: {
  reducedMotion: boolean; onDone: () => void;
}) {
  const { accent } = SECTION_ACCENT.Mood;

  useEffect(() => {
    const t = setTimeout(onDone, reducedMotion ? 900 : 2200);
    return () => clearTimeout(t);
  }, [onDone, reducedMotion]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onDone}
    >
      <motion.span
        className="text-[28px] font-semibold tracking-[-.01em]"
        style={{ color: accent, opacity: 0.9 }}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 0.9 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        Let's look back on your day
      </motion.span>
      <motion.span
        className="text-[14px]"
        style={{ color: GHOST_TEXT }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        Tap to begin
      </motion.span>
    </motion.div>
  );
}

// --- Progress row: one hairline + a mono chapter label + optional info glyph ---

function ProgressRow({ step, total, group, accent, onInfo }: {
  step: number; total: number; group: string; accent: string; onInfo?: () => void;
}) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div
      className="absolute flex items-center gap-3"
      style={{ top: 56, left: 26, right: 26, paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-[2px] flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,.10)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: accent }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <span
        className="flex-none whitespace-nowrap text-[10px] font-semibold uppercase"
        style={{ color: '#6A6D68', letterSpacing: '.12em', fontFamily: 'var(--font-mono)' }}
      >
        {group} · {String(step + 1).padStart(2, '0')}/{total}
      </span>
      {onInfo && (
        <button
          onClick={onInfo}
          aria-label="More info"
          className="flex h-5 w-5 flex-none items-center justify-center rounded-full"
          style={{ border: '1px solid rgba(255,255,255,.14)' }}
        >
          <Info size={13} style={{ color: '#8A8D88' }} />
        </button>
      )}
    </div>
  );
}

// --- Prompt ---

function Prompt({ text }: { text: string }) {
  return (
    <div className="absolute text-center" style={{ top: 118, left: 26, right: 26 }}>
      <div
        className="text-[30px] font-semibold text-ink"
        style={{ lineHeight: 1.28, letterSpacing: '-.015em', textWrap: 'balance' }}
      >
        {text}
      </div>
    </div>
  );
}

// --- One question's answer area ---

function QuestionStep({ question, entry, accent, onAnswered }: {
  question: Question; entry: MoodEntry; accent: string; onAnswered: (e: MoodEntry) => void;
}) {
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => { setPending(null); }, [question.field]);

  const commitSingle = (value: number) => {
    if (pending !== null) return;        // ignore taps during the confirmation beat
    setPending(value);                   // instant visual feedback

    void (async () => {
      await answerQuestion(entry.id, question.field, value);
      const refreshed = await db.moodEntries.get(entry.id);
      setTimeout(() => {
        if (refreshed) onAnswered(refreshed);
      }, 200);
    })();
  };

  const currentValue = entry[question.field] as number | boolean | null;

  return (
    <>
      <Prompt text={question.prompt} />
      {question.kind === 'multi' ? (
        <ActivitiesPicker entry={entry} question={question} accent={accent} onAnswered={onAnswered} />
      ) : (
        <AnswerStack>
          {question.options.map((o, i) => {
            const isSelected = pending !== null ? pending === o.value : currentValue === o.value;
            const isDimmed = pending !== null && pending !== o.value;
            const Icon = o.icon;
            const dotColor = Icon ? null : optionRampColor(question.options, i);
            return (
              <AnswerRow
                key={o.value}
                leading={Icon
                  ? <Icon size={23} strokeWidth={2} style={{ color: isSelected ? accent : '#7C7F79', flexShrink: 0 }} />
                  : <ScaleDot color={dotColor!} selected={isSelected} />}
                label={o.label}
                selected={isSelected}
                dimmed={isDimmed}
                last={i === question.options.length - 1}
                accent={accent}
                onClick={() => commitSingle(o.value)}
              />
            );
          })}
        </AnswerStack>
      )}
    </>
  );
}

function ActivitiesPicker({ entry, question, accent, onAnswered }: {
  entry: MoodEntry; question: Question; accent: string; onAnswered: (e: MoodEntry) => void;
}) {
  const [selected, setSelected] = useState<number>(entry.activities ?? 0);
  const [chaotic, setChaotic] = useState<boolean>(entry.activitiesChaotic ?? false);
  const ChaoticIcon = chaoticActivityIcon;

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

  const canContinue = chaotic || selected !== 0;

  return (
    <AnswerStack>
      {question.options.map((o) => (
        <MultiRow
          key={o.value}
          icon={o.icon}
          label={o.label}
          checked={!chaotic && (selected & o.value) !== 0}
          disabled={chaotic}
          accent={accent}
          onClick={() => toggleFlag(o.value)}
        />
      ))}
      <MultiRow
        icon={ChaoticIcon}
        label={CHAOTIC_LABEL}
        checked={chaotic}
        accent={accent}
        separatorAbove
        last
        onClick={() => { setChaotic((c) => !c); setSelected(0); }}
      />
      <button
        onClick={() => void commit()}
        disabled={!canContinue}
        className="mt-4 w-full rounded-14 py-4 text-[16px] font-bold transition-colors"
        style={{
          background: canContinue ? accent : 'rgba(255,255,255,.06)',
          color: canContinue ? '#0C1413' : '#6A6D68',
        }}
      >
        Continue
      </button>
    </AnswerStack>
  );
}

// --- Shared presentational pieces ---

function AnswerStack({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute flex flex-col"
      style={{
        left: 0, right: 0, bottom: 'calc(70px + env(safe-area-inset-bottom))',
        padding: '0 30px', gap: 2,
      }}
    >
      {children}
    </div>
  );
}

function ScaleDot({ color, selected }: { color: string; selected: boolean }) {
  return (
    <span
      className="flex-none rounded-full"
      style={{
        width: 9, height: 9, background: color,
        boxShadow: selected ? `0 0 0 4px ${hexToRgba(color, 0.22)}` : 'none',
        transition: 'box-shadow 150ms',
      }}
    />
  );
}

function AnswerRow({ leading, label, selected, dimmed, last, accent, onClick }: {
  leading: ReactNode; label: string; selected: boolean; dimmed: boolean;
  last: boolean; accent: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3.5 py-[15px] px-2 text-left"
      style={{
        borderBottom: last ? 'none' : `1px solid ${GHOST_DIVIDER}`,
        opacity: dimmed ? 0.35 : 1,
        transition: 'opacity 180ms',
      }}
    >
      {leading}
      <span
        className="flex-1 text-[19px]"
        style={{
          fontWeight: selected ? 700 : 500,
          color: selected ? '#F1F1EC' : GHOST_TEXT,
          transition: 'color 150ms',
        }}
      >
        {label}
      </span>
      {selected && (
        <motion.span
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18 }}
          className="ml-auto flex-none"
        >
          <Check size={20} strokeWidth={2.4} style={{ color: accent }} />
        </motion.span>
      )}
    </button>
  );
}

function Checkbox({ checked, accent }: { checked: boolean; accent: string }) {
  return (
    <span
      className="flex h-5 w-5 flex-none items-center justify-center"
      style={{
        borderRadius: 7,
        border: `2px solid ${checked ? accent : '#555853'}`,
        background: checked ? accent : 'transparent',
        transition: 'background-color 150ms, border-color 150ms',
      }}
    >
      {checked && <Check size={13} strokeWidth={3} style={{ color: '#0C1413' }} />}
    </span>
  );
}

function MultiRow({ icon: Icon, label, checked, disabled, accent, last, separatorAbove, onClick }: {
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string; checked: boolean; disabled?: boolean; accent: string;
  last?: boolean; separatorAbove?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3.5 py-[15px] px-2 text-left disabled:opacity-40"
      style={{
        borderTop: separatorAbove ? `1px solid ${GHOST_DIVIDER}` : undefined,
        borderBottom: last ? 'none' : `1px solid ${GHOST_DIVIDER}`,
        marginTop: separatorAbove ? 6 : 0,
      }}
    >
      <Checkbox checked={checked} accent={accent} />
      {Icon && <Icon size={20} style={{ color: checked ? accent : '#7C7F79' }} />}
      <span
        className="flex-1 text-[19px]"
        style={{ fontWeight: checked ? 700 : 500, color: checked ? '#F1F1EC' : GHOST_TEXT }}
      >
        {label}
      </span>
    </button>
  );
}

// --- Closing screen ---

function ClosingScreen({ message, onDone, reducedMotion }: {
  message: string; onDone: () => void; reducedMotion: boolean;
}) {
  const { accent, orb: orbColor } = SECTION_ACCENT.Mood; // home color

  return (
    <motion.div
      className="relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden px-8 text-center"
      style={{ background: CHECKIN_CANVAS }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Orb
        orbColor={orbColor}
        size={360}
        duration={9}
        reducedMotion={reducedMotion}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <Moon size={28} style={{ color: accent, opacity: 0.85 }} className="relative" />
      <h1
        className="relative text-[28px] font-semibold text-ink"
        style={{ lineHeight: 1.35, textWrap: 'balance' }}
      >
        {message}
      </h1>
      <p className="relative text-[15px]" style={{ color: GHOST_TEXT, lineHeight: 1.6 }}>
        That&rsquo;s everything. Sleep well.
      </p>
      <button
        onClick={onDone}
        className="relative mt-2 w-full max-w-[300px] rounded-14 py-4 text-[16px] font-bold"
        style={{ background: accent, color: '#0C1413' }}
      >
        Done
      </button>
    </motion.div>
  );
}

// --- Info popup: a calm bottom sheet, not a harsh modal ---

function InfoSheet({ title, text, accent, onClose }: {
  title: string; text: string; accent: string; onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(6,8,7,.66)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full"
        style={{
          background: '#141618',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTop: '1px solid rgba(255,255,255,.08)',
          padding: '24px 26px calc(28px + env(safe-area-inset-bottom))',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: 'rgba(255,255,255,.16)' }} />
        <p className="text-[17px] font-semibold text-ink">{title}</p>
        <p className="mt-2 text-[14.5px]" style={{ color: GHOST_TEXT, lineHeight: 1.6 }}>{text}</p>
        <button
          onClick={onClose}
          className="mt-4 text-[14px] font-semibold"
          style={{ color: accent }}
        >
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}

// --- Minimal back/close controls — no chrome, matches the quiet aesthetic ---

function TopControls({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  return (
    <div
      className="absolute flex items-center justify-between"
      style={{ top: 'calc(15px + env(safe-area-inset-top))', left: 20, right: 20, zIndex: 1 }}
    >
      <button onClick={onBack} aria-label="Back" className="p-1" style={{ color: '#6F726D' }}>
        <ChevronLeft size={20} />
      </button>
      <button onClick={onClose} aria-label="Close check-in" className="p-1" style={{ color: '#6F726D' }}>
        <X size={20} />
      </button>
    </div>
  );
}
