import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    className?: string;
    size?: number;
    text?: string;
}

export function LoadingSpinner({ className, size = 48, text = "Loading..." }: LoadingSpinnerProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center min-h-[50vh] w-full", className)}>
            <Loader2 className="animate-spin text-blue-600 mb-4" size={size} />
            {text && <p className="text-gray-500 font-medium animate-pulse">{text}</p>}
        </div>
    );
}
