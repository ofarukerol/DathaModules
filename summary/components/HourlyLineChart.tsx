import { useState } from 'react';
import type { HourlyDataPoint } from '../types';

interface HourlyLineChartProps {
    data: HourlyDataPoint[];
    currentDataIdx: number;
}

export default function HourlyLineChart({ data, currentDataIdx }: HourlyLineChartProps) {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; amount: number } | null>(null);

    const W = 800, H = 200;
    const PAD = { top: 16, right: 16, bottom: 36, left: 8 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    const maxVal = Math.max(...data.map(d => d.amount), 1);

    // Noktaların koordinatları
    const pts = data.map((d, i) => ({
        x: PAD.left + (i / (data.length - 1)) * chartW,
        y: PAD.top + chartH - (d.amount / maxVal) * chartH,
        ...d,
    }));

    // Smooth bezier path (cubic spline benzeri)
    function smoothPath(points: { x: number; y: number }[]) {
        if (points.length < 2) return '';
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const cp1x = points[i].x + (points[i + 1].x - points[i].x) * 0.45;
            const cp1y = points[i].y;
            const cp2x = points[i + 1].x - (points[i + 1].x - points[i].x) * 0.45;
            const cp2y = points[i + 1].y;
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i + 1].x} ${points[i + 1].y}`;
        }
        return d;
    }

    // Şimdiki konuma kadar olan dilim (geçmiş vs gelecek rengi)
    const pastPts = pts.slice(0, currentDataIdx + 1);
    const futurePts = currentDataIdx < pts.length - 1 ? pts.slice(currentDataIdx) : [];

    const pastLine = smoothPath(pastPts);
    const pastArea = pastPts.length > 1
        ? pastLine + ` L ${pastPts[pastPts.length-1].x} ${PAD.top + chartH} L ${pastPts[0].x} ${PAD.top + chartH} Z`
        : '';
    const futureLine = futurePts.length > 1 ? smoothPath(futurePts) : '';
    const futureArea = futurePts.length > 1
        ? futureLine + ` L ${futurePts[futurePts.length-1].x} ${PAD.top + chartH} L ${futurePts[0].x} ${PAD.top + chartH} Z`
        : '';

    // Y ekseni çizgileri (3 seviye)
    const yGridLines = [0.25, 0.5, 0.75, 1].map(pct => ({
        y: PAD.top + chartH - pct * chartH,
        val: Math.round(maxVal * pct),
    }));

    // Label gösterim aralığı (15 saatlik aralık için her 3 saatte bir)
    const showLabel = (i: number) => data.length <= 10 || i % 2 === 0;

    return (
        <div className="relative w-full h-full select-none">
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-full overflow-visible"
                onMouseLeave={() => setTooltip(null)}
            >
                <defs>
                    <linearGradient id="pastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#663259" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#663259" stopOpacity="0.01" />
                    </linearGradient>
                    <linearGradient id="futureGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.10" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
                    </linearGradient>
                </defs>

                {/* Y ekseni yatay çizgiler */}
                {yGridLines.map((g, i) => (
                    <line key={i} x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y}
                        stroke="#F3F4F6" strokeWidth="1" />
                ))}

                {/* Gelecek alan (yeşilimsi, soluk) */}
                {futureArea && <path d={futureArea} fill="url(#futureGrad)" />}
                {futureLine && (
                    <path d={futureLine} fill="none" stroke="#10B981" strokeWidth="2"
                        strokeDasharray="5 4" strokeLinecap="round" />
                )}

                {/* Geçmiş alan (mor gradient) */}
                {pastArea && <path d={pastArea} fill="url(#pastGrad)" />}
                {pastPts.length > 1 && (
                    <path d={pastLine} fill="none" stroke="#663259" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Nokta + interaktif alan */}
                {pts.map((pt, i) => (
                    <g key={i}>
                        {/* Geniş hover alanı */}
                        <rect
                            x={pt.x - chartW / (2 * (data.length - 1))}
                            y={PAD.top}
                            width={chartW / (data.length - 1)}
                            height={chartH}
                            fill="transparent"
                            onMouseEnter={() => setTooltip({ x: pt.x, y: pt.y, label: pt.label, amount: pt.amount })}
                        />
                        {/* Nokta */}
                        {pt.amount > 0 && (
                            <>
                                <circle cx={pt.x} cy={pt.y} r="4" fill="white"
                                    stroke={i <= currentDataIdx ? "#663259" : "#10B981"} strokeWidth="2" />
                                {/* Şimdiki konum noktası büyük */}
                                {i === currentDataIdx && (
                                    <circle cx={pt.x} cy={pt.y} r="6" fill="none" stroke="#663259" strokeWidth="1.5" strokeOpacity="0.4" />
                                )}
                            </>
                        )}
                        {/* X ekseni label */}
                        {showLabel(i) && (
                            <text x={pt.x} y={H - 6} textAnchor="middle"
                                fontSize="9" fill="#9CA3AF" fontFamily="Lexend, sans-serif">
                                {pt.label}
                            </text>
                        )}
                    </g>
                ))}

                {/* Tooltip */}
                {tooltip && tooltip.amount > 0 && (() => {
                    const tw = 90, th = 36;
                    const tx = Math.max(tw/2 + PAD.left, Math.min(W - PAD.right - tw/2, tooltip.x));
                    const ty = tooltip.y - th - 10;
                    return (
                        <g>
                            <rect x={tx - tw/2} y={ty} width={tw} height={th} rx="6" ry="6"
                                fill="#663259" opacity="0.95" />
                            <text x={tx} y={ty + 13} textAnchor="middle"
                                fontSize="9" fill="rgba(255,255,255,0.7)" fontFamily="Lexend, sans-serif">
                                {tooltip.label}
                            </text>
                            <text x={tx} y={ty + 27} textAnchor="middle"
                                fontSize="11" fontWeight="700" fill="white" fontFamily="Lexend, sans-serif">
                                {'\u20BA'}{tooltip.amount.toLocaleString('tr-TR')}
                            </text>
                        </g>
                    );
                })()}
            </svg>
        </div>
    );
}
