export interface Choice {
  id: string;
  label: string;
  icon: string;
}

export interface TrainingTask {
  prompt: string;
  hint: string;
  fact: string;
  answer: string;
  choices: readonly Choice[];
}

export interface TrainingStation {
  title: string;
  skill: string;
  icon: string;
  tasks: readonly TrainingTask[];
}

const choice = (id: string, label: string, icon = id): Choice => ({ id, label, icon });

/** Simplified pretend training, inspired by NASA's spacesuit and station education resources. */
export const STATIONS: readonly TrainingStation[] = [
  {
    title: 'Suit up',
    skill: 'Be prepared',
    icon: 'helmet',
    tasks: [
      {
        prompt: 'A spacewalk is outside the spacecraft. Choose your head protection.',
        hint: 'Look for the sealed helmet with a visor.',
        fact: 'A spacesuit helmet protects your head. Its visor helps shield your eyes from bright sunlight.',
        answer: 'helmet',
        choices: [
          choice('cap', 'Sun hat'),
          choice('helmet', 'Space helmet'),
          choice('umbrella', 'Umbrella'),
        ],
      },
      {
        prompt: 'Your hands need protection, too. What belongs on your spacesuit?',
        hint: 'Find the gloves made for a spacesuit.',
        fact: 'Spacesuit gloves protect your hands while you hold tools outside the spacecraft.',
        answer: 'gloves',
        choices: [
          choice('gloves', 'Space gloves'),
          choice('book', 'Notebook'),
          choice('water', 'Water pouch'),
        ],
      },
      {
        prompt: 'You need oxygen to breathe outside. Choose your life-support equipment.',
        hint: 'The life-support pack is part of the spacesuit.',
        fact: 'A spacesuit life-support pack supplies oxygen and helps keep an astronaut cool.',
        answer: 'pack',
        choices: [
          choice('plant', 'Plant pot'),
          choice('ball', 'Beach ball'),
          choice('pack', 'Life-support pack'),
        ],
      },
    ],
  },
  {
    title: 'Work together',
    skill: 'Be a teammate',
    icon: 'radio',
    tasks: [
      {
        prompt: 'Mission Control is your team on Earth. How can you talk to them?',
        hint: 'Choose the radio headset.',
        fact: 'Astronauts use radios to talk with crewmates and Mission Control on Earth.',
        answer: 'radio',
        choices: [
          choice('book', 'Write a story'),
          choice('radio', 'Use the radio'),
          choice('cap', 'Wave a hat'),
        ],
      },
      {
        prompt: 'Your crew is getting ready. What helps everyone remember each step?',
        hint: 'Look for the list with check marks.',
        fact: 'Crews practice together and use checklists to work carefully, one step at a time.',
        answer: 'checklist',
        choices: [
          choice('checklist', 'Read the checklist'),
          choice('ball', 'Bounce a ball'),
          choice('umbrella', 'Open an umbrella'),
        ],
      },
      {
        prompt: 'A crewmate is unsure what to do next. How can you help?',
        hint: 'Good teammates listen and check the plan together.',
        fact: 'Listening, asking questions, and helping each other are astronaut skills, too.',
        answer: 'team',
        choices: [
          choice('sleep', 'Take a nap'),
          choice('rocket', 'Rush ahead'),
          choice('team', 'Check the plan together'),
        ],
      },
    ],
  },
  {
    title: 'Live in space',
    skill: 'Care for yourself',
    icon: 'exercise',
    tasks: [
      {
        prompt: 'You float in orbit! What helps keep your muscles and bones strong?',
        hint: 'Astronauts use special exercise equipment.',
        fact: 'Astronauts exercise regularly in space to help keep their muscles and bones strong.',
        answer: 'exercise',
        choices: [
          choice('sleep', 'Sleep all day'),
          choice('exercise', 'Use the exercise bike'),
          choice('book', 'Read a story'),
        ],
      },
      {
        prompt: 'Loose drops float around the cabin. Choose a drink container for space.',
        hint: 'Find the closed pouch with a straw.',
        fact: 'A closed drink pouch with a straw helps keep water from floating around the cabin.',
        answer: 'water',
        choices: [
          choice('water', 'Sealed water pouch'),
          choice('cup', 'Open cup'),
          choice('plant', 'Plant pot'),
        ],
      },
      {
        prompt: 'It is time to rest. What helps you stay in your sleeping spot?',
        hint: 'Choose a sleeping bag attached inside the spacecraft.',
        fact: 'Astronauts can sleep in sleeping bags attached to a wall so they do not drift around.',
        answer: 'sleep',
        choices: [
          choice('ball', 'Beach ball'),
          choice('cap', 'Sun hat'),
          choice('sleep', 'Attached sleeping bag'),
        ],
      },
    ],
  },
  {
    title: 'Be a scientist',
    skill: 'Look closely',
    icon: 'plant',
    tasks: [
      {
        prompt: 'Study the three plants in our pretend space lab. Which has the most leaves?',
        hint: 'Count the leaves: A has 2, B has 6, and C has 4.',
        fact: 'Careful observations help scientists compare how plants grow. Plant B has the most leaves.',
        answer: 'plant-b',
        choices: [
          choice('plant-a', 'Plant A · 2 leaves', 'plant2'),
          choice('plant-b', 'Plant B · 6 leaves', 'plant6'),
          choice('plant-c', 'Plant C · 4 leaves', 'plant4'),
        ],
      },
      {
        prompt: 'Plant B has six leaves. How should we record what we found?',
        hint: 'Choose the note that matches what you counted.',
        fact: 'Scientists write down what they observe, so the team can compare results later.',
        answer: 'six',
        choices: [
          choice('two', 'Write: 2 leaves', 'book'),
          choice('four', 'Write: 4 leaves', 'book'),
          choice('six', 'Write: 6 leaves', 'book'),
        ],
      },
      {
        prompt: 'Your science team wants to hear the result. What will you share?',
        hint: 'Tell the team what you actually observed.',
        fact: 'Astronauts share experiment results with scientists on Earth. Curiosity and teamwork help us learn!',
        answer: 'result',
        choices: [
          choice('result', 'Plant B has 6 leaves', 'radio'),
          choice('guess', 'Guess without looking', 'ball'),
          choice('hide', 'Keep the notes hidden', 'pack'),
        ],
      },
    ],
  },
];

