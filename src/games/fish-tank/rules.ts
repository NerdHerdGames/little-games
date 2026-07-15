export const SEA_ANIMALS = [
  {
    id: 'clownfish',
    name: 'Clownfish',
    question: 'Where do clownfish often live?',
    choices: ['Near sea anemones', 'In dry sand', 'On snowy mountains'],
    correctChoice: 0,
  },
  {
    id: 'regal-blue-tang',
    name: 'Regal Blue Tang',
    question: 'What color is a regal blue tang mostly?',
    choices: ['Plain white', 'Bright blue', 'Grass green'],
    correctChoice: 1,
  },
  {
    id: 'pufferfish',
    name: 'Pufferfish',
    question: 'What can a pufferfish do when it feels threatened?',
    choices: ['Puff up larger', 'Grow feathers', 'Climb a tree'],
    correctChoice: 0,
  },
  {
    id: 'shark',
    name: 'Shark',
    question: "What is a shark's skeleton mostly made of?",
    choices: ['Wood', 'Glass', 'Cartilage'],
    correctChoice: 2,
  },
  {
    id: 'sea-turtle',
    name: 'Sea Turtle',
    question: 'What must a sea turtle come to the surface to breathe?',
    choices: ['Sand', 'Air', 'Seaweed'],
    correctChoice: 1,
  },
  {
    id: 'jellyfish',
    name: 'Jellyfish',
    question: 'How many bones does a jellyfish have?',
    choices: ['Two', 'One hundred', 'None'],
    correctChoice: 2,
  },
] as const;

export type SeaAnimalId = (typeof SEA_ANIMALS)[number]['id'];
export interface FishTankState {
  released: readonly SeaAnimalId[];
  complete: boolean;
}
export interface FishAnswerResult {
  correct: boolean;
  newlyReleased: boolean;
  state: FishTankState;
}

export const createFishTankState = (): FishTankState => ({ released: [], complete: false });

export const answerFishQuestion = (
  state: FishTankState,
  animalId: SeaAnimalId,
  choiceIndex: number,
): FishAnswerResult => {
  const animal = SEA_ANIMALS.find(({ id }) => id === animalId);
  if (!animal) throw new Error(`Unknown sea animal: ${animalId}`);
  if (choiceIndex !== animal.correctChoice) return { correct: false, newlyReleased: false, state };
  if (state.released.includes(animalId)) return { correct: true, newlyReleased: false, state };
  const released = [...state.released, animalId];
  return {
    correct: true,
    newlyReleased: true,
    state: { released, complete: released.length === SEA_ANIMALS.length },
  };
};
