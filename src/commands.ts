// The skill-atlas commands. The same code serves the Node CLI and the browser
// terminal: everything that differs between them comes in through the context.
import { AtlasError } from './core/errors.ts';
import { skillLink, type Repository, type Skill } from './core/model.ts';
import { scan, type Source } from './core/scan.ts';

export type Context = {
  /** Opens what the user asked to scan. */
  open(input: string): Promise<Source>;
  print(text: string): void;
  /** Errors and warnings. */
  error(text: string): void;
  /** Starts the local web view on the port (0: any free one); resolves to its URL. The Node CLI only. */
  serve?(port: number): Promise<string>;
};

const usage = `Usage: skill-atlas <command>

  scan <GitHub URL | directory> [words…]
                                  find every SKILL.md in a repository and print it;
                                  with words, only the skills whose name or description has them all
  serve [port]                    open the web view at http://127.0.0.1:<port>/ (4173 by default)
  help                            show this help`;

/** Runs one command; returns its exit code. */
export async function run(args: string[], context: Context): Promise<number> {
  const [command = 'help', ...rest] = args;
  try {
    if (command === 'scan') await scanCommand(rest, context);
    else if (command === 'serve') await serveCommand(rest, context);
    else if (command === 'help') context.print(usage);
    else throw new AtlasError(`Unknown command: ${command}\n\n${usage}`);
    return 0;
  } catch (error) {
    if (!(error instanceof AtlasError)) throw error;
    context.error(error.message);
    return 1;
  }
}

async function scanCommand(args: string[], context: Context) {
  const [input, ...filter] = args;
  if (input === undefined) throw new AtlasError('Usage: skill-atlas scan <GitHub URL | directory> [words…]');
  const result = await scan(await context.open(input));
  // The filter runs after the scan: the scan itself is the same with or without words.
  const words = filter.flatMap((arg) => arg.split(/\s+/)).filter(Boolean);
  printRepository(result.repository, result.skills, words, context);
  for (const warning of result.warnings) context.error(`warning: ${warning}`);
}

async function serveCommand(args: string[], context: Context) {
  // Digits only: `Number` reads '' as 0, '0x10' as 16 and '1e3' as 1000.
  const port = args.length === 0 ? 4173 : /^\d+$/.test(args[0]) ? Number(args[0]) : NaN;
  if (args.length > 1 || !Number.isInteger(port) || port < 0 || port > 65535) throw new AtlasError('Usage: skill-atlas serve [port]');
  if (!context.serve) throw new AtlasError('serve: not available here');
  context.print(`Skill Atlas web view: ${await context.serve(port)}`);
}

/** `<owner>/<repo> · N skills` (`M of N skills` with words), then each skill's name, first sentence and link. */
function printRepository(repository: Repository, all: Skill[], words: string[], { print }: Context) {
  const skills = all.filter((skill) => matches(skill, words));
  const total = `${all.length} ${all.length === 1 ? 'skill' : 'skills'}`;
  print(`${repository.id} · ${words.length ? `${skills.length} of ${total}` : total}`);
  if (words.length && skills.length === 0) print(`no skills match "${words.join(' ')}"`);
  for (const skill of skills) {
    print(skill.description ? `${skill.name} — ${firstSentence(skill.description)}` : skill.name);
    print(`  ${skillLink(repository, skill)}`);
    if (skill.copies.length > 0) print(`  also in ${skill.copies.join(', ')}`);
    if (skill.product) print(`  part of the product: ${skill.product}`);
  }
}

/** Every word is in the name or the description, case-insensitive, as a substring. The web page has the same rule. */
function matches(skill: Skill, words: string[]): boolean {
  const text = fold(`${skill.name}\n${skill.description}`);
  return words.every((word) => text.includes(fold(word)));
}

/** Lower case, with the final sigma ς as σ: `ΟΔΥΣ` lowers to `οδυς`, but inside `ΟΔΥΣΣΕΥΣ` the Σ is a σ. */
const fold = (text: string) => text.toLowerCase().replaceAll('ς', 'σ');

function firstSentence(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return /^.*?[.!?](?=\s|$)/.exec(line)?.[0] ?? line;
}