export interface TrainingState {
  station: number;
  task: number;
  solved: boolean;
  complete: boolean;
}

export const createTraining = (): TrainingState => ({
  station: 0,
  task: 0,
  solved: false,
  complete: false,
});

export const currentTask = (state: TrainingState): TrainingTask | undefined =>
  state.complete ? undefined : STATIONS[state.station]?.tasks[state.task];

export function chooseAnswer(state: TrainingState, id: string): TrainingState {
  if (state.complete || state.solved || currentTask(state)?.answer !== id) return state;
  return { ...state, solved: true };
}

export function advanceTraining(state: TrainingState): TrainingState {
  if (!state.solved || state.complete) return state;
  const station = STATIONS[state.station];
  if (!station) return state;
  if (state.task + 1 < station.tasks.length)
    return { ...state, task: state.task + 1, solved: false };
  if (state.station + 1 < STATIONS.length)
    return { ...state, station: state.station + 1, task: 0, solved: false };
  return { ...state, complete: true };
}

export const TOTAL_TASKS = STATIONS.reduce((total, station) => total + station.tasks.length, 0);

export function completedTasks(state: TrainingState): number {
  if (state.complete) return TOTAL_TASKS;
  return (
    STATIONS.slice(0, state.station).reduce((total, station) => total + station.tasks.length, 0) +
    state.task +
    Number(state.solved)
  );
}
