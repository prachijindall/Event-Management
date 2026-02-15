"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  Send,
  Trash2,
  MessageCircle,
  Bookmark,
  Image as ImageIcon,
  Play,
  X,
  TrendingUp,
  Flame
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import toast, { Toaster } from "react-hot-toast"

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [newPost, setNewPost] = useState("")
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [likedPosts, setLikedPosts] = useState<string[]>([])
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([])
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [viewMode, setViewMode] = useState<"feed" | "grid">("feed")
  const [filterMode, setFilterMode] = useState<"all" | "liked" | "bookmarked">("all")
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [videoPreviews, setVideoPreviews] = useState<string | null>(null)

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
        await loadBookmarks(user.id)
      }

      await loadPosts()
      if (user) await loadLikes(user.id)
    }
    fetchData()
  }, [])

  const loadPosts = async () => {
    console.log("Loading posts...")
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("Error loading posts:", error)
      toast.error("Failed to load posts")
      return
    }
    
    console.log("Posts loaded:", data)
    console.log("Number of posts:", data?.length || 0)
    
    if (data) {
      setPosts(data)
      await loadLikeCounts(data)
    }
  }

  const loadLikes = async (userId: string) => {
    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .eq("source", "community")
    setLikedPosts((data || []).map((d: any) => String(d.post_id)))
  }

  const loadBookmarks = async (userId: string) => {
    const { data } = await supabase
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", userId)
    setBookmarkedPosts((data || []).map((d: any) => String(d.post_id)))
  }

  const loadLikeCounts = async (postsData: any[]) => {
    const counts: Record<string, number> = {}
    const { data: allLikes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("source", "community")

    if (allLikes) {
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

  const handleLike = async (postIdRaw: any) => {
    if (!user) return toast.error("Please login first")
    const postId = String(postIdRaw)

    const { data: existingLike } = await supabase
      .from("post_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postIdRaw)
      .eq("source", "community")
      .maybeSingle()

    if (existingLike) {
      await supabase.from("post_likes").delete().eq("id", existingLike.id)
      setLikedPosts((prev) => prev.filter((id) => id !== postId))
      setLikeCounts((prev) => ({ ...prev, [postId]: Math.max((prev[postId] || 1) - 1, 0) }))
      toast.success("Like removed")
    } else {
      await supabase.from("post_likes").insert([{ user_id: user.id, post_id: postIdRaw, source: "community" }])
      setLikedPosts((prev) => [...prev, postId])
      setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }))
      toast.success("Liked")
    }
  }

  const toggleBookmark = async (postId: string) => {
    if (!user) return toast.error("Please login first")

    if (bookmarkedPosts.includes(postId)) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", postId)
      setBookmarkedPosts((prev) => prev.filter((id) => id !== postId))
      toast.success("Bookmark removed")
    } else {
      await supabase.from("bookmarks").insert([{ user_id: user.id, post_id: postId }])
      setBookmarkedPosts((prev) => [...prev, postId])
      toast.success("Bookmarked")
    }
  }

  const handleShare = (postId: any) => {
    const shareUrl = `${window.location.origin}/community/${postId}`
    if (navigator.share) {
      navigator.share({ title: "Check this post!", url: shareUrl })
    } else {
      navigator.clipboard.writeText(shareUrl)
      toast.success("Link copied")
    }
  }

  const handleDelete = async (postId: any) => {
    if (!confirm("Delete this post?")) return
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("created_by", user.id)
    if (!error) {
      setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)))
      toast.success("Post deleted")
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImages(files)
    setImagePreviews(files.map(file => URL.createObjectURL(file)))
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setVideo(file)
    if (file) setVideoPreviews(URL.createObjectURL(file))
  }

  const clearMedia = () => {
    setImages([])
    setVideo(null)
    setImagePreviews([])
    setVideoPreviews(null)
  }

  const handlePost = async () => {
    if (!user || role !== "admin") return toast.error("Only admins can post")
    if (!newPost.trim() && images.length === 0 && !video) return toast.error("Add content")

    setLoading(true)
    const uploadedUrls: string[] = []

    try {
      console.log("Starting post creation...")
      
      for (const file of images) {
        const fileName = `${Date.now()}-${file.name}`
        console.log("Uploading image:", fileName)
        const { error: uploadError } = await supabase.storage.from("post-images").upload(fileName, file)
        if (uploadError) {
          console.error("Image upload error:", uploadError)
          throw uploadError
        }
        const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(fileName)
        uploadedUrls.push(publicUrl)
        console.log("Image uploaded:", publicUrl)
      }

      let videoUrl = null
      if (video) {
        const fileName = `${Date.now()}-${video.name}`
        console.log("Uploading video:", fileName)
        const { error: uploadError } = await supabase.storage.from("post-videos").upload(fileName, video)
        if (uploadError) {
          console.error("Video upload error:", uploadError)
          throw uploadError
        }
        const { data: { publicUrl } } = supabase.storage.from("post-videos").getPublicUrl(fileName)
        videoUrl = publicUrl
        console.log("Video uploaded:", videoUrl)
      }

      console.log("Inserting post with data:", {
        title: newPost,
        description: newPost,
        image_url: uploadedUrls.join(","),
        video_url: videoUrl,
        created_by: user.id,
        email: user.email,
      })

      const { data: insertedData, error: insertError } = await supabase.from("posts").insert([{
        title: newPost,
        description: newPost,
        image_url: uploadedUrls.join(","),
        video_url: videoUrl,
        created_by: user.id,
        email: user.email,
      }]).select()

      if (insertError) {
        console.error("Insert error:", insertError)
        throw insertError
      }

      console.log("Post inserted successfully:", insertedData)

      setNewPost("")
      clearMedia()
      toast.success("Post published!")
      
      console.log("Reloading posts...")
      await loadPosts()
      if (user) await loadLikes(user.id)
    } catch (error: any) {
      console.error("Upload failed:", error)
      toast.error(error.message || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  const filteredPosts = posts.filter(post => {
    const pid = String(post.id)
    if (filterMode === "liked") return likedPosts.includes(pid)
    if (filterMode === "bookmarked") return bookmarkedPosts.includes(pid)
    return true
  })

  const trendingPosts = [...posts]
    .sort((a, b) => (likeCounts[String(b.id)] || 0) - (likeCounts[String(a.id)] || 0))
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
      }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/90 border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/">
                <button className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <h1 className="font-serif text-2xl font-light tracking-tight">Community</h1>
                <p className="text-[9px] text-neutral-400 uppercase tracking-[0.2em] mt-0.5">
                  {filteredPosts.length} Posts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setFilterMode("all")} className={`h-9 px-4 text-[10px] uppercase tracking-[0.15em] transition-all ${filterMode === "all" ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"}`}>All</button>
              <button onClick={() => setFilterMode("liked")} className={`h-9 px-4 text-[10px] uppercase tracking-[0.15em] transition-all ${filterMode === "liked" ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"}`}>Liked ({likedPosts.length})</button>
              <button onClick={() => setFilterMode("bookmarked")} className={`h-9 px-4 text-[10px] uppercase tracking-[0.15em] transition-all ${filterMode === "bookmarked" ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"}`}>Saved ({bookmarkedPosts.length})</button>
              <div className="h-4 w-px bg-white/10" />
              <button onClick={() => setViewMode("feed")} className={`h-9 px-4 text-[10px] uppercase tracking-[0.15em] transition-all ${viewMode === "feed" ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"}`}>Feed</button>
              <button onClick={() => setViewMode("grid")} className={`h-9 px-4 text-[10px] uppercase tracking-[0.15em] transition-all ${viewMode === "grid" ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"}`}>Grid</button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 max-w-7xl mx-auto px-8 pb-16">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <div>
        {/* Create Post Section */}
        {role === "admin" && (
          <div className="mb-12 p-6 border border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7dd3c0]/30 to-[#7dd3c0]/10 border border-[#7dd3c0]/50 flex items-center justify-center font-serif text-lg flex-shrink-0 text-[#7dd3c0]">
                {user?.email?.[0]?.toUpperCase() || "A"}
              </div>
              <textarea
                placeholder="Share your thoughts..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="flex-1 bg-transparent border border-white/10 p-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#7dd3c0] transition-all text-sm resize-none h-24"
              />
            </div>

            {/* Media Previews */}
            {(imagePreviews.length > 0 || videoPreviews) && (
              <div className="relative p-4 border border-white/10 bg-black/20">
                <button onClick={clearMedia} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all z-10">
                  <X className="w-4 h-4" />
                </button>
                
                {imagePreviews.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto">
                    {imagePreviews.map((preview, i) => (
                      <img key={i} src={preview} alt="" className="h-32 w-auto rounded object-cover" />
                    ))}
                  </div>
                )}
                
                {videoPreviews && (
                  <video src={videoPreviews} controls className="w-full max-h-64 rounded" />
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex gap-3">
                <label className="h-9 px-4 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all text-[10px] uppercase tracking-[0.15em] flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="w-3 h-3" />
                  Photos
                  <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                </label>
                <label className="h-9 px-4 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all text-[10px] uppercase tracking-[0.15em] flex items-center gap-2 cursor-pointer">
                  <Play className="w-3 h-3" />
                  Video
                  <input type="file" className="hidden" accept="video/mp4" onChange={handleVideoChange} />
                </label>
              </div>
              <button onClick={handlePost} disabled={loading} className="h-9 px-6 bg-gradient-to-r from-[#7dd3c0]/20 to-[#7dd3c0]/10 border border-[#7dd3c0] text-white hover:from-[#7dd3c0] hover:to-[#7dd3c0]/80 hover:text-black transition-all text-[10px] uppercase tracking-[0.15em] flex items-center gap-2 disabled:opacity-50">
                <Send className="w-3 h-3" />
                {loading ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        )}

        {/* Posts Feed/Grid */}
        {viewMode === "feed" ? (
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const pid = String(post.id)
              const isLiked = likedPosts.includes(pid)
              const isBookmarked = bookmarkedPosts.includes(pid)

              return (
                <div key={post.id} className="border border-white/10 bg-white/[0.02] overflow-hidden hover:border-[#7dd3c0]/80 transition-all">
                  {/* Post Header */}
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7dd3c0]/30 to-[#7dd3c0]/10 border border-[#7dd3c0]/50 flex items-center justify-center font-serif text-base">
                          {post.email?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <h4 className="font-serif text-sm text-white">{post.email || "Anonymous"}</h4>
                          <p className="text-[9px] text-neutral-400 uppercase tracking-[0.15em]">
                            {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      
                      {user?.email === post.email && (
                        <button onClick={() => handleDelete(post.id)} className="w-8 h-8 border border-white/20 hover:bg-red-500/10 hover:border-red-500 transition-all flex items-center justify-center">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="p-4">
                    <p className="text-white text-sm leading-relaxed mb-4">{post.title}</p>

                    {/* Media */}
                    {post.image_url && (
                      <div className="flex gap-2 overflow-x-auto mb-4 -mx-4 px-4">
                        {post.image_url.split(",").map((url: string, i: number) => (
                          <Link key={i} href={`/community/${post.id}`}>
                            <img src={url} alt="" className="h-48 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity rounded" />
                          </Link>
                        ))}
                      </div>
                    )}

                    {post.video_url && (
                      <video src={post.video_url} controls className="w-full max-h-64 mb-4 rounded" />
                    )}
                  </div>

                  {/* Post Actions */}
                  <div className="px-4 pb-4 flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleLike(post.id)} className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] transition-all ${isLiked ? "text-[#7dd3c0]" : "hover:text-[#7dd3c0]"}`}>
                        <Heart className={`w-4 h-4 ${isLiked ? "fill-current text-[#7dd3c0]" : ""}`} />
                        {likeCounts[pid] || 0}
                      </button>
                      <Link href={`/community/${post.id}`}>
                        <button className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] hover:text-[#7dd3c0] transition-all">
                          <MessageCircle className="w-4 h-4" />
                          View
                        </button>
                      </Link>
                      <button onClick={() => handleShare(post.id)} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] hover:text-[#7dd3c0] transition-all">
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                    </div>

                    <button onClick={() => toggleBookmark(pid)} className={`w-8 h-8 border transition-all flex items-center justify-center ${isBookmarked ? "border-[#7dd3c0] bg-[#7dd3c0]/10" : "border-white/20 hover:bg-[#7dd3c0]/10 hover:border-[#7dd3c0]"}`}>
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-current text-[#7dd3c0]" : ""}`} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredPosts.map((post) => (
              <Link key={post.id} href={`/community/${post.id}`}>
                <div className="group relative aspect-square overflow-hidden bg-neutral-900 cursor-pointer border border-white/10 hover:border-[#7dd3c0]/80 transition-all">
                  {post.image_url?.split(",")[0] ? (
                    <img src={post.image_url.split(",")[0]} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                  ) : post.video_url ? (
                    <video src={post.video_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                      <p className="text-neutral-600 text-sm text-center px-4">{post.title}</p>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-4 text-white text-sm">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {likeCounts[String(post.id)] || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {post.video_url && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
                      <Play className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-32 border border-white/10">
            <div className="w-16 h-16 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-6 h-6 text-neutral-600" />
            </div>
            <p className="text-white text-xs uppercase tracking-[0.2em] mb-2">No Posts Found</p>
            <p className="text-neutral-500 text-xs">
              {filterMode === "liked" && "You haven't liked any posts yet"}
              {filterMode === "bookmarked" && "You haven't saved any posts yet"}
              {filterMode === "all" && "No posts available"}
            </p>
          </div>
        )}
          </div>

          {/* Trending Sidebar */}
          <div className="space-y-6 relative">
            {/* Trending Posts Card */}
            <div className="border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-sm overflow-hidden">
              <div className="p-6 border-b border-white/10 bg-gradient-to-r from-[#7dd3c0]/10 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#7dd3c0]/20 border border-[#7dd3c0] flex items-center justify-center">
                    <Flame className="w-5 h-5 text-[#7dd3c0]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-white font-medium">Trending Now</h3>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-[0.2em]">Top 5 Posts</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                {trendingPosts.slice(0, 5).map((post, index) => (
                  <Link key={post.id} href={`/community/${post.id}`}>
                    <div className="group relative overflow-hidden border border-white/10 hover:border-[#7dd3c0] bg-white/[0.02] hover:bg-[#7dd3c0]/5 transition-all duration-300">
                      <div className="flex gap-3 p-3">
                        {/* Rank Badge */}
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7dd3c0]/30 to-[#7dd3c0]/10 border border-[#7dd3c0]/50 flex items-center justify-center">
                            <span className="font-bold text-[#7dd3c0] text-sm">#{index + 1}</span>
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#7dd3c0] rounded-full flex items-center justify-center">
                              <TrendingUp className="w-2.5 h-2.5 text-black" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white line-clamp-2 mb-2 group-hover:text-[#7dd3c0] transition-colors font-medium leading-tight">
                            {post.title}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[10px] text-neutral-400 uppercase tracking-[0.1em]">
                              <Heart className="w-3 h-3 text-[#7dd3c0]" />
                              <span className="text-[#7dd3c0] font-semibold">{likeCounts[String(post.id)] || 0}</span>
                            </span>
                            <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
                            <span className="text-[9px] text-neutral-400 uppercase tracking-[0.1em]">
                              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {/* Thumbnail */}
                        {post.image_url && (
                          <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden border border-white/10 bg-black">
                            <img 
                              src={post.image_url.split(",")[0]} 
                              alt="" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            />
                          </div>
                        )}
                      </div>

                      {/* Hover Accent Line */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#7dd3c0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  </Link>
                ))}
              </div>

              {trendingPosts.length === 0 && (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                    <Flame className="w-6 h-6 text-neutral-700" />
                  </div>
                  <p className="text-neutral-500 text-xs">No trending posts yet</p>
                </div>
              )}
            </div>

            {/* Stats Card */}
            <div className="border border-white/10 bg-white/[0.02] p-5">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-4">Community Stats</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Total Posts</span>
                  <span className="text-lg font-semibold text-white">{posts.length}</span>
                </div>
                <div className="h-px bg-white/10"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Total Likes</span>
                  <span className="text-lg font-semibold text-[#7dd3c0]">
                    {Object.values(likeCounts).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
                <div className="h-px bg-white/10"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Your Liked</span>
                  <span className="text-lg font-semibold text-white">{likedPosts.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}