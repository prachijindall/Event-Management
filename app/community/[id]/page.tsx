"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Heart, Share2, Bookmark, Download, Eye, Calendar, User, Clock } from "lucide-react"
import Link from "next/link"
import toast, { Toaster } from "react-hot-toast"

export default function SinglePostPage() {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUser(user)

      const { data, error } = await supabase.from("posts").select("*").eq("id", id).single()
      
      if (!error && data) {
        setPost(data)
        
        const { data: likes } = await supabase.from("post_likes").select("id").eq("post_id", id).eq("source", "community")
        setLikeCount(likes?.length || 0)

        if (user) {
          const { data: userLike } = await supabase.from("post_likes").select("id").eq("user_id", user.id).eq("post_id", id).eq("source", "community").maybeSingle()
          setIsLiked(!!userLike)
        }
      }
      
      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleLike = async () => {
    if (!user) return toast.error("Please login first")

    try {
      if (isLiked) {
        await supabase.from("post_likes").delete().eq("user_id", user.id).eq("post_id", id).eq("source", "community")
        setIsLiked(false)
        setLikeCount(prev => Math.max(0, prev - 1))
        toast.success("Like removed")
      } else {
        await supabase.from("post_likes").insert([{ user_id: user.id, post_id: id, source: "community" }])
        setIsLiked(true)
        setLikeCount(prev => prev + 1)
        toast.success("Liked")
      }
    } catch (err) {
      toast.error("Failed to update like")
    }
  }

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    toast.success(isBookmarked ? "Bookmark removed" : "Bookmarked")
  }

  const handleShare = () => {
    const shareUrl = window.location.href
    if (navigator.share) {
      navigator.share({ title: post.title, text: post.description, url: shareUrl })
    } else {
      navigator.clipboard.writeText(shareUrl)
      toast.success("Link copied")
    }
  }

  const downloadImage = async (url: string, index: number = 0) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `post-${id}-image-${index + 1}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      
      toast.success("Download started")
    } catch (error) {
      console.error('Download failed:', error)
      toast.error("Download failed")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border border-white/10 border-t-[#7dd3c0] rounded-full animate-spin mx-auto" />
          <p className="text-neutral-500 text-xs uppercase tracking-[0.2em]">Loading Post</p>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600 text-xs uppercase tracking-[0.2em]">Post Not Found</p>
          <Link href="/community">
            <button className="mt-6 px-6 h-10 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 text-[10px] uppercase tracking-[0.15em] transition-all">
              Back to Community
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const images = post.image_url ? post.image_url.split(",") : []

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/90 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/community">
                <button className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <h1 className="font-serif text-2xl font-light tracking-tight">Post Details</h1>
                <p className="text-[9px] text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Community</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLike}
                className={`h-9 px-4 text-[10px] uppercase tracking-[0.15em] transition-all flex items-center gap-2 ${
                  isLiked 
                    ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" 
                    : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                }`}
              >
                <Heart className={`w-3 h-3 ${isLiked ? "fill-current text-[#7dd3c0]" : ""}`} />
                {likeCount}
              </button>
              <button
                onClick={toggleBookmark}
                className={`w-9 h-9 border transition-all flex items-center justify-center ${
                  isBookmarked 
                    ? "border-[#7dd3c0] bg-[#7dd3c0]/10" 
                    : "border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current text-[#7dd3c0]" : ""}`} />
              </button>
              <button
                onClick={handleShare}
                className="w-9 h-9 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all flex items-center justify-center"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 max-w-7xl mx-auto px-8 pb-16">
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Main Content */}
          <div className="space-y-8">
            {/* Post Header */}
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7dd3c0]/30 to-[#7dd3c0]/10 border border-[#7dd3c0]/50 flex items-center justify-center font-serif text-xl text-[#7dd3c0]">
                    {post.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-neutral-200">{post.email || "Anonymous"}</h3>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-400 uppercase tracking-[0.15em] mt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {new Date(post.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6">
                <h2 className="font-serif text-3xl font-light tracking-tight leading-tight mb-4">
                  {post.title}
                </h2>
                {post.description && post.description !== post.title && (
                  <p className="text-neutral-300 leading-relaxed text-lg">
                    {post.description}
                  </p>
                )}
              </div>
            </div>

            {/* Images */}
            {images.length > 0 && (
              <div className="space-y-4">
                <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900 border border-white/10 hover:border-[#7dd3c0]/80 transition-all">
                  <img
                    src={selectedImage || images[0]}
                    alt=""
                    className="w-full h-full object-contain cursor-zoom-in hover:scale-105 transition-transform duration-500"
                    onClick={() => window.open(selectedImage || images[0], '_blank')}
                  />
                  <button
                    onClick={() => downloadImage(selectedImage || images[0], images.indexOf(selectedImage || images[0]))}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/80 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-gradient-to-r hover:from-[#7dd3c0]/20 hover:to-[#7dd3c0]/10 hover:border-[#7dd3c0] transition-all group"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((url: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(url)}
                        className={`relative w-24 h-24 flex-shrink-0 overflow-hidden bg-neutral-900 border-2 transition-all ${
                          (selectedImage || images[0]) === url 
                            ? "border-[#7dd3c0]" 
                            : "border-white/10 hover:border-[#7dd3c0]/80"
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Video */}
            {post.video_url && (
              <div className="relative aspect-video overflow-hidden bg-neutral-900 border border-white/10">
                <video src={post.video_url} controls className="w-full h-full" />
              </div>
            )}

            {/* Engagement Stats */}
            <div className="flex items-center gap-8 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-neutral-400">
                
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-neutral-400">
                
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions Card */}
            <div className="sticky top-24 p-6 border border-white/10 bg-white/[0.02] space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-4">Actions</h3>
              
              <button
                onClick={handleLike}
                className={`w-full h-10 text-[10px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${
                  isLiked 
                    ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" 
                    : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current text-[#7dd3c0]" : ""}`} />
                {isLiked ? "Liked" : "Like"} ({likeCount})
              </button>

              <button
                onClick={toggleBookmark}
                className={`w-full h-10 transition-all text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 ${
                  isBookmarked 
                    ? "border-[#7dd3c0] bg-[#7dd3c0]/10" 
                    : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current text-[#7dd3c0]" : ""}`} />
                {isBookmarked ? "Saved" : "Save"}
              </button>

              <button
                onClick={handleShare}
                className="w-full h-10 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>

              {images.length > 0 && (
                <button
                  onClick={() => downloadImage(selectedImage || images[0], images.indexOf(selectedImage || images[0]))}
                  className="w-full h-10 border border-white/10 hover:bg-gradient-to-r hover:from-[#7dd3c0]/20 hover:to-[#7dd3c0]/10 hover:border-[#7dd3c0] hover:text-white transition-all text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Image
                </button>
              )}
            </div>

            {/* Post Info Card */}
            <div className="sticky top-[22rem] p-6 border border-white/10 bg-white/[0.02] space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-4">Details</h3>
              
              <div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-neutral-600 mb-1">Author</div>
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-neutral-500" />
                  <span className="text-sm text-neutral-300">{post.email || "Anonymous"}</span>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-neutral-600 mb-1">Published</div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-neutral-500" />
                  <span className="text-sm text-neutral-300">
                    {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {(images.length > 0 || post.video_url) && (
                <>
                  <div className="h-px bg-white/10" />
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.15em] text-neutral-600 mb-1">Media</div>
                    <div className="text-sm text-neutral-300">
                      {images.length > 0 && `${images.length} ${images.length === 1 ? 'Image' : 'Images'}`}
                      {images.length > 0 && post.video_url && ' • '}
                      {post.video_url && '1 Video'}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link href="/community">
              <button className="w-full h-10 border border-white/10 hover:bg-gradient-to-r hover:from-[#7dd3c0]/20 hover:to-[#7dd3c0]/10 hover:border-[#7dd3c0] hover:text-white transition-all text-[10px] uppercase tracking-[0.15em]">
                Back to Community
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}