import React, { useState } from 'react';
import { DatabaseProject, DatabaseTable } from '../types';
import {
  Copy,
  Check,
  Terminal,
  Code2,
  Globe,
  Database,
  Key,
  Server,
  Play,
  ShieldCheck,
  AlertTriangle,
  Lock,
  WifiOff,
  RotateCw,
  Search,
  Table as TableIcon
} from 'lucide-react';
import { Language, translations } from '../translations';
import { RefreshTokenModal } from './RefreshTokenModal';

interface ApiDocsViewProps {
  project: DatabaseProject;
  tables: DatabaseTable[];
  language: Language;
  onOpenPlayground: () => void;
  onProjectTokenRefreshed?: (project: DatabaseProject) => void;
  onTableTokenRefreshed?: (table: DatabaseTable) => void;
}

export function ApiDocsView({
  project,
  tables,
  language,
  onOpenPlayground,
  onProjectTokenRefreshed,
  onTableTokenRefreshed
}: ApiDocsViewProps) {
  const t = translations[language];
  const [selectedTableSlug, setSelectedTableSlug] = useState<string>(tables[0]?.slug || '');
  const [authMethod, setAuthMethod] = useState<'header' | 'url'>('header');
  const [activeCodeLang, setActiveCodeLang] = useState<'curl' | 'js' | 'python' | 'php'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRefreshTokenOpen, setIsRefreshTokenOpen] = useState(false);

  const currentTable = tables.find(t => t.slug === selectedTableSlug) || tables[0];
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getSnippets = (tbl: DatabaseTable) => {
    const tblToken = tbl.token || project.token;
    const cleanEndpoint = `${baseUrl}/api/v1/${tbl.slug}`;
    const legacyEndpoint = `${baseUrl}/api/v1/${tblToken}/${tbl.slug}`;

    const endpoint = authMethod === 'header' ? cleanEndpoint : legacyEndpoint;

    const samplePayload: Record<string, any> = {};
    tbl.fields.forEach(f => {
      if (!f.isPrimaryKey && f.key !== 'id') {
        if (f.type === 'number') samplePayload[f.key] = 100;
        else if (f.type === 'boolean') samplePayload[f.key] = true;
        else if (f.type === 'select' && f.options?.length) samplePayload[f.key] = f.options[0];
        else samplePayload[f.key] = `Contoh ${f.label}`;
      }
    });
    const jsonBody = JSON.stringify(samplePayload, null, 2);

    if (authMethod === 'header') {
      return {
        curl: {
          getAll: `curl -X GET "${endpoint}" \\\n  -H "Authorization: Bearer ${tblToken}" \\\n  -H "Accept: application/json"`,
          getOne: `curl -X GET "${endpoint}/1" \\\n  -H "Authorization: Bearer ${tblToken}" \\\n  -H "Accept: application/json"`,
          getSearch: `curl -X GET "${endpoint}?search=kata_kunci" \\\n  -H "Authorization: Bearer ${tblToken}" \\\n  -H "Accept: application/json"`,
          post: `curl -X POST "${endpoint}" \\\n  -H "Authorization: Bearer ${tblToken}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(samplePayload)}'`,
          put: `curl -X PUT "${endpoint}/1" \\\n  -H "Authorization: Bearer ${tblToken}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(samplePayload)}'`,
          del: `curl -X DELETE "${endpoint}/1" \\\n  -H "Authorization: Bearer ${tblToken}"`
        },
        js: {
          getAll: `// GET Semua Data Tabel ${tbl.name}\nfetch('${endpoint}', {\n  headers: {\n    'Authorization': 'Bearer ${tblToken}',\n    'Accept': 'application/json'\n  }\n})\n  .then(res => res.json())\n  .then(data => console.log(data));`,
          getOne: `// GET Single Record Berdasarkan ID (#1)\nfetch('${endpoint}/1', {\n  headers: {\n    'Authorization': 'Bearer ${tblToken}',\n    'Accept': 'application/json'\n  }\n})\n  .then(res => res.json())\n  .then(data => console.log('Single Record:', data));`,
          getSearch: `// GET Pencarian Data via ?search=kata_kunci\nfetch('${endpoint}?search=kata_kunci', {\n  headers: {\n    'Authorization': 'Bearer ${tblToken}',\n    'Accept': 'application/json'\n  }\n})\n  .then(res => res.json())\n  .then(data => console.log('Hasil Pencarian:', data));`,
          post: `// Tambah Data Baru (POST)\nfetch('${endpoint}', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ${tblToken}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify(${jsonBody})\n})\n  .then(res => res.json())\n  .then(data => console.log('Data tersimpan:', data));`,
          put: `// Update Data Berdasarkan ID Target (#1)\nfetch('${endpoint}/1', {\n  method: 'PUT',\n  headers: {\n    'Authorization': 'Bearer ${tblToken}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify(${jsonBody})\n})\n  .then(res => res.json())\n  .then(data => console.log('Data terupdate:', data));`,
          del: `// Hapus Data Berdasarkan ID Target (#1)\nfetch('${endpoint}/1', {\n  method: 'DELETE',\n  headers: {\n    'Authorization': 'Bearer ${tblToken}'\n  }\n})\n  .then(res => res.json())\n  .then(data => console.log('Data terhapus:', data));`
        },
        python: {
          getAll: `import requests\n\nheaders = {"Authorization": "Bearer ${tblToken}"}\nurl = "${endpoint}"\nresponse = requests.get(url, headers=headers)\nprint(response.json())`,
          getOne: `import requests\n\nheaders = {"Authorization": "Bearer ${tblToken}"}\nurl = "${endpoint}/1"\nresponse = requests.get(url, headers=headers)\nprint(response.json())`,
          getSearch: `import requests\n\nheaders = {"Authorization": "Bearer ${tblToken}"}\nurl = "${endpoint}"\nparams = {"search": "kata_kunci"}\nresponse = requests.get(url, headers=headers, params=params)\nprint(response.json())`,
          post: `import requests\n\nheaders = {\n    "Authorization": "Bearer ${tblToken}",\n    "Content-Type": "application/json"\n}\nurl = "${endpoint}"\npayload = ${JSON.stringify(samplePayload, null, 4)}\nresponse = requests.post(url, headers=headers, json=payload)\nprint(response.json())`,
          put: `import requests\n\nheaders = {\n    "Authorization": "Bearer ${tblToken}",\n    "Content-Type": "application/json"\n}\nurl = "${endpoint}/1"\npayload = ${JSON.stringify(samplePayload, null, 4)}\nresponse = requests.put(url, headers=headers, json=payload)\nprint(response.json())`,
          del: `import requests\n\nheaders = {"Authorization": "Bearer ${tblToken}"}\nurl = "${endpoint}/1"\nresponse = requests.delete(url, headers=headers)\nprint(response.json())`
        },
        php: {
          getAll: `<?php\n// GET Semua Data\n$url = "${endpoint}";\n$options = [\n  'http' => [\n    'header' => "Authorization: Bearer ${tblToken}\\r\\nAccept: application/json\\r\\n",\n    'method' => 'GET'\n  ]\n];\n$context = stream_context_create($options);\n$response = file_get_contents($url, false, $context);\nprint_r(json_decode($response, true));`,
          getOne: `<?php\n// GET Single Record (#1)\n$url = "${endpoint}/1";\n$options = [\n  'http' => [\n    'header' => "Authorization: Bearer ${tblToken}\\r\\nAccept: application/json\\r\\n",\n    'method' => 'GET'\n  ]\n];\n$context = stream_context_create($options);\n$response = file_get_contents($url, false, $context);\nprint_r(json_decode($response, true));`,
          getSearch: `<?php\n// GET Pencarian Data (?search=kata_kunci)\n$url = "${endpoint}?search=" . urlencode("kata_kunci");\n$options = [\n  'http' => [\n    'header' => "Authorization: Bearer ${tblToken}\\r\\nAccept: application/json\\r\\n",\n    'method' => 'GET'\n  ]\n];\n$context = stream_context_create($options);\n$response = file_get_contents($url, false, $context);\nprint_r(json_decode($response, true));`,
          post: `<?php\n// POST Data Baru\n$url = "${endpoint}";\n$data = ${jsonBody};\n$options = [\n  'http' => [\n    'header' => "Authorization: Bearer ${tblToken}\\r\\nContent-Type: application/json\\r\\n",\n    'method' => 'POST',\n    'content' => json_encode($data)\n  ]\n];\n$context = stream_context_create($options);\n$result = file_get_contents($url, false, $context);\nprint_r(json_decode($result, true));`,
          put: `<?php\n// PUT / Update Data\n$url = "${endpoint}/1";\n$data = ${jsonBody};\n$options = [\n  'http' => [\n    'header' => "Authorization: Bearer ${tblToken}\\r\\nContent-Type: application/json\\r\\n",\n    'method' => 'PUT',\n    'content' => json_encode($data)\n  ]\n];\n$context = stream_context_create($options);\n$result = file_get_contents($url, false, $context);\nprint_r(json_decode($result, true));`,
          del: `<?php\n// DELETE Record\n$url = "${endpoint}/1";\n$options = [\n  'http' => [\n    'header' => "Authorization: Bearer ${tblToken}\\r\\n",\n    'method' => 'DELETE'\n  ]\n];\n$context = stream_context_create($options);\n$result = file_get_contents($url, false, $context);\nprint_r(json_decode($result, true));`
        }
      };
    }

    // Fallback URL method
    return {
      curl: {
        getAll: `curl -X GET "${endpoint}" \\\n  -H "Accept: application/json"`,
        getOne: `curl -X GET "${endpoint}/1" \\\n  -H "Accept: application/json"`,
        getSearch: `curl -X GET "${endpoint}?search=kata_kunci" \\\n  -H "Accept: application/json"`,
        post: `curl -X POST "${endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(samplePayload)}'`,
        put: `curl -X PUT "${endpoint}/1" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(samplePayload)}'`,
        del: `curl -X DELETE "${endpoint}/1"`
      },
      js: {
        getAll: `// GET Semua Data Tabel ${tbl.name} (URL Token)\nfetch('${endpoint}')\n  .then(res => res.json())\n  .then(data => console.log(data));`,
        getOne: `// GET Record #1 (URL Token)\nfetch('${endpoint}/1')\n  .then(res => res.json())\n  .then(data => console.log(data));`,
        getSearch: `// GET Pencarian Data (URL Token)\nfetch('${endpoint}?search=kata_kunci')\n  .then(res => res.json())\n  .then(data => console.log(data));`,
        post: `// Tambah Data Baru (URL Token)\nfetch('${endpoint}', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(${jsonBody})\n})\n  .then(res => res.json())\n  .then(data => console.log('Data tersimpan:', data));`,
        put: `// Update Data Berdasarkan Primary Key ID\nfetch('${endpoint}/1', {\n  method: 'PUT',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(${jsonBody})\n})\n  .then(res => res.json())\n  .then(data => console.log('Data terupdate:', data));`,
        del: `// Hapus Data Berdasarkan ID\nfetch('${endpoint}/1', { method: 'DELETE' })\n  .then(res => res.json())\n  .then(data => console.log('Data terhapus:', data));`
      },
      python: {
        getAll: `import requests\n\nurl = "${endpoint}"\nresponse = requests.get(url)\nprint(response.json())`,
        getOne: `import requests\n\nurl = "${endpoint}/1"\nresponse = requests.get(url)\nprint(response.json())`,
        getSearch: `import requests\n\nurl = "${endpoint}"\nparams = {"search": "kata_kunci"}\nresponse = requests.get(url, params=params)\nprint(response.json())`,
        post: `import requests\n\nurl = "${endpoint}"\npayload = ${JSON.stringify(samplePayload, null, 4)}\nresponse = requests.post(url, json=payload)\nprint(response.json())`,
        put: `import requests\n\nurl = "${endpoint}/1"\npayload = ${JSON.stringify(samplePayload, null, 4)}\nresponse = requests.put(url, json=payload)\nprint(response.json())`,
        del: `import requests\n\nurl = "${endpoint}/1"\nresponse = requests.delete(url)\nprint(response.json())`
      },
      php: {
        getAll: `<?php\n$url = "${endpoint}";\n$response = file_get_contents($url);\nprint_r(json_decode($response, true));`,
        getOne: `<?php\n$url = "${endpoint}/1";\n$response = file_get_contents($url);\nprint_r(json_decode($response, true));`,
        getSearch: `<?php\n$url = "${endpoint}?search=" . urlencode("kata_kunci");\n$response = file_get_contents($url);\nprint_r(json_decode($response, true));`,
        post: `<?php\n$url = "${endpoint}";\n$data = ${jsonBody};\n$options = [\n  'http' => [\n    'header' => "Content-Type: application/json\\r\\n",\n    'method' => 'POST',\n    'content' => json_encode($data)\n  ]\n];\n$context = stream_context_create($options);\n$result = file_get_contents($url, false, $context);\nprint_r(json_decode($result, true));`,
        put: `<?php\n$url = "${endpoint}/1";\n$data = ${jsonBody};\n$options = [\n  'http' => [\n    'header' => "Content-Type: application/json\\r\\n",\n    'method' => 'PUT',\n    'content' => json_encode($data)\n  ]\n];\n$context = stream_context_create($options);\n$result = file_get_contents($url, false, $context);\nprint_r(json_decode($result, true));`,
        del: `<?php\n$url = "${endpoint}/1";\n$options = [\n  'http' => [\n    'method' => 'DELETE'\n  ]\n];\n$context = stream_context_create($options);\n$result = file_get_contents($url, false, $context);\nprint_r(json_decode($result, true));`
      }
    };
  };

  const snippets = currentTable ? getSnippets(currentTable) : null;

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12 animate-fadeIn max-w-full overflow-hidden">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                REST API v1
              </span>
              <span className="text-xs text-slate-300 font-mono">CORS: Enabled (*)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                Bearer Auth Ready
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold">Dokumentasi REST API: {project.name}</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Database ini dapat diakses secara aman dari aplikasi mobile (Flutter, React Native, Kotlin), web frontend (Next.js, React), backend (Node, Python, Go, PHP), atau otomasi (n8n, Make, Zapier).
            </p>
          </div>

          <button
            onClick={onOpenPlayground}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shrink-0 self-start md:self-center"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Buka Live Sandbox</span>
          </button>
        </div>

        {/* Token Info Card */}
        <div className="mt-4 pt-4 border-t border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Key className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-slate-300 font-semibold shrink-0">API Access Token:</span>
            <code className="font-mono text-emerald-300 bg-slate-950/70 px-2 py-0.5 rounded border border-indigo-700/50 break-all select-all">
              {project.token}
            </code>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleCopy(project.token, 'token')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
              title="Salin Token Master Database"
            >
              {copiedKey === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'token' ? 'Token Disalin!' : 'Salin Token'}</span>
            </button>

            <button
              onClick={() => setIsRefreshTokenOpen(true)}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 shadow-xs"
              title="Refresh / Putar token jika bocor atau perlu diganti"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Refresh Token</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Advisory Callout */}
      <div className="p-4 sm:p-5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-2.5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <span>Keamanan Terbaik: Gunakan HTTP Header "Authorization: Bearer"</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200">
                Paling Aman & Standar OWASP
              </span>
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
              <strong>Solusi Teraman:</strong> Gunakan header HTTP <code>Authorization: Bearer &lt;TOKEN&gt;</code> dengan URL bersih (<code>/api/v1/nama_tabel</code>). Header HTTP melalui HTTPS (TLS) dienkripsi sepenuhnya dari perangkat ke server.
            </p>
          </div>
        </div>
      </div>

      {/* Method Switcher: Header vs URL */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="font-bold text-slate-700 dark:text-slate-300">Pilih Metode Autentikasi:</span>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
          <button
            onClick={() => setAuthMethod('header')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              authMethod === 'header'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Header Bearer (Aman)</span>
          </button>

          <button
            onClick={() => setAuthMethod('url')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              authMethod === 'url'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>URL Token (Legacy)</span>
          </button>
        </div>
      </div>

      {/* Table Selector Strip */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Pilih Tabel untuk Contoh Kode Integrasi:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {tables.map(tbl => (
            <button
              key={tbl.id}
              onClick={() => setSelectedTableSlug(tbl.slug)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 border ${
                selectedTableSlug === tbl.slug
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{tbl.name} (/{tbl.slug})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Field Schema & Validation Rules Card */}
      {currentTable && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-indigo-500" />
              <span>Skema Kolom & Aturan Validasi API: <code className="text-indigo-600 dark:text-indigo-400 font-mono">/{currentTable.slug}</code></span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">{currentTable.fields.length} Kolom Didefinisikan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 pb-2">
                  <th className="pb-2 font-mono">Key JSON API</th>
                  <th className="pb-2">Nama Kolom</th>
                  <th className="pb-2">Tipe Data</th>
                  <th className="pb-2">Status Validasi</th>
                  <th className="pb-2">Opsi Pilihan (Select) / Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {currentTable.fields.map(f => (
                  <tr key={f.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">{f.key}</td>
                    <td className="py-2 font-medium">{f.label}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono text-[10px] rounded uppercase font-bold text-slate-600 dark:text-slate-300">
                        {f.type}
                      </span>
                    </td>
                    <td className="py-2">
                      {f.required || f.isPrimaryKey ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px] bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                          Wajib (Required)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Opsional (Nullable)</span>
                      )}
                    </td>
                    <td className="py-2">
                      {f.type === 'select' && f.options && f.options.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-semibold">Valid Options (Peka Huruf Besar/Kecil):</span>
                          {f.options.map((opt, oIdx) => (
                            <span key={oIdx} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded font-mono text-[10px] font-bold">
                              "{opt}"
                            </span>
                          ))}
                        </div>
                      ) : f.isPrimaryKey ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-semibold">Auto-Increment Primary Key</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Code Snippets Section */}
      {currentTable && snippets && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          {/* Language Switcher Tabs */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Code2 className="w-4 h-4 text-indigo-500" />
              <span>Contoh Kode Interaksi REST API ({currentTable.name}):</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
              {(['curl', 'js', 'python', 'php'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setActiveCodeLang(lang)}
                  className={`px-2.5 py-1 rounded-md transition-colors uppercase ${
                    activeCodeLang === lang
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Snippets List */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* 1. GET ALL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono font-bold rounded">
                    GET
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    1. Ambil Semua Data ({currentTable.name})
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(snippets[activeCodeLang].getAll, 'getAll')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  {copiedKey === 'getAll' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'getAll' ? 'Disalin' : 'Salin Kode'}</span>
                </button>
              </div>
              <pre className="p-3.5 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap break-all leading-relaxed border border-slate-800">
                {snippets[activeCodeLang].getAll}
              </pre>
            </div>

            {/* 2. GET ONE BY ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-mono font-bold rounded">
                    GET
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    2. Ambil 1 Data Berdasarkan ID Specific (/{currentTable.slug}/:id)
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(snippets[activeCodeLang].getOne, 'getOne')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  {copiedKey === 'getOne' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'getOne' ? 'Disalin' : 'Salin Kode'}</span>
                </button>
              </div>
              <pre className="p-3.5 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap break-all leading-relaxed border border-slate-800">
                {snippets[activeCodeLang].getOne}
              </pre>
            </div>

            {/* 3. GET SEARCH */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-mono font-bold rounded flex items-center gap-1">
                    <Search className="w-3 h-3" /> GET
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    3. Pencarian Data via Query Parameter (?search=kata_kunci)
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(snippets[activeCodeLang].getSearch, 'getSearch')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  {copiedKey === 'getSearch' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'getSearch' ? 'Disalin' : 'Salin Kode'}</span>
                </button>
              </div>
              <pre className="p-3.5 bg-slate-950 text-cyan-300 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap break-all leading-relaxed border border-slate-800">
                {snippets[activeCodeLang].getSearch}
              </pre>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                * Parameter search memfilter berdasarkan kolom yang telah Anda izinkan di setting tabel.
              </div>
            </div>

            {/* 4. POST CREATE */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold rounded">
                    POST
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    4. Tambah Record Baru (#ID Primary Key dibuat otomatis)
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(snippets[activeCodeLang].post, 'post')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  {copiedKey === 'post' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'post' ? 'Disalin' : 'Salin Kode'}</span>
                </button>
              </div>
              <pre className="p-3.5 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap break-all leading-relaxed border border-slate-800">
                {snippets[activeCodeLang].post}
              </pre>
            </div>

            {/* 5. PUT UPDATE */}
            {snippets[activeCodeLang].put && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono font-bold rounded">
                      PUT
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      5. Perbarui Data Berdasarkan ID Target (#1)
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(snippets[activeCodeLang].put!, 'put')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copiedKey === 'put' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'put' ? 'Disalin' : 'Salin Kode'}</span>
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap break-all leading-relaxed border border-slate-800">
                  {snippets[activeCodeLang].put}
                </pre>
              </div>
            )}

            {/* 6. DELETE */}
            {snippets[activeCodeLang].del && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-mono font-bold rounded">
                      DELETE
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      6. Hapus Record Berdasarkan ID Target (#1)
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(snippets[activeCodeLang].del!, 'del')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copiedKey === 'del' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'del' ? 'Disalin' : 'Salin Kode'}</span>
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap break-all leading-relaxed border border-slate-800">
                  {snippets[activeCodeLang].del}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refresh Token Modal */}
      <RefreshTokenModal
        isOpen={isRefreshTokenOpen}
        onClose={() => setIsRefreshTokenOpen(false)}
        project={project}
        tables={tables}
        activeTableId={currentTable?.id}
        language={language}
        onProjectTokenRefreshed={(updatedProj) => {
          if (onProjectTokenRefreshed) onProjectTokenRefreshed(updatedProj);
        }}
        onTableTokenRefreshed={(updatedTbl) => {
          if (onTableTokenRefreshed) onTableTokenRefreshed(updatedTbl);
        }}
      />
    </div>
  );
}
