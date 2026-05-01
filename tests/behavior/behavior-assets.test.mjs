import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");

test("skill-triggering 行为测试资产必须完整", async () => {
  const suiteRoot = path.join(repoRoot, "tests", "skill-triggering");
  const expectations = await readExpectations(suiteRoot);
  const manualResults = await readFile(
    path.join(suiteRoot, "manual-results.zh-CN.md"),
    "utf8",
  );
  const skillNames = await collectSkillNames();

  assert.equal(expectations.version, 1);
  assert.ok(expectations.scenarios.length >= 4);

  const scenarioIds = new Set();
  for (const scenario of expectations.scenarios) {
    assertScenarioBasics(suiteRoot, scenario, scenarioIds);
    assert.match(manualResults, new RegExp(`\`${scenario.id}\``));

    for (const skillName of [
      ...scenario.expectedSkills,
      ...scenario.forbiddenSkills,
    ]) {
      assert.ok(
        skillNames.has(skillName),
        `${scenario.id} references unknown skill ${skillName}`,
      );
    }
  }
});

test("explicit-skill-requests 行为测试资产必须完整", async () => {
  const suiteRoot = path.join(repoRoot, "tests", "explicit-skill-requests");
  const expectations = await readExpectations(suiteRoot);
  const manualResults = await readFile(
    path.join(suiteRoot, "manual-results.zh-CN.md"),
    "utf8",
  );
  const skillNames = await collectSkillNames();

  assert.equal(expectations.version, 1);
  assert.ok(expectations.scenarios.length >= 3);

  const scenarioIds = new Set();
  for (const scenario of expectations.scenarios) {
    assertScenarioBasics(suiteRoot, scenario, scenarioIds);
    assert.match(manualResults, new RegExp(`\`${scenario.id}\``));
    assert.ok(
      skillNames.has(scenario.requestedSkill),
      `${scenario.id} references unknown requested skill ${scenario.requestedSkill}`,
    );
    assert.equal(scenario.mustInvokeBeforeOtherTools, true);

    const prompt = await readFile(path.join(suiteRoot, scenario.prompt), "utf8");
    const skillText = await readFile(
      path.join(repoRoot, "skills", scenario.requestedSkill, "SKILL.md"),
      "utf8",
    );
    assert.match(
      `${prompt}\n${skillText}`,
      new RegExp(`(/${scenario.requestedSkill}|${scenario.requestedSkill})`, "i"),
      `${scenario.id} should visibly request ${scenario.requestedSkill}`,
    );
  }
});

async function readExpectations(suiteRoot) {
  const content = await readFile(path.join(suiteRoot, "EXPECTATIONS.json"), "utf8");
  return JSON.parse(content);
}

async function collectSkillNames() {
  const skillsRoot = path.join(repoRoot, "skills");
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  return new Set(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
}

async function assertScenarioBasics(suiteRoot, scenario, scenarioIds) {
  assert.match(scenario.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(!scenarioIds.has(scenario.id), `duplicate scenario id ${scenario.id}`);
  scenarioIds.add(scenario.id);

  assert.match(scenario.prompt, /^prompts\/[a-z0-9-]+\.md$/);
  await access(path.join(suiteRoot, scenario.prompt));
  assert.ok(scenario.reason.length >= 20);
}
