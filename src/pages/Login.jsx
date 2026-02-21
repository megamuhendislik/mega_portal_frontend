import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [remember, setRemember] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(username, password, remember);
            navigate('/');
        } catch (err) {
            setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Left Side - Visual */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 z-10" />
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_25%_25%,_white_1px,_transparent_1px)] bg-[length:40px_40px]" />

                <div className="relative z-20 flex flex-col justify-between p-12 w-full text-white">
                    <div className="flex items-center space-x-4">
                        <img src="/mega_logo.png" alt="Mega Portal Logo" className="h-12 w-auto object-contain bg-white/10 backdrop-blur-sm rounded-lg p-1" />
                        <span className="text-2xl font-bold tracking-tight text-white drop-shadow-md">Portal</span>
                    </div>

                    <div className="space-y-6 max-w-lg">
                        <h1 className="text-5xl font-bold leading-tight drop-shadow-lg">
                            Yarının Vizyonu, Bugünün Fikirleri
                        </h1>
                        <p className="text-lg text-slate-100 drop-shadow-md font-medium">
                            Mega Portal
                        </p>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-slate-200 font-medium">
                        <span>© 2025 Mega İnşaat A.Ş.</span>
                        <span>•</span>
                        <span>Portal v1.0</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8 animate-fade-in">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900">Hoş Geldiniz</h2>
                        <p className="mt-2 text-slate-600">Hesabınıza giriş yaparak devam edin.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Kullanıcı Adı
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="input-field pl-10"
                                        placeholder="Kullanıcı adınızı girin"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Şifre
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="input-field pl-10"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            id="remember-me"
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)}
                                        />
                                        <span className="ml-2 text-sm text-slate-600">Beni Hatırla</span>
                                    </label>
                                    <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                        Şifremi Unuttum?
                                    </a>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary flex items-center justify-center space-x-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Giriş Yap</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
