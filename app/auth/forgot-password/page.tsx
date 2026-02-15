"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(email)) {
        setError("Please enter a valid email address format.")
        setIsLoading(false)
        return
      }

      const allowedDomains = [
        "gmail.com",
        "outlook.com",
        "hotmail.com",
        "yahoo.com",
        "icloud.com",
        "rediffmail.com",
        "protonmail.com",
        "edu.in",
        "ac.in",
        "edu",
      ]
      const emailDomain = email.split("@")[1]?.toLowerCase()

      const isAllowed =
        allowedDomains.some((domain) => emailDomain === domain || emailDomain.endsWith(domain))

      if (!isAllowed) {
        setError(
          "Please use a valid or college email address (e.g., Gmail, Outlook, or .edu/.ac.in domain)."
        )
        setIsLoading(false)
        return
      }
      
      const redirectTo =
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      if (error) throw error
      setMessage("Check your email for the password reset link!")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7dd3c0]/30 to-[#7dd3c0]/10 border border-[#7dd3c0]/50 flex items-center justify-center">
            <Mail className="w-8 h-8 text-[#7dd3c0]" />
          </div>
        </div>

        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center border-b border-white/10 pb-6">
            <CardTitle className="font-serif text-3xl text-white mb-2">
              Reset Password
            </CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
              Enter your email to receive reset link
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-[10px] uppercase tracking-[0.15em] text-neutral-400"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@college.edu"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/[0.02] border-white/10 text-white placeholder:text-neutral-600 focus:border-[#7dd3c0] focus:ring-[#7dd3c0]/20 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded">
                  {error}
                </div>
              )}
              
              {message && (
                <div className="p-4 text-sm text-[#7dd3c0] bg-[#7dd3c0]/10 border border-[#7dd3c0]/20 rounded">
                  {message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#7dd3c0] hover:bg-[#7dd3c0]/90 text-black font-medium text-sm uppercase tracking-[0.1em] transition-all h-11"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center text-xs uppercase tracking-[0.15em] text-neutral-400 hover:text-[#7dd3c0] transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center mt-8 text-[9px] uppercase tracking-[0.2em] text-neutral-600">
          Secure Password Reset
        </p>
      </div>
    </div>
  )
}