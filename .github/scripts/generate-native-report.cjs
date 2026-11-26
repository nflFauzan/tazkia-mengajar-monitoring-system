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
  if (!fs.existsSync(file)) return { status: 'SKIPPED', findings: [], count: 0 };
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return { status: 'PASSED', findings: [], count: 0 };

  const lines = raw.split('\n').filter(l => l.trim());
  const findings = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  return {
    status: findings.length > 0 ? 'FAILED' : 'PASSED',
    count: findings.length,
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
  if (!fs.existsSync(file)) return { status: 'SKIPPED', findings: [], count: 0 };
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return { status: 'SKIPPED', findings: [], count: 0 };
    const data = JSON.parse(raw);
    const vulns = Array.isArray(data)
      ? data.flatMap(d => Array.isArray(d?.vulnerabilities) ? d.vulnerabilities : [])
      : (Array.isArray(data?.vulnerabilities) ? data.vulnerabilities : []);

    return {
      status: vulns.length > 0 ? 'FAILED' : 'PASSED',
      count: vulns.length,
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
    return { status: 'ERROR', findings: [], count: 0 };
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
  if (!fs.existsSync(file)) return { status: 'SKIPPED', findings: [], count: 0 };
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return { status: 'SKIPPED', findings: [], count: 0 };
    const data = JSON.parse(raw);
    const results = data.runs?.[0]?.results || [];

    const productionFindings = results.filter(r => {
      const level = String(r?.level || 'warning').toLowerCase();
      const ruleId = String(r?.ruleId || '');
      const location = String(r?.locations?.[0]?.physicalLocation?.artifactLocation?.uri || '');

      if (
        ruleId.includes('/test') ||
        location.startsWith('tests/') ||
        location.startsWith('test/') ||
        location.startsWith('scripts/') ||
        location.includes('/__tests__/') ||
        location.includes('.test.') ||
        location.includes('.spec.') ||
        location.includes('/testdata/')
      ) {
        return false;
      }

      if (
        location.includes('/seeds/') ||
        location.includes('/seeders/') ||
        location.includes('/factories/') ||
        location.includes('/fixtures/') ||
        location.includes('seed.ts') ||
        location.includes('seed.js')
      ) {
        return false;
      }

      if (ruleId === 'php/HardcodedPassword' && (location.includes('User.php') || location.includes('Model.php'))) {
        return false;
      }

      if (ruleId === 'php/XxePrePHP8') {
        return false;
      }

      if (location.includes('.next/') || location.includes('dist/') || location.includes('build/')) {
        return false;
      }

      if (level === 'note') return false;

      return true;
    });

    // Strict Mode (Opsi B): Seluruh temuan keamanan kode (termasuk WARNING) menggagalkan Security Gate
    return {
      status: productionFindings.length > 0 ? 'FAILED' : 'PASSED',
      count: productionFindings.length,
      findings: productionFindings.map(r => ({
        ruleId: r?.ruleId || 'CODE_ISSUE',
        level: String(r?.level || 'warning').toUpperCase(),
        message: r?.message?.text || '',
        location: `${r?.locations?.[0]?.physicalLocation?.artifactLocation?.uri || 'unknown'}:${r?.locations?.[0]?.physicalLocation?.region?.startLine || '-'}`
      }))
    };
  } catch (err) {
    console.error('Error parsing Snyk Code:', err.message);
    return { status: 'ERROR', findings: [], count: 0 };
  }
}

// ============================================================================
// EXECUTE PARSERS & CALCULATE OVERALL STATUS
// ============================================================================
const trufflehog = parseTruffleHog();
const snykSca = parseSnykSCA();
const syftSbom = parseSyftSBOM();
const snykCode = parseSnykCode();

const overallStatus = [trufflehog, snykSca, snykCode].some(s => s && s.status === 'FAILED') ? 'FAILED' : 'PASSED';

const now = new Date();
const formattedWib = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'full',
  timeStyle: 'long',
  timeZone: 'Asia/Jakarta'
}).format(now);
const timestampDisplay = `${formattedWib} (${now.toISOString()})`;

// ============================================================================
// GENERATE CLEAN CORPORATE DASHBOARD (MATTE PALETTE - ZERO EMOJI - NO NEON)
// ============================================================================
const ecosystemsHtml = Object.entries(syftSbom.ecosystems || {})
  .map(([eco, count]) => `<span class="tag-pill">${eco}: ${count}</span>`)
  .join(' ');

