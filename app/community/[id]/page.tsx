"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SinglePostPage() {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single()
      if (!error) setPost(data)
      setLoading(false)
    }
    fetchPost()
  }, [id])

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading...</p>
  if (!post) return <p className="text-center mt-10 text-gray-500">Post not found.</p>

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16">
          <Link href="/community">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <h1 className="ml-3 text-lg font-bold text-gray-800">Post Details</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-3">{post.title}</h2>
            <p className="text-gray-700 mb-4">{post.description}</p>

            {post.image_url && (
              <div className="flex overflow-x-auto space-x-3 mb-4">
                {post.image_url.split(",").map((url: string, i: number) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="h-64 w-auto rounded-lg flex-shrink-0"
                  />
                ))}
              </div>
            )}

            {post.video_url && (
              <video
                src={post.video_url}
                controls
                className="w-full rounded-lg mb-4 max-h-96"
              />
            )}

            <p className="text-sm text-gray-500 mt-4">
              Posted by: {post.email || "Anonymous"}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
