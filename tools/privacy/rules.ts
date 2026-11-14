// SPEC-PROCESS-PRIVATE-OPERATIONAL-CONFIGURATION R5: findings never include matched values.
export interface Finding { file: string; line: number; category: string }
export function inspect(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  const rules: [string, RegExp][] = [
    ['private-network-host', /\b[\w.-]+\.tail[\w]+\.ts\.net\b/],
    ['personal-home-path', /(?:\/Users\/|\/home\/)(?!(?:me|user|example|test)(?:\/|\b))[\w.-]+\//],
    ['personal-windows-path', /[A-Z]:[\\/]+Users[\\/]+(?!(?:Public|Default|user|example|test)\b)[\w.-]+/i],
    ['personal-signing-identity', /Developer ID (?:Application|Installer):[^\n'"`]+\([A-Z0-9]{10}\)/],
    ['personal-worker-host', /https?:\/\/[\w-]+\.(?!(?:example|test|your-subdomain)\.)[\w-]+\.workers\.dev/],
    ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['access-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16})\b/],
    ['machine-report', /\bApple M[1-9]\d*(?: Pro| Max| Ultra)?\b/],
  ];
  for (const [i, line] of text.split('\n').entries()) {
    for (const [category, rule] of rules) if (rule.test(line)) findings.push({ file, line: i + 1, category });
    const addresses = line.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) ?? [];
    if (addresses.some(a => !/@(?:example\.(?:com|org|invalid)|2x\.png|3x\.png)$/.test(a)
      && !/^(?:\d+\+)?[\w.-]+@users\.noreply\.github\.com$/.test(a)
      && a !== 'noreply@anthropic.com')) findings.push({ file, line: i + 1, category: 'email-or-ssh-address' });
    if (file.endsWith('wrangler.jsonc') && /"database_id":\s*"(?!00000000)[a-f0-9]{8}-[a-f0-9-]{27}"/.test(line)) {
      findings.push({ file, line: i + 1, category: 'deployed-database-id' });
    }
  }
  return findings;
}
