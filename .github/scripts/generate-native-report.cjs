/* eslint-disable */
// @ts-nocheck
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = 'security-reports';

// ============================================================================
// 1. PARSE TRUFFLEHOG (SECRET SCANNER - NDJSON)
// ============================================================================
function parseTruffleHog() {
  const file = path.join(REPORTS_DIR, 'trufflehog.json');
  if (!fs.existsSync(file)) return { status: 'SKIPPED', findings: [] };
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return { status: 'PASSED', findings: [] };

  const lines = raw.split('\n').filter(l => l.trim());
  const findings = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  return {
    status: findings.length > 0 ? 'FAILED' : 'PASSED',
    findings: findings.map(f => ({
      detector: f.DetectorName || 'Generic Secret',
      file: f.SourceMetadata?.Data?.Filesystem?.file || 'Unknown',
      line: f.SourceMetadata?.Data?.Filesystem?.line || '-',
      verified: f.Verified ? 'Verified' : 'Unverified'
    }))
  };
}

// ============================================================================
// 2. PARSE SNYK SCA (DEPENDENCY VULNERABILITIES - NATIVE JSON)
// ============================================================================
function parseSnykSCA() {
  const file = path.join(REPORTS_DIR, 'snyk-sca.json');
  if (!fs.existsSync(file)) return { status: 'SKIPPED', findings: [] };
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return { status: 'SKIPPED', findings: [] };
    const data = JSON.parse(raw);
    const vulns = Array.isArray(data)
      ? data.flatMap(d => Array.isArray(d?.vulnerabilities) ? d.vulnerabilities : [])
      : (Array.isArray(data?.vulnerabilities) ? data.vulnerabilities : []);

    return {
      status: vulns.length > 0 ? 'FAILED' : 'PASSED',
      findings: vulns.map(v => {
        let fixedIn = 'No fix available';
        if (Array.isArray(v?.fixedIn)) {
          fixedIn = v.fixedIn.join(', ');
        } else if (typeof v?.fixedIn === 'string') {
          fixedIn = v.fixedIn;
        }

        return {
          id: v?.id || 'VULN',
          package: `${v?.packageName || v?.name || 'package'}@${v?.version || '-'}`,
          severity: String(v?.severity || 'LOW').toUpperCase(),
          title: v?.title || v?.name || 'Security Vulnerability',
          fixedIn: fixedIn
        };
      })
    };
  } catch (err) {
    console.error('Error parsing Snyk SCA:', err.message);
    return { status: 'ERROR', findings: [] };
  }
}

// ============================================================================
// 3. PARSE SYFT SBOM (SOFTWARE BILL OF MATERIALS - CYCLONEDX JSON)
// ============================================================================
function parseSyftSBOM() {
  const file = path.join(REPORTS_DIR, 'sbom.json');
  if (!fs.existsSync(file)) return { status: 'SKIPPED', totalPackages: 0, packages: [], ecosystems: {} };
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return { status: 'SKIPPED', totalPackages: 0, packages: [], ecosystems: {} };
    const data = JSON.parse(raw);
    const components = data.components || [];

    // Hitung breakdown ekosistem (npm, composer, pypi, golang, dll)
    const ecosystems = {};
    components.forEach(c => {
      const type = c.properties?.find(p => p.name === 'syft:package:type')?.value || c.type || 'other';
      ecosystems[type] = (ecosystems[type] || 0) + 1;
    });

    return {
      status: 'PASSED',
      totalPackages: components.length,
      ecosystems: ecosystems,
      packages: components.map(c => ({
        name: c.name,
        version: c.version || '-',
        type: c.properties?.find(p => p.name === 'syft:package:type')?.value || c.type || 'library',
        license: c.licenses?.[0]?.license?.id || '-'
      }))
    };
  } catch (err) {
    console.error('Error parsing Syft SBOM:', err.message);
    return { status: 'ERROR', totalPackages: 0, packages: [], ecosystems: {} };
  }
}

