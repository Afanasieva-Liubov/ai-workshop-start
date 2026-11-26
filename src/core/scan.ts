import { findSkills, rootRank, type SkillFile } from './find.ts';
import { sortSkills, type Repository, type Skill } from './model.ts';
import { parseSkill } from './parse.ts';

/** A repository to scan: its files, and how to read them. */
export type Source = {
  repository: Repository;
  /** Every file path, relative to the repository root. */
  paths: string[];
  /** What listing the files had to leave out. */
  warnings: string[];
  /** The file's bytes, or undefined if it is not there. */
  read(path: string): Promise<Uint8Array | undefined>;
};

export type ScanResult = { repository: Repository; skills: Skill[]; warnings: string[] };

/** fetch → find → parse. Nothing is stored: the result is all there is. */
export async function scan(source: Source): Promise<ScanResult> {
  const files = findSkills(source.paths, source.repository.name);
  // The files are read at the same time: on GitHub, each one is a request.
  const read = await Promise.all(files.map(async (file) => ({ file, bytes: await source.read(file.path) })));
  const warnings = [...source.warnings];
  // Identical files are one skill: the preferred one, with the others as its copies.
  const groups = new Map<string, { file: SkillFile; text: string }[]>();
  for (const { file, bytes } of read) {
    if (!bytes) {
      warnings.push(`${file.path}: listed, but not found at the scanned commit; skipped`);
      continue;
    }
    const text = new TextDecoder().decode(bytes);
    groups.set(text, [...(groups.get(text) ?? []), { file, text }]);
  }
  const skills: Skill[] = [];
  for (const group of groups.values()) {
    const [first, ...others] = group.sort((a, b) => rootRank(a.file.path) - rootRank(b.file.path));
    const { skill, warning } = toSkill(source, first.file, first.text, others.map((other) => other.file.path));
    skills.push(skill);
    if (warning) warnings.push(warning);
  }
  return { repository: source.repository, skills: sortSkills(skills), warnings };
}

function toSkill(source: Source, file: SkillFile, text: string, copies: string[]): { skill: Skill; warning?: string } {
  const parsed = parseSkill(text);
  const skill: Skill = {
    id: `${source.repository.id}:${file.path}`,
    repository: source.repository.id,
    path: file.path,
    name: parsed.name ?? file.name,
    description: parsed.description,
    commit: source.repository.commit,
    copies,
    text,
    ...(file.product && { product: file.product }),
  };
  return { skill, warning: parsed.warning && `${file.path}: ${parsed.warning}` };
}
