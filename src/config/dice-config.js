export const DICE_TYPES = [2, 4, 6, 8, 10, 12, 20];

export const DICE_STYLES = {
  2: { bg: 'bg-dice-2', text: 'text-white', border: 'border-black' },
  4: { bg: 'bg-dice-4', text: 'text-black', border: 'border-black' },
  6: { bg: 'bg-dice-6', text: 'text-white', border: 'border-black' },
  8: { bg: 'bg-dice-8', text: 'text-white', border: 'border-black' },
  10: { bg: 'bg-dice-10', text: 'text-white', border: 'border-black' },
  12: { bg: 'bg-dice-12', text: 'text-black', border: 'border-black' },
  20: { bg: 'bg-dice-20', text: 'text-black', border: 'border-black' },
};

export const getDiceClasses = (sides) => {
  const style = DICE_STYLES[sides] || DICE_STYLES[6];
  return `${style.bg} ${style.text} ${style.border}`;
};
