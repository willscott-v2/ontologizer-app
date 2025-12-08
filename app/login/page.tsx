"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/design-system/button";
import { Input } from "@/components/ui/design-system/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/design-system/card";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithEmail } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // First check if the email is allowed
    try {
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const { allowed } = await checkResponse.json();

      if (!allowed) {
        setError("This email is not authorized to access The Ontologizer. Please contact the administrator.");
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Failed to check email:", err);
      setError("Failed to verify email. Please try again.");
      setLoading(false);
      return;
    }

    // Email is allowed, proceed with magic link
    const { error: signInError } = await signInWithEmail(email);

    if (signInError) {
      setError(signInError.message || "Failed to send magic link");
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
        <Card variant="glass" padding="lg" className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Check your email</CardTitle>
            <CardDescription className="text-[var(--light-gray)] text-base mt-1">
              We sent you a magic link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-2">
            <p className="text-base text-[var(--light-gray)]">
              Click the link in the email to sign in to your account. You can close this window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold">
          <span className="text-gradient-orange">The Ontologizer</span>
        </h1>
      </div>

      <Card variant="glass" padding="lg" className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Welcome</CardTitle>
          <CardDescription className="text-[var(--light-gray)] text-base mt-1">
            Sign in with your email to get started
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                variant="glass"
                className="text-lg py-3"
              />
            </div>
            {error && (
              <div className="text-sm text-[var(--error-red)] bg-red-900/20 border border-red-800/30 rounded-md p-3">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 mt-4">
            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? "Sending magic link..." : "Send magic link"}
            </Button>
            <p className="text-sm text-[var(--light-gray)] text-center">
              No password required. We&apos;ll send you a secure link to sign in.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
