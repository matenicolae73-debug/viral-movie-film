export type SafetyResult = { ok: boolean; reason?: string; category?: string };

const RULES: Array<{ category: string; patterns: RegExp[]; reason: string }> = [
  { category: "sexual", patterns: [/\b(porn|pornography|xxx|adult content|explicit sex|sex scene|sexual intercourse|nude|nudity|genitals|blowjob|fetish|erotic|sexualized)\b/i], reason: "Sexually explicit or pornographic content is not allowed." },
  { category: "minors", patterns: [/\b(child|children|minor|underage|teen|teenager|schoolgirl|schoolboy)\b.{0,50}\b(nude|naked|sex|sexual|porn|erotic)\b/i, /\b(lolita|csam|grooming|sextortion)\b/i], reason: "Sexual content involving minors is strictly prohibited." },
  { category: "non-consensual", patterns: [/\b(deepfake|face swap|face-swap|nudify|undress|non[- ]consensual|revenge porn)\b/i], reason: "Non-consensual intimate imagery and identity manipulation are not allowed." },
  { category: "real-person", patterns: [/\b(real person|real people|celebrity|politician|public figure|impersonate|impersonation|clone (his|her|their) voice|copy (his|her|their) face)\b/i], reason: "Generating realistic impersonations or deceptive depictions of real people is not allowed." },
  { category: "extremism", patterns: [/\b(terrorist|terrorism|isis|islamic state|nazi propaganda|extremist recruitment)\b/i], reason: "Terrorist or violent extremist content is not allowed." },
  { category: "self-harm", patterns: [/\b(suicide|self[- ]harm|kill myself|how to die)\b/i], reason: "Content promoting or facilitating self-harm is not allowed." },
  { category: "fraud", patterns: [/\b(phishing|scam|fraud|fake passport|fake id|identity theft|credit card theft)\b/i], reason: "Fraudulent or criminal content is not allowed." },
  { category: "graphic-violence", patterns: [/\b(gore|torture|mutilation|dismember|decapitation)\b/i], reason: "Extreme graphic violence is not allowed." },
];

export function moderatePrompt(input: unknown): SafetyResult {
  const text = String(input ?? "").trim();
  if (!text) return { ok: false, reason: "Please enter a prompt." };
  if (text.length > 2000) return { ok: false, reason: "Prompt is too long." };
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return { ok: false, category: rule.category, reason: rule.reason };
  }
  return { ok: true };
}

export const SAFETY_SUMMARY = [
  "18+ users only",
  "No pornography or sexually explicit content",
  "No sexual content involving minors",
  "No non-consensual intimate imagery",
  "No realistic impersonation or deceptive deepfakes of real people",
  "No terrorism, hate, scams, criminal instructions, or extreme gore",
  "No attempts to bypass safety filters",
];
