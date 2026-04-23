import React from 'react';
import { Alert, Button } from 'antd';
import { RotateCw, AlertTriangle } from 'lucide-react';

/**
 * Analytics tab'larını saran hata sınırı.
 * Async fetch hatalarını YAKALAMAZ (React ErrorBoundary'nin kuralı gereği);
 * onları tab içinde try/catch + sectionError dispatch ile yakalayın.
 *
 * Props:
 *  - children — sarılan içerik
 *  - label — hata başlığı
 *  - fallback — özel UI (ReactNode veya ({error, reset}) => ReactNode)
 *  - onError(error, info) — hata callback
 *  - onReset() — reset callback
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary]', error, errorInfo);
        }
        if (this.props.onError) {
            try {
                this.props.onError(error, errorInfo);
            } catch (e) {
                if (import.meta.env.DEV) {
                    console.error('[ErrorBoundary] onError handler failed', e);
                }
            }
        }
    }

    componentDidUpdate(prevProps) {
        // resetKey değişirse state'i sıfırla (örn: tab değişimi)
        if (
            this.state.hasError &&
            prevProps.resetKey !== this.props.resetKey &&
            this.props.resetKey !== undefined
        ) {
            this.setState({ hasError: false, error: null });
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            try {
                this.props.onReset();
            } catch (e) {
                if (import.meta.env.DEV) {
                    console.error('[ErrorBoundary] onReset handler failed', e);
                }
            }
        }
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const { fallback, label = 'Bu bölümde bir hata oluştu' } = this.props;
        const { error } = this.state;

        if (typeof fallback === 'function') {
            return fallback({ error, reset: this.handleReset });
        }
        if (fallback) {
            return fallback;
        }

        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-red-600" />
                    <div className="flex-1">
                        <div className="mb-1 font-semibold text-red-800">{label}</div>
                        <div className="mb-3 text-sm text-red-700">
                            {error?.message || 'Bilinmeyen hata. Tekrar deneyin veya sayfayı yenileyin.'}
                        </div>
                        <Button
                            size="small"
                            icon={<RotateCw size={12} />}
                            onClick={this.handleReset}
                            danger
                        >
                            Tekrar Dene
                        </Button>
                        {import.meta.env.DEV && error?.stack && (
                            <details className="mt-3 text-xs text-red-600">
                                <summary className="cursor-pointer font-medium">Stack trace (dev)</summary>
                                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-red-100 p-2 text-[11px]">
                                    {error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}
