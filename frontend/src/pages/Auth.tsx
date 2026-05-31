import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Globe } from "lucide-react";

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
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md border-none bg-transparent shadow-none sm:bg-card sm:border sm:shadow-sm">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
                    <CardDescription>
                        Sign in to your Purplexity account to continue
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Button 
                        variant="outline" 
                        onClick={() => login("google")}
                        className="relative h-12 w-full justify-center text-base font-semibold"
                    >
                        <Globe className="mr-2 h-5 w-5 text-blue-500" />
                        Continue with Google
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => login("github")}
                        className="relative h-12 w-full justify-center text-base font-semibold"
                    >
                        <Github className="mr-2 h-5 w-5" />
                        Continue with GitHub
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}