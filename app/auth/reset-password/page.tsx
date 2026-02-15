"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Lock, CheckCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        setError("Invalid or expired reset link. Please request a new one.")
      }
    }

    handleAuthCallback()
  }, [supabase.auth])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setIsSuccess(true)
      setMessage("Password updated successfully! Redirecting to login...")

      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7dd3c0]/30 to-[#7dd3c0]/10 border border-[#7dd3c0]/50 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-[#7dd3c0]" />
            </div>
          </div>

          <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center border-b border-white/10 pb-6">
              <CardTitle className="font-serif text-3xl text-white mb-2">
                Password Updated!
              </CardTitle>
              <CardDescription className="text-sm text-neutral-400 leading-relaxed">
                Your password has been successfully updated. Redirecting to login...
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex justify-center">
                <div className="animate-pulse flex space-x-2">
                  <div className="w-2 h-2 bg-[#7dd3c0] rounded-full"></div>
                  <div className="w-2 h-2 bg-[#7dd3c0] rounded-full"></div>
                  <div className="w-2 h-2 bg-[#7dd3c0] rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7dd3c0]/30 to-[#7dd3c0]/10 border border-[#7dd3c0]/50 flex items-center justify-center">
            <Lock className="w-8 h-8 text-[#7dd3c0]" />
          </div>
        </div>

        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center border-b border-white/10 pb-6">
            <CardTitle className="font-serif text-3xl text-white mb-2">
              Set New Password
            </CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label 
                  htmlFor="password" 
                  className="text-[10px] uppercase tracking-[0.15em] text-neutral-400"
                >
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/[0.02] border-white/10 text-white placeholder:text-neutral-600 focus:border-[#7dd3c0] focus:ring-[#7dd3c0]/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="confirmPassword" 
                  className="text-[10px] uppercase tracking-[0.15em] text-neutral-400"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isLoading ? "Updating..." : "Update Password"}
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