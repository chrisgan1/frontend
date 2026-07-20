// Representative control set inspired by DEFSTAN 05-138 (Cyber Security for
// Defence Suppliers) themes and risk-based profile levels. This is NOT a
// verbatim reproduction of the official standard — treat it as a starting
// seed to replace with the licensed/official control text before real use.
export const controls = [
  // Security governance
  { code: "GOV-01", category: "Security Governance", profileLevel: "very_low", title: "Nominate a security point of contact", description: "A named individual is responsible for cyber security within the organisation." },
  { code: "GOV-02", category: "Security Governance", profileLevel: "low", title: "Maintain a security policy", description: "A documented information security policy is approved, published, and reviewed annually." },
  { code: "GOV-03", category: "Security Governance", profileLevel: "moderate", title: "Board-level security reporting", description: "Cyber risk is reported to senior management or the board on a regular cadence." },
  { code: "GOV-04", category: "Security Governance", profileLevel: "high", title: "Independent security audit programme", description: "An independent party audits the security management system at least annually." },

  // Asset management
  { code: "AST-01", category: "Asset Management", profileLevel: "very_low", title: "Maintain an asset inventory", description: "All devices and systems that process MOD information are recorded in an inventory." },
  { code: "AST-02", category: "Asset Management", profileLevel: "low", title: "Classify information assets", description: "Information assets are labelled according to UK Government classification (OFFICIAL, OFFICIAL-SENSITIVE)." },
  { code: "AST-03", category: "Asset Management", profileLevel: "moderate", title: "Track asset lifecycle", description: "Assets are tracked from procurement through to secure decommissioning." },

  // Access control
  { code: "ACC-01", category: "Access Control", profileLevel: "very_low", title: "Unique user accounts", description: "Every user has a unique account; shared credentials are not used." },
  { code: "ACC-02", category: "Access Control", profileLevel: "low", title: "Least-privilege access", description: "Access to MOD information is granted on a need-to-know, least-privilege basis." },
  { code: "ACC-03", category: "Access Control", profileLevel: "moderate", title: "Multi-factor authentication", description: "MFA is enforced for all remote access and privileged accounts." },
  { code: "ACC-04", category: "Access Control", profileLevel: "high", title: "Privileged access review", description: "Privileged account entitlements are reviewed at least quarterly." },

  // Data security
  { code: "DAT-01", category: "Data Security", profileLevel: "very_low", title: "Encrypt data at rest on portable devices", description: "Laptops and removable media holding MOD data use full-disk or file-level encryption." },
  { code: "DAT-02", category: "Data Security", profileLevel: "low", title: "Encrypt data in transit", description: "MOD information is transmitted only over encrypted channels (TLS 1.2+ or equivalent)." },
  { code: "DAT-03", category: "Data Security", profileLevel: "moderate", title: "Data loss prevention controls", description: "Technical controls detect and prevent unauthorised exfiltration of sensitive data." },

  // Network security
  { code: "NET-01", category: "Network Security", profileLevel: "very_low", title: "Boundary firewall", description: "A firewall is deployed at the network boundary with a default-deny inbound rule set." },
  { code: "NET-02", category: "Network Security", profileLevel: "low", title: "Network segmentation", description: "Systems handling MOD information are segmented from general corporate networks." },
  { code: "NET-03", category: "Network Security", profileLevel: "moderate", title: "Intrusion detection", description: "Network traffic is monitored for indicators of compromise." },

  // Vulnerability & patch management
  { code: "VUL-01", category: "Vulnerability Management", profileLevel: "very_low", title: "Apply security patches", description: "Critical security patches are applied within 14 days of release." },
  { code: "VUL-02", category: "Vulnerability Management", profileLevel: "low", title: "Vulnerability scanning", description: "Internet-facing systems are scanned for vulnerabilities at least quarterly." },
  { code: "VUL-03", category: "Vulnerability Management", profileLevel: "moderate", title: "Penetration testing", description: "An independent penetration test is conducted at least annually." },

  // Malware protection
  { code: "MAL-01", category: "Malware Protection", profileLevel: "very_low", title: "Anti-malware on endpoints", description: "All endpoints run up-to-date anti-malware software." },
  { code: "MAL-02", category: "Malware Protection", profileLevel: "low", title: "Application allow-listing", description: "Execution of unauthorised software is restricted on systems handling MOD data." },

  // Personnel security
  { code: "PER-01", category: "Personnel Security", profileLevel: "very_low", title: "Security awareness training", description: "All staff complete annual cyber security awareness training." },
  { code: "PER-02", category: "Personnel Security", profileLevel: "low", title: "Pre-employment screening", description: "Baseline Personnel Security Standard (BPSS) checks are completed before granting access to MOD information." },
  { code: "PER-03", category: "Personnel Security", profileLevel: "moderate", title: "Security clearance tracking", description: "SC/DV clearance status and expiry are tracked for personnel requiring them." },
  { code: "PER-04", category: "Personnel Security", profileLevel: "high", title: "Insider threat programme", description: "A documented insider threat detection and response capability is maintained." },

  // Incident management
  { code: "INC-01", category: "Incident Management", profileLevel: "very_low", title: "Incident reporting process", description: "A documented process exists for staff to report suspected security incidents." },
  { code: "INC-02", category: "Incident Management", profileLevel: "low", title: "Incident response plan", description: "A tested incident response plan defines roles, escalation, and MOD notification timelines." },
  { code: "INC-03", category: "Incident Management", profileLevel: "moderate", title: "Post-incident review", description: "Root-cause analysis and lessons learned are documented after every significant incident." },

  // Business continuity & backup
  { code: "BCP-01", category: "Business Continuity", profileLevel: "low", title: "Regular data backups", description: "MOD-related data is backed up regularly and restoration is tested." },
  { code: "BCP-02", category: "Business Continuity", profileLevel: "moderate", title: "Business continuity plan", description: "A business continuity and disaster recovery plan is documented and exercised." },

  // Supply chain / third party
  { code: "SUP-01", category: "Supply Chain", profileLevel: "low", title: "Sub-contractor security requirements", description: "Security obligations equivalent to this standard are flowed down to sub-contractors." },
  { code: "SUP-02", category: "Supply Chain", profileLevel: "moderate", title: "Supplier assurance monitoring", description: "Sub-contractor compliance is periodically assessed and evidenced." },
] as const;
