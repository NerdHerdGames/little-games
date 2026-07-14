import { GAMES } from '../src/games/registry';

const errors: string[] = [];
const ids = new Set<string>();
for (const [index, game] of GAMES.entries()) {
  const location = `Game ${index + 1}`;
  if (!game.id.trim()) errors.push(`${location}: id is required.`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.id))
    errors.push(`${location}: id "${game.id}" must be lowercase kebab-case.`);
  if (ids.has(game.id)) errors.push(`${location}: duplicate id "${game.id}".`);
  if (!game.title.trim()) errors.push(`${location}: title is required.`);
  if (!game.description.trim()) errors.push(`${location}: description is required.`);
  if (!game.sceneKey.trim()) errors.push(`${location}: sceneKey is required.`);
  if (!game.symbol.trim()) errors.push(`${location}: symbol is required.`);
  ids.add(game.id);
}
if (GAMES.length === 0) errors.push('At least one game must be registered.');
if (errors.length) {
  console.error(`Game registry validation failed:\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else console.log(`Game registry valid: ${GAMES.length} game(s).`);
