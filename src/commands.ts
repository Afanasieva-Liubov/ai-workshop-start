// The skill-atlas commands. The same code serves the Node CLI and the browser
// terminal: everything that differs between them comes in through the context.
import { AtlasError } from './core/errors.ts';
import { parseGitHubOwnerUrl, type Owner } from './core/github.ts';
import { skillLink, type Repository, type Skill } from './core/model.ts';
import { scan, type Source } from './core/scan.ts';

export type Context = {
  /** Opens what the user asked to scan. */
  open(input: string): Promise<Source>;
  /** Opens an organization or a user, `github.com/<owner>`, to scan each repository. The Node CLI only. */
  openOwner?(input: string): Promise<Owner>;
  print(text: string): void;
  /** Errors and warnings. */
  error(text: string): void;
  /** Starts the local web view on the port (0: any free one); resolves to its URL. The Node CLI only. */
  serve?(port: number): Promise<string>;
};

const usage = `Usage: skill-atlas <command>

  scan <GitHub URL | directory>   find every SKILL.md in a repository and print it
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
  if (args.length !== 1) throw new AtlasError('Usage: skill-atlas scan <GitHub URL | directory>');
  if (context.openOwner && parseGitHubOwnerUrl(args[0])) return scanOwner(await context.openOwner(args[0]), context);
  const result = await scan(await context.open(args[0]));
  printRepository(result.repository, result.skills, context);
  for (const warning of result.warnings) context.error(`warning: ${warning}`);
}

/**
 * Each repository with skills, as `scan` prints one, sorted by name; then the total. A repository
 * that fails is a warning, and the scan goes on. Identical skills in different repositories stay apart.
 */
async function scanOwner(owner: Owner, context: Context) {
  const results = await Promise.all(
    owner.repositories.map(async (repository) => {
      try {
        return { id: repository.id, result: await scan(await repository.open()) };
      } catch (error) {
        if (!(error instanceof AtlasError)) throw error;
        return { id: repository.id, error: error.message };
      }
    }),
  );
  let skills = 0;
  let printed = 0;
  for (const { id, result, error } of results) {
    if (error !== undefined) context.error(`warning: ${id}: ${error}`);
    if (!result) continue;
    if (result.skills.length > 0) {
      printRepository(result.repository, result.skills, context);
      skills += result.skills.length;
      printed++;
    }
    for (const warning of result.warnings) context.error(`warning: ${id}: ${warning}`);
  }
  context.print(`${owner.name} · ${count(skills, 'skill', 'skills')} in ${count(printed, 'repository', 'repositories')}`);
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

async function serveCommand(args: string[], context: Context) {
  // Digits only: `Number` reads '' as 0, '0x10' as 16 and '1e3' as 1000.
  const port = args.length === 0 ? 4173 : /^\d+$/.test(args[0]) ? Number(args[0]) : NaN;
  if (args.length > 1 || !Number.isInteger(port) || port < 0 || port > 65535) throw new AtlasError('Usage: skill-atlas serve [port]');
  if (!context.serve) throw new AtlasError('serve: not available here');
  context.print(`Skill Atlas web view: ${await context.serve(port)}`);
}

/** `<owner>/<repo> · N skills`, then each skill's name, first sentence and link. */
function printRepository(repository: Repository, skills: Skill[], { print }: Context) {
  print(`${repository.id} · ${count(skills.length, 'skill', 'skills')}`);
  for (const skill of skills) {
    print(skill.description ? `${skill.name} — ${firstSentence(skill.description)}` : skill.name);
    print(`  ${skillLink(repository, skill)}`);
    if (skill.copies.length > 0) print(`  also in ${skill.copies.join(', ')}`);
    if (skill.product) print(`  part of the product: ${skill.product}`);
  }
}

function firstSentence(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return /^.*?[.!?](?=\s|$)/.exec(line)?.[0] ?? line;
}
