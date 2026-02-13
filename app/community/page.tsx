
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Heart, Share2, Send, Camera, Video, Trash2 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [newPost, setNewPost] = useState("")
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [likedPosts, setLikedPosts] = useState<string[]>([])
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        setRole(profile?.role || "user")
      }

      await loadPosts()
      if (user) await loadLikes(user.id)
    }
    fetchData()
  }, [])

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error && data) {
      setPosts(data)
      await loadLikeCounts(data)
    } else if (error) {
      console.error("Error loading posts:", error)
    }
  }

  const loadLikes = async (userId: string) => {
    const { data, error } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .eq("source", "community")

    if (error) {
      console.error("Error loading likes:", error)
      return
    }

    setLikedPosts((data || []).map((d: any) => String(d.post_id)))
  }

  //  Load like counts for all posts
  const loadLikeCounts = async (postsData: any[]) => {
    const counts: Record<string, number> = {}
    const { data: allLikes, error } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("source", "community")

    if (!error && allLikes) {
      allLikes.forEach((l: any) => {
        const pid = String(l.post_id)
        counts[pid] = (counts[pid] || 0) + 1
      })
    }

    postsData.forEach((p) => {
      const pid = String(p.id)
      if (!counts[pid]) counts[pid] = 0
    })

    setLikeCounts(counts)
  }

  // Like / Unlike toggle
  const handleLike = async (postIdRaw: any) => {
    if (!user) return alert("Please login first.")
    const postId = String(postIdRaw)

    try {
      const { data: existingLike } = await supabase
        .from("post_likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postIdRaw)
        .eq("source", "community")
        .maybeSingle()

      if (existingLike) {
        const { error: delErr } = await supabase
          .from("post_likes")
          .delete()
          .eq("id", existingLike.id)

        if (!delErr) {
          setLikedPosts((prev) => prev.filter((id) => id !== postId))
          setLikeCounts((prev) => ({
            ...prev,
            [postId]: Math.max((prev[postId] || 1) - 1, 0),
          }))
        } else console.error("Unlike error:", delErr)
      } else {
        const { error: insErr } = await supabase
  .from("post_likes")
  .insert([
    {
      user_id: user.id,
      post_id: postIdRaw,
      source: "community",
    },
  ])
  .select(); 


        if (!insErr) {
          setLikedPosts((prev) => [...prev, postId])
          setLikeCounts((prev) => ({
            ...prev,
            [postId]: (prev[postId] || 0) + 1,
          }))
        } else console.error("Like insert error:", insErr)
      }
    } catch (err) {
      console.error("handleLike error:", err)
    }
  }

  // Share logic
  const handleShare = (postId: any) => {
    const shareUrl = `${window.location.origin}/community/${postId}`
    if (navigator.share) {
      navigator.share({ title: "Check this post!", url: shareUrl })
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert("Link copied to clipboard!")
    }
  }

  // Delete post
  const handleDelete = async (postId: any) => {
    if (!confirm("Delete this post?")) return
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("created_by", user.id)
    if (!error) {
      setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)))
    } else console.error("Delete error:", error)
  }

  // Upload post
  const handlePost = async () => {
    if (!user) return alert("Please login to post.")
    if (role !== "admin") return alert("Only admins can post.")
    if (!newPost.trim() && images.length === 0 && !video)
      return alert("Add text, image, or video before posting!")

    setLoading(true)
    const uploadedUrls: string[] = []

    try {
      for (const file of images) {
        const fileName = `${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase
          .storage.from("post-images").upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage
          .from("post-images")
          .getPublicUrl(fileName)
        uploadedUrls.push(publicUrl)
      }

      let videoUrl = null
      if (video) {
        const fileName = `${Date.now()}-${video.name}`
        const { error: uploadError } = await supabase
          .storage.from("post-videos").upload(fileName, video)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage
          .from("post-videos")
          .getPublicUrl(fileName)
        videoUrl = publicUrl
      }

      const { error: insertError } = await supabase.from("posts").insert([
        {
          title: newPost,
          description: newPost,
          image_url: uploadedUrls.join(","),
          video_url: videoUrl,
          created_by: user.id,
          email: user.email,
        },
      ])
      if (insertError) throw insertError

      setNewPost("")
      setImages([])
      setVideo(null)
      alert("Post added!")
      await loadPosts()
      await loadLikes(user.id)
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Upload failed! Check your Supabase permissions.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Community Feed</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {role === "admin" && (
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Avatar><AvatarFallback>AD</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Share something..."
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      className="mb-4"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <label className="cursor-pointer">
                            <Camera className="w-4 h-4 mr-2" /> Photos
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              multiple
                              onChange={(e) => setImages(Array.from(e.target.files || []))}
                            />
                          </label>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <label className="cursor-pointer">
                            <Video className="w-4 h-4 mr-2" /> Video
                            <input
                              type="file"
                              className="hidden"
                              accept="video/mp4"
                              onChange={(e) => setVideo(e.target.files?.[0] || null)}
                            />
                          </label>
                        </Button>
                      </div>
                      <Button
                        onClick={handlePost}
                        disabled={loading}
                        className="bg-gradient-to-r from-emerald-600 to-cyan-600"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {loading ? "Posting..." : "Post"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {posts.map((post) => {
            const pid = String(post.id)
            return (
              <Card key={post.id}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Avatar>
                      <AvatarFallback>{post.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{post.email || "User"}</h4>
                        <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                          {role === "admin" ? "Admin" : "Member"}
                        </Badge>
                      </div>

                      <p className="text-gray-800 mb-4">{post.title}</p>

                      {post.image_url && (
                        <div className="flex overflow-x-auto space-x-3 mb-4">
                          {post.image_url.split(",").map((url: string, i: number) => (
                            <img key={i} src={url} alt="" className="h-64 w-auto rounded-lg flex-shrink-0" />
                          ))}
                        </div>
                      )}

                      {post.video_url && (
                        <video src={post.video_url} controls className="w-full rounded-lg mb-4 max-h-96" />
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center text-sm ${likedPosts.includes(pid) ? "text-red-500" : "text-gray-600"}`}
                          >
                            <Heart
                              className={`w-4 h-4 mr-2 ${likedPosts.includes(pid) ? "fill-red-500 text-red-500" : ""}`}
                            />
                            {likeCounts[pid] || 0}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShare(post.id)}
                            className="text-gray-600"
                          >
                            <Share2 className="w-4 h-4 mr-2" /> Share
                          </Button>
                        </div>

                        {user?.email === post.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