const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSDLC DevSecOps Security Gate Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .wrapper {
      max-width: 1200px;
      margin: 0 auto;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #334155;
      margin-bottom: 40px;
    }
    .top-bar .title-group h1 {
      font-size: 20px;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: 700;
      color: #ffffff;
    }
    .top-bar .title-group p {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .timestamp {
      font-size: 12px;
      color: #94a3b8;
      font-family: monospace;
      text-align: right;
    }

    /* ================= INFOGRAPHIC ARCHITECTURE (MATTE DESIGN) ================= */
    .infographic-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 50px;
      margin-bottom: 45px;
      position: relative;
    }
    @media (max-width: 900px) {
      .infographic-container {
        flex-direction: column;
      }
    }

    /* Central Hub Circle (Matte Corporate) */
    .hub-card {
      width: 260px;
      height: 260px;
      border-radius: 50%;
      background: #ffffff;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 28px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      position: relative;
      flex-shrink: 0;
    }
    .hub-card.PASSED {
      border: 5px solid #16a34a;
    }
    .hub-card.FAILED {
      border: 5px solid #dc2626;
    }
    .hub-badge {
      padding: 5px 14px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .hub-badge.PASSED {
      background: #16a34a;
      color: #ffffff;
    }
    .hub-badge.FAILED {
      background: #dc2626;
      color: #ffffff;
    }
    .hub-title {
      font-size: 17px;
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .hub-divider {
      width: 36px;
      height: 2px;
      background: #cbd5e1;
      margin: 10px 0;
    }
    .hub-subtitle {
      font-size: 11px;
      color: #64748b;
      line-height: 1.4;
    }

    /* Branch Stage Capsule Items (Matte Dark Blue) */
    .stages-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      max-width: 580px;
    }
    .stage-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 40px;
      padding: 12px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .stage-card:hover {
      background: #24344d;
      border-color: #475569;
    }
    .stage-card.active {
      background: #273854;
      border-color: #0284c7;
    }
    .stage-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .stage-number {
      width: 38px;
      height: 38px;
      background: #ffffff;
      color: #0f172a;
      font-weight: 700;
      font-size: 15px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stage-info .stage-name {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    }
    .stage-info .stage-desc {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .stage-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .stage-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stage-badge.PASSED { background: #14532d; color: #86efac; border: 1px solid #16a34a; }
    .stage-badge.FAILED { background: #7f1d1d; color: #fca5a5; border: 1px solid #dc2626; }
    .stage-badge.SKIPPED { background: #334155; color: #cbd5e1; border: 1px solid #475569; }

    .click-indicator {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
      border: 1px solid #475569;
      padding: 3px 8px;
      border-radius: 4px;
      background: #0f172a;
    }

    /* ================= DETAIL PANELS ================= */
    .details-box {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 24px;
      margin-top: 10px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 14px;
      border-bottom: 1px solid #334155;
      margin-bottom: 20px;
    }
    .details-title {
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
    }
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #334155;
    }
    th {
      background: #0f172a;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    tr:nth-child(even) td {
      background: #192437;
    }
    .severity-pill {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 700;
      font-family: monospace;
    }
    .severity-pill.CRITICAL, .severity-pill.ERROR, .severity-pill.HIGH { background: #7f1d1d; color: #fca5a5; }
    .severity-pill.MEDIUM, .severity-pill.WARNING { background: #78350f; color: #fde68a; }
    .severity-pill.LOW { background: #1e3a8a; color: #bfdbfe; }
    .tag-pill {
      background: #334155;
      color: #e2e8f0;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      display: inline-block;
      margin: 2px 4px 2px 0;
    }
    .empty-state {
      padding: 24px;
      text-align: center;
      color: #4ade80;
      font-size: 13px;
      background: rgba(22, 163, 74, 0.08);
      border-radius: 6px;
      border: 1px solid #16a34a;
    }
    .skipped-state {
      padding: 24px;
      text-align: center;
      color: #94a3b8;
      font-size: 13px;
      background: rgba(51, 65, 85, 0.4);
      border-radius: 6px;
      border: 1px solid #475569;
    }
    .code-font {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #cbd5e1;
    }
    .footer-bar {
      margin-top: 45px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      padding-top: 20px;
      border-top: 1px solid #334155;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header Universal (Tanpa Nama Brand Khusus) -->
    <div class="top-bar">
      <div class="title-group">
        <h1>SSDLC DevSecOps Security Gate</h1>
        <p>Automated Security Audit & Compliance Pipeline</p>
      </div>
      <div class="timestamp">
        <div>WAKTU AUDIT</div>
        <div>${timestampDisplay}</div>
      </div>
    </div>

    <!-- Interactive Infographic Hub (Matte Look) -->
    <div class="infographic-container">
      <!-- Central Node -->
      <div class="hub-card ${overallStatus}">
        <div class="hub-badge ${overallStatus}">${overallStatus === 'PASSED' ? 'ALL CLEAR' : 'ATTENTION REQUIRED'}</div>
        <div class="hub-title">SECURITY GATE</div>
        <div class="hub-divider"></div>
        <div class="hub-subtitle">
          ${overallStatus === 'PASSED' 
            ? 'Seluruh tahapan audit keamanan berhasil lolos tanpa celah temuan berbahaya.' 
            : 'Ditemukan celah keamanan atau pelanggaran policy pada tahapan pipeline.'}
        </div>
      </div>

      <!-- Stages Branch -->
      <div class="stages-list">
        <!-- 01 Secret Scanning -->
        <div class="stage-card active" onclick="showTab('secret', this)">
          <div class="stage-left">
            <div class="stage-number">01</div>
            <div class="stage-info">
              <div class="stage-name">Secret Scanner (TruffleHog)</div>
              <div class="stage-desc">Mencegah kebocoran API Key, Token, dan Kredensial</div>
            </div>
          </div>
          <div class="stage-right">
            <span class="stage-badge ${trufflehog.status}">${trufflehog.status} (${trufflehog.count})</span>
            <span class="click-indicator">Detail</span>
          </div>
        </div>

        <!-- 02 SCA Dependency -->
        <div class="stage-card" onclick="showTab('sca', this)">
          <div class="stage-left">
            <div class="stage-number">02</div>
            <div class="stage-info">
              <div class="stage-name">SCA Dependency Scanner (Snyk)</div>
              <div class="stage-desc">Mendeteksi celah CVE pada library pihak ketiga</div>
            </div>
          </div>
          <div class="stage-right">
            <span class="stage-badge ${snykSca.status}">${snykSca.status} (${snykSca.count})</span>
            <span class="click-indicator">Detail</span>
          </div>
        </div>

        <!-- 03 Syft SBOM -->
        <div class="stage-card" onclick="showTab('sbom', this)">
          <div class="stage-left">
            <div class="stage-number">03</div>
            <div class="stage-info">
              <div class="stage-name">SBOM Inventory (Anchore Syft)</div>
              <div class="stage-desc">Daftar komposisi paket dan lisensi perangkat lunak</div>
            </div>
          </div>
          <div class="stage-right">
            <span class="stage-badge ${syftSbom.status}">${syftSbom.status} (${syftSbom.totalPackages})</span>
            <span class="click-indicator">Detail</span>
          </div>
        </div>

        <!-- 04 SAST Code -->
        <div class="stage-card" onclick="showTab('sast', this)">
          <div class="stage-left">
            <div class="stage-number">04</div>
            <div class="stage-info">
              <div class="stage-name">SAST Code Scanner (Snyk Code)</div>
              <div class="stage-desc">Analisis statis celah keamanan pada kode aplikasi</div>
            </div>
          </div>
          <div class="stage-right">
            <span class="stage-badge ${snykCode.status}">${snykCode.status} (${snykCode.count})</span>
            <span class="click-indicator">Detail</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= DYNAMIC DETAILS SECTION ================= -->
    <div id="secret-details" class="details-box">
      <div class="details-header">
        <div class="details-title">01. Laporan Temuan Secret Scanner (TruffleHog)</div>
        <span class="stage-badge ${trufflehog.status}">Status: ${trufflehog.status}</span>
      </div>
      ${trufflehog.status === 'SKIPPED' ? `
        <div class="skipped-state">Proses ini terlewatkan (SKIPPED) karena pipeline berhenti pada tahap sebelumnya.</div>
      ` : trufflehog.findings.length ? `
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Detektor</th><th>Lokasi Berkas</th><th>Baris</th><th>Status Verifikasi</th></tr>
            </thead>
            <tbody>
              ${trufflehog.findings.map(f => `
                <tr>
                  <td><strong>${f.detector}</strong></td>
                  <td class="code-font">${f.file}</td>
                  <td>${f.line}</td>
                  <td>${f.verified}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">Tidak ditemukan kebocoran secret atau kredensial sensitif pada kode sumber.</div>
      `}
    </div>

    <div id="sca-details" class="details-box" style="display: none;">
      <div class="details-header">
        <div class="details-title">02. Laporan Celah Dependensi SCA (Snyk Open Source)</div>
        <span class="stage-badge ${snykSca.status}">Status: ${snykSca.status}</span>
      </div>
      ${snykSca.status === 'SKIPPED' ? `
        <div class="skipped-state">Proses ini terlewatkan (SKIPPED) karena pipeline berhenti pada tahap sebelumnya.</div>
      ` : snykSca.findings.length ? `
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Tingkat Keparahan</th><th>Nama Paket</th><th>Judul Kerentanan</th><th>Solusi Perbaikan (Fixed In)</th></tr>
            </thead>
            <tbody>
              ${snykSca.findings.map(f => `
                <tr>
                  <td><span class="severity-pill ${f.severity}">${f.severity}</span></td>
                  <td class="code-font"><strong>${f.package}</strong></td>
                  <td>${f.title} (${f.id})</td>
                  <td class="code-font">${f.fixedIn}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">Seluruh dependensi pihak ketiga bersih dan aman dari kerentanan CVE yang diketahui.</div>
      `}
    </div>

    <div id="sbom-details" class="details-box" style="display: none;">
      <div class="details-header">
        <div class="details-title">03. Daftar Inventaris SBOM (Anchore Syft - CycloneDX)</div>
        <span class="stage-badge ${syftSbom.status}">Status: ${syftSbom.status}</span>
      </div>
      <div style="margin-bottom: 16px;">
        <p style="font-size: 13px; color: #94a3b8;">Total Komponen Terdaftar: <strong>${syftSbom.totalPackages} paket</strong></p>
        <p style="margin-top: 6px;">Ekosistem Terdeteksi: ${ecosystemsHtml || '<span class="tag-pill">None</span>'}</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 6px;">File lengkap standar industri tersimpan di artifact: <code>sbom.json</code></p>
      </div>
      ${syftSbom.status === 'SKIPPED' ? `
        <div class="skipped-state">Proses ini terlewatkan (SKIPPED) karena pipeline berhenti pada tahap sebelumnya.</div>
      ` : syftSbom.packages.length ? `
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Nama Paket</th><th>Versi</th><th>Ekosistem</th><th>Lisensi</th></tr>
            </thead>
            <tbody>
              ${syftSbom.packages.slice(0, 30).map(p => `
                <tr>
                  <td class="code-font"><strong>${p.name}</strong></td>
                  <td class="code-font">${p.version}</td>
                  <td><span class="tag-pill">${p.type}</span></td>
                  <td>${p.license}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">Tidak ada paket terdeteksi pada direktori target.</div>
      `}
    </div>

    <div id="sast-details" class="details-box" style="display: none;">
      <div class="details-header">
        <div class="details-title">04. Laporan Analisis Kode Statis SAST (Snyk Code)</div>
        <span class="stage-badge ${snykCode.status}">Status: ${snykCode.status}</span>
      </div>
      ${snykCode.status === 'SKIPPED' ? `
        <div class="skipped-state">Proses ini terlewatkan (SKIPPED) karena pipeline berhenti pada tahap sebelumnya.</div>
      ` : snykCode.findings.length ? `
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Tingkat</th><th>Aturan (Rule ID)</th><th>Lokasi Berkas & Baris</th><th>Deskripsi Temuan</th></tr>
            </thead>
            <tbody>
              ${snykCode.findings.map(f => `
                <tr>
                  <td><span class="severity-pill ${f.level}">${f.level}</span></td>
                  <td class="code-font">${f.ruleId}</td>
                  <td class="code-font">${f.location}</td>
                  <td>${f.message}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">Tidak ditemukan celah keamanan pada penulisan kode sumber aplikasi.</div>
      `}
    </div>

    <div class="footer-bar">
      Dokumen Laporan Resmi Secure SDLC - Dihasilkan Secara Otomatis oleh CI/CD Pipeline
    </div>
  </div>

  <script>
    function showTab(tabName, cardElement) {
      document.getElementById('secret-details').style.display = 'none';
      document.getElementById('sca-details').style.display = 'none';
      document.getElementById('sbom-details').style.display = 'none';
      document.getElementById('sast-details').style.display = 'none';

      const cards = document.querySelectorAll('.stage-card');
      cards.forEach(c => c.classList.remove('active'));

      const targetBox = document.getElementById(tabName + '-details');
      if (targetBox) {
        targetBox.style.display = 'block';
      }

      if (cardElement) {
        cardElement.classList.add('active');
      }
    }
  </script>
</body>
</html>`;

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}
fs.writeFileSync(path.join(REPORTS_DIR, 'report.html'), html);
console.log('HTML Report successfully generated at security-reports/report.html');

// Single Source of Truth Quality Gate: Sinkronisasi 100% antara CI/CD Pipeline dan Report
if (overallStatus === 'FAILED') {
  console.error('DevSecOps Security Gate: FAILED (Ditemukan temuan keamanan kode produksi yang memerlukan evaluasi).');
  process.exit(1);
} else {
  console.log('DevSecOps Security Gate: PASSED (Seluruh tahapan audit aman).');
  process.exit(0);
}
