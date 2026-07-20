export const CLOSING_MESSAGES_NO_LAUGH: string[] = [
  'At any moment you are where you are, and you can only navigate from there.',
  'All we have to decide is what to do with the time that is given to us.',
  'Comparison is the thief of joy.',
  'I can be changed by what happens to me, but I refuse to be reduced by it.',
  'However difficult life may seem, there is always something you can do and succeed at.',
  'The most common way people give up their power is by thinking they don\'t have any.',
  'Difficulties are just things to overcome.',
  'Sometimes courage is a quiet voice at the end of the day saying, \'I will try again tomorrow.\'',
  'The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty.',
  'You\'re braver than you believe, stronger than you seem, and smarter than you think.',
  'Life isn\'t about waiting for the storm to pass, it\'s about learning to dance in the rain.',
  'Make sure your worst enemy doesn\'t live between your own two ears.',
  'Don\'t judge each day by the harvest that you reap, but by the seeds that you plant.',
  'No one can make you feel inferior without your consent.',
  'Worry is a misuse of imagination.',
  'The greatest glory in living lies not in never falling, but in rising every time we fall.',
  'Be gentle with yourself, you\'re doing the best you can.',
  'Every morning you wake up is another chance to get it right.',
  'Every sunrise is a new chapter in your life waiting to be written.',
  'If you fell down today, stand up tomorrow.'
];
export const CLOSING_MESSAGES_YES_LAUGH: string[] = [
  'A joyful life is an individual creation that cannot be copied from a recipe.',
  'We are what we pretend to be, so we must be careful about what we pretend to be.',
  'We are the custodians of life\'s meaning. It is up to us.',
  'What do we live for, if it is not to make life less difficult for each other?',
  'What lies behind us and what lies before us are tiny matters compared to what lies within us.',
  'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.',
  'Life is ten percent what happens to you and ninety percent how you respond to it.',
  'Create a life that feels good on the inside, not one that just looks good on the outside.',
  'The only person you are destined to become is the person you decide to be.',
  'Be the change that you wish to see in the world.',
  'To improve is to change; to be perfect is to change often.',
  'Be gentle with yourself, you\'re doing the best you can.',
  'Run when you can. Walk when you need to. Never give up.',
  'Strive to fail often; that is the best way to learn.',
];

export function pickClosingMessage(laughed: boolean): string {
  const pool = laughed ? CLOSING_MESSAGES_YES_LAUGH : CLOSING_MESSAGES_NO_LAUGH;
  return pool[Math.floor(Math.random() * pool.length)] ?? 'Rest up — tomorrow is a fresh start.';
}