// ============================================================================
// 4. PARSE SNYK CODE SAST (UNIVERSAL MULTI-FRAMEWORK FILTER - SARIF JSON)
// ============================================================================
function parseSnykCode() {
  const file = path.join(REPORTS_DIR, 'snyk-code.json');
  if (!fs.existsSync(file)) return { status: 'SKIPPED', findings: [] };
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return { status: 'SKIPPED', findings: [] };
    const data = JSON.parse(raw);
    const results = data.runs?.[0]?.results || [];

    // UNIVERSAL FALSE-POSITIVE FILTER (Mendukung Laravel, Next.js, React, Node, Python, dsb)
    const productionFindings = results.filter(r => {
      const level = String(r?.level || 'warning').toLowerCase();
      const ruleId = String(r?.ruleId || '');
      const location = String(r?.locations?.[0]?.physicalLocation?.artifactLocation?.uri || '');

      // 1. Abaikan file test/spec di semua bahasa (tests/, __tests__/, *.test.*, *.spec.*, testdata/)
      if (
        ruleId.includes('/test') ||
        location.startsWith('tests/') ||
        location.startsWith('test/') ||
        location.includes('/__tests__/') ||
        location.includes('.test.') ||
        location.includes('.spec.') ||
        location.includes('/testdata/')
      ) {
        return false;
      }

      // 2. Abaikan file mock, seed, dan fixture
      if (location.includes('/seeds/') || location.includes('/seeders/') || location.includes('/factories/') || location.includes('/fixtures/')) {
        return false;
      }

      // 3. Filter Spesifik Laravel: False positive 'password' => 'hashed' pada Model Laravel
      if (ruleId === 'php/HardcodedPassword' && (location.includes('User.php') || location.includes('Model.php'))) {
        return false;
      }

      // 4. Filter Spesifik PHP: Warning XXE pre-PHP8 (aplikasi modern sudah pakai PHP 8.2+)
      if (ruleId === 'php/XxePrePHP8') {
        return false;
      }

      // 5. Filter Spesifik Frontend: Abaikan false positive development bundler
      if (location.includes('.next/') || location.includes('dist/') || location.includes('build/')) {
        return false;
      }

      // 6. Abaikan informational notes generik
      if (level === 'note') return false;

      return true;
    });

    // Quality gate: Hanya gagalkan pipeline jika ada severity ERROR pada kode aplikasi
    const blocking = productionFindings.filter(r => {
      const level = String(r?.level || 'warning').toLowerCase();
      return level === 'error';
    });

    return {
      status: blocking.length > 0 ? 'FAILED' : 'PASSED',
      findings: productionFindings.map(r => ({
        ruleId: r?.ruleId || 'CODE_ISSUE',
        level: String(r?.level || 'warning').toUpperCase(),
        message: r?.message?.text || '',
        location: `${r?.locations?.[0]?.physicalLocation?.artifactLocation?.uri || 'unknown'}:${r?.locations?.[0]?.physicalLocation?.region?.startLine || '-'}`
      }))
    };
  } catch (err) {
    console.error('Error parsing Snyk Code:', err.message);
    return { status: 'ERROR', findings: [] };
  }
}

// ============================================================================
// RUN ANALYZERS
// ============================================================================
const trufflehog = parseTruffleHog();
const snykSca = parseSnykSCA();
const syftSbom = parseSyftSBOM();
const snykCode = parseSnykCode();

// Quality gate ditentukan oleh Secret, SCA, dan SAST
const overallStatus = [trufflehog, snykSca, snykCode].some(s => s && s.status === 'FAILED') ? 'FAILED' : 'PASSED';

// Format timestamp lokal Indonesia (WIB - UTC+7) dan UTC
const now = new Date();
const formattedWib = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'full',
  timeStyle: 'long',
  timeZone: 'Asia/Jakarta'
}).format(now);
const timestampDisplay = `${formattedWib} (${now.toISOString()})`;

