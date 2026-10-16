// HUMAN: every string in this file. Generated microcopy tends toward cute; the target is dry.
// Badge names and emoji are placeholders.

export type BadgeId = 'good-company' | 'fox' | 'sheep' | 'stray' | 'split'

export const BADGES: Record<BadgeId, { emoji: string; name: string; line: string }> = {
  // HUMAN: badge names and emoji.
  'good-company': { emoji: '✅', name: 'In good company', line: 'You were right. So was most of the room.' },
  fox: { emoji: '🦊', name: 'Fox', line: 'You were right. Most of the room was not.' },
  sheep: { emoji: '🐑', name: 'Sheep', line: 'You were wrong. So was most of the room.' },
  stray: { emoji: '⚪', name: 'Stray', line: 'You were wrong. Most of the room was right.' },
  split: { emoji: '⚖️', name: 'Split', line: 'The room was split.' },
}

export const COPY = {
  wordmark: 'Read the Room', // HUMAN: the wordmark. Set in the serif; no logo.
  tagline: 'Five claims. Your call, then your read of the room.', // HUMAN: the tagline.
  play: 'Play',
  share: 'Share',
  howToPlay: 'How to play',
  stats: 'Stats',
  archive: 'Archive',
  back: 'Back',
  next: 'Next',
  seeResults: 'See results',
  lock: 'Lock',
  true: 'True',
  false: 'False',
  youSaid: (v: 'true' | 'false') => `You said: ${v === 'true' ? 'True' : 'False'}`,
  sliderQuestion: 'How much of the room says TRUE?',
  sayTrue: 'Say true',
  sayFalse: 'Say false',
  unsure: 'Unsure',
  thatDotIsYou: 'That dot is you.',
  stampTrue: 'True',
  stampFalse: 'False',
  // HUMAN: the three onboarding lines. Nine words per panel maximum.
  howTo: [
    { title: 'Call it', line: 'Five claims. Call each one, then say how sure.' },
    { title: 'Read the room', line: 'Then guess how much of the room says true.' },
    { title: 'See where you stood', line: 'A real poll fills in. That dot is you.' },
  ],
  roomIs: 'The room is a real polled public, not other players.',
  accuracy: 'Accuracy',
  read: 'Read',
  streak: 'Streak',
  streakDays: (n: number) => (n === 1 ? '1 day' : `${n} days`),
  // HUMAN: results-screen phrases.
  youVsRoom: (you: number, room: number) => `you said ${you}, room said ${room}`,
  sendOne: 'Send a friend the one that got you',
  doneToday: 'Today is done. Come back tomorrow.',
  archiveNote: 'archive — doesn’t count',
  yesterday: 'Yesterday',
  playIt: 'Play it',
  playToday: 'Play today’s puzzle',
  copied: 'Copied',
  shared: 'Shared',
  shareFailed: 'Could not share. Copied the text instead.',
  emptyStats: 'No days played yet.',
  emptyArchive: 'Nothing in the archive yet.',
  storageOff: 'Saving is off in this browser. You can still play; streaks won’t keep.',
  claimOf: (i: number, n: number) => `${i} of ${n}`,
  source: (label: string, dates: string, n: number) => `${label}, ${dates}, n=${n.toLocaleString('en-US')}`,
  readOnly: 'Already revealed',
  notFound: 'That claim isn’t here.',
  // HUMAN: the game-show layer. Short, loud, and still true to what happened.
  getReady: 'Read the room',
  go: 'Go',
  countdownSkip: 'Skip the countdown',
  correct: ['Nailed it', 'Correct', 'Called it', 'Right on'],
  wrong: ['Nope', 'Not quite', 'Swing and a miss', 'The room disagrees'],
  bullseye: 'Bullseye read',
  closeRead: 'Close read',
  readPts: (n: number) => `+${n}`,
  combo: (n: number) => `${n} in a row`,
  soundOn: 'Sound on',
  soundOff: 'Sound off',
  nextIn: 'Next room opens in',
  lockKey: 'Enter',
  // Results headline, picked from the day's two scores (first match wins).
  ranks: [
    { min: { accuracy: 5, read: 80 }, title: 'Mind reader', line: 'Every call right, and you knew the room cold.' },
    { min: { accuracy: 5, read: 0 }, title: 'Flawless', line: 'Five for five on the facts.' },
    { min: { accuracy: 0, read: 70 }, title: 'Room whisperer', line: 'You know what people think. Uncanny.' },
    { min: { accuracy: 4, read: 0 }, title: 'Sharp eye', line: 'Four out of five. The room should ask you.' },
    { min: { accuracy: 3, read: 40 }, title: 'Good read', line: 'Solid on the facts, decent on the crowd.' },
    { min: { accuracy: 3, read: 0 }, title: 'Holding steady', line: 'More right than wrong. Tomorrow, the room.' },
    { min: { accuracy: 0, read: 0 }, title: 'Wallflower', line: 'Tough room today. There is always tomorrow.' },
  ],
  // HUMAN: the confidence step. Plain words under each number; no number above 100.
  sureQuestion: 'How sure are you?',
  sureLevels: { 50: 'Coin flip', 70: 'Leaning', 90: 'Pretty sure', 100: 'Certain' } as Record<number, string>,
  sureChip: (c: number) => `${c}% sure`,
  sureMissNote: (c: number) => `You were ${c}% sure.`,
  sureHead: 'How sure were you?',
  sureFeltVsRight: (felt: number, right: number) => `You felt ${felt}% sure. You were right ${right}% of the time.`,
  sureVerdict: { over: (n: number) => `Overconfident by ${n} points`, under: (n: number) => `Underconfident by ${n} points`, calibrated: () => 'About as sure as you should be' },
  sureMisses: (n: number) => (n === 0 ? 'No confident misses.' : `${n} ${n === 1 ? 'call' : 'calls'} you were 90%+ sure of ${n === 1 ? 'was' : 'were'} wrong.`),
  sureStatsLine: (level: number) => `Said ${level}%`,
  sureStatsRight: (right: number, n: number) => `${right} of ${n} right`,
  sureStatsEmpty: 'Play a day to see how your confidence holds up.',
  // HUMAN: the share text.
  shareText: (no: number, acc: number, read: number, badges: string) =>
    `Read the Room #${no}  🎯 ${acc}/5  📡 ${read}\n${badges}`,
}
