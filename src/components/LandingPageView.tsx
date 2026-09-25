import React, { useState } from 'react';
import { Database, Zap, ShieldCheck, Code2, Cpu, ArrowRight, CheckCircle2, Layers, Globe, Sparkles, Terminal, Lock, RefreshCw, Server } from 'lucide-react';
import { Language } from '../types';

interface LandingPageViewProps {
  language: Language;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export function LandingPageView({ language, onOpenLogin, onOpenRegister }: LandingPageViewProps) {
  const [activeTab, setActiveTab] = useState<'get' | 'post' | 'schema'>('get');

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[400px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/15 to-emerald-500/15 blur-[120px] pointer-events-none rounded-full" />

      {/* Top Navigation Bar */}
      <header className="w-full border-b border-slate-800/80 backdrop-blur-xl bg-slate-950/90 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5 flex-wrap">
              DataForge <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-bold">Studio</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden xs:block">
              Cloud Database & REST API Engine
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <a href="#features" className="hover:text-indigo-400 transition-colors">Fitur Utama</a>
          <a href="#how-it-works" className="hover:text-indigo-400 transition-colors">Cara Kerja</a>
          <a href="#api-preview" className="hover:text-indigo-400 transition-colors">API Playground</a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenLogin}
            className="px-3 sm:px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            Masuk
          </button>
          <button
            onClick={onOpenRegister}
            className="px-3.5 sm:px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 shrink-0"
          >
            <span>Mulai Gratis</span>
            <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/90 border border-indigo-700/60 text-indigo-300 text-[11px] sm:text-xs font-semibold mb-6 shadow-sm mx-auto max-w-full text-center">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
          <span className="truncate">Platform Database Cloud & REST API Generasi Baru</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.15] mb-6 px-2">
          Kelola Database & Hasilkan <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-300 to-emerald-400">REST API Instan</span> dalam Sekejap
        </h1>

        <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-4">
          Bangun struktur database relasional secara visual, kelola tabel & rekaman dengan sinkronisasi online real-time 100%, serta uji endpoint API secara interaktif tanpa repot konfigurasi server.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 mb-14">
          <button
            onClick={onOpenRegister}
            className="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-extrabold transition-all shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 flex items-center justify-center gap-2.5"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Buat Akun & Database Gratis</span>
          </button>
          <button
            onClick={onOpenLogin}
            className="w-full sm:w-auto px-7 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Masuk ke Dashboard</span>
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-16 p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="text-center p-2">
            <div className="text-xl sm:text-3xl font-black text-white mb-1">99.9%</div>
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Uptime Cloud Server</div>
          </div>
          <div className="text-center p-2 border-l border-slate-800">
            <div className="text-xl sm:text-3xl font-black text-emerald-400 mb-1">&lt; 15ms</div>
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Latency Response</div>
          </div>
          <div className="text-center p-2 border-l border-slate-800">
            <div className="text-xl sm:text-3xl font-black text-indigo-400 mb-1">100%</div>
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Online Sync Data</div>
          </div>
          <div className="text-center p-2 border-l border-slate-800">
            <div className="text-xl sm:text-3xl font-black text-purple-400 mb-1">Zero Config</div>
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Instant REST API</div>
          </div>
        </div>

