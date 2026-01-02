import React from 'react';

interface AvatarProps {
    gender?: string; // 'male' | 'female' | any
    size?: number; // pixel size, default 32
    className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ gender = '', size = 32, className = '' }) => {
    const lower = gender?.toLowerCase();
    const src = lower === 'male' ? '/avatars/male.png' : lower === 'female' ? '/avatars/female.png' : null;
    const alt = lower === 'male' ? 'Male' : lower === 'female' ? 'Female' : 'Avatar';
    const baseClass = `w-${size} h-${size} rounded-full overflow-hidden border-2 border-blue-200 shrink-0 bg-white ${className}`;
    return src ? (
        <img src={src} alt={alt} className={baseClass} />
    ) : (
        <div className={baseClass}>
            <span className="flex items-center justify-center w-full h-full text-xs text-slate-400">👤</span>
        </div>
    );
};

export default Avatar;
