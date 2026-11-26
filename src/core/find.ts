/** A SKILL.md found in a repository, its name, and the product folder it ships in, if any. */
export type SkillFile = { path: string; name: string; product?: string };

/** Where agents keep a repository's own skills, the preferred first. */
export const SKILL_ROOTS = ['.agents/skills', '.claude/skills', '.github/skills', 'agent/skills'];

/** A folder of the project's own tests: `test`, `testData`, `fixtures`, a source set such as `jvmTest`. */
const TEST_FOLDER = /^(?:tests?|test-?data|testdata|fixtures?|__tests__|__fixtures__)$/i;
const TEST_SOURCE_SET = /^[a-z]+Test$/;

/**
 * Every file named exactly SKILL.md, named after its directory (a SKILL.md at the
 * root after the repository). Test data is not a skill; a skill under `resources`
 * is part of the product.
 */
export function findSkills(paths: string[], repositoryName: string): SkillFile[] {
  return paths
    .filter((path) => path.split('/').at(-1) === 'SKILL.md' && !isTestData(path))
    .sort()
    .map((path) => {
      const segments = path.split('/');
      const resources = segments.indexOf('resources');
      const product = resources >= 0 ? segments.slice(0, resources + 1).join('/') : undefined;
      return { path, name: segments.at(-2) ?? repositoryName, ...(product && { product }) };
    });
}

function isTestData(path: string): boolean {
  return path.split('/').slice(0, -1).some((segment) => TEST_FOLDER.test(segment) || TEST_SOURCE_SET.test(segment));
}

/** The preferred copy among identical ones: by the order of SKILL_ROOTS, then elsewhere, then by path. */
export function rootRank(path: string): number {
  const index = SKILL_ROOTS.findIndex((root) => path.startsWith(`${root}/`));
  return index < 0 ? SKILL_ROOTS.length : index;
}
