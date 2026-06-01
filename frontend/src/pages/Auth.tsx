import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github } from "lucide-react";
import { GoogleIcon } from "@/components/icons/flat-color-icons-google";

const supabase = createClient();

export default function Auth() {
    async function login(provider: "github" | "google") {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
        });
        if (error) {
            console.error("Error during login:", error);
        } else {
            console.log("Login successful, redirecting to:", data.url);
        }
    }

    return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-slate-50 dark:bg-[#0d0d12]">
        
        {/* Layer 2: The Glowing Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-300/40 dark:bg-purple-400/30 blur-[120px] pointer-events-none"></div>
        <div className="absolute top-[20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-400/30 dark:bg-blue-600/20 blur-[140px] pointer-events-none"></div>
        
        {/* Layer 3: The Grain Texture Overlay */}
        <div className="bg-grainy"></div>
        
        {/* Layer 4: The Auth Card (Needs relative & z-20 to sit on top of the grain) */}
        <div className="relative z-20 w-full max-w-md">
            
            {/* Added backdrop-blur and semi-transparent black so the gradient shines through the card! */}
            <Card className="w-full border-none bg-transparent shadow-none sm:bg-white/40 sm:dark:bg-black/40 sm:border-gray-200 sm:dark:border-white/10 sm:backdrop-blur-xl sm:shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-gray-400">
                        Sign in to your DeepQuery account to continue
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Button 
                        variant="outline" 
                        onClick={() => login("google")}
                        className="relative h-12 w-full justify-center text-base font-semibold bg-white text-black hover:bg-gray-200 dark:text-white"
                    >
                        <GoogleIcon className="mr-2 h-5 w-5" />
                        Continue with Google
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => login("github")}
                        className="relative h-12 w-full justify-center text-base font-semibold bg-slate-900 text-white border-none hover:bg-slate-300  dark:bg-[#24292e] dark:hover:bg-[#2f363d]"
                    >
                        <Github className="mr-2 h-5 w-5" />
                        Continue with GitHub
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
);
}