        {/* Interactive Code Preview / Terminal Window */}
        <div id="api-preview" className="max-w-4xl mx-auto rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-left mx-4 sm:mx-auto">
          <div className="bg-slate-800/90 px-3 sm:px-4 py-3 border-b border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="ml-2 text-[11px] sm:text-xs font-mono text-slate-300 font-semibold truncate">
                DataForge API Sandbox
              </span>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-center overflow-x-auto">
              <button
                onClick={() => setActiveTab('get')}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold transition-all whitespace-nowrap ${
                  activeTab === 'get' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                GET /products
              </button>
              <button
                onClick={() => setActiveTab('post')}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold transition-all whitespace-nowrap ${
                  activeTab === 'post' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                POST /orders
              </button>
              <button
                onClick={() => setActiveTab('schema')}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold transition-all whitespace-nowrap ${
                  activeTab === 'schema' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                SCHEMA
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 font-mono text-[11px] sm:text-xs bg-slate-950 text-slate-300 overflow-x-auto space-y-2 leading-relaxed">
            {activeTab === 'get' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-500 pb-2 border-b border-slate-900 text-[10px] gap-1">
                  <span className="truncate">GET /v1/db/prod_store/tables/products</span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 w-fit">200 OK (12ms)</span>
                </div>
                <div className="text-purple-400">&#123;</div>
                <div className="pl-3 sm:pl-4 text-emerald-400">"status": <span className="text-amber-300">"success"</span>,</div>
                <div className="pl-3 sm:pl-4 text-emerald-400">"total_records": <span className="text-cyan-400">1420</span>,</div>
                <div className="pl-3 sm:pl-4 text-emerald-400">"data": [</div>
                <div className="pl-6 sm:pl-8 text-slate-300">&#123; "id": <span className="text-amber-300">"prod_001"</span>, "name": <span className="text-amber-300">"MacBook Pro M3"</span>, "price": <span className="text-cyan-400">24999000</span> &#125;</div>
                <div className="pl-3 sm:pl-4 text-emerald-400">]</div>
                <div className="text-purple-400">&#125;</div>
              </>
            )}

            {activeTab === 'post' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-500 pb-2 border-b border-slate-900 text-[10px] gap-1">
                  <span className="truncate">POST /v1/db/prod_store/tables/orders</span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 w-fit">201 Created (18ms)</span>
                </div>
                <div className="text-purple-400">&#123;</div>
                <div className="pl-3 sm:pl-4 text-emerald-400">"success": <span className="text-amber-300">true</span>,</div>
                <div className="pl-3 sm:pl-4 text-emerald-400">"message": <span className="text-amber-300">"Record inserted successfully"</span>,</div>
                <div className="pl-3 sm:pl-4 text-emerald-400">"inserted_id": <span className="text-amber-300">"ord_998124"</span></div>
                <div className="text-purple-400">&#125;</div>
              </>
            )}

            {activeTab === 'schema' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-500 pb-2 border-b border-slate-900 text-[10px] gap-1">
                  <span className="truncate">RELATIONAL SQL DEFINITION</span>
                  <span className="text-purple-400 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800 w-fit">PostgreSQL / MySQL</span>
                </div>
                <div className="text-indigo-400">CREATE TABLE <span className="text-white">products</span> (</div>
                <div className="pl-3 sm:pl-4 text-slate-300">id VARCHAR(64) PRIMARY KEY,</div>
                <div className="pl-3 sm:pl-4 text-slate-300">name VARCHAR(255) NOT NULL,</div>
                <div className="pl-3 sm:pl-4 text-slate-300">price DECIMAL(12,2) DEFAULT 0.00</div>
                <div className="text-indigo-400">);</div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-20 border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto mb-14 px-2">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">
            Keunggulan & Kemudahan Utama
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Dirancang khusus untuk developer dan bisnis yang membutuhkan kecepatan, performa tinggi, dan keamanan data maksimal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 sm:px-0">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-all shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold mb-5 group-hover:scale-110 transition-transform border border-indigo-800/60 shadow-lg">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-white mb-2">
              REST API Instan Otomatis
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Setiap tabel langsung menghasilkan endpoint REST (GET, POST, PUT, DELETE) lengkap dengan dokumentasi interaktif.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition-all shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold mb-5 group-hover:scale-110 transition-transform border border-emerald-800/60 shadow-lg">
              <Globe className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-white mb-2">
              Online Cloud Sync 100%
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Data tersimpan aman di database cloud terpusat. Akses kapanpun dari berbagai perangkat tanpa kendala sinkronisasi.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 transition-all shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-purple-950 text-purple-400 flex items-center justify-center font-bold mb-5 group-hover:scale-110 transition-transform border border-purple-800/60 shadow-lg">
              <ShieldCheck className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-white mb-2">
              Keamanan Token & RBAC
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Dilengkapi autentikasi token JWT, verifikasi email OTP, serta kontrol hak akses pengguna yang ketat dan andal.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-20 border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto mb-14 px-2">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">
            Cara Kerja Sangat Praktis
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Hanya 3 langkah mudah untuk memiliki database online dan REST API production-ready.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 sm:px-0">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-mono font-bold flex items-center justify-center text-sm mb-5 shadow-md">
              01
            </div>
            <h3 className="font-bold text-white text-base mb-2">Buat Proyek Database</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Beri nama proyek dan inisialisasi database relasional dalam hitungan detik.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-mono font-bold flex items-center justify-center text-sm mb-5 shadow-md">
              02
            </div>
            <h3 className="font-bold text-white text-base mb-2">Definisikan Tabel</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Buat kolom, tipe data, dan relasi secara visual melalui antarmuka intuitif.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-mono font-bold flex items-center justify-center text-sm mb-5 shadow-md">
              03
            </div>
            <h3 className="font-bold text-white text-base mb-2">Gunakan Endpoint API</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Endpoint REST API siap dipanggil di aplikasi web atau mobile Anda secara instan.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 shadow-2xl text-center relative overflow-hidden mx-2 sm:mx-0">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Siap Meningkatkan Produktivitas Anda?</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed">
            Bergabunglah sekarang dan rasakan kemudahan mengelola database serta memproduksi REST API instan tanpa kendala.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-950 rounded-2xl text-xs font-extrabold transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <span>Daftar Akun Gratis</span>
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </button>
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-2xl text-xs font-bold transition-all"
            >
              Masuk ke Akun
            </button>
          </div>
        </div>
      </section>

      {/* Footer with Maudigi.com branding */}
      <footer className="w-full border-t border-slate-900 py-8 px-4 sm:px-6 text-center text-xs text-slate-500 mt-auto bg-slate-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 text-slate-400 font-semibold">
            <Database className="w-4 h-4 text-indigo-500" />
            <span>DataForge Studio &copy; {new Date().getFullYear()}</span>
          </div>
          <p className="text-slate-400">
            Developed by <span className="font-bold text-indigo-400">Maudigi.com</span>. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
