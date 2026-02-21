import React from 'react';
import { Copy, AlertTriangle } from 'lucide-react';

const DocsTab = ({ program }) => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
    const copyJson = (obj) => navigator.clipboard.writeText(JSON.stringify(obj, null, 2));

    const endpoints = [
        {
            method: 'POST',
            path: '/external-auth/login/',
            title: 'Giriş (Login)',
            desc: 'Kullanıcıyı doğrular ve JWT token döner.',
            request: {
                program_key: program?.program_key || 'YOUR_PROGRAM_KEY',
                username: 'kullanici_adi',
                password: '********',
                hwid: 'abc123...def456',
                device_name: 'BILGISAYAR-ADI',
                version: program?.current_version || '1.0.0'
            },
            successResponse: {
                status: 'success',
                token: 'eyJ0eXAiOiJKV1...',
                refresh: 'eyJ0eXAiOiJKV1...',
                user: { name: 'Ad Soyad', employee_id: 1 }
            },
            errorCodes: [
                { code: 'INVALID_KEY', desc: 'Program anahtarı geçersiz', status: 401 },
                { code: 'PROGRAM_INACTIVE', desc: 'Program devre dışı (Kill Switch)', status: 403 },
                { code: 'VERSION_REJECTED', desc: 'İstemci sürümü çok eski', status: 403 },
                { code: 'INVALID_CREDENTIALS', desc: 'Kullanıcı adı/şifre hatalı', status: 401 },
                { code: 'USER_INACTIVE', desc: 'Kullanıcı hesabı pasif', status: 401 },
                { code: 'HWID_BLOCKED', desc: 'Bu cihaz engellenmiş', status: 403 },
                { code: 'HWID_LIMIT', desc: 'Cihaz limiti aşıldı', status: 403 },
            ]
        },
        {
            method: 'GET',
            path: '/external-auth/verify/',
            title: 'Oturum Doğrulama (Verify)',
            desc: 'Mevcut token ve programın hâlâ geçerli olduğunu kontrol eder.',
            headers: { Authorization: 'Bearer eyJ0eXAi...' },
            params: { program_key: 'YOUR_KEY', version: '1.0.0' },
            successResponse: {
                valid: true,
                user: 'kullanici_adi',
                program_active: true,
                current_version: program?.current_version || '1.0.0',
                min_version: program?.min_version || '1.0.0'
            }
        }
    ];

    return (
        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
            {/* Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-amber-800">Güvenlik Uyarısı</p>
                    <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc pl-4">
                        <li><strong>Program Anahtarı (Secret Key)</strong> gizli tutulmalıdır. Kaynak kodda açık bırakmayın.</li>
                        <li>Token'lar <strong>5 saat</strong> geçerlidir. Süresi dolan token'lar reddedilir.</li>
                        <li>HWID kilidi açıksa, aynı kullanıcı en fazla <strong>{program?.max_devices_per_user || 2} cihaz</strong> kaydedebilir.</li>
                        <li>Program <strong>devre dışı</strong> bırakılırsa tüm bağlantılar anlık kesilir (Kill Switch).</li>
                        <li>Anahtar yenilendiğinde (<strong>Regenerate</strong>) mevcut tüm istemciler güncellenmeli.</li>
                    </ul>
                </div>
            </div>

            {/* Connection Info */}
            <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Bağlantı Bilgileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                        <span className="text-slate-500">Base URL</span>
                        <div className="font-mono bg-white px-2 py-1 rounded border border-slate-200 mt-0.5 flex items-center justify-between">
                            <span className="truncate">{baseUrl}</span>
                            <button onClick={() => navigator.clipboard.writeText(baseUrl)} className="ml-1 p-0.5 hover:bg-slate-100 rounded"><Copy size={12} /></button>
                        </div>
                    </div>
                    <div>
                        <span className="text-slate-500">Program Key</span>
                        <div className="font-mono bg-white px-2 py-1 rounded border border-slate-200 mt-0.5 flex items-center justify-between">
                            <span className="truncate">{String(program?.program_key || '').substring(0, 12)}...</span>
                            <button onClick={() => navigator.clipboard.writeText(program?.program_key)} className="ml-1 p-0.5 hover:bg-slate-100 rounded"><Copy size={12} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Endpoints */}
            {endpoints.map((ep, i) => (
                <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${ep.method === 'POST' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{ep.method}</span>
                            <code className="text-sm font-mono text-slate-700">{ep.path}</code>
                        </div>
                        <span className="text-xs text-slate-500">{ep.title}</span>
                    </div>
                    <div className="p-4 space-y-3">
                        <p className="text-sm text-slate-600">{ep.desc}</p>

                        {/* Headers */}
                        {ep.headers && (
                            <div>
                                <p className="text-xs font-semibold text-slate-500 mb-1">Headers</p>
                                <pre className="bg-slate-900 text-slate-300 p-3 rounded text-xs overflow-x-auto"><code>{JSON.stringify(ep.headers, null, 2)}</code></pre>
                            </div>
                        )}

                        {/* Request Body / Params */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-slate-500">{ep.request ? 'Request Body (JSON)' : 'Query Params'}</p>
                                <button onClick={() => copyJson(ep.request || ep.params)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Copy size={10} /> Kopyala</button>
                            </div>
                            <pre className="bg-slate-900 text-green-400 p-3 rounded text-xs overflow-x-auto"><code>{JSON.stringify(ep.request || ep.params, null, 2)}</code></pre>
                        </div>

                        {/* Success Response */}
                        <div>
                            <p className="text-xs font-semibold text-green-600 mb-1">✅ Başarılı Yanıt (200)</p>
                            <pre className="bg-slate-900 text-blue-300 p-3 rounded text-xs overflow-x-auto"><code>{JSON.stringify(ep.successResponse, null, 2)}</code></pre>
                        </div>

                        {/* Error Codes */}
                        {ep.errorCodes && (
                            <div>
                                <p className="text-xs font-semibold text-red-600 mb-1">❌ Hata Kodları</p>
                                <div className="border border-slate-200 rounded overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead><tr className="bg-slate-50"><th className="px-3 py-1.5 text-left">Kod</th><th className="px-3 py-1.5 text-left">Açıklama</th><th className="px-3 py-1.5 text-center">HTTP</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {ep.errorCodes.map(ec => (
                                                <tr key={ec.code}>
                                                    <td className="px-3 py-1.5 font-mono text-red-600">{ec.code}</td>
                                                    <td className="px-3 py-1.5 text-slate-600">{ec.desc}</td>
                                                    <td className="px-3 py-1.5 text-center">{ec.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Auth Flow Diagram */}
            <div className="border border-slate-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Kimlik Doğrulama Akışı</h4>
                <div className="space-y-2 text-xs">
                    {[
                        { step: '1', text: 'İstemci → POST /external-auth/login/', detail: 'program_key + kullanıcı bilgileri + HWID gönderilir' },
                        { step: '2', text: 'Sunucu → Program Key kontrolü', detail: 'Geçersiz key = 401 INVALID_KEY' },
                        { step: '3', text: 'Sunucu → Program aktif mi?', detail: 'Pasif = 403 PROGRAM_INACTIVE (Kill Switch)' },
                        { step: '4', text: 'Sunucu → Versiyon kontrolü', detail: 'Eski versiyon = 403 VERSION_REJECTED + update_url' },
                        { step: '5', text: 'Sunucu → Kullanıcı doğrulama', detail: 'AD/şifre kontrolü, çalışan kaydı kontrolü' },
                        { step: '6', text: 'Sunucu → HWID kontrolü', detail: 'Engelli cihaz? Limit aşıldı? Yeni cihaz kaydı' },
                        { step: '7', text: 'Sunucu → JWT Token döner', detail: 'Token 5 saat geçerli, cache\'e kaydedilir' },
                        { step: '8', text: 'İstemci → GET /external-auth/verify/', detail: 'Periyodik oturum kontrolü (opsiyonel)' },
                    ].map(s => (
                        <div key={s.step} className="flex gap-3 items-start">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">{s.step}</span>
                            <div>
                                <p className="font-medium text-slate-700">{s.text}</p>
                                <p className="text-slate-500">{s.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DocsTab;
