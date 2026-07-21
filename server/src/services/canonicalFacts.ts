// A representative slice of the Muster spec's canonical Fact Base (§3) —
// full spec is ~120-150 facts across 12 domains (A-L). This vertical
// slice wires real extraction for 5 domains (~27 facts) to prove the
// Fact Base -> extraction -> Review Ceremony -> Answer Engine loop end
// to end; the remaining domains/facts are a straightforward addition
// once this shape is validated, not an architectural change.

export interface CanonicalFactDef {
  domain: string;
  domainLabel: string;
  key: string;
  label: string;
}

const domainLabels: Record<string, string> = {
  A: "Corporate identity",
  C: "Insurance",
  D: "Quality",
  E: "Cyber and IT",
  F: "Personnel and clearances",
};

const defs: Array<[string, string, string]> = [
  ["A", "legal_name", "Legal company name"],
  ["A", "company_number", "Companies House number"],
  ["A", "registered_address", "Registered address"],
  ["A", "employee_count", "Number of employees"],
  ["A", "ultimate_parent", "Ultimate parent company"],

  ["C", "employers_liability_insurer", "Employer's liability insurer"],
  ["C", "employers_liability_limit", "Employer's liability limit of indemnity"],
  ["C", "employers_liability_expiry", "Employer's liability policy expiry"],
  ["C", "public_liability_insurer", "Public liability insurer"],
  ["C", "public_liability_limit", "Public liability limit of indemnity"],
  ["C", "public_liability_expiry", "Public liability policy expiry"],
  ["C", "professional_indemnity_insurer", "Professional indemnity insurer"],
  ["C", "professional_indemnity_expiry", "Professional indemnity policy expiry"],

  ["D", "iso9001_certificate_number", "ISO 9001 certificate number"],
  ["D", "iso9001_expiry", "ISO 9001 certificate expiry"],
  ["D", "iso9001_certification_body", "ISO 9001 certification body"],
  ["D", "as9100_certificate_number", "AS9100 Rev D certificate number"],
  ["D", "as9100_expiry", "AS9100 Rev D certificate expiry"],

  ["E", "cyber_essentials_certificate_number", "Cyber Essentials certificate number"],
  ["E", "cyber_essentials_expiry", "Cyber Essentials certificate expiry"],
  ["E", "cyber_essentials_plus_certificate_number", "Cyber Essentials Plus certificate number"],
  ["E", "cyber_essentials_plus_expiry", "Cyber Essentials Plus certificate expiry"],
  ["E", "iso27001_certificate_number", "ISO 27001 certificate number"],
  ["E", "iso27001_expiry", "ISO 27001 certificate expiry"],
  ["E", "mfa_coverage", "MFA coverage across the organisation"],
  ["E", "it_provider", "IT arrangement (in-house or outsourced, and to whom)"],

  // Aggregate counts only — no per-employee tracking in this rebuild
  // (personnel clearance case management is explicitly out of scope,
  // spec §10).
  ["F", "total_headcount", "Total headcount"],
  ["F", "bpss_cleared_count", "Staff holding BPSS clearance"],
  ["F", "sc_cleared_count", "Staff holding SC clearance"],
  ["F", "dv_cleared_count", "Staff holding DV clearance"],
];

export const CANONICAL_FACTS: CanonicalFactDef[] = defs.map(([domain, key, label]) => ({
  domain,
  domainLabel: domainLabels[domain],
  key,
  label,
}));

export const CANONICAL_FACT_BY_KEY = new Map(CANONICAL_FACTS.map((f) => [f.key, f]));

export const DOMAIN_LABELS = domainLabels;