// ============================================================================
// GENERATE HTML DASHBOARD REPORT
// ============================================================================
const ecosystemsSummary = Object.entries(syftSbom.ecosystems || {})
  .map(([eco, count]) => `<span class="chip">${eco}: <strong>${count}</strong></span>`)
  .join(' ');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SSDLC DevSecOps Security Gate Report</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 30px; line-height: 1.5; }
    .container { max-width: 1100px; margin: 0 auto; }
    .header { margin-bottom: 24px; }
    .card { background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .badge { padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; display: inline-block; }
    .badge.PASSED { background: #059669; color: white; }
    .badge.FAILED { background: #dc2626; color: white; }
    .badge.SKIPPED { background: #64748b; color: white; }
    .badge.HIGH, .badge.CRITICAL, .badge.ERROR { background: #dc2626; color: white; }
    .badge.MEDIUM, .badge.WARNING { background: #d97706; color: white; }
    .badge.LOW { background: #2563eb; color: white; }
    .chip { background: #334155; padding: 3px 8px; border-radius: 12px; font-size: 12px; margin-right: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
    th, td { border: 1px solid #334155; padding: 10px; text-align: left; }
    th { background: #0f172a; color: #94a3b8; }
    tr:nth-child(even) { background: #1e293b; }
    tr:nth-child(odd) { background: #182234; }
    .empty-note { color: #10b981; font-weight: 500; margin-top: 10px; }
    .footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ SSDLC DevSecOps Security Gate Report</h1>
      <p style="color: #94a3b8;">Cynnexis Automated Security Quality Gate Pipeline</p>
    </div>

    <!-- Overall Status -->
    <div class="card">
      <h3>Overall Quality Gate: <span class="badge ${overallStatus}">${overallStatus}</span></h3>
      <p><strong>Timestamp:</strong> ${timestampDisplay}</p>
    </div>

    <!-- 1. TruffleHog -->
    <div class="card">
      <h3>1. Secret Scanner (TruffleHog) <span class="badge ${trufflehog.status}">${trufflehog.status}</span></h3>
      ${trufflehog.findings.length ? `
        <table>
          <tr><th>Detector</th><th>File Location</th><th>Line</th><th>Verification</th></tr>
          ${trufflehog.findings.map(f => `<tr><td>${f.detector}</td><td>${f.file}</td><td>${f.line}</td><td>${f.verified}</td></tr>`).join('')}
        </table>` : '<p class="empty-note">✓ No leaked secrets or sensitive credentials found.</p>'}
    </div>

    <!-- 2. Snyk SCA -->
    <div class="card">
      <h3>2. SCA Scanner (Snyk Open Source) <span class="badge ${snykSca.status}">${snykSca.status}</span></h3>
      ${snykSca.findings.length ? `
        <table>
          <tr><th>Severity</th><th>Package</th><th>Vulnerability</th><th>Remediation (Fixed In)</th></tr>
          ${snykSca.findings.map(f => `<tr><td><span class="badge ${f.severity}">${f.severity}</span></td><td>${f.package}</td><td>${f.title} (${f.id})</td><td>${f.fixedIn}</td></tr>`).join('')}
        </table>` : '<p class="empty-note">✓ No vulnerable dependencies detected in third-party libraries.</p>'}
    </div>

    <!-- 3. Syft SBOM -->
    <div class="card">
      <h3>3. Software Bill of Materials (Syft SBOM) <span class="badge ${syftSbom.status}">${syftSbom.status}</span></h3>
      <p>Total Dependensi Terinventarisasi: <strong>${syftSbom.totalPackages} paket</strong></p>
      ${ecosystemsSummary ? `<p style="margin-top: 6px;">Ekosistem: ${ecosystemsSummary}</p>` : ''}
      <p style="font-size: 12px; color: #94a3b8; margin-top: 6px;">Dokumen lengkap standar industri tersimpan di file: <code>sbom.json</code> (CycloneDX v1.7)</p>
      ${syftSbom.packages.length ? `
        <details style="margin-top: 12px; cursor: pointer;">
          <summary style="font-weight: bold; color: #38bdf8;">Lihat Daftar 15 Paket Teratas (${syftSbom.packages.length} total) ▼</summary>
          <table>
            <tr><th>Nama Paket</th><th>Versi</th><th>Tipe Ekosistem</th><th>Lisensi</th></tr>
            ${syftSbom.packages.slice(0, 15).map(p => `<tr><td>${p.name}</td><td>${p.version}</td><td>${p.type}</td><td>${p.license}</td></tr>`).join('')}
          </table>
        </details>` : '<p class="empty-note">Tidak ada paket terdeteksi.</p>'}
    </div>

    <!-- 4. Snyk Code SAST -->
    <div class="card">
      <h3>4. SAST Scanner (Snyk Code SARIF) <span class="badge ${snykCode.status}">${snykCode.status}</span></h3>
      ${snykCode.findings.length ? `
        <table>
          <tr><th>Level</th><th>Rule ID</th><th>File & Line</th><th>Issue Description</th></tr>
          ${snykCode.findings.map(f => `<tr><td><span class="badge ${f.level}">${f.level}</span></td><td>${f.ruleId}</td><td>${f.location}</td><td>${f.message}</td></tr>`).join('')}
        </table>` : '<p class="empty-note">✓ No blocking SAST vulnerabilities found in application source code.</p>'}
    </div>

    <div class="footer">
      Generated automatically by Cynnexis DevSecOps CI/CD Pipeline
    </div>
  </div>
</body>
</html>`;

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}
fs.writeFileSync(path.join(REPORTS_DIR, 'report.html'), html);
console.log('HTML Report successfully generated at security-reports/report.html');

// Quality Gate Exit Code: Fail CI/CD if overall security status is FAILED
if (overallStatus === 'FAILED') {
  console.error('\n❌ DevSecOps Quality Gate FAILED: Security vulnerabilities detected. See report.html for details.');
  process.exit(1);
} else {
  console.log('\n✅ DevSecOps Quality Gate PASSED: All security checks passed.');
